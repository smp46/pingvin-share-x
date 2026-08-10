import { Injectable, Logger } from "@nestjs/common";
import * as NodeClam from "clamscan";
import * as fs from "fs";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CLAMAV_HOST, CLAMAV_PORT, SHARE_DIRECTORY } from "../constants";

const clamscanConfig = {
  clamdscan: {
    host: CLAMAV_HOST,
    port: CLAMAV_PORT,
    localFallback: false,
    // clamscan's own default (20s) is too short once share.maxSize allows
    // files in the hundreds of MB, the socket just times out mid-stream
    timeout: 300_000,
  },
  preference: "clamdscan",
};
const RETRY_INTERVAL_MS = 60_000;
const SCAN_RETRY_ATTEMPTS = 3;
const SCAN_RETRY_DELAY_MS = 3_000;

@Injectable()
export class ClamScanService {
  private readonly logger = new Logger(ClamScanService.name);

  constructor(
    private fileService: FileService,
    private prisma: PrismaService,
  ) {}

  private clamScan: Promise<NodeClam | null> | null = null;
  private lastInitAttempt = 0;

  // ClamAV might not be reachable yet (or anymore) when this runs, so retry
  // on a cooldown instead of caching a failed connection forever. The promise
  // itself is cached so concurrent scans share one init instead of skipping.
  private getClamScan(): Promise<NodeClam | null> {
    if (this.clamScan) return this.clamScan;

    const now = Date.now();
    if (now - this.lastInitAttempt < RETRY_INTERVAL_MS)
      return Promise.resolve(null);
    this.lastInitAttempt = now;

    this.clamScan = new NodeClam()
      .init(clamscanConfig)
      .then((res) => {
        this.logger.log("ClamAV is active");
        return res;
      })
      .catch(() => {
        this.logger.log("ClamAV is not active");
        this.clamScan = null;
        return null;
      });

    return this.clamScan;
  }

  // isInfected() can fail mid-scan if ClamAV restarts, retry a few times
  // before giving up so a short restart doesn't get treated as "file is clean"
  private async scanFile(
    clamScan: NodeClam,
    filePath: string,
  ): Promise<{ isInfected: boolean; failed: boolean }> {
    for (let attempt = 1; attempt <= SCAN_RETRY_ATTEMPTS; attempt++) {
      try {
        const { isInfected } = await clamScan.isInfected(filePath);
        // null means clamav was unable to scan, treat it like a failed attempt
        if (typeof isInfected === "boolean")
          return { isInfected, failed: false };
      } catch {
        // fall through to the retry below
      }
      if (attempt < SCAN_RETRY_ATTEMPTS)
        await new Promise((r) => setTimeout(r, SCAN_RETRY_DELAY_MS));
    }
    return { isInfected: false, failed: true };
  }

  async check(
    shareId: string,
  ): Promise<{ infectedFiles: { id: string; name: string }[]; scanFailed: boolean }> {
    const clamScan = await this.getClamScan();

    if (!clamScan) {
      return { infectedFiles: [], scanFailed: true };
    }

    let scanFailed = false;
    const infectedFiles = [];

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    const storageProvider = share?.storageProvider || "UNKNOWN";

    if (storageProvider === "S3") {
      const files = await this.prisma.file.findMany({
        where: { shareId },
        select: { id: true, name: true },
      });

      for (const f of files) {
        try {
          const fileObj = await this.fileService.get(shareId, f.id);

          const tmpDir = `${SHARE_DIRECTORY}/${shareId}`;
          const tmpPath = `${tmpDir}/${f.id}`;

          fs.mkdirSync(tmpDir, { recursive: true });

          // Download S3 object stream to temp local file
          await new Promise<void>((resolve, reject) => {
            const writeStream = fs.createWriteStream(tmpPath);
            (fileObj.file as any).pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
            (fileObj.file as any).on("error", reject);
          });

          const { isInfected, failed } = await this.scanFile(
            clamScan,
            tmpPath,
          );

          if (failed) {
            scanFailed = true;
            this.logger.error(
              `ClamAV scan could not complete for file ${f.id} (${f.name}) in share ${shareId} after ${SCAN_RETRY_ATTEMPTS} attempts, file was not confirmed clean`,
            );
          }

          if (isInfected) infectedFiles.push({ id: f.id, name: f.name });

          try {
            fs.unlinkSync(tmpPath);
          } catch {
            // ignore error
          }
        } catch (err: any) {
          scanFailed = true;
          this.logger.warn(
            `ClamAV scan failed for S3 file ${f.id} in share ${shareId}: ${err?.message || "unknown error"}`,
          );
        }
      }

      return { infectedFiles, scanFailed };
    }

    let files: string[] = [];
    try {
      files = fs
        .readdirSync(`${SHARE_DIRECTORY}/${shareId}`)
        .filter((file) => file != "archive.zip");
    } catch (e) {
      void e;
      return { infectedFiles: [], scanFailed: false };
    }

    for (const fileId of files) {
      const { isInfected, failed } = await this.scanFile(
        clamScan,
        `${SHARE_DIRECTORY}/${shareId}/${fileId}`,
      );

      const fileName = (
        await this.prisma.file.findUnique({ where: { id: fileId } })
      ).name;

      if (failed) {
        scanFailed = true;
        this.logger.error(
          `ClamAV scan could not complete for file ${fileId} (${fileName}) in share ${shareId} after ${SCAN_RETRY_ATTEMPTS} attempts, file was not confirmed clean`,
        );
      }

      if (isInfected) {
        infectedFiles.push({ id: fileId, name: fileName });
      }
    }

    return { infectedFiles, scanFailed };
  }

  async checkAndRemove(shareId: string) {
    const { infectedFiles, scanFailed } = await this.check(shareId);

    if (infectedFiles.length > 0) {
      try {
        await this.fileService.deleteAllFiles(shareId);
        await this.prisma.file.deleteMany({ where: { shareId } });
      } catch (err: any) {
        this.logger.error(
          `Failed to delete malicious share ${shareId}: ${err?.message || "unknown error"}`,
        );
        return;
      }

      const fileNames = infectedFiles.map((file) => file.name).join(", ");

      await this.prisma.share.update({
        where: { id: shareId },
        data: {
          scanStatus: "INFECTED",
          removedReason: `Your share got removed because the file(s) ${fileNames} are malicious.`,
        },
      });

      this.logger.warn(
        `Share ${shareId} deleted because it contained ${infectedFiles.length} malicious file(s)`,
      );
      return;
    }

    try {
      await this.prisma.share.update({
        where: { id: shareId },
        data: { scanStatus: scanFailed ? "FAILED" : "CLEAN" },
      });
    } catch {
      // share may have been deleted concurrently, nothing to persist
    }
  }
}

import { Injectable, Logger } from "@nestjs/common";
import * as NodeClam from "clamscan";
import * as fs from "fs";
import { Readable } from "stream";
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

  // scanStream() can fail mid-scan if ClamAV restarts, retry a few times
  // before giving up so a short restart doesn't get treated as "file is clean".
  // getStream is called fresh on every attempt since a consumed stream can't
  // be re-read.
  private async scanFile(
    clamScan: NodeClam,
    getStream: () => Readable | Promise<Readable>,
  ): Promise<{ isInfected: boolean; failed: boolean }> {
    for (let attempt = 1; attempt <= SCAN_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await clamScan.scanStream(await getStream());
        // null means clamav was unable to scan, treat it like a failed attempt
        if (typeof result?.isInfected === "boolean")
          return { isInfected: result.isInfected, failed: false };
      } catch {
        // fall through to the retry below
      }
      if (attempt < SCAN_RETRY_ATTEMPTS)
        await new Promise((r) => setTimeout(r, SCAN_RETRY_DELAY_MS));
    }
    return { isInfected: false, failed: true };
  }

  async check(shareId: string): Promise<{
    infectedFiles: { id: string; name: string }[];
    scanFailed: boolean;
  }> {
    const clamScan = await this.getClamScan();

    if (!clamScan) {
      return { infectedFiles: [], scanFailed: true };
    }

    let scanFailed = false;
    const infectedFiles = [];

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { storageProvider: true },
    });
    const storageProvider = share?.storageProvider || "LOCAL";

    if (storageProvider === "S3") {
      const files = await this.prisma.file.findMany({
        where: { shareId },
        select: { id: true, name: true },
      });

      for (const f of files) {
        try {
          const { isInfected, failed } = await this.scanFile(
            clamScan,
            async () => {
              const fileObj = await this.fileService.get(shareId, f.id);
              return fileObj.file as Readable;
            },
          );

          if (failed) {
            scanFailed = true;
            this.logger.error(
              `ClamAV scan could not complete for file ${f.id} (${f.name}) in share ${shareId} after ${SCAN_RETRY_ATTEMPTS} attempts, file was not confirmed clean`,
            );
          }

          if (isInfected) infectedFiles.push({ id: f.id, name: f.name });
        } catch (err: any) {
          scanFailed = true;
          this.logger.warn(
            `ClamAV scan failed for S3 file ${f.name} (${f.id}) in share ${shareId}: ${err?.message || "unknown error"}`,
          );
        }
      }

      this.logger.log(
        `ClamAV scan completed for S3 share ${shareId}: ${infectedFiles.length} infected file(s) found`,
      );
      return { infectedFiles, scanFailed };
    }

    // Local Storage Provider
    let files: string[] = [];
    try {
      files = (
        await fs.promises.readdir(`${SHARE_DIRECTORY}/${shareId}`)
      ).filter((file) => file != "archive.zip");
    } catch (e) {
      // Nothing on disk for this share, which is what an empty one looks like
      void e;
      return { infectedFiles: [], scanFailed: false };
    }

    // One query for the whole share rather than one per file, the way the s3
    // branch above already does it. Only the name is needed, and only so an
    // infected file can be reported by something a person recognises.
    const namesById = new Map(
      (
        await this.prisma.file.findMany({
          where: { shareId },
          select: { id: true, name: true },
        })
      ).map((file) => [file.id, file.name]),
    );

    for (const fileId of files) {
      const filePath = `${SHARE_DIRECTORY}/${shareId}/${fileId}`;
      // a file on disk with no row is still scanned, reported by its id
      const fileName = namesById.get(fileId) || fileId;

      try {
        const { isInfected, failed } = await this.scanFile(clamScan, () =>
          fs.createReadStream(filePath),
        );

        if (failed) {
          scanFailed = true;
          this.logger.error(
            `ClamAV scan could not complete for file ${fileId} (${fileName}) in share ${shareId} after ${SCAN_RETRY_ATTEMPTS} attempts, file was not confirmed clean`,
          );
        }

        if (isInfected) {
          infectedFiles.push({ id: fileId, name: fileName });
        }
      } catch (err: any) {
        scanFailed = true;
        this.logger.warn(
          `ClamAV scan failed for local file ${fileId} in share ${shareId}: ${err?.message || "unknown error"}`,
        );
      }
    }

    this.logger.log(
      `ClamAV scan completed for local share ${shareId}: ${infectedFiles.length} infected file(s) found`,
    );
    return { infectedFiles, scanFailed };
  }

  async checkAndRemove(shareId: string) {
    let infectedFiles: { id: string; name: string }[];
    let scanFailed: boolean;

    try {
      ({ infectedFiles, scanFailed } = await this.check(shareId));
    } catch (err: any) {
      this.logger.error(
        `Error during ClamAV scan for share ${shareId}: ${err?.message || "unknown error"}`,
      );
      return;
    }

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

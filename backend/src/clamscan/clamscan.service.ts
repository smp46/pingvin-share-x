import { Injectable, Logger } from "@nestjs/common";
import * as NodeClam from "clamscan";
import * as fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CLAMAV_HOST, CLAMAV_PORT, SHARE_DIRECTORY } from "../constants";

const clamscanConfig = {
  clamdscan: {
    host: CLAMAV_HOST,
    port: CLAMAV_PORT,
    localFallback: false,
  },
  preference: "clamdscan",
};
@Injectable()
export class ClamScanService {
  private readonly logger = new Logger(ClamScanService.name);

  constructor(
    private fileService: FileService,
    private prisma: PrismaService,
  ) {}

  private clamScanInstance: NodeClam | null = null;

  private async getClamScan(): Promise<NodeClam | null> {
    if (this.clamScanInstance) {
      return this.clamScanInstance;
    }

    try {
      const instance = await new NodeClam().init(clamscanConfig);
      this.logger.log("ClamAV is active and connected");
      this.clamScanInstance = instance;
      return instance;
    } catch (err: any) {
      this.logger.log(
        "ClamAV is not active or unreachable",
      );
      return null;
    }
  }

  async check(shareId: string) {
    const clamScan = await this.getClamScan();

    if (!clamScan) {
      return [];
    }

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      select: { storageProvider: true },
    });

    const storageProvider = share?.storageProvider || "LOCAL";
    const infectedFiles = [];

    if (storageProvider === "S3") {
      const files = await this.prisma.file.findMany({
        where: { shareId },
        select: { id: true, name: true },
      });

      for (const f of files) {
        try {
          const fileObj = await this.fileService.get(shareId, f.id);
          const result = await clamScan.scanStream(fileObj.file as Readable);
          const isInfected = !!result?.isInfected;

          if (isInfected) infectedFiles.push({ id: f.id, name: f.name });
        } catch (err: any) {
          this.logger.warn(
            `ClamAV scan failed for S3 file ${f.name} (${f.id}) in share ${shareId}: ${err?.message || "unknown error"}`,
          );
        }
      }

      this.logger.log(
        `ClamAV scan completed for S3 share ${shareId}: ${infectedFiles.length} infected file(s) found`,
      );
      return infectedFiles;
    }

    // Local Storage Provider
    let files: string[] = [];
    try {
      files = fs
        .readdirSync(`${SHARE_DIRECTORY}/${shareId}`)
        .filter((file) => file != "archive.zip");
    } catch (e) {
      void e;
      return [];
    }

    for (const fileId of files) {
      try {
        const filePath = `${SHARE_DIRECTORY}/${shareId}/${fileId}`;
        const readStream = fs.createReadStream(filePath);
        const result = await clamScan.scanStream(readStream);
        const isInfected = !!result?.isInfected;

        const fileName =
          (await this.prisma.file.findUnique({ where: { id: fileId } }))
            ?.name || fileId;

        if (isInfected) {
          infectedFiles.push({ id: fileId, name: fileName });
        }
      } catch (err: any) {
        this.logger.warn(
          `ClamAV scan failed for local file ${fileId} in share ${shareId}: ${err?.message || "unknown error"}`,
        );
      }
    }

    this.logger.log(
      `ClamAV scan completed for local share ${shareId}: ${infectedFiles.length} infected file(s) found`,
    );
    return infectedFiles;
  }

  async checkAndRemove(shareId: string) {
    try {
      const infectedFiles = await this.check(shareId);

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
            removedReason: `Your share got removed because the file(s) ${fileNames} are malicious.`,
          },
        });

        this.logger.warn(
          `Share ${shareId} deleted because it contained ${infectedFiles.length} malicious file(s)`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Error during ClamAV scan for share ${shareId}: ${err?.message || "unknown error"}`,
      );
    }
  }
}


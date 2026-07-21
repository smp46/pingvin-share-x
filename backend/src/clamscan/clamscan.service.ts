import { Injectable, Logger } from "@nestjs/common";
import * as NodeClam from "clamscan";
import * as fs from "fs";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { StoragePathService } from "src/storage/storage-path.service";
import { CLAMAV_HOST, CLAMAV_PORT } from "../constants";
import * as path from "path";
import * as os from "os";

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
    private storagePath: StoragePathService,
  ) {}

  private ClamScan: Promise<NodeClam | null> = new NodeClam()
    .init(clamscanConfig)
    .then((res) => {
      this.logger.log("ClamAV is active");
      return res;
    })
    .catch(() => {
      this.logger.log("ClamAV is not active");
      return null;
    });

  async check(shareId: string) {
    const clamScan = await this.ClamScan;

    if (!clamScan) {
      return [];
    }

    const infectedFiles = [];

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });
    const storageProvider = share?.storageProvider || "UNKNOWN";

    const files = await this.prisma.file.findMany({
      where: { shareId },
      select: { id: true, name: true, storageName: true },
    });

    if (storageProvider === "S3") {
      for (const f of files) {
        try {
          const fileObj = await this.fileService.get(shareId, f.id);

          const tmpPath = path.join(
            os.tmpdir(),
            `pingvin-clam-${shareId}-${f.id}`,
          );

          await new Promise<void>((resolve, reject) => {
            const writeStream = fs.createWriteStream(tmpPath);
            (fileObj.file as any).pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
            (fileObj.file as any).on("error", reject);
          });

          const { isInfected } = await clamScan
            .isInfected(tmpPath)
            .catch(() => ({ isInfected: false }));

          if (isInfected) infectedFiles.push({ id: f.id, name: f.name });

          try {
            fs.unlinkSync(tmpPath);
          } catch {
            // ignore error
          }
        } catch (err: any) {
          this.logger.warn(
            `ClamAV scan failed for S3 file ${f.id} in share ${shareId}: ${err?.message || "unknown error"}`,
          );
        }
      }

      return infectedFiles;
    }

    for (const f of files) {
      try {
        const absolutePath = this.storagePath.getFileAbsolutePath(share, f);
        const { isInfected } = await clamScan
          .isInfected(absolutePath)
          .catch(() => {
            this.logger.log("ClamAV is not active");
            return { isInfected: false };
          });

        if (isInfected) {
          infectedFiles.push({ id: f.id, name: f.name });
        }
      } catch (err: any) {
        this.logger.warn(
          `ClamAV scan failed for file ${f.id} in share ${shareId}: ${err?.message || "unknown error"}`,
        );
      }
    }

    return infectedFiles;
  }

  async checkAndRemove(shareId: string) {
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
  }
}

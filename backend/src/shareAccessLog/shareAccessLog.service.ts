import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

export type ShareAccessEvent = "CREATED" | "VIEWED";

@Injectable()
export class ShareAccessLogService {
  private readonly logger = new Logger(ShareAccessLogService.name);

  constructor(private prisma: PrismaService) {}

  async log(shareId: string, ip: string, event: ShareAccessEvent) {
    try {
      await this.prisma.shareAccessLog.create({
        data: { shareId, ip, event },
      });
    } catch (err: any) {
      // best effort, never let logging break the actual share flow
      this.logger.warn(
        `Failed to log ${event} access for share ${shareId}: ${err?.message || "unknown error"}`,
      );
    }
  }
}

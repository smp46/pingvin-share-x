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

  async findByShare(shareId: string) {
    const totalEvents = await this.prisma.shareAccessLog.count({
      where: { shareId },
    });

    const grouped = await this.prisma.shareAccessLog.groupBy({
      by: ["ip", "event"],
      where: { shareId },
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "desc" } },
      take: MAX_GROUPED_ENTRIES,
    });

    return {
      totalEvents,
      entries: grouped.map((g) => ({
        ip: g.ip,
        event: g.event as ShareAccessEvent,
        count: g._count._all,
        firstSeen: g._min.createdAt,
        lastSeen: g._max.createdAt,
      })),
    };
  }
}

const MAX_GROUPED_ENTRIES = 200;

import { Injectable } from "@nestjs/common";
import * as crypto from "crypto";
import { Request } from "express";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { evaluateTripwire } from "src/utils/tripwire.util";

export type AccessEventType = "view" | "download" | "bad_password";

/**
 * Records access events and runs the tripwire. To avoid a circular dependency
 * with ShareService (which records events), the auto-revoke writes
 * `removedReason` through Prisma directly, exactly like ShareService.revoke.
 */
@Injectable()
export class AccessEventService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async record(
    shareId: string,
    type: AccessEventType,
    req: Request,
  ): Promise<void> {
    const ipHash = crypto
      .createHash("sha256")
      .update((req.ip ?? "") + this.config.get("internal.jwtSecret"))
      .digest("hex");
    const userAgent = req.headers?.["user-agent"]?.toString().slice(0, 500);

    await this.prisma.accessEvent.create({
      data: { shareId, type, ipHash, userAgent: userAgent ?? null },
    });

    const cfg = {
      passwordLimit: this.config.get("share.tripwirePasswordLimit"),
      downloadLimit: this.config.get("share.tripwireDownloadLimit"),
      distinctIps: this.config.get("share.tripwireDistinctIps"),
      windowMinutes: this.config.get("share.tripwireWindowMinutes"),
    };
    const now = new Date();
    const events = await this.prisma.accessEvent.findMany({
      where: {
        shareId,
        createdAt: {
          gte: new Date(now.getTime() - cfg.windowMinutes * 60 * 1000),
        },
      },
      select: { type: true, ipHash: true, createdAt: true },
    });
    const reason = evaluateTripwire(
      events as {
        type: AccessEventType;
        ipHash: string;
        createdAt: Date;
      }[],
      now,
      cfg,
    );
    if (reason) {
      // Never overwrite an earlier reason (e.g. owner revoke)
      await this.prisma.share.updateMany({
        where: { id: shareId, removedReason: null },
        data: { removedReason: reason },
      });
    }
  }

  async listForShare(shareId: string) {
    // ipHash is deliberately not selected
    return this.prisma.accessEvent.findMany({
      where: { shareId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { type: true, createdAt: true, userAgent: true },
    });
  }
}

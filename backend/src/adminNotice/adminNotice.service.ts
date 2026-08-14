import { Injectable, OnModuleInit } from "@nestjs/common";
import { User } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminNoticeDto } from "./dto/adminNotice.dto";

@Injectable()
export class AdminNoticeService implements OnModuleInit {
  private definitionsCache: AdminNoticeDto[] | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.getNoticeDefinitions();
  }

  private getNoticeDefinitions(): AdminNoticeDto[] {
    if (this.definitionsCache) {
      return this.definitionsCache;
    }

    const candidatePaths = [
      path.join(__dirname, "admin-notices.json"),
      path.join(process.cwd(), "src/adminNotice/admin-notices.json"),
      path.join(process.cwd(), "dist/adminNotice/admin-notices.json"),
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf8");
          this.definitionsCache = JSON.parse(fileContent);
          return this.definitionsCache;
        } catch {
          // Ignore parse errors and try next path or fallback
        }
      }
    }
    this.definitionsCache = [];
    return this.definitionsCache;
  }

  async getPendingNotices(): Promise<AdminNoticeDto[]> {
    const dismissals = await this.prisma.adminNoticeDismissal.findMany();
    const dismissedNoticeIds = new Set<string>(
      dismissals.map((d) => d.noticeId),
    );

    let isS3Enabled = false;
    try {
      isS3Enabled = !!this.configService.get("s3.enabled");
    } catch {
      isS3Enabled = false;
    }

    const allNotices = this.getNoticeDefinitions();

    return allNotices.filter((notice) => {
      if (dismissedNoticeIds.has(notice.id)) {
        return false;
      }
      if (notice.conditionKey === "REQUIRE_S3_ENABLED" && !isS3Enabled) {
        return false;
      }
      return true;
    });
  }

  async dismissNotice(noticeId: string, user: User): Promise<void> {
    await this.prisma.adminNoticeDismissal.upsert({
      where: { noticeId },
      update: {
        dismissedByUserId: user.id,
        dismissedByUsername: user.username,
      },
      create: {
        noticeId,
        dismissedByUserId: user.id,
        dismissedByUsername: user.username,
      },
    });
  }
}

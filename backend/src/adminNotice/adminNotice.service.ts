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
    const records = await this.prisma.config.findMany({
      where: { category: "admin_notices" },
    });

    const dismissedNoticeIds = new Set<string>();

    for (const record of records) {
      if (record.name === "dismissed" && record.value) {
        try {
          const legacyMap = JSON.parse(record.value);
          Object.keys(legacyMap).forEach((id) => dismissedNoticeIds.add(id));
        } catch {
          // Ignore malformed JSON
        }
      } else if (record.name.startsWith("dismissed_")) {
        dismissedNoticeIds.add(record.name.replace(/^dismissed_/, ""));
      }
    }

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
    const configName = `dismissed_${noticeId}`;
    const value = JSON.stringify({
      dismissedAt: new Date().toISOString(),
      dismissedBy: user.id,
      dismissedByUsername: user.username,
    });

    await this.prisma.config.upsert({
      where: { name_category: { name: configName, category: "admin_notices" } },
      update: { value },
      create: {
        name: configName,
        category: "admin_notices",
        type: "string",
        value,
        order: 0,
      },
    });
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
import { FileService } from "src/file/file.service";
import { PrismaService } from "src/prisma/prisma.service";
import { ReverseShareService } from "src/reverseShare/reverseShare.service";
import { ConfigService } from "src/config/config.service";
import { UPLOADS_DIRECTORY } from "../constants";

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private prisma: PrismaService,
    private reverseShareService: ReverseShareService,
    private fileService: FileService,
    private configServer: ConfigService,
  ) {}

  @Cron("* * * * *")
  async deleteExpiredShares() {
    const fileRetentionPeriod = this.configServer.get(
      "share.fileRetentionPeriod",
    );

    if (fileRetentionPeriod.value === -1) {
      return;
    }

    const thresholdDate = moment()
      .subtract(fileRetentionPeriod.value, fileRetentionPeriod.unit)
      .toDate();

    const expiredShares = await this.prisma.share.findMany({
      where: {
        AND: [
          { expiration: { lt: thresholdDate } },
          { expiration: { not: moment(0).toDate() } },
        ],
      },
    });

    for (const expiredShare of expiredShares) {
      await this.fileService.deleteAllFiles(expiredShare.id);
      await this.prisma.share.delete({
        where: { id: expiredShare.id },
      });
    }

    if (expiredShares.length > 0) {
      this.logger.log(`Deleted ${expiredShares.length} expired shares`);
    }
  }

  @Cron("0 * * * *")
  async deleteExpiredReverseShares() {
    const expiredReverseShares = await this.prisma.reverseShare.findMany({
      where: {
        shareExpiration: { lt: new Date() },
      },
    });

    for (const expiredReverseShare of expiredReverseShares) {
      await this.reverseShareService.remove(expiredReverseShare.id);
    }

    if (expiredReverseShares.length > 0) {
      this.logger.log(
        `Deleted ${expiredReverseShares.length} expired reverse shares`,
      );
    }
  }

  @Cron("0 */6 * * *")
  async deleteUnfinishedShares() {
    const cutoff = moment().subtract(1, "day").toDate();
    const unfinishedShares = await this.prisma.share.findMany({
      where: {
        uploadLocked: false,
        OR: [
          { updatedAt: { lt: cutoff } },
          { updatedAt: { equals: null }, createdAt: { lt: cutoff } },
        ],
      },
    });

    for (const unfinishedShare of unfinishedShares) {
      await this.fileService.deleteAllFiles(unfinishedShare.id);
      await this.prisma.share.delete({
        where: { id: unfinishedShare.id },
      });
    }

    if (unfinishedShares.length > 0) {
      this.logger.log(`Deleted ${unfinishedShares.length} unfinished shares`);
    }
  }

  @Cron("0 0 * * *")
  deleteTemporaryFiles() {
    let filesDeleted = 0;
    const uploadsRoot = path.resolve(UPLOADS_DIRECTORY);

    if (!fs.existsSync(uploadsRoot)) {
      this.logger.log(`Deleted 0 temporary files`);
      return;
    }

    const walk = (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith(".tmp-chunk")) {
          try {
            const stats = fs.statSync(full);
            const isOlderThanOneDay = moment(stats.mtime)
              .add(1, "day")
              .isBefore(moment());
            if (isOlderThanOneDay) {
              fs.rmSync(full);
              filesDeleted++;
            }
          } catch {
            // ignore
          }
        }
      }
    };

    walk(uploadsRoot);
    this.logger.log(`Deleted ${filesDeleted} temporary files`);
  }

  @Cron("1 * * * *")
  async deleteExpiredTokens() {
    const { count: refreshTokenCount } =
      await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

    const { count: loginTokenCount } = await this.prisma.loginToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const { count: resetPasswordTokenCount } =
      await this.prisma.resetPasswordToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });

    const deletedTokensCount =
      refreshTokenCount + loginTokenCount + resetPasswordTokenCount;

    if (deletedTokensCount > 0) {
      this.logger.log(`Deleted ${deletedTokensCount} expired refresh tokens`);
    }
  }

  @Cron("0 * * * *")
  async deleteUnactivatedUsers() {
    const cutoff = moment().subtract(24, "hours").toDate();
    const unactivatedUsers = await this.prisma.user.findMany({
      where: {
        isActivated: false,
        createdAt: { lt: cutoff },
      },
      include: { shares: true },
    });

    for (const user of unactivatedUsers) {
      await Promise.all(
        user.shares.map((share) => this.fileService.deleteAllFiles(share.id)),
      );
      await this.prisma.user.delete({ where: { id: user.id } });
    }

    if (unactivatedUsers.length > 0) {
      this.logger.log(`Deleted ${unactivatedUsers.length} unactivated users`);
    }
  }
}

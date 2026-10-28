import * as moment from "moment";
import type { PrismaService } from "../prisma/prisma.service";

export function resolveStorageQuota(
  user: { storageQuotaLimit?: string | null } | null | undefined,
  defaultQuota: number,
): number | null {
  if (user?.storageQuotaLimit != null) {
    return parseInt(user.storageQuotaLimit, 10);
  }
  return defaultQuota > 0 ? defaultQuota : null;
}

export async function getUserActiveStorageUsage(
  prisma: PrismaService,
  userId: string,
): Promise<number> {
  const files = await prisma.file.findMany({
    where: {
      share: {
        removedReason: null,
        OR: [
          { expiration: { gt: new Date() } },
          { expiration: moment(0).toDate() },
        ],
        AND: [
          {
            OR: [
              { reverseShare: { creatorId: userId } },
              { reverseShareId: null, creatorId: userId },
            ],
          },
        ],
      },
    },
    select: { size: true },
  });

  return files.reduce((sum, file) => sum + parseInt(file.size), 0);
}

import moment from "moment";
import { PrismaService } from "src/prisma/prisma.service";

export async function getUserActiveStorageUsage(
  prisma: PrismaService,
  userId: string,
): Promise<number> {
  const files = await prisma.file.findMany({
    where: {
      share: {
        creatorId: userId,
        removedReason: null,
        OR: [
          { expiration: { gt: new Date() } },
          { expiration: moment(0).toDate() },
        ],
      },
    },
    select: { size: true },
  });

  return files.reduce((sum, file) => sum + parseInt(file.size), 0);
}

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { createReadStream } from "fs";
import * as fs from "fs/promises";
import * as mime from "mime-types";
import { I18nService } from "nestjs-i18n";
import { resolve, sep } from "path";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { byteToHumanSizeString } from "src/utils/fileSize.util";
import { getUserActiveStorageUsage } from "src/utils/storageQuota.util";
import { validate as isValidUUID } from "uuid";
import { SHARE_DIRECTORY } from "../constants";
import { Readable } from "stream";
import * as rangeParser from "range-parser";
import { File } from "./file.service";

@Injectable()
export class LocalFileService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async create(
    data: string,
    chunk: { index: number; total: number },
    file: { id?: string; name: string },
    shareId: string,
  ) {
    if (!file.id) {
      file.id = crypto.randomUUID();
    } else if (!isValidUUID(file.id)) {
      throw new BadRequestException(this.i18n.t("file.invalidIdFormat"));
    }

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: {
        files: true,
        reverseShare: { include: { creator: true } },
        creator: true,
      },
    });

    if (share.uploadLocked)
      throw new BadRequestException(this.i18n.t("file.alreadyCompleted"));

    let diskFileSize: number;
    try {
      diskFileSize = (
        await fs.stat(`${SHARE_DIRECTORY}/${shareId}/${file.id}.tmp-chunk`)
      ).size;
    } catch {
      diskFileSize = 0;
    }

    // If the sent chunk index and the expected chunk index doesn't match throw an error
    const chunkSize = this.config.get("share.chunkSize");
    const expectedChunkIndex = Math.ceil(diskFileSize / chunkSize);

    if (expectedChunkIndex != chunk.index)
      throw new BadRequestException({
        message: this.i18n.t("file.unexpectedChunk"),
        error: "unexpected_chunk_index",
        expectedChunkIndex,
      });

    const buffer = Buffer.from(data, "base64");

    // Check if there is enough space on the server
    const space = await fs.statfs(SHARE_DIRECTORY);
    const availableSpace = space.bavail * space.bsize;
    if (availableSpace < buffer.byteLength) {
      throw new InternalServerErrorException(
        this.i18n.t("file.notEnoughSpace"),
      );
    }

    // Check if share size limit is exceeded
    const fileSizeSum = share.files.reduce(
      (n, { size }) => n + parseInt(size),
      0,
    );

    const shareSizeSum = fileSizeSum + diskFileSize + buffer.byteLength;

    let limit = parseInt(this.config.get("share.maxSize"));
    if (share.reverseShare?.maxShareSize) {
      limit = parseInt(share.reverseShare.maxShareSize);
    } else if (share.creator?.shareSizeLimit) {
      limit = parseInt(share.creator.shareSizeLimit);
    }

    if (shareSizeSum > limit) {
      throw new HttpException(
        this.i18n.t("file.maxSizeExceeded"),
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    const quotaOwner = share.reverseShare
      ? share.reverseShare.creator
      : share.creator;
    const quotaOwnerId = share.reverseShare
      ? share.reverseShare.creatorId
      : share.creatorId;

    if (quotaOwnerId && quotaOwner?.storageQuotaLimit) {
      const quotaLimit = parseInt(quotaOwner.storageQuotaLimit);
      const activeStorageUsage = await getUserActiveStorageUsage(
        this.prisma,
        quotaOwnerId,
      );
      const projectedUsage =
        activeStorageUsage + diskFileSize + buffer.byteLength;

      if (projectedUsage > quotaLimit) {
        const exceededBytes = projectedUsage - quotaLimit;
        const exceededSize = byteToHumanSizeString(exceededBytes);
        throw new HttpException(
          share.reverseShare
            ? this.i18n.t("file.reverseShareQuotaExceeded", {
                args: { exceededSize },
              })
            : this.i18n.t("file.storageQuotaExceeded", {
                args: { exceededSize },
              }),
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }
    }

    await fs.appendFile(
      `${SHARE_DIRECTORY}/${shareId}/${file.id}.tmp-chunk`,
      buffer,
    );

    const isLastChunk = chunk.index == chunk.total - 1;
    if (isLastChunk) {
      await fs.rename(
        `${SHARE_DIRECTORY}/${shareId}/${file.id}.tmp-chunk`,
        `${SHARE_DIRECTORY}/${shareId}/${file.id}`,
      );
      const fileSize = (
        await fs.stat(`${SHARE_DIRECTORY}/${shareId}/${file.id}`)
      ).size;
      await this.prisma.file.create({
        data: {
          id: file.id,
          name: file.name,
          size: fileSize.toString(),
          share: { connect: { id: shareId } },
        },
      });
    }

    return file;
  }

  async get(
    shareId: string,
    fileId: string,
    range?: { start: number; end?: number } | string,
  ): Promise<File> {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData)
      throw new NotFoundException(this.i18n.t("file.notFound"));

    const totalSize = parseInt(fileMetaData.size, 10);
    let activeRange: { start: number; end: number } | undefined;
    let isRangeNotSatisfiable = false;

    if (typeof range === "string") {
      const ranges = rangeParser(totalSize, range, { combine: true });
      if (ranges === -1) {
        isRangeNotSatisfiable = true;
      } else if (Array.isArray(ranges) && ranges.length > 0 && totalSize > 0) {
        activeRange = ranges[0];
      }
    } else if (range && typeof range === "object") {
      activeRange = {
        start: range.start,
        end: range.end ?? totalSize - 1,
      };
    }

    const filePath = this.getSafeFilePath(shareId, fileId);

    const file = isRangeNotSatisfiable
      ? undefined
      : createReadStream(
          filePath,
          activeRange
            ? { start: activeRange.start, end: activeRange.end }
            : undefined,
        );

    return {
      metaData: {
        mimeType: mime.contentType(fileMetaData.name.split(".").pop()),
        ...fileMetaData,
        size: fileMetaData.size,
      },
      file,
      range: activeRange,
      isRangeNotSatisfiable,
    };
  }

  async remove(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData)
      throw new NotFoundException(this.i18n.t("file.notFound"));

    const filePath = this.getSafeFilePath(shareId, fileId);
    await fs.unlink(filePath);

    await this.prisma.file.delete({ where: { id: fileId } });
  }

  private getSafeFilePath(shareId: string, fileId: string): string {
    const baseDir = resolve(SHARE_DIRECTORY, shareId);
    const resolvedPath = resolve(baseDir, fileId);

    if (!resolvedPath.startsWith(baseDir + sep)) {
      throw new BadRequestException(this.i18n.t("file.invalidIdFormat"));
    }

    return resolvedPath;
  }

  async deleteAllFiles(shareId: string) {
    await fs.rm(`${SHARE_DIRECTORY}/${shareId}`, {
      recursive: true,
      force: true,
    });
  }

  async getZip(shareId: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      const zipStream = createReadStream(
        `${SHARE_DIRECTORY}/${shareId}/archive.zip`,
      );

      zipStream.on("error", (err) => {
        reject(new InternalServerErrorException(err));
      });

      zipStream.on("open", () => {
        resolve(zipStream);
      });
    });
  }
}

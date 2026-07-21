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
import * as path from "path";
import * as mime from "mime-types";
import { I18nService } from "nestjs-i18n";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { StoragePathService } from "src/storage/storage-path.service";
import { validate as isValidUUID } from "uuid";
import { Readable } from "stream";

@Injectable()
export class LocalFileService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private storagePath: StoragePathService,
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
      include: { files: true, reverseShare: true, creator: true },
    });

    if (share.uploadLocked)
      throw new BadRequestException(this.i18n.t("file.alreadyCompleted"));

    const shareInfo = {
      id: share.id,
      storagePath: share.storagePath,
      name: share.name,
      createdAt: share.createdAt,
      creator: share.creator,
    };

    await this.storagePath.ensureShareDirectory(shareInfo);

    const tempChunkPath = this.storagePath.getTempChunkPath(shareInfo, file.id);

    let diskFileSize: number;
    try {
      diskFileSize = (await fs.stat(tempChunkPath)).size;
    } catch {
      diskFileSize = 0;
    }

    const chunkSize = this.config.get("share.chunkSize");
    const expectedChunkIndex = Math.ceil(diskFileSize / chunkSize);

    if (expectedChunkIndex != chunk.index)
      throw new BadRequestException({
        message: this.i18n.t("file.unexpectedChunk"),
        error: "unexpected_chunk_index",
        expectedChunkIndex,
      });

    const buffer = Buffer.from(data, "base64");

    const uploadsRoot = this.storagePath.getUploadsRoot();
    const space = await fs.statfs(uploadsRoot);
    const availableSpace = space.bavail * space.bsize;
    if (availableSpace < buffer.byteLength) {
      throw new InternalServerErrorException(
        this.i18n.t("file.notEnoughSpace"),
      );
    }

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

    await fs.mkdir(path.dirname(tempChunkPath), { recursive: true });
    await fs.appendFile(tempChunkPath, buffer);

    const isLastChunk = chunk.index == chunk.total - 1;
    if (isLastChunk) {
      const existingNames = share.files
        .map((f) => f.storageName || f.name)
        .filter(Boolean);

      const storageName = await this.storagePath.allocateStorageName(
        shareInfo,
        file.name,
        existingNames,
      );

      const finalPath = this.storagePath.getFileAbsolutePath(shareInfo, {
        id: file.id,
        name: file.name,
        storageName,
      });

      await fs.mkdir(path.dirname(finalPath), { recursive: true });
      await fs.rename(tempChunkPath, finalPath);

      const fileSize = (await fs.stat(finalPath)).size;
      await this.prisma.file.create({
        data: {
          id: file.id,
          name: file.name,
          storageName,
          size: fileSize.toString(),
          share: { connect: { id: shareId } },
        },
      });
    }

    return file;
  }

  async get(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData)
      throw new NotFoundException(this.i18n.t("file.notFound"));

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) throw new NotFoundException(this.i18n.t("share.notFound"));

    const absolutePath = this.storagePath.getFileAbsolutePath(share, fileMetaData);
    const file = createReadStream(absolutePath);

    return {
      metaData: {
        mimeType: mime.contentType(fileMetaData.name.split(".").pop()),
        ...fileMetaData,
        size: fileMetaData.size,
      },
      file,
    };
  }

  async remove(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData)
      throw new NotFoundException(this.i18n.t("file.notFound"));

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) throw new NotFoundException(this.i18n.t("share.notFound"));

    const absolutePath = this.storagePath.getFileAbsolutePath(share, fileMetaData);
    try {
      await fs.unlink(absolutePath);
      await this.removeEmptyParents(
        path.dirname(absolutePath),
        this.storagePath.getShareAbsolutePath(share),
      );
    } catch {
      // File may already be gone from disk
    }

    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async deleteAllFiles(shareId: string) {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) return;

    await fs.rm(this.storagePath.getShareAbsolutePath(share), {
      recursive: true,
      force: true,
    });
  }

  async getZip(shareId: string): Promise<Readable> {
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
    });

    if (!share) throw new NotFoundException(this.i18n.t("share.notFound"));

    return new Promise((resolve, reject) => {
      const zipStream = createReadStream(
        this.storagePath.getArchivePath(share),
      );

      zipStream.on("error", (err) => {
        reject(new InternalServerErrorException(err));
      });

      zipStream.on("open", () => {
        resolve(zipStream);
      });
    });
  }

  private async removeEmptyParents(
    current: string,
    stopAt: string,
  ): Promise<void> {
    const resolvedCurrent = path.resolve(current);
    const resolvedStop = path.resolve(stopAt);
    if (
      resolvedCurrent === resolvedStop ||
      !resolvedCurrent.startsWith(resolvedStop + path.sep)
    ) {
      return;
    }

    try {
      const entries = await fs.readdir(resolvedCurrent);
      if (entries.length === 0) {
        await fs.rmdir(resolvedCurrent);
        await this.removeEmptyParents(path.dirname(resolvedCurrent), stopAt);
      }
    } catch {
      // ignore
    }
  }
}

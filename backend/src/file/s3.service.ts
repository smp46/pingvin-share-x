import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
  UploadPartCommand,
  UploadPartCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as contentDisposition from "content-disposition";
import { PrismaService } from "src/prisma/prisma.service";
import { ConfigService } from "src/config/config.service";
import { I18nService } from "nestjs-i18n";
import * as crypto from "crypto";
import * as mime from "mime-types";
import { byteToHumanSizeString } from "src/utils/fileSize.util";
import { getUserActiveStorageUsage } from "src/utils/storageQuota.util";
import { File } from "./file.service";
import { Readable } from "stream";
import { validate as isValidUUID } from "uuid";
import * as archiver from "archiver";

@Injectable()
export class S3FileService {
  private readonly logger = new Logger(S3FileService.name);

  private multipartUploads: Record<
    string,
    {
      uploadId: string;
      parts: Array<{ ETag: string | undefined; PartNumber: number }>;
      uploadedBytes: number;
    }
  > = {};

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

    const buffer = Buffer.from(data, "base64");
    const key = `${this.getS3Path()}${shareId}/${file.name}`;
    const bucketName = this.config.get("s3.bucketName");
    const s3Instance = this.getS3Instance();
    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: {
        creator: true,
        reverseShare: { include: { creator: true } },
      },
    });

    try {
      // Initialize multipart upload if it's the first chunk
      if (chunk.index === 0) {
        const multipartInitResponse = await s3Instance.send(
          new CreateMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );

        const uploadId = multipartInitResponse.UploadId;
        if (!uploadId) {
          throw new Error(this.i18n.t("file.s3UploadInitError"));
        }

        // Store the uploadId and parts list in memory
        this.multipartUploads[file.id] = {
          uploadId,
          parts: [],
          uploadedBytes: 0,
        };
      }

      // Get the ongoing multipart upload
      const multipartUpload = this.multipartUploads[file.id];
      if (!multipartUpload) {
        throw new InternalServerErrorException(
          this.i18n.t("file.s3SessionNotFound"),
        );
      }

      const quotaOwner = share?.reverseShare
        ? share.reverseShare.creator
        : share?.creator;
      const quotaOwnerId = share?.reverseShare
        ? share.reverseShare.creatorId
        : share?.creatorId;

      if (quotaOwnerId && quotaOwner?.storageQuotaLimit) {
        const quotaLimit = parseInt(quotaOwner.storageQuotaLimit);
        const activeStorageUsage = await getUserActiveStorageUsage(
          this.prisma,
          quotaOwnerId,
        );
        const projectedUsage =
          activeStorageUsage +
          multipartUpload.uploadedBytes +
          buffer.byteLength;

        if (projectedUsage > quotaLimit) {
          const exceededBytes = projectedUsage - quotaLimit;
          const exceededSize = byteToHumanSizeString(exceededBytes);
          throw new BadRequestException(
            share?.reverseShare
              ? this.i18n.t("file.reverseShareQuotaExceeded", {
                  args: { exceededSize },
                })
              : this.i18n.t("file.storageQuotaExceeded", {
                  args: { exceededSize },
                }),
          );
        }
      }

      const uploadId = multipartUpload.uploadId;

      // Upload the current chunk
      const partNumber = chunk.index + 1; // Part numbers start from 1

      const uploadPartResponse: UploadPartCommandOutput = await s3Instance.send(
        new UploadPartCommand({
          Bucket: bucketName,
          Key: key,
          PartNumber: partNumber,
          UploadId: uploadId,
          Body: buffer,
        }),
      );

      // Store the ETag and PartNumber for later completion
      multipartUpload.parts.push({
        ETag: uploadPartResponse.ETag,
        PartNumber: partNumber,
      });
      multipartUpload.uploadedBytes += buffer.byteLength;

      // Complete the multipart upload if it's the last chunk
      if (chunk.index === chunk.total - 1) {
        await s3Instance.send(
          new CompleteMultipartUploadCommand({
            Bucket: bucketName,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
              Parts: multipartUpload.parts,
            },
          }),
        );

        // Remove the completed upload from memory
        delete this.multipartUploads[file.id];
      }
    } catch (error) {
      // Abort the multipart upload if it fails
      const multipartUpload = this.multipartUploads[file.id];
      if (multipartUpload) {
        try {
          await s3Instance.send(
            new AbortMultipartUploadCommand({
              Bucket: bucketName,
              Key: key,
              UploadId: multipartUpload.uploadId,
            }),
          );
        } catch (abortError) {
          console.error("Error aborting multipart upload:", abortError);
        }
        delete this.multipartUploads[file.id];
      }
      this.logger.error(error);
      throw new Error(this.i18n.t("file.s3UploadFailed"));
    }

    const isLastChunk = chunk.index == chunk.total - 1;
    if (isLastChunk) {
      const fileSize: number = await this.getFileSize(shareId, file.name);

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

  async get(shareId: string, fileId: string): Promise<File> {
    const fileName = (
      await this.prisma.file.findUnique({ where: { id: fileId } })
    ).name;

    const s3Instance = this.getS3Instance();
    const key = `${this.getS3Path()}${shareId}/${fileName}`;
    const response = await s3Instance.send(
      new GetObjectCommand({
        Bucket: this.config.get("s3.bucketName"),
        Key: key,
      }),
    );

    return {
      metaData: {
        id: fileId,
        size: response.ContentLength?.toString() || "0",
        name: fileName,
        shareId: shareId,
        createdAt: response.LastModified || new Date(),
        mimeType:
          mime.contentType(fileId.split(".").pop()) ||
          "application/octet-stream",
      },
      file: response.Body as Readable,
    } as File;
  }

  async remove(shareId: string, fileId: string) {
    const fileMetaData = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!fileMetaData)
      throw new NotFoundException(this.i18n.t("file.notFound"));

    const key = `${this.getS3Path()}${shareId}/${fileMetaData.name}`;
    const s3Instance = this.getS3Instance();

    try {
      await s3Instance.send(
        new DeleteObjectCommand({
          Bucket: this.config.get("s3.bucketName"),
          Key: key,
        }),
      );
    } catch {
      throw new Error(this.i18n.t("file.s3DeleteError"));
    }

    await this.prisma.file.delete({ where: { id: fileId } });
  }

  async deleteAllFiles(shareId: string) {
    const prefix = `${this.getS3Path()}${shareId}/`;
    const s3Instance = this.getS3Instance();
    const bucketName = this.config.get("s3.bucketName");

    const fallbackDeleteByDb = async (reason: string) => {
      const files = await this.prisma.file.findMany({
        where: { shareId },
        select: { name: true },
      });
      void reason;

      for (const f of files) {
        const key = `${this.getS3Path()}${shareId}/${f.name}`;
        try {
          await s3Instance.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          );
        } catch {
          // ignore per-object failure
        }
      }
    };

    try {
      // List all objects under the given prefix
      const listResponse = await s3Instance.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        }),
      );

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return;
      }

      // Extract the keys of the files to be deleted
      const objectsToDelete = listResponse.Contents.map((file) => ({
        Key: file.Key!,
      }));

      // Delete all files in a single request (up to 1000 objects at once)
      await s3Instance.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
          },
        }),
      );
    } catch (error) {
      // try deleting by known file names from DB instead.
      await fallbackDeleteByDb("list_or_bulk_delete_failed");
      void error;
    }
  }

  async getFileSize(shareId: string, fileName: string): Promise<number> {
    const key = `${this.getS3Path()}${shareId}/${fileName}`;
    const s3Instance = this.getS3Instance();

    try {
      // Get metadata of the file using HeadObjectCommand
      const headObjectResponse = await s3Instance.send(
        new HeadObjectCommand({
          Bucket: this.config.get("s3.bucketName"),
          Key: key,
        }),
      );

      // Return ContentLength which is the file size in bytes
      return headObjectResponse.ContentLength ?? 0;
    } catch {
      throw new Error(this.i18n.t("file.s3SizeError"));
    }
  }

  getS3Instance(): S3Client {
    const checksumCalculation =
      this.config.get("s3.useChecksum") === true ? null : "WHEN_REQUIRED";

    return new S3Client({
      endpoint: this.config.get("s3.endpoint"),
      region: this.config.get("s3.region"),
      credentials: {
        accessKeyId: this.config.get("s3.key"),
        secretAccessKey: this.config.get("s3.secret"),
      },
      forcePathStyle: true,
      requestChecksumCalculation: checksumCalculation,
      responseChecksumValidation: checksumCalculation,
    });
  }

  async getZip(shareId: string) {
    const files = await this.prisma.file.findMany({
      where: { shareId },
    });

    if (files.length === 0) {
      throw new NotFoundException(`No files found for share ${shareId}`);
    }

    const s3Instance = this.getS3Instance();
    const bucketName = this.config.get("s3.bucketName");
    const compressionLevel = this.config.get("share.zipCompressionLevel");
    const s3Path = this.getS3Path();

    const archive = archiver("zip", {
      zlib: { level: parseInt(compressionLevel) },
    });

    archive.on("error", (err) => {
      this.logger.error("Archive error", err);
    });

    const processFiles = async () => {
      for (const file of files) {
        const key = `${s3Path}${shareId}/${file.name}`;
        try {
          const response = await s3Instance.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          );

          if (response.Body instanceof Readable) {
            const body = response.Body as Readable;
            archive.append(body, { name: file.name });
            // Wait for this file to be fully appended before moving to the next one to avoid overwhelming memory/connections
            await new Promise((resolve, reject) => {
              body.on("end", resolve);
              body.on("error", reject);
            });
          }
        } catch (error) {
          this.logger.error(`Error processing file ${file.name}`, error);
        }
      }
      archive.finalize();
    };

    processFiles();

    return archive;
  }

  async createPreSignedUploadUrls(
    shareId: string,
    fileName: string,
    totalChunks: number,
  ): Promise<{ uploadId: string; key: string; urls: string[] }> {
    const key = `${this.getS3Path()}${shareId}/${fileName}`;
    const bucketName = this.config.get("s3.bucketName");
    const s3Instance = this.getS3Instance();

    try {
      const multipartInitResponse = await s3Instance.send(
        new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      const uploadId = multipartInitResponse.UploadId;
      if (!uploadId) {
        throw new InternalServerErrorException(this.i18n.t("file.s3UploadInitError"));
      }

      const urls: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const partNumber = i + 1;
        const command = new UploadPartCommand({
          Bucket: bucketName,
          Key: key,
          PartNumber: partNumber,
          UploadId: uploadId,
        });
        const url = await getSignedUrl(s3Instance, command, { expiresIn: 3600 });
        urls.push(url);
      }

      return { uploadId, key, urls };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(this.i18n.t("file.s3UploadInitError"));
    }
  }

  async completePreSignedUpload(
    shareId: string,
    fileId: string,
    fileName: string,
    uploadId: string,
    parts: Array<{ ETag: string; PartNumber: number }>,
  ): Promise<{ id: string; name: string }> {
    if (!fileId) {
      fileId = crypto.randomUUID();
    } else if (!isValidUUID(fileId)) {
      throw new BadRequestException(this.i18n.t("file.invalidIdFormat"));
    }

    const key = `${this.getS3Path()}${shareId}/${fileName}`;
    const bucketName = this.config.get("s3.bucketName");
    const s3Instance = this.getS3Instance();

    const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);

    try {
      await s3Instance.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: sortedParts,
          },
        }),
      );
    } catch (error) {
      this.logger.error("Failed to complete S3 multipart upload:", error);
      throw new BadRequestException(this.i18n.t("file.s3UploadFailed"));
    }

    try {
      const fileSize = await this.getFileSize(shareId, fileName);

      const existingFile = await this.prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!existingFile) {
        await this.prisma.file.create({
          data: {
            id: fileId,
            name: fileName,
            size: fileSize.toString(),
            share: { connect: { id: shareId } },
          },
        });
      }

      return { id: fileId, name: fileName };
    } catch (error) {
      this.logger.error("Error creating database record after S3 upload completion:", error);
      throw new InternalServerErrorException(this.i18n.t("file.s3UploadFailed"));
    }
  }

  async abortPreSignedUpload(
    shareId: string,
    fileName: string,
    uploadId: string,
  ): Promise<void> {
    const key = `${this.getS3Path()}${shareId}/${fileName}`;
    const bucketName = this.config.get("s3.bucketName");
    const s3Instance = this.getS3Instance();

    try {
      await s3Instance.send(
        new AbortMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
        }),
      );
    } catch (error) {
      this.logger.error("Error aborting multipart upload:", error);
    }
  }

  async getPreSignedDownloadUrl(
    shareId: string,
    fileId: string,
    isDownload: boolean,
  ): Promise<string> {
    const fileRecord = await this.prisma.file.findFirst({
      where: { id: fileId, shareId },
    });
    if (!fileRecord) {
      throw new NotFoundException(this.i18n.t("file.notFound"));
    }

    const key = `${this.getS3Path()}${shareId}/${fileRecord.name}`;
    const bucketName = this.config.get("s3.bucketName");
    const s3Instance = this.getS3Instance();

    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: contentDisposition(
        fileRecord.name,
        isDownload ? undefined : { type: "inline" },
      ),
    });

    return await getSignedUrl(s3Instance, getObjectCommand, { expiresIn: 300 });
  }

  getS3Path(): string {
    const configS3Path = this.config.get("s3.bucketPath");
    if (!configS3Path) return "";
    const normalized = `${configS3Path}`.replace(/^\/+|\/+$/g, "");
    return normalized ? `${normalized}/` : "";
  }
}

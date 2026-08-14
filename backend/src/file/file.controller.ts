import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import * as contentDisposition from "content-disposition";
import { Response } from "express";
import { CreateShareGuard } from "src/share/guard/createShare.guard";
import { StrictShareOwnerGuard } from "src/share/guard/strictShareOwner.guard";
import { IdValidation } from "src/share/guard/shareIdValidation.guard";
import { FileService } from "./file.service";
import { FileSecurityGuard } from "./guard/fileSecurity.guard";
import * as mime from "mime-types";

const VALID_ID_REGEX = /^[a-zA-Z0-9-]*={0,2}$/;

function getValidRecipientId(recipientId?: string): string | undefined {
  if (!recipientId) return undefined;
  return VALID_ID_REGEX.test(recipientId) ? recipientId : undefined;
}

@Controller("shares/:shareId/files")
export class FileController {
  constructor(private fileService: FileService) {}

  @Post("upload-init")
  @SkipThrottle()
  @UseGuards(IdValidation, CreateShareGuard, StrictShareOwnerGuard)
  async uploadInit(
    @Body()
    body: {
      id?: string;
      name: string;
      totalChunks: number;
    },
    @Param("shareId") shareId: string,
  ) {
    return await this.fileService.createPreSignedUploadUrls(
      shareId,
      body.name,
      body.totalChunks,
    );
  }

  @Post("upload-complete")
  @SkipThrottle()
  @UseGuards(IdValidation, CreateShareGuard, StrictShareOwnerGuard)
  async uploadComplete(
    @Body()
    body: {
      id?: string;
      name: string;
      uploadId: string;
      parts: Array<{ ETag: string; PartNumber: number }>;
    },
    @Param("shareId") shareId: string,
  ) {
    return await this.fileService.completePreSignedUpload(
      shareId,
      body.id,
      body.name,
      body.uploadId,
      body.parts,
    );
  }

  @Post("upload-abort")
  @SkipThrottle()
  @UseGuards(IdValidation, CreateShareGuard, StrictShareOwnerGuard)
  async uploadAbort(
    @Body()
    body: {
      name: string;
      uploadId: string;
    },
    @Param("shareId") shareId: string,
  ) {
    await this.fileService.abortPreSignedUpload(
      shareId,
      body.name,
      body.uploadId,
    );
  }

  @Post()
  @SkipThrottle()
  @UseGuards(IdValidation, CreateShareGuard, StrictShareOwnerGuard)
  async create(
    @Query()
    query: {
      id: string;
      name: string;
      chunkIndex: string;
      totalChunks: string;
    },
    @Body() body: string,
    @Param("shareId") shareId: string,
  ) {
    const { id, name, chunkIndex, totalChunks } = query;

    // Data can be empty if the file is empty
    return await this.fileService.create(
      body,
      { index: parseInt(chunkIndex), total: parseInt(totalChunks) },
      { id, name },
      shareId,
    );
  }

  @Get("zip")
  @UseGuards(FileSecurityGuard)
  async getZip(
    @Res({ passthrough: true }) res: Response,
    @Param("shareId") shareId: string,
    @Query("recipient") recipientId?: string,
  ) {
    const zipStream = await this.fileService.getZip(shareId);

    res.set({
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(`${shareId}.zip`),
    });

    void this.fileService.notifyRecipientDownload(
      shareId,
      `${shareId}.zip`,
      getValidRecipientId(recipientId),
    );

    return new StreamableFile(zipStream);
  }

  @Get(":fileId")
  @UseGuards(FileSecurityGuard)
  async getFile(
    @Res({ passthrough: true }) res: Response,
    @Param("shareId") shareId: string,
    @Param("fileId") fileId: string,
    @Query("download") download = "true",
    @Query("recipient") recipientId?: string,
  ) {
    const isDownload = download === "true";
    const storageProvider = await this.fileService.getStorageProvider(shareId);

    if (storageProvider === "S3") {
      const url = await this.fileService.getPreSignedDownloadUrl(
        shareId,
        fileId,
        isDownload,
      );
      const fileName = await this.fileService.getFileName(shareId, fileId);
      if (isDownload) {
        void this.fileService.notifyRecipientDownload(
          shareId,
          fileName,
          getValidRecipientId(recipientId),
        );
      }
      res.status(302).setHeader("Location", url);
      return;
    }

    const file = await this.fileService.get(shareId, fileId);

    const headers = {
      "Content-Type":
        mime?.lookup?.(file.metaData.name) || "application/octet-stream",
      "Content-Length": file.metaData.size,
      "Content-Security-Policy": "sandbox",
      "Content-Disposition": contentDisposition(
        file.metaData.name,
        isDownload ? undefined : { type: "inline" },
      ),
    };

    res.set(headers);

    if (isDownload) {
      void this.fileService.notifyRecipientDownload(
        shareId,
        file.metaData.name,
        getValidRecipientId(recipientId),
      );
    }

    return new StreamableFile(file.file);
  }

  @Delete(":fileId")
  @SkipThrottle()
  @UseGuards(StrictShareOwnerGuard)
  async remove(
    @Param("fileId") fileId: string,
    @Param("shareId") shareId: string,
  ) {
    await this.fileService.remove(shareId, fileId);
  }
}

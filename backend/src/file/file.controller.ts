import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { RangeNotSatisfiableError } from "./range";
import * as mime from "mime-types";

const VALID_ID_REGEX = /^[a-zA-Z0-9-]*={0,2}$/;

function getValidRecipientId(recipientId?: string): string | undefined {
  if (!recipientId) return undefined;
  return VALID_ID_REGEX.test(recipientId) ? recipientId : undefined;
}

@Controller("shares/:shareId/files")
export class FileController {
  constructor(private fileService: FileService) {}

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
    @Headers("range") rangeHeader?: string,
  ) {
    const isDownload = download === "true";

    try {
      const file = await this.fileService.get(shareId, fileId, rangeHeader);

      const headers: Record<string, string> = {
        "Content-Type":
          mime?.lookup?.(file.metaData.name) || "application/octet-stream",
        "Content-Length": file.metaData.size,
        // Advertise range support so players know they can seek even before
        // they issue a range request.
        "Accept-Ranges": "bytes",
        "Content-Security-Policy": "sandbox",
        "Content-Disposition": contentDisposition(
          file.metaData.name,
          isDownload ? undefined : { type: "inline" },
        ),
      };

      // Partial content -> 206; override Content-Length with the served slice
      // and add Content-Range so the browser can stream and seek instead of
      // buffering the whole file first.
      if (file.range) {
        const { start, end, size } = file.range;
        res.status(206);
        headers["Content-Length"] = (end - start + 1).toString();
        headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      }

      res.set(headers);

      if (isDownload) {
        void this.fileService.notifyRecipientDownload(
          shareId,
          file.metaData.name,
          getValidRecipientId(recipientId),
        );
      }

      return new StreamableFile(file.file);
    } catch (e) {
      // Valid Range we can't satisfy -> 416 with the total size.
      if (e instanceof RangeNotSatisfiableError) {
        res.status(416);
        res.set({
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${e.size}`,
        });
        return new StreamableFile(Buffer.alloc(0));
      }
      throw e;
    }
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

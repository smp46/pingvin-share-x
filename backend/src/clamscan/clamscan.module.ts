import { forwardRef, Module } from "@nestjs/common";
import { FileModule } from "src/file/file.module";
import { StorageModule } from "src/storage/storage.module";
import { ClamScanService } from "./clamscan.service";

@Module({
  imports: [forwardRef(() => FileModule), StorageModule],
  providers: [ClamScanService],
  exports: [ClamScanService],
})
export class ClamScanModule {}

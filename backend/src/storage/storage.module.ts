import { Module } from "@nestjs/common";
import { StoragePathService } from "./storage-path.service";

@Module({
  providers: [StoragePathService],
  exports: [StoragePathService],
})
export class StorageModule {}

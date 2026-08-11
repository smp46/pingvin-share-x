import { Module } from "@nestjs/common";
import { ShareAccessLogService } from "./shareAccessLog.service";

@Module({
  providers: [ShareAccessLogService],
  exports: [ShareAccessLogService],
})
export class ShareAccessLogModule {}

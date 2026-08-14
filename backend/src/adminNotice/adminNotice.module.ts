import { Module } from "@nestjs/common";
import { ConfigModule } from "src/config/config.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { AdminNoticeController } from "./adminNotice.controller";
import { AdminNoticeService } from "./adminNotice.service";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AdminNoticeController],
  providers: [AdminNoticeService],
  exports: [AdminNoticeService],
})
export class AdminNoticeModule {}

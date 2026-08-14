import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { AdminNoticeService } from "./adminNotice.service";
import { AdminNoticeDto } from "./dto/adminNotice.dto";

@Controller("admin-notices")
@UseGuards(JwtGuard, AdministratorGuard)
export class AdminNoticeController {
  constructor(private adminNoticeService: AdminNoticeService) {}

  @Get("pending")
  async getPendingNotices(): Promise<AdminNoticeDto[]> {
    return this.adminNoticeService.getPendingNotices();
  }

  @Post(":id/dismiss")
  async dismissNotice(
    @Param("id") id: string,
    @Req() req: any,
  ): Promise<{ success: boolean }> {
    await this.adminNoticeService.dismissNotice(id, req.user);
    return { success: true };
  }
}

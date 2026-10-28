import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { AuditService } from "./audit.service";

@Controller("audit")
@UseGuards(JwtGuard, AdministratorGuard)
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get("recent")
  async recent(@Query("limit") limit?: string) {
    if (!this.audit.enabled) return { enabled: false };
    return {
      enabled: true,
      events: await this.audit.recent(limit ? parseInt(limit, 10) : 50),
    };
  }

  @Get("verify")
  async verify() {
    if (!this.audit.enabled) return { enabled: false };
    return { enabled: true, ...(await this.audit.verifyChain()) };
  }
}

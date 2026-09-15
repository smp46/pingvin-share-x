import { ExecutionContext, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import { Request } from "express";
import { ConfigService } from "src/config/config.service";
import { JwtGuard } from "../../auth/guard/jwt.guard";

@Injectable()
export class ReceivedSharesGuard extends JwtGuard {
  constructor(private configService: ConfigService) {
    super(configService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    // Run the JWTGuard to set the user
    await super.canActivate(context);
    const user = request.user as User;

    // If not signed in, deny access
    if (!user) return false;

    if (!this.configService.get("share.enableUserRecipients")) {
      return false;
    }

    return true;
  }
}

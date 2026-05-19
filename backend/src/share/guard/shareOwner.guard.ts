import {
  ExecutionContext,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { Request } from "express";
import { I18nService } from "nestjs-i18n";
import { ConfigService } from "src/config/config.service";
import { PrismaService } from "src/prisma/prisma.service";
import { JwtGuard } from "../../auth/guard/jwt.guard";

@Injectable()
export class ShareOwnerGuard extends JwtGuard {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {
    super(configService);
  }

  isBase64(toCheck: string) {
    const isBase64 = /^[a-zA-Z0-9-]*={0,2}$/.test(toCheck);
    return isBase64;
  }

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const shareId = Object.prototype.hasOwnProperty.call(
      request.params,
      "shareId",
    )
      ? request.params.shareId
      : request.params.id;

    if (!this.isBase64(shareId)) {
      throw new BadRequestException(this.i18n.t("file.invalidIdFormat"));
    }

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { security: true },
    });

    if (!share) throw new NotFoundException(this.i18n.t("share.notFound"));

    (request as any).share = share;

    // Run the JWTGuard to set the user
    await super.canActivate(context);
    const user = request.user as User;

    // If the user is the creator of the share, allow access
    if (user && share.creatorId == user.id) return true;

    // If the user is an admin, allow access
    if (this.allowAdmin && user?.isAdmin) return true;

    // If it's a anonymous share, allow access
    if (!share.creatorId) return true;

    // If not signed in, deny access
    if (!user) return false;

    return false;
  }

  protected get allowAdmin(): boolean {
    return true;
  }
}

import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Request } from "express";
import * as moment from "moment";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { ShareSecurityGuard } from "src/share/guard/shareSecurity.guard";
import { ShareService } from "src/share/share.service";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class FileSecurityGuard extends ShareSecurityGuard {
  constructor(
    private _shareService: ShareService,
    private _prisma: PrismaService,
    private _config: ConfigService,
    private readonly _i18n: I18nService,
  ) {
    super(_shareService, _prisma, _config, _i18n);
  }

  isBase64(toCheck: string) {
    const isBase64 = /^[a-zA-Z0-9_-]*={0,2}$/.test(toCheck);
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
      throw new BadRequestException(this._i18n.t("file.invalidIdFormat"));
    }

    const shareToken = request.cookies[`share_${shareId}_token`];

    const share = await this._prisma.share.findUnique({
      where: { id: shareId },
      include: {
        security: true,
        userRecipients: { select: { userId: true } },
        recipients: { select: { email: true } },
      },
    });

    // Blocked shares keep their files for investigation but are admin only,
    // whether the caller has a share token or not.
    if (share?.blockedAt) {
      const user = await this.authenticateUser(context);
      if (user?.isAdmin) return true;
      throw new NotFoundException(this._i18n.t("file.notFound"));
    }

    // If there is no share token the user requests a file directly
    if (!shareToken) {
      // If admin access is enabled and user is admin, allow access.
      // Uses authenticateUser (JwtGuard, never throws) instead of
      // super.canActivate (ShareSecurityGuard), which would unconditionally
      // demand a share token and 403 anonymous requests to public shares.
      if (this._config.get("share.allowAdminAccessAllShares")) {
        const user = await this.authenticateUser(context);
        if (user?.isAdmin) {
          return true;
        }
      }

      if (
        !share ||
        (moment().isAfter(share.expiration) &&
          !moment(share.expiration).isSame(0))
      ) {
        throw new NotFoundException(this._i18n.t("file.notFound"));
      }

      if (share.security?.restrictToRecipients) {
        const user = await this.authenticateUser(context);
        const isCreator = user && share.creatorId === user.id;
        const isRecipient = await this.isRecipient(share, user);

        if (!isCreator && !isRecipient) {
          throw new ForbiddenException(
            this._i18n.t("share.restrictedToRecipients"),
            "share_restricted_to_recipients",
          );
        }
      }

      if (share.security?.password)
        throw new ForbiddenException(this._i18n.t("file.passwordProtected"));

      if (share.security?.maxViews && share.security.maxViews <= share.views) {
        throw new ForbiddenException(
          this._i18n.t("share.maxViewsExceeded"),
          "share_max_views_exceeded",
        );
      }

      await this._shareService.increaseViewCount(share, request.ip);
      return true;
    } else {
      return super.canActivate(context);
    }
  }
}

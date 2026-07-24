import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import * as moment from "moment";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";
import { ShareService } from "src/share/share.service";
import { ConfigService } from "src/config/config.service";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { User } from "@prisma/client";

@Injectable()
export class ShareSecurityGuard extends JwtGuard {
  constructor(
    private shareService: ShareService,
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    super(configService);
  }

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();

    const shareId = Object.prototype.hasOwnProperty.call(
      request.params,
      "shareId",
    )
      ? request.params.shareId
      : request.params.id;

    const shareToken = request.cookies[`share_${shareId}_token`];

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: {
        security: true,
        reverseShare: true,
        userRecipients: { select: { userId: true } },
        recipients: { select: { email: true } },
      },
    });

    if (!share) throw new NotFoundException(this.i18n.t("share.notFound"));

    // Run the JWTGuard to set the user
    await super.canActivate(context);
    const user = request.user as User;

    // If admin access is enabled and user is admin, allow access
    if (
      user?.isAdmin &&
      this.configService.get("share.allowAdminAccessAllShares")
    ) {
      return true;
    }

    if (
      moment().isAfter(share.expiration) &&
      !moment(share.expiration).isSame(0)
    ) {
      throw new NotFoundException(this.i18n.t("share.notFound"));
    }

    // If user sharing is enabled, check if the authenticated user is a recipient
    if (this.configService.get("share.enableUserRecipients") && user) {
      // Already linked as a recipient of this share.
      const isLinked = share.userRecipients.some((r) => r.userId === user.id);
      if (isLinked) return true;

      // Otherwise, if the user's (account-verified) email matches one of the
      // share's recipients, grant access and link them so the share also shows
      // up on their "Received shares" page. This lets a recipient who signed up
      // after the share was created gain access — without the app ever
      // revealing whether a given email belongs to a registered account.
      const userEmail = user.email?.toLowerCase();
      const isEmailRecipient =
        !!userEmail &&
        share.recipients.some((r) => r.email.toLowerCase() === userEmail);
      if (isEmailRecipient) {
        await this.prisma.shareUserRecipient.upsert({
          where: { userId_shareId: { userId: user.id, shareId: share.id } },
          create: { userId: user.id, shareId: share.id },
          update: {},
        });
        return true;
      }
    }

    // If share is restricted to named recipients, block everyone else (excluding the creator)
    if (
      share.security?.restrictToRecipients &&
      (!user || share.creatorId !== user.id)
    ) {
      throw new ForbiddenException(
        "This share is restricted to specific recipients. Please log in to access it.",
        "share_restricted_to_recipients",
      );
    }

    if (share.security?.password && !shareToken)
      throw new ForbiddenException(
        this.i18n.t("file.passwordProtected"),
        "share_password_required",
      );

    if (!(await this.shareService.verifyShareToken(share, shareToken)))
      throw new ForbiddenException(
        this.i18n.t("share.tokenRequired"),
        "share_token_required",
      );

    // Only the creator and reverse share creator can access the reverse share if it's not public
    if (
      share.reverseShare &&
      !share.reverseShare.publicAccess &&
      share.creatorId !== user?.id &&
      share.reverseShare.creatorId !== user?.id
    )
      throw new ForbiddenException(
        this.i18n.t("share.privateShare"),
        "private_share",
      );

    return true;
  }
}

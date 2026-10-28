import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import * as moment from "moment";
import { I18nService } from "nestjs-i18n";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ShareTokenSecurity implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const shareId = Object.prototype.hasOwnProperty.call(
      request.params,
      "shareId",
    )
      ? request.params.shareId
      : request.params.id;

    const share = await this.prisma.share.findUnique({
      where: { id: shareId },
      include: { security: true },
    });

    if (!share)
      throw new NotFoundException(
        this.i18n.t("share.notFound"),
        "share_not_found",
      );
    if (share.removedReason)
      throw new NotFoundException(share.removedReason, "share_removed");
    if (
      moment().isAfter(share.expiration) &&
      !moment(share.expiration).isSame(0)
    )
      throw new NotFoundException(
        this.i18n.t("share.expired"),
        "share_expired",
      );

    return true;
  }
}

import { ExecutionContext, Injectable } from "@nestjs/common";
import { Share, User } from "@prisma/client";
import { Request } from "express";
import { ShareOwnerGuard } from "./shareOwner.guard";

@Injectable()
export class RevertShareCompletionGuard extends ShareOwnerGuard {
  async canActivate(context: ExecutionContext) {
    if (!(await super.canActivate(context))) return false;

    const request: Request = context.switchToHttp().getRequest();
    const share = (request as any).share as Share;
    const user = request.user as User;

    return share.creatorId ? share.creatorId === user?.id : true;
  }

  protected get allowAnonymous(): boolean {
    return false;
  }
}

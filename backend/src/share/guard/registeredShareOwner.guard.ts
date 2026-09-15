import { Injectable } from "@nestjs/common";
import { ShareOwnerGuard } from "./shareOwner.guard";

@Injectable()
export class RegisteredShareOwnerGuard extends ShareOwnerGuard {
  protected get allowAnonymous(): boolean {
    return false;
  }

  protected get allowAdmin(): boolean {
    return false;
  }
}

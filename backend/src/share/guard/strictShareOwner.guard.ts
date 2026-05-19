import { Injectable } from "@nestjs/common";
import { ShareOwnerGuard } from "./shareOwner.guard";

@Injectable()
export class StrictShareOwnerGuard extends ShareOwnerGuard {
  protected get allowAdmin(): boolean {
    return false;
  }
}

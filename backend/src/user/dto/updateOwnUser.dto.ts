import { PartialType, PickType } from "@nestjs/swagger";
import { UserDTO } from "./user.dto";

export class UpdateOwnUserDTO extends PartialType(
  PickType(UserDTO, ["fullname","username", "email"] as const),
) {}

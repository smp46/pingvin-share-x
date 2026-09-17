import { PickType } from "@nestjs/swagger";
import { UserDTO } from "./user.dto";

export class PublicUserDTO extends PickType(UserDTO, [
  "id",
  "username",
  "fullname",
  "shareSizeLimit",
] as const) {}

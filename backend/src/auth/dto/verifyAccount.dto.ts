import { IsString, IsNotEmpty } from "class-validator";

export class VerifyAccountDTO {
  @IsString()
  @IsNotEmpty()
  token: string;
}

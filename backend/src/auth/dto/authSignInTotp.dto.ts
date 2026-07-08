import { IsString } from "class-validator";

export class AuthSignInTotpDTO {
  @IsString()
  totp: string;

  @IsString()
  loginToken: string;
}

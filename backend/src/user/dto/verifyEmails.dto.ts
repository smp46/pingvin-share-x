import { IsEmail } from "class-validator";

export class VerifyEmailsDTO {
  @IsEmail({}, { each: true })
  emails: string[];
}
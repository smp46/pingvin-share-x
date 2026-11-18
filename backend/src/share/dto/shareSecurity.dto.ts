import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
} from "class-validator";

export class ShareSecurityDTO {
  @IsString()
  @IsOptional()
  @Length(3, 30)
  password: string;

  // PostgreSQL stores it as a 32-bit integer
  @IsInt()
  @Max(2147483647)
  @IsOptional()
  maxViews: number;

  @IsBoolean()
  @IsOptional()
  restrictToRecipients: boolean;
}

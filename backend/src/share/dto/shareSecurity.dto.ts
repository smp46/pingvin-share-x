import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MinLength,
} from "class-validator";

export class ShareSecurityDTO {
  @IsString()
  @IsOptional()
  @MinLength(3)
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

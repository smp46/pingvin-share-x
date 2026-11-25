import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class ShareSecurityDTO {
  @IsString()
  @IsOptional()
  @MinLength(3)
  password: string;

  @IsNumber()
  @IsOptional()
  maxViews: number;

  @IsBoolean()
  @IsOptional()
  restrictToRecipients: boolean;
}

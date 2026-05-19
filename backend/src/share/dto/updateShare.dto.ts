import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class UpdateShareSecurityDTO {
  @IsString()
  @IsOptional()
  @Length(3, 30)
  password?: string;

  @IsBoolean()
  @IsOptional()
  removePassword?: boolean;

  @IsNumber()
  @IsOptional()
  maxViews?: number | null;
}

export class UpdateShareDTO {
  @Length(3, 30)
  @IsOptional()
  name?: string | null;

  @IsString()
  @IsOptional()
  expiration?: string;

  @MaxLength(512)
  @IsOptional()
  description?: string | null;

  @ValidateNested()
  @Type(() => UpdateShareSecurityDTO)
  @IsOptional()
  security?: UpdateShareSecurityDTO;
}

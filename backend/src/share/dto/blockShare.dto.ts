import { IsOptional, IsString, MaxLength } from "class-validator";

export class BlockShareDTO {
  @IsString()
  @IsOptional()
  @MaxLength(512)
  reason?: string;
}

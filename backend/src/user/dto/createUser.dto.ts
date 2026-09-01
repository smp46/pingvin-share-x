import { plainToClass } from "class-transformer";
import { Allow, IsOptional, MinLength } from "class-validator";
import { UserDTO } from "./user.dto";

export class CreateUserDTO extends UserDTO {
  @Allow()
  isAdmin: boolean;

  @Allow()
  @IsOptional()
  isActivated: boolean;

  @MinLength(8)
  @IsOptional()
  password: string;

  @Allow()
  @IsOptional()
  allowShare: boolean;

  @Allow()
  @IsOptional()
  allowCreateReverseShares: boolean;

  @Allow()
  @IsOptional()
  maxShares?: number;

  @Allow()
  @IsOptional()
  maxReverseShares?: number;

  from(partial: Partial<CreateUserDTO>) {
    return plainToClass(CreateUserDTO, partial, {
      excludeExtraneousValues: true,
    });
  }
}

import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class MoveShareDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  destination: string;
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class IdValidation implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    let id: string;
    try {
      id =
        request.params?.id ||
        request.query?.id ||
        request.body?.id ||
        request.params?.shareId;
    } catch {
      throw new BadRequestException("Invalid ID format");
    }

    if (!id) {
      return true;
    }

    // Regular expression to check for Base64
    const isBase64 = /^[a-zA-Z0-9-]*={0,2}$/.test(id);

    if (!isBase64) {
      throw new BadRequestException("Invalid ID format");
    }

    return true;
  }
}

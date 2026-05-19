import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { I18nService } from "nestjs-i18n";

@Injectable()
export class IdValidation implements CanActivate {
  constructor(private readonly i18n: I18nService) {}

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
      throw new BadRequestException(this.i18n.t("file.invalidIdFormat"));
    }

    if (!id) {
      return true;
    }

    // Regular expression to check for Base64
    const isBase64 = /^[a-zA-Z0-9-]*={0,2}$/.test(id);

    if (!isBase64) {
      throw new BadRequestException(this.i18n.t("file.invalidIdFormat"));
    }

    return true;
  }
}

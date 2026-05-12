import { Injectable } from "@nestjs/common";
import { I18nResolver } from "nestjs-i18n";
import { ConfigService } from "../config/config.service";

@Injectable()
export class SystemLanguageResolver implements I18nResolver {
  constructor(private readonly configService: ConfigService) {}

  resolve(): string | undefined {
    return this.configService.get("general.defaultLanguage");
  }
}

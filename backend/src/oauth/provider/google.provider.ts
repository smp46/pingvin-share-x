import { GenericOidcProvider } from "./genericOidc.provider";
import { ConfigService } from "../../config/config.service";
import { JwtService } from "@nestjs/jwt";
import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { I18nService } from "nestjs-i18n";

@Injectable()
export class GoogleProvider extends GenericOidcProvider {
  constructor(
    config: ConfigService,
    jwtService: JwtService,
    @Inject(CACHE_MANAGER) cache: Cache,
    i18n: I18nService,
  ) {
    super("google", ["oauth.google-enabled"], config, jwtService, cache, i18n);
  }

  protected getDiscoveryUri(): string {
    return "https://accounts.google.com/.well-known/openid-configuration";
  }

  protected getExpectedIssuer(): string[] {
    return ["https://accounts.google.com", "accounts.google.com"];
  }
}

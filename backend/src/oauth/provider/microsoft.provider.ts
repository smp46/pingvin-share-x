import {
  GenericOidcProvider,
  OidcConfiguration,
  OidcIdToken,
} from "./genericOidc.provider";
import { ConfigService } from "../../config/config.service";
import { JwtService } from "@nestjs/jwt";
import { Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { I18nService } from "nestjs-i18n";

@Injectable()
export class MicrosoftProvider extends GenericOidcProvider {
  constructor(
    config: ConfigService,
    jwtService: JwtService,
    @Inject(CACHE_MANAGER) cache: Cache,
    i18n: I18nService,
  ) {
    super(
      "microsoft",
      ["oauth.microsoft-enabled", "oauth.microsoft-tenant"],
      config,
      jwtService,
      cache,
      i18n,
    );
  }

  protected getDiscoveryUri(): string {
    return `https://login.microsoftonline.com/${this.config.get(
      "oauth.microsoft-tenant",
    )}/v2.0/.well-known/openid-configuration`;
  }

  protected getExpectedIssuer(
    configuration: OidcConfiguration,
    idToken: OidcIdToken & { tid?: string },
  ): string {
    return configuration.issuer.replace("{tenantid}", idToken.tid);
  }
}

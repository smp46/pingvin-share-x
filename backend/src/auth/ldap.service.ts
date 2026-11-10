import { Inject, Injectable, Logger } from "@nestjs/common";
import { inspect } from "node:util";
import { ConfigService } from "../config/config.service";
import { Client, Entry, InvalidCredentialsError } from "ldapts";
import { I18nService } from "nestjs-i18n";

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);
  constructor(
    @Inject(ConfigService)
    private readonly serviceConfig: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  private async createLdapConnection(): Promise<Client> {
    const ldapUrl = this.serviceConfig.get("ldap.url");
    if (!ldapUrl) {
      throw new Error(this.i18n.t("ldap.urlNotDefined"));
    }

    const ldapClient = new Client({
      url: ldapUrl,
      timeout: 15_000,
      connectTimeout: 15_000,
    });

    const bindDn = this.serviceConfig.get("ldap.bindDn") || null;
    if (bindDn) {
      try {
        await ldapClient.bind(
          bindDn,
          this.serviceConfig.get("ldap.bindPassword"),
        );
      } catch (error) {
        this.logger.warn(
          this.i18n.t("ldap.defaultUserBindFailed", {
            args: { error: String(error) },
          }),
        );
        throw new Error(this.i18n.t("ldap.bindFailed"));
      }
    }

    return ldapClient;
  }

  public async authenticateUser(
    username: string,
    password: string,
  ): Promise<Entry | null> {
    if (typeof password !== "string" || password.length === 0) {
      this.logger.verbose(
        this.i18n.t("ldap.emptyPassword", { args: { username } }),
      );
      return null;
    }

    if (!username.match(/^[a-zA-Z0-9-_.@]+$/)) {
      this.logger.verbose(
        this.i18n.t("ldap.invalidUsernamePattern", { args: { username } }),
      );
      return null;
    }

    const searchBase = this.serviceConfig.get("ldap.searchBase");
    const searchQuery = this.serviceConfig
      .get("ldap.searchQuery")
      .replaceAll("%username%", username);

    const ldapClient = await this.createLdapConnection();
    try {
      const { searchEntries } = await ldapClient.search(searchBase, {
        filter: searchQuery,
        scope: "sub",

        attributes: ["*"],
        returnAttributeValues: true,
      });

      if (searchEntries.length > 1) {
        /* too many users found */
        this.logger.verbose(
          this.i18n.t("ldap.tooManyUsersFound", {
            args: { username, searchQuery },
          }),
        );
        return null;
      } else if (searchEntries.length == 0) {
        /* user not found */
        this.logger.verbose(
          this.i18n.t("ldap.noUserFound", {
            args: { username, searchQuery },
          }),
        );
        return null;
      }

      const targetEntity = searchEntries[0];
      this.logger.verbose(
        this.i18n.t("ldap.tryingToAuthenticate", {
          args: { username, dn: targetEntity.dn },
        }),
      );
      try {
        await ldapClient.bind(targetEntity.dn, password);
        return targetEntity;
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          this.logger.verbose(
            this.i18n.t("ldap.invalidCredentials", {
              args: { username, dn: targetEntity.dn },
            }),
          );
          return null;
        }

        this.logger.warn(
          this.i18n.t("ldap.userBindFailure", {
            args: { error: inspect(error) },
          }),
        );
        return null;
      }
    } catch (error) {
      this.logger.warn(
        this.i18n.t("ldap.connectError", {
          args: { error: inspect(error) },
        }),
      );
      return null;
    }
  }
}

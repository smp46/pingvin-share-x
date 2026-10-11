import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { Request, Response } from "express";
import { nanoid } from "nanoid";
import { AuthService } from "../auth/auth.service";
import { GetUser } from "../auth/decorator/getUser.decorator";
import { JwtGuard } from "../auth/guard/jwt.guard";
import { ConfigService } from "../config/config.service";
import { OAuthCallbackDto } from "./dto/oauthCallback.dto";
import { ErrorPageExceptionFilter } from "./filter/errorPageException.filter";
import { OAuthGuard } from "./guard/oauth.guard";
import { ProviderGuard } from "./guard/provider.guard";
import { OAuthService } from "./oauth.service";
import { OAuthProvider } from "./provider/oauthProvider.interface";
import { OAuthExceptionFilter } from "./filter/oauthException.filter";

@Controller("oauth")
export class OAuthController {
  constructor(
    private authService: AuthService,
    private oauthService: OAuthService,
    private config: ConfigService,
    @Inject("OAUTH_PROVIDERS")
    private providers: Record<string, OAuthProvider<unknown>>,
  ) {}

  @Get("available")
  available() {
    return this.oauthService.available();
  }

  private getOAuthOrigin(request: Request): string {
    const appUrl = this.config.get("general.appUrl");
    const host = request.get("host");
    if (!host) return appUrl;

    const allowedHosts: string = this.config.get("oauth.allowedHosts") || "";
    const allowed = [
      new URL(appUrl).host.toLowerCase(),
      ...allowedHosts.toLowerCase().split(",").map((h) => h.trim()).filter(Boolean),
    ];

    return allowed.includes(host.toLowerCase()) ? `${request.protocol}://${host}` : appUrl;
  }

  @Get("status")
  @UseGuards(JwtGuard)
  async status(@GetUser() user: User) {
    return this.oauthService.status(user);
  }

  @Get("auth/:provider")
  @UseGuards(ProviderGuard)
  @UseFilters(ErrorPageExceptionFilter)
  async auth(
    @Param("provider") provider: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const state = nanoid(16);
    const redirectUri = `${this.getOAuthOrigin(request)}/api/oauth/callback/${provider}`;
    const url = await this.providers[provider].getAuthEndpoint(state, redirectUri);

    const isSecure = this.config.get("security.secureCookies");
    response.cookie(`oauth_${provider}_state`, state, {
      sameSite: "lax",
      secure: isSecure,
      httpOnly: true,
    });

    response.redirect(url);
  }

  @Get("callback/:provider")
  @UseGuards(ProviderGuard, OAuthGuard)
  @UseFilters(ErrorPageExceptionFilter, OAuthExceptionFilter)
  async callback(
    @Param("provider") provider: string,
    @Query() query: OAuthCallbackDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const redirectUri = `${this.getOAuthOrigin(request)}/api/oauth/callback/${provider}`;
    const oauthToken = await this.providers[provider].getToken(query, redirectUri);
    const user = await this.providers[provider].getUserInfo(oauthToken, query);
    const id = await this.authService.getIdOfCurrentUser(request);

    response.cookie(`oauth_${provider}_state`, "", {
      maxAge: -1,
      sameSite: "lax",
      httpOnly: true,
      secure: this.config.get("security.secureCookies"),
    });

    if (id) {
      await this.oauthService.link(
        id,
        provider,
        user.providerId,
        user.providerUsername,
      );
      response.redirect("/account");
    } else {
      const token: {
        accessToken?: string;
        refreshToken?: string;
        loginToken?: string;
      } = await this.oauthService.signIn(user, request.ip);
      if (token.accessToken) {
        this.authService.addTokensToResponse(
          response,
          token.refreshToken,
          token.accessToken,
        );
        response.redirect("/");
      } else {
        response.redirect(`/auth/totp/${token.loginToken}`);
      }
    }
  }

  @Post("unlink/:provider")
  @UseGuards(JwtGuard, ProviderGuard)
  @UseFilters(ErrorPageExceptionFilter)
  unlink(@GetUser() user: User, @Param("provider") provider: string) {
    return this.oauthService.unlink(user, provider);
  }
}

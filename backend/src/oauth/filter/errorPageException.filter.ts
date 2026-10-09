import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { ConfigService } from "../../config/config.service";
import { ErrorPageException } from "../exceptions/errorPage.exception";

@Catch(ErrorPageException)
export class ErrorPageExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorPageExceptionFilter.name);

  constructor(private config: ConfigService) {}

  catch(exception: ErrorPageException, host: ArgumentsHost) {
    this.logger.error(
      JSON.stringify({
        error: exception.key,
        params: exception.params,
        redirect: exception.redirect,
      }),
    );

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const redirect =
      exception.redirect ||
      (ctx.getRequest().cookies.access_token ? "/account" : "/auth/signIn");
    const params = new URLSearchParams({
      error: exception.key,
      redirect,
    });
    if (exception.params) {
      params.set("params", exception.params.join(","));
    }

    response.redirect(`/error?${params.toString()}`);
  }
}

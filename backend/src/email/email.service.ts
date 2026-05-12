import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { User } from "@prisma/client";
import * as moment from "moment";
import * as nodemailer from "nodemailer";
import { I18nService } from "nestjs-i18n";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class EmailService {
  constructor(
    private config: ConfigService,
    private readonly i18n: I18nService,
  ) {}
  private readonly logger = new Logger(EmailService.name);

  getTransporter() {
    if (!this.config.get("smtp.enabled"))
      throw new InternalServerErrorException(this.i18n.t("email.smtpDisabled"));

    const username = this.config.get("smtp.username");
    const password = this.config.get("smtp.password");

    return nodemailer.createTransport({
      host: this.config.get("smtp.host"),
      port: this.config.get("smtp.port"),
      secure: this.config.get("smtp.port") == 465,
      auth:
        username || password ? { user: username, pass: password } : undefined,
      tls: {
        rejectUnauthorized: !this.config.get(
          "smtp.allowUnauthorizedCertificates",
        ),
      },
    });
  }

  private async sendMail(email: string, subject: string, text: string) {
    await this.getTransporter()
      .sendMail({
        from: `"${this.config.get("general.appName")}" <${this.config.get(
          "smtp.email",
        )}>`,
        to: email,
        subject,
        text,
      })
      .catch((e) => {
        this.logger.error(e);
        throw new InternalServerErrorException(this.i18n.t("email.sendFailed"));
      });
  }

  async sendMailToShareRecipients(
    recipientEmail: string,
    shareId: string,
    creator?: User,
    description?: string,
    expiration?: Date,
  ) {
    if (!this.config.get("email.enableShareEmailRecipients"))
      throw new InternalServerErrorException(
        this.i18n.t("email.emailServiceDisabled"),
      );

    const shareUrl = `${this.config.get("general.appUrl")}/s/${shareId}`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.shareRecipientsSubject"),
      this.config
        .get("email.shareRecipientsMessage")
        .replaceAll("\\n", "\n")
        .replaceAll(
          "{creator}",
          creator?.username ??
            this.i18n.t("email.shareRecipientsCreatorFallback"),
        )
        .replaceAll("{creatorEmail}", creator?.email ?? "")
        .replaceAll("{shareUrl}", shareUrl)
        .replaceAll(
          "{desc}",
          description ?? this.i18n.t("email.shareRecipientsDescFallback"),
        )
        .replaceAll(
          "{expires}",
          moment(expiration).unix() != 0
            ? moment(expiration).fromNow()
            : this.i18n.t("email.shareRecipientsExpiresNeverFallback"),
        ),
    );
  }

  async sendMailToReverseShareCreator(recipientEmail: string, shareId: string) {
    const shareUrl = `${this.config.get("general.appUrl")}/s/${shareId}`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.reverseShareSubject"),
      this.config
        .get("email.reverseShareMessage")
        .replaceAll("\\n", "\n")
        .replaceAll("{shareUrl}", shareUrl),
    );
  }

  async sendResetPasswordEmail(recipientEmail: string, token: string) {
    const resetPasswordUrl = `${this.config.get(
      "general.appUrl",
    )}/auth/resetPassword/${token}`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.resetPasswordSubject"),
      this.config
        .get("email.resetPasswordMessage")
        .replaceAll("\\n", "\n")
        .replaceAll("{url}", resetPasswordUrl),
    );
  }

  async sendInviteEmail(recipientEmail: string, password: string) {
    const loginUrl = `${this.config.get("general.appUrl")}/auth/signIn`;

    await this.sendMail(
      recipientEmail,
      this.config.get("email.inviteSubject"),
      this.config
        .get("email.inviteMessage")
        .replaceAll("{url}", loginUrl)
        .replaceAll("{password}", password)
        .replaceAll("{email}", recipientEmail),
    );
  }

  async sendTestMail(recipientEmail: string) {
    await this.getTransporter()
      .sendMail({
        from: `"${this.config.get("general.appName")}" <${this.config.get(
          "smtp.email",
        )}>`,
        to: recipientEmail,
        subject: this.i18n.t("email.testSubject"),
        text: this.i18n.t("email.testText"),
      })
      .catch((e) => {
        this.logger.error(e);
        throw new InternalServerErrorException(e.message);
      });
  }
}

import { Module } from "@nestjs/common";

import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module";

import { join } from "path";
import { I18nModule } from "nestjs-i18n";

import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AppCacheModule } from "./cache/cache.module";
import { AppController } from "./app.controller";
import { ClamScanModule } from "./clamscan/clamscan.module";
import { ConfigModule } from "./config/config.module";
import { EmailModule } from "./email/email.module";
import { FileModule } from "./file/file.module";
import { JobsModule } from "./jobs/jobs.module";
import { OAuthModule } from "./oauth/oauth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReverseShareModule } from "./reverseShare/reverseShare.module";
import { ShareModule } from "./share/share.module";
import { UserModule } from "./user/user.module";
import { SystemModule } from "./system/system.module";

import { SystemLanguageResolver } from "./i18n/systemLanguage.resolver";

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    ShareModule,
    FileModule,
    EmailModule,
    PrismaModule,
    JobsModule,
    UserModule,
    SystemModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    ClamScanModule,
    ReverseShareModule,
    OAuthModule,
    AppCacheModule,
    I18nModule.forRoot({
      fallbackLanguage: "en-US",
      loaderOptions: {
        path: join(__dirname, "i18n"),
        watch: true,
      },
      resolvers: [SystemLanguageResolver],
    }),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    SystemLanguageResolver,
  ],
})
export class AppModule {}

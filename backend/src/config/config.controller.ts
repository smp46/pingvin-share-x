import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  GatewayTimeoutException,
  InternalServerErrorException,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipThrottle } from "@nestjs/throttler";
import { createKeyv } from "@keyv/redis";
import { AdministratorGuard } from "src/auth/guard/isAdmin.guard";
import { JwtGuard } from "src/auth/guard/jwt.guard";
import { EmailService } from "src/email/email.service";
import { ConfigService } from "./config.service";
import { AdminConfigDTO } from "./dto/adminConfig.dto";
import { ConfigDTO } from "./dto/config.dto";
import { TestEmailDTO } from "./dto/testEmail.dto";
import UpdateConfigDTO from "./dto/updateConfig.dto";
import { LogoService } from "./logo.service";

@Controller("configs")
export class ConfigController {
  constructor(
    private configService: ConfigService,
    private logoService: LogoService,
    private emailService: EmailService,
  ) {}

  @Get()
  @SkipThrottle()
  async list() {
    return new ConfigDTO().fromList(await this.configService.list());
  }

  @Get("admin/:category")
  @UseGuards(JwtGuard, AdministratorGuard)
  async getByCategory(@Param("category") category: string) {
    return new AdminConfigDTO().fromList(
      await this.configService.getByCategory(category),
    );
  }

  @Patch("admin")
  @UseGuards(JwtGuard, AdministratorGuard)
  async updateMany(@Body() data: UpdateConfigDTO[]) {
    return new AdminConfigDTO().fromList(
      await this.configService.updateMany(data),
    );
  }

  @Post("admin/testEmail")
  @UseGuards(JwtGuard, AdministratorGuard)
  async testEmail(@Body() { email }: TestEmailDTO) {
    await this.emailService.sendTestMail(email);
  }

  @Post("admin/testRedis")
  @UseGuards(JwtGuard, AdministratorGuard)
  async testRedis() {
    const redisUrl = this.configService.get("cache.redis-url");
    const enabled = this.configService.get("cache.redis-enabled");

    if (!redisUrl) {
      throw new InternalServerErrorException("Redis URL is not set");
    }

    const withTimeout = async <T>(
      promise: Promise<T>,
      timeoutMs: number,
    ): Promise<T> => {
      let timeout: NodeJS.Timeout | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => {
            timeout = setTimeout(
              () => reject(new GatewayTimeoutException("Redis timed out")),
              timeoutMs,
            );
          }),
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };

    const keyv = createKeyv(
      {
        url: redisUrl,
        socket: {
          connectTimeout: 3000,
          reconnectStrategy: () => new Error("Redis connection failed"),
        },
      } as any,
      { namespace: "pingvin" },
    );
    const testKey = `connection-test:${Date.now()}`;

    try {
      await withTimeout(keyv.set(testKey, "ok", 5000), 5000);
      const value = await withTimeout(keyv.get(testKey), 5000);
      if (value !== "ok") {
        throw new Error("Unexpected response from Redis");
      }

      return { ok: true, enabled };
    } catch (e: any) {
      if (e instanceof GatewayTimeoutException) throw e;
      const message =
        typeof e?.message === "string"
          ? `${e?.name ? `${e.name}: ` : ""}${e.message}`
          : "Redis error";
      throw new InternalServerErrorException(message);
    } finally {
      const store: any = (keyv as any).store;
      try {
        await store?.client?.quit?.();
      } catch {
        // ignore cleanup errors
      }
    }
  }

  @Post("admin/logo")
  @UseInterceptors(FileInterceptor("file"))
  @UseGuards(JwtGuard, AdministratorGuard)
  async uploadLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: "image/png" })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.logoService.create(file.buffer);
  }

  @Post("admin/logoDark")
  @UseInterceptors(FileInterceptor("file"))
  @UseGuards(JwtGuard, AdministratorGuard)
  async uploadDarkLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: "image/png" })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.logoService.createDark(file.buffer);
  }
}

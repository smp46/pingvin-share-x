import {
  ClassSerializerInterceptor,
  Logger,
  LogLevel,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as fs from "fs";
import { AppModule } from "./app.module";
import { ConfigService } from "./config/config.service";
import {
  DATA_DIRECTORY,
  LOG_LEVEL_AVAILABLE,
  LOG_LEVEL_DEFAULT,
  LOG_LEVEL_ENV,
} from "./constants";

function isValidLogLevel(level: string): level is LogLevel {
  return LOG_LEVEL_AVAILABLE.includes(level as LogLevel);
}

function generateNestJsLogLevels(): LogLevel[] {
  if (LOG_LEVEL_ENV) {
    if (!isValidLogLevel(LOG_LEVEL_ENV)) {
      throw new Error(`log level ${LOG_LEVEL_ENV} unknown`);
    }

    const levelIndex = LOG_LEVEL_AVAILABLE.indexOf(LOG_LEVEL_ENV);
    return LOG_LEVEL_AVAILABLE.slice(levelIndex);
  } else {
    const levelIndex = LOG_LEVEL_AVAILABLE.indexOf(LOG_LEVEL_DEFAULT);
    return LOG_LEVEL_AVAILABLE.slice(levelIndex);
  }
}

async function bootstrap() {
  const logLevels = generateNestJsLogLevels();
  Logger.log(`Showing ${logLevels.join(", ")} messages`);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: logLevels,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = app.get<ConfigService>(ConfigService);

  // Initialize body parser middleware once with chunk size from config
  const chunkSize = config.get("share.chunkSize");
  app.use(
    bodyParser.raw({
      type: "application/octet-stream",
      limit: `${chunkSize}B`,
    }),
  );

  app.use(cookieParser());
  app.set("trust proxy", true);

  // Create upload directory with error handling
  try {
    await fs.promises.mkdir(`${DATA_DIRECTORY}/uploads/_temp`, {
      recursive: true,
    });
  } catch (error) {
    Logger.error(
      `Failed to create upload directory: ${DATA_DIRECTORY}/uploads/_temp`,
      error,
    );
    throw error;
  }

  app.setGlobalPrefix("api");

  // Setup Swagger in development mode
  if (process.env.NODE_ENV === "development") {
    const config = new DocumentBuilder()
      .setTitle("Pingvin Share API")
      .setVersion("1.0")
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/swagger", app, document);
  }

  const portString = process.env.BACKEND_PORT || process.env.PORT || "8080";
  const port = parseInt(portString, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid port number: ${portString}. Port must be between 1 and 65535.`,
    );
  }

  try {
    await app.listen(port);
    Logger.log(`Application is running on port ${port}`);
  } catch (error) {
    Logger.error(`Failed to start server on port ${port}`, error);
    throw error;
  }

  const logger = new Logger("UnhandledAsyncError");
  process.on("unhandledRejection", (e) => {
    logger.error("Unhandled promise rejection, shutting down gracefully", e);
    process.exit(1);
  });
}
bootstrap();

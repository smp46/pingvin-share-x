import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { DATABASE_URL } from "../constants";
import { toAdapterUrl } from "./sqliteUrl";

@Injectable()
export class PrismaService extends PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Prisma 7 no longer takes a datasource url, the connection comes from a
    // driver adapter instead
    super({
      adapter: new PrismaBetterSqlite3({ url: toAdapterUrl(DATABASE_URL) }),
    });
    super.$connect().then(() => this.logger.log("Connected to the database"));
  }
}

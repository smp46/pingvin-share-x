import { Injectable, Logger } from "@nestjs/common";
import * as sqliteClient from "@prisma/client";
import { DATABASE_URL } from "../constants";

// The PostgreSQL client is generated from prisma/postgresql/schema.prisma.
// Both schemas define the same models, so the SQLite client types apply to it.
const prismaClient: typeof sqliteClient = /^postgres(ql)?:\/\//.test(
  DATABASE_URL,
)
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require(".prisma/client-postgresql")
  : sqliteClient;

// Each generated client has its own error classes, use this one for instanceof checks
export const PrismaClientKnownRequestError =
  prismaClient.Prisma.PrismaClientKnownRequestError;

@Injectable()
export class PrismaService extends prismaClient.PrismaClient {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: DATABASE_URL,
        },
      },
    });
    super.$connect().then(() => this.logger.log("Connected to the database"));
  }
}

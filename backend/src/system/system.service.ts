import { Injectable, Logger } from "@nestjs/common";
import checkDiskSpace from "check-disk-space";
import { DATA_DIRECTORY } from "src/constants";
import { SystemInfoDTO } from "./dto/systemInfo.dto";
import { ConfigService } from "src/config/config.service";
import * as path from "path";

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(private configService: ConfigService) {}

  async getSystemInfo(): Promise<SystemInfoDTO | null> {
    if (this.configService.get("s3.enabled")) {
      return null;
    }

    const resolvedPath = path.resolve(DATA_DIRECTORY);

    try {
      const diskSpace = await checkDiskSpace(resolvedPath);
      return {
        used: diskSpace.size - diskSpace.free,
        total: diskSpace.size,
      };
    } catch (e) {
      this.logger.warn(
        `Failed to check disk space for ${resolvedPath}, falling back to root: ${e.message}`,
      );
      try {
        const diskSpace = await checkDiskSpace("/");
        return {
          used: diskSpace.size - diskSpace.free,
          total: diskSpace.size,
        };
      } catch (err) {
        this.logger.error(
          `Failed to check disk space even for root: ${err.message}`,
        );
        return null;
      }
    }
  }
}

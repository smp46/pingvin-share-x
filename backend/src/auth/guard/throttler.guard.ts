import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { RATE_LIMIT_DISABLED } from "src/constants";

// The stock guard with an escape hatch for the integration suite, which
// creates several accounts per run and would otherwise sit out the 5 minute
// auth window. main.ts shouts about it on boot so it cannot be left on by
// accident.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(): Promise<boolean> {
    return RATE_LIMIT_DISABLED;
  }
}

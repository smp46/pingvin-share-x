import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Share, ShareSecurity } from "@prisma/client";

export const GetShare = createParamDecorator(
  (
    _data: unknown,
    ctx: ExecutionContext,
  ): (Share & { security?: ShareSecurity }) | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.share;
  },
);

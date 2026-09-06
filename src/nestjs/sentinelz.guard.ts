import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SentinelzService } from './sentinelz.service';
import { ABILITY_METADATA_KEY, AbilityMetadata } from './decorators';

interface RequestWithUser {
  user?: { id: string };
}

@Injectable()
export class SentinelzGuard implements CanActivate {
  constructor(
    private readonly sentinelzService: SentinelzService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ability = this.reflector.get<AbilityMetadata | undefined>(
      ABILITY_METADATA_KEY,
      context.getHandler(),
    );
    if (!ability) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    const hasPermission = await this.sentinelzService.enforce(user.id, ability.resource, ability.action);
    if (!hasPermission) {
      throw new ForbiddenException(`User ${user.id} cannot ${ability.action} on ${ability.resource}`);
    }
    return true;
  }
}

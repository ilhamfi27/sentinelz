import { SetMetadata } from '@nestjs/common';

export const ABILITY_METADATA_KEY = 'sentinelz:ability';
export const RESOURCE_METADATA_KEY = 'sentinelz:resource';
export const ACTION_METADATA_KEY = 'sentinelz:action';

export interface AbilityMetadata {
  action: string;
  resource: string;
}

export function CheckAbility(config: AbilityMetadata): MethodDecorator & ClassDecorator {
  return SetMetadata(ABILITY_METADATA_KEY, config);
}

export function Resource(resource: string): MethodDecorator & ClassDecorator {
  return SetMetadata(RESOURCE_METADATA_KEY, resource);
}

export function Action(action: string): MethodDecorator & ClassDecorator {
  return SetMetadata(ACTION_METADATA_KEY, action);
}

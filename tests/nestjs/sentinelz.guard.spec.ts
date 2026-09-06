import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SentinelzGuard } from '../../src/nestjs/sentinelz.guard';
import { SentinelzService } from '../../src/nestjs/sentinelz.service';

function createContext(user?: { id: string }): ExecutionContext {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function createReflector(returnValue: unknown): Reflector {
  return { get: jest.fn().mockReturnValue(returnValue) } as unknown as Reflector;
}

function createService(enforceResult?: boolean): SentinelzService {
  return { enforce: jest.fn().mockResolvedValue(enforceResult) } as unknown as SentinelzService;
}

describe('SentinelzGuard', () => {
  it('allows when no @CheckAbility metadata is set', async () => {
    const reflector = createReflector(undefined);
    const service = createService();
    const guard = new SentinelzGuard(service, reflector);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(service.enforce).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when there is no authenticated user', async () => {
    const reflector = createReflector({ action: 'write', resource: 'articles' });
    const service = createService();
    const guard = new SentinelzGuard(service, reflector);

    await expect(guard.canActivate(createContext(undefined))).rejects.toThrow(ForbiddenException);
  });

  it('allows when enforce() returns true', async () => {
    const reflector = createReflector({ action: 'write', resource: 'articles' });
    const service = createService(true);
    const guard = new SentinelzGuard(service, reflector);

    await expect(guard.canActivate(createContext({ id: 'alice' }))).resolves.toBe(true);
    expect(service.enforce).toHaveBeenCalledWith('alice', 'articles', 'write');
  });

  it('throws ForbiddenException when enforce() returns false', async () => {
    const reflector = createReflector({ action: 'write', resource: 'articles' });
    const service = createService(false);
    const guard = new SentinelzGuard(service, reflector);

    await expect(guard.canActivate(createContext({ id: 'bob' }))).rejects.toThrow(ForbiddenException);
  });
});

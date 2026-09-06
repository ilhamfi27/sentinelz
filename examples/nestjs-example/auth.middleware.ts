import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

/** Stand-in for real auth: trusts an `x-user-id` header so the example is self-contained. */
@Injectable()
export class FakeAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const userId = req.header('x-user-id');
    if (userId) {
      (req as Request & { user?: { id: string } }).user = { id: userId };
    }
    next();
  }
}

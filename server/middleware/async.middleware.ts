import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Express 4 does not forward rejected handler promises on its own. */
export function asyncHandler<R extends Request = Request>(
  handler: (req: R, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve().then(() => handler(req as R, res, next)).catch(next);
  };
}

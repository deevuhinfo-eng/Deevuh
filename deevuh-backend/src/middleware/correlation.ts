import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface CorrelatedRequest extends Request {
  requestId?: string;
  user?: { id: string; role: string; email: string };
}

export const correlationMiddleware = (req: CorrelatedRequest, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Expose on res.locals so that structured loggers or controllers can extract it
  res.locals.requestId = requestId;
  next();
};

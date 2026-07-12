import { Request, Response, NextFunction } from 'express';

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (limit: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown-ip';
    const now = Date.now();
    
    const record = ipRequestCounts.get(ip);
    
    if (!record) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    record.count += 1;
    if (record.count > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later.'
      });
    }
    
    next();
  };
};

import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error Interceptor]:', err);

  if (err.code === 'P2002') {
    const fields = err.meta?.target || [];
    return res.status(400).json({
      success: false,
      message: `Unique constraint check failed. Record with value already exists. Fields: ${fields.join(', ')}`
    });
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key lookup constraint failed. Checked associated IDs do not exist.'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message
  });
};

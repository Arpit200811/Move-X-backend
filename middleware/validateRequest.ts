import { Request, Response, NextFunction } from 'express';
import { ZodSchema, z } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const zodError = error as any;
        const message = zodError.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        return res.status(400).json({
          success: false,
          message: message,
          errors: zodError.errors
        });
      }
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };
};

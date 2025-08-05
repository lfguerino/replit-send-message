import { Request, Response, NextFunction } from "express";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    email?: string;
    isActive: boolean;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  
  next();
}

export function attachUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    // User will be attached by the route handler if needed
    req.user = { id: req.session.userId } as any;
  }
  
  next();
}
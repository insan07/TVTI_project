import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
       res.status(401).json({ message: 'Not authorized' });
       return;
    }
    if (!roles.includes(req.user.role)) {
       res.status(403).json({ message: 'Access denied: insufficient permissions' });
       return;
    }
    next();
  };
};

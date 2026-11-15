import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { getJwtSecret } from '../config/auth';

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token;

  if (req.headers.authorization && /^Bearer \S+$/i.test(req.headers.authorization)) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as any;
      if (typeof decoded !== 'object' || typeof decoded.id !== 'string' || !/^[a-f\d]{24}$/i.test(decoded.id)) {
        res.status(401).json({ message: 'Not authorized, invalid token' });
        return;
      }

      req.user = await User.findById(decoded.id).select('-password_hash');

      if (!req.user) {
        res.status(401).json({ message: 'Not authorized, user not found' });
        return;
      }
      if ((decoded.ver || 0) !== (req.user.session_version || 0)) {
        res.status(401).json({ message: 'Your password changed. Please log in again.' });
        return;
      }
      // Recheck account state on every request, including tokens issued before deactivation.
      if (!req.user.is_active) {
        res.status(401).json({ message: 'Your account is inactive. Please contact the TVTI administration.' });
        return;
      }

      // Enforce route-level blocking if must_change_password is true
      if (req.user.must_change_password) {
        const allowedPaths = ['/users/force-change-password', '/users/password-change-otp', '/users/me', '/auth/me'];
        const requestPath = req.originalUrl.split('?')[0].replace(/^\/api(?=\/)/, '').replace(/\/$/, '');
        const isAllowed = allowedPaths.includes(requestPath);
        if (!isAllowed) {
          res.status(403).json({
            must_change_password: true,
            message: 'You must set a new password before accessing system features.'
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

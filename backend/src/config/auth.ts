import jwt from 'jsonwebtoken';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error('JWT_SECRET must be configured');
  return secret;
}

export function generateSessionToken(user: { _id: unknown; session_version?: number }): string {
  return jwt.sign({ id: String(user._id), ver: user.session_version || 0 }, getJwtSecret(), { algorithm: 'HS256', expiresIn: '7d' });
}

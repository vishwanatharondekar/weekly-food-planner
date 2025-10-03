import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export interface UnsubscribeTokenPayload {
  email: string;
  userId: string;
  type: 'unsubscribe';
  iat?: number;
  exp?: number;
}

export function generateUnsubscribeToken(email: string, userId: string): string {
  const payload: UnsubscribeTokenPayload = {
    email,
    userId,
    type: 'unsubscribe',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d', // Token expires in 30 days
    issuer: 'khanakyabanau.in',
    audience: 'unsubscribe',
  });
}

export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'khanakyabanau.in',
      audience: 'unsubscribe',
    }) as UnsubscribeTokenPayload;

    // Additional validation
    if (decoded.type !== 'unsubscribe' || !decoded.email || !decoded.userId) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function generateUnsubscribeUrl(email: string, userId: string): string {
  const token = generateUnsubscribeToken(email, userId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://khanakyabanau.in';
  return `${baseUrl}/unsubscribe?token=${token}`;
}
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1h';
const JWT_REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';

interface TokenPayload {
  walletAddress: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export function generateTokenPair(walletAddress: string) {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not configured');
  }

  const sessionId = randomBytes(16).toString('hex');

  const accessToken = jwt.sign(
    { walletAddress, sessionId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN, algorithm: 'HS512' }
  );

  const refreshToken = jwt.sign(
    { walletAddress, sessionId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_TOKEN_EXPIRES_IN, algorithm: 'HS512' }
  );

  return { accessToken, refreshToken, sessionId };
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS512'] }) as TokenPayload;
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, { algorithms: ['HS512'] }) as TokenPayload;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

export function refreshAccessToken(refreshToken: string) {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    throw new Error('Invalid refresh token');
  }

  const newTokenPair = generateTokenPair(decoded.walletAddress);
  return newTokenPair;
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export function validateWalletAddress(walletAddress: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(walletAddress);
}

export function generateSecureSessionId(): string {
  return randomBytes(32).toString('hex');
}
import prisma from '../../config/database.js';
import { Response, Request } from 'express';
import { getAccessCookieOptions, getRefreshCookieOptions } from '../../utils/cookies.js';

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('deevuh_token', accessToken, getAccessCookieOptions());
  res.cookie('deevuh_refresh_token', refreshToken, getRefreshCookieOptions());
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('deevuh_token', getAccessCookieOptions());
  res.clearCookie('deevuh_refresh_token', getRefreshCookieOptions());
};

export const logAuthEvent = async (
  userId: string | null,
  action: string,
  req: Request
) => {
  try {
    await prisma.authLog.create({
      data: {
        userId,
        action,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      },
    });
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
};

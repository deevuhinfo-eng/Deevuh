import prisma from '../../config/database.js';
import { Response, Request } from 'express';
import { getAccessCookieOptions, getRefreshCookieOptions } from '../../utils/cookies.js';

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('deevuh_token', accessToken, getAccessCookieOptions(res.req));
  res.cookie('deevuh_refresh_token', refreshToken, getRefreshCookieOptions(res.req));
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie('deevuh_token', getAccessCookieOptions(res.req));
  res.clearCookie('deevuh_refresh_token', getRefreshCookieOptions(res.req));
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

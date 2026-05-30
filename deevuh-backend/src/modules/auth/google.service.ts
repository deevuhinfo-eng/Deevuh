import { OAuth2Client, TokenPayload } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.warn('WARNING: GOOGLE_CLIENT_ID is not set in environment variables. Google login will fail.');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (idToken: string): Promise<TokenPayload> => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error('Invalid Google token payload.');
  }

  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch.');
  }

  if (payload.email_verified !== true) {
    throw new Error('Google account email is not verified.');
  }

  return payload;
};

import request from 'supertest';
import app from '../../../app.js';
import prisma from '../../../config/database.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    authLog: {
      create: jest.fn(),
    },
  },
}));

describe('Authentication Hardening Integration Tests', () => {
  let mockUser: any;
  let csrfCookie: string;
  let csrfToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'd3b07384-d113-49c3-a5f1-8f5539d48b11',
      name: 'Test User',
      email: 'test@deevuh.com',
      password: '$2b$12$DummyHashedPasswordForTestEnvironmentVerificationPurpose', // Mock bcrypt hash
      tokenVersion: 0,
      isEmailVerified: false,
    };
  });

  // Helper to get CSRF cookies for POST requests
  const fetchCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
    csrfCookie = cookies.find((c: string) => c.startsWith('XSRF-TOKEN')) || '';
    csrfToken = csrfCookie.split(';')[0].split('=')[1];
  };

  describe('GET /api/auth/csrf', () => {
    it('should issue a CSRF token with Lax SameSite option', async () => {
      const res = await request(app).get('/api/auth/csrf');
      expect(res.status).toBe(200);
      
      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(cookies).toBeDefined();
      
      const xsrfCookie = cookies.find((c: string) => c.startsWith('XSRF-TOKEN'));
      expect(xsrfCookie).toContain('SameSite=Lax');
      expect(xsrfCookie).not.toContain('HttpOnly'); // Frontend needs to read it
    });
  });

  describe('POST /api/auth/login (CSRF & Cookie Protection)', () => {
    it('should reject login attempt if CSRF token double-submit header is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@deevuh.com', password: 'password123' });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CSRF token validation failed');
    });

    it('should allow login, inject access token and refresh token with path restrictions', async () => {
      await fetchCsrf();

      // Mock Prisma return values
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // We need to bypass bcrypt check inside integration tests safely by mocking bcrypt
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockImplementation(async () => true);

      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('x-xsrf-token', csrfToken)
        .send({ email: 'test@deevuh.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(prisma.authLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'login', userId: mockUser.id })
      }));

      const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
      expect(cookies).toBeDefined();

      // Access Token assertions
      const accessTokenCookie = cookies.find((c: string) => c.startsWith('deevuh_token='));
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(accessTokenCookie).toContain('Max-Age=900'); // 15 mins

      // Refresh Token assertions (Cookie Path Restriction)
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith('deevuh_refresh_token='));
      expect(refreshTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('Path=/api/auth/refresh'); // Strict boundary path
      expect(refreshTokenCookie).toContain('Max-Age=604800'); // 7 days

      compareSpy.mockRestore();
    });
  });

  describe('Hashed Verification Tokens (Email Verification)', () => {
    it('should query the database using the SHA256 hashed variant of the token', async () => {
      const rawToken = 'dummyRawTokenStringForTesting';
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const mockVerificationRecord = {
        id: 'verification-uuid',
        email: 'test@deevuh.com',
        token: expectedHash,
        expiresAt: new Date(Date.now() + 1000 * 60 * 10), // valid for 10 minutes
      };

      (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(mockVerificationRecord);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const res = await request(app)
        .get(`/api/auth/verify-email?token=${rawToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Email verified successfully');

      // Verify Prisma was called with hashed value!
      expect(prisma.emailVerificationToken.findUnique).toHaveBeenCalledWith({
        where: { token: expectedHash }
      });
      expect(prisma.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { id: mockVerificationRecord.id }
      });
    });

    it('should reject verification if token has expired', async () => {
      const rawToken = 'expiredTokenString';
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const mockExpiredRecord = {
        id: 'expired-uuid',
        email: 'test@deevuh.com',
        token: expectedHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 sec ago
      };

      (prisma.emailVerificationToken.findUnique as jest.Mock).mockResolvedValue(mockExpiredRecord);

      const res = await request(app)
        .get(`/api/auth/verify-email?token=${rawToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Token has expired');
      expect(prisma.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { id: mockExpiredRecord.id }
      });
    });
  });

  describe('Token Rotation & Session Invalidation (Race/Drift Edge Cases)', () => {
    it('should reject refresh if user tokenVersion has mutated in the database', async () => {
      // Create a refresh token with tokenVersion: 0
      const testRefreshToken = jwt.sign(
        { id: mockUser.id, email: mockUser.email, role: 'USER', tokenVersion: 0 },
        process.env.JWT_REFRESH_SECRET || 'dummy_refresh_secret',
        { expiresIn: '7d' }
      );

      // Database has tokenVersion: 1 (compromised/revoked session state)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        tokenVersion: 1, 
      });

      await fetchCsrf();

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [csrfCookie, `deevuh_refresh_token=${testRefreshToken}`])
        .set('x-xsrf-token', csrfToken);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired refresh token');
      expect(prisma.authLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ action: 'refresh_failed' })
      }));
    });
  });
});

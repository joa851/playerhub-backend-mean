// Tests de los middlewares requireAuth y requireAdmin.
// Mockeamos firebase-admin entero para no depender de credenciales ni red.

const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin', () => ({
  apps: [{}],                              // simula que ya está inicializado
  initializeApp: jest.fn(),
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

const express = require('express');
const request = require('supertest');
const { requireAuth, requireAdmin } = require('../src/middleware/auth');

// Mini-app aislada con dos rutas: una solo-auth, otra solo-admin.
function makeApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ uid: req.user.uid, email: req.user.email, admin: req.user.admin });
  });
  app.get('/admin-only', requireAuth, requireAdmin, (req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    delete process.env.ADMIN_EMAILS;
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(makeApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/missing/i);
  });

  it('returns 401 when header has no Bearer prefix', async () => {
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'token-without-bearer');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid (firebase-admin throws)', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('expired'));
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer fake-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });

  it('passes through and sets req.user when token is valid', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'u-123',
      email: 'jugador@example.com',
    });

    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ uid: 'u-123', email: 'jugador@example.com', admin: false });
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
  });

  it('accepts case-insensitive Bearer scheme', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u-1', email: 'a@b.com' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'bearer some-token');
    expect(res.status).toBe(200);
  });

  it('marks admin=true when email is in ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'admin@gmail.com,otro@org.com';
    mockVerifyIdToken.mockResolvedValue({ uid: 'u-1', email: 'admin@gmail.com' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer x');
    expect(res.status).toBe(200);
    expect(res.body.admin).toBe(true);
  });

  it('marks admin=false when email is NOT in ADMIN_EMAILS', async () => {
    process.env.ADMIN_EMAILS = 'admin@gmail.com';
    mockVerifyIdToken.mockResolvedValue({ uid: 'u-1', email: 'random@x.com' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer x');
    expect(res.status).toBe(200);
    expect(res.body.admin).toBe(false);
  });

  it('admin match is case-insensitive', async () => {
    process.env.ADMIN_EMAILS = 'Admin@Gmail.com';
    mockVerifyIdToken.mockResolvedValue({ uid: 'u-1', email: 'ADMIN@gmail.com' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'Bearer x');
    expect(res.body.admin).toBe(true);
  });
});

describe('requireAdmin middleware', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    process.env.ADMIN_EMAILS = 'admin@gmail.com';
  });

  it('returns 403 when authenticated but not admin', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u', email: 'normal@x.com' });
    const res = await request(makeApp())
      .get('/admin-only')
      .set('Authorization', 'Bearer x');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  it('returns 200 when user is admin', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u', email: 'admin@gmail.com' });
    const res = await request(makeApp())
      .get('/admin-only')
      .set('Authorization', 'Bearer x');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 401 when not authenticated (no token at all)', async () => {
    const res = await request(makeApp()).get('/admin-only');
    // requireAuth corta primero
    expect(res.status).toBe(401);
  });
});

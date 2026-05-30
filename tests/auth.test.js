// Tests del middleware requireAuth. Mockeamos firebase-admin entero
// para no depender de credenciales ni red.

const mockVerifyIdToken = jest.fn();
jest.mock('firebase-admin', () => ({
  apps: [{}],                              // simula que ya está inicializado
  initializeApp: jest.fn(),
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

const express = require('express');
const request = require('supertest');
const { requireAuth } = require('../src/middleware/auth');

// Mini-app aislada que solo monta una ruta protegida.
function makeApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ uid: req.user.uid, email: req.user.email });
  });
  return app;
}

describe('requireAuth middleware', () => {
  beforeEach(() => mockVerifyIdToken.mockReset());

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
    expect(res.body).toEqual({ uid: 'u-123', email: 'jugador@example.com' });
    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
  });

  it('accepts case-insensitive Bearer scheme', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u-1', email: 'a@b.com' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Authorization', 'bearer some-token');
    expect(res.status).toBe(200);
  });
});

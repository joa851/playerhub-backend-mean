const express = require('express');
const request = require('supertest');
const errorHandler = require('../src/middleware/errorHandler');

/**
 * App mínima de prueba: cada ruta dispara un tipo distinto de error
 * y verificamos que el middleware lo traduce al status code correcto.
 */
function buildApp() {
  const app = express();
  app.use(express.json());

  app.get('/validation', (req, res, next) => {
    const err = new Error('Player validation failed: name is required');
    err.name = 'ValidationError';
    next(err);
  });

  app.get('/cast', (req, res, next) => {
    const err = new Error('cast failed');
    err.name = 'CastError';
    next(err);
  });

  app.get('/with-status', (req, res, next) => {
    const err = new Error('Conflict on resource');
    err.status = 409;
    next(err);
  });

  app.get('/unhandled', (req, res, next) => {
    next(new Error('Something exploded'));
  });

  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  const app = buildApp();

  // Silencia el console.error del test de unhandled.
  let errSpy;
  beforeAll(() => {
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => errSpy.mockRestore());

  it('translates Mongoose ValidationError to 400', async () => {
    const res = await request(app).get('/validation');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name is required/);
  });

  it('translates Mongoose CastError to 400', async () => {
    const res = await request(app).get('/cast');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid id format');
  });

  it('respects err.status when set explicitly', async () => {
    const res = await request(app).get('/with-status');
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict on resource');
  });

  it('defaults to 500 for unhandled errors', async () => {
    const res = await request(app).get('/unhandled');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

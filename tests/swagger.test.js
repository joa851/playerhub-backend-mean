const request = require('supertest');
const app = require('../src/app');

describe('Swagger', () => {
  it('serves the OpenAPI JSON at /api-docs.json', async () => {
    const res = await request(app).get('/api-docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info.title).toBe('PlayerHub – MEAN Backend');
    expect(res.body.paths['/players']).toBeDefined();
    expect(res.body.paths['/players/{id}']).toBeDefined();
    expect(res.body.paths['/players/ideal-team']).toBeDefined();
  });

  it('serves the Swagger UI HTML at /api-docs/', async () => {
    const res = await request(app).get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/swagger-ui/i);
  });

  it('exposes docs link at root', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.docs).toBe('/api-docs');
  });
});

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Player = require('../src/models/player');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Player.deleteMany({});
});

// Helper para crear jugadores de prueba en la BD directamente.
async function seedPlayer(overrides = {}) {
  return Player.create({
    name: 'Pedri',
    team: 'Barcelona',
    league: 'La Liga',
    position: 'Midfielder',
    ...overrides,
  });
}

// ─── GET /players ──────────────────────────────────────────────────────

describe('GET /players', () => {
  it('returns [] when DB is empty', async () => {
    const res = await request(app).get('/players');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all players', async () => {
    await seedPlayer({ name: 'Pedri' });
    await seedPlayer({ name: 'Lamine Yamal' });

    const res = await request(app).get('/players');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by name (case insensitive partial match)', async () => {
    await seedPlayer({ name: 'Pedri' });
    await seedPlayer({ name: 'Lamine Yamal' });

    const res = await request(app).get('/players').query({ name: 'pedri' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Pedri');
  });

  it('filters by team', async () => {
    await seedPlayer({ name: 'Pedri', team: 'Barcelona' });
    await seedPlayer({ name: 'Vinicius', team: 'Real Madrid' });

    const res = await request(app).get('/players').query({ team: 'Barcelona' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].team).toBe('Barcelona');
  });
});

// ─── GET /players/:id ──────────────────────────────────────────────────

describe('GET /players/:id', () => {
  it('returns the player when found', async () => {
    const p = await seedPlayer({ name: 'Pedri' });

    const res = await request(app).get(`/players/${p._id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Pedri');
  });

  it('returns 404 when not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/players/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid id', async () => {
    const res = await request(app).get('/players/not-a-valid-id');
    expect(res.status).toBe(400);
  });
});

// ─── POST /players ─────────────────────────────────────────────────────

describe('POST /players', () => {
  it('creates a player and returns 201', async () => {
    const res = await request(app)
      .post('/players')
      .send({
        name: 'Lamine Yamal',
        team: 'Barcelona',
        league: 'La Liga',
        position: 'Attacker',
        location: { latitude: 41.38, longitude: 2.13 },
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Lamine Yamal');
    expect(res.body._id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.location.latitude).toBe(41.38);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/players')
      .send({ team: 'Barcelona' });

    expect(res.status).toBe(400);
  });
});

// ─── PUT /players/:id ──────────────────────────────────────────────────

describe('PUT /players/:id', () => {
  it('updates an existing player', async () => {
    const p = await seedPlayer({ name: 'Pedri', number: 8 });

    const res = await request(app)
      .put(`/players/${p._id}`)
      .send({ number: 10 });

    expect(res.status).toBe(200);
    expect(res.body.number).toBe(10);
    expect(res.body.name).toBe('Pedri');  // sigue ahí
  });

  it('returns 404 when player does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/players/${fakeId}`)
      .send({ number: 10 });
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid id', async () => {
    const res = await request(app).put('/players/not-valid').send({});
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /players/:id ───────────────────────────────────────────────

describe('DELETE /players/:id', () => {
  it('deletes an existing player and returns 204', async () => {
    const p = await seedPlayer({ name: 'Pedri' });

    const res = await request(app).delete(`/players/${p._id}`);
    expect(res.status).toBe(204);

    // verificación: ya no existe
    const stillThere = await Player.findById(p._id);
    expect(stillThere).toBeNull();
  });

  it('returns 404 when player does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/players/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid id', async () => {
    const res = await request(app).delete('/players/bad-id');
    expect(res.status).toBe(400);
  });
});

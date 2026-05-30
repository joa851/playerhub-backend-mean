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

// ─── POST /players/:id/comments ────────────────────────────────────────

describe('POST /players/:id/comments', () => {
  it('adds a comment and returns 201 with the created comment', async () => {
    const p = await seedPlayer({ name: 'Pedri' });

    const res = await request(app)
      .post(`/players/${p._id}/comments`)
      .send({
        author: 'Anon',
        text: 'Crack absoluto',
        rating: 5,
        location: { latitude: 41.38, longitude: 2.13 },
      });

    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.author).toBe('Anon');
    expect(res.body.rating).toBe(5);
    expect(res.body.createdAt).toBeDefined();

    // verificación: el player ahora tiene 1 comment embebido
    const fresh = await Player.findById(p._id);
    expect(fresh.comments).toHaveLength(1);
    expect(fresh.comments[0].text).toBe('Crack absoluto');
  });

  it('returns 400 when author is missing', async () => {
    const p = await seedPlayer();

    const res = await request(app)
      .post(`/players/${p._id}/comments`)
      .send({ text: 'Sin autor', rating: 3 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is out of range (>5)', async () => {
    const p = await seedPlayer();

    const res = await request(app)
      .post(`/players/${p._id}/comments`)
      .send({ author: 'A', text: 'X', rating: 10 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when text exceeds 1000 chars', async () => {
    const p = await seedPlayer();
    const huge = 'x'.repeat(1001);

    const res = await request(app)
      .post(`/players/${p._id}/comments`)
      .send({ author: 'A', text: huge, rating: 3 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when player does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/players/${fakeId}/comments`)
      .send({ author: 'A', text: 'X', rating: 3 });

    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid player id', async () => {
    const res = await request(app)
      .post('/players/bad-id/comments')
      .send({ author: 'A', text: 'X', rating: 3 });
    expect(res.status).toBe(400);
  });
});

// ─── GET /players/external (API-Football) ─────────────────────────────

describe('GET /players/external', () => {
  let savedFetch;
  let savedKey;

  beforeEach(() => {
    savedFetch = global.fetch;
    savedKey = process.env.API_FOOTBALL_KEY;
    process.env.API_FOOTBALL_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.API_FOOTBALL_KEY;
    else process.env.API_FOOTBALL_KEY = savedKey;
  });

  it('returns 200 with players extracted from API-Football response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: [
          { player: { id: 1, name: 'Messi', position: 'Attacker' } },
          { player: { id: 2, name: 'Ronaldo', position: 'Attacker' } },
        ],
      }),
    });

    const res = await request(app).get('/players/external').query({ query: 'star' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Messi');
  });

  it('returns 400 when query is missing', async () => {
    const res = await request(app).get('/players/external');
    expect(res.status).toBe(400);
  });

  it('returns 503 when API_FOOTBALL_KEY is not configured', async () => {
    delete process.env.API_FOOTBALL_KEY;
    const res = await request(app).get('/players/external').query({ query: 'x' });
    expect(res.status).toBe(503);
  });

  it('returns 502 when API-Football fails (network)', async () => {
    global.fetch.mockRejectedValue(new Error('network down'));
    const res = await request(app).get('/players/external').query({ query: 'x' });
    expect(res.status).toBe(502);
  });
});

// ─── POST /players/external/import ────────────────────────────────────

describe('POST /players/external/import', () => {
  let savedFetch;
  let savedKey;

  beforeEach(() => {
    savedFetch = global.fetch;
    savedKey = process.env.API_FOOTBALL_KEY;
    process.env.API_FOOTBALL_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.API_FOOTBALL_KEY;
    else process.env.API_FOOTBALL_KEY = savedKey;
  });

  it('imports a new player and returns 201', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        response: [{ player: { id: 100, name: 'Imported', position: 'Defender' } }],
      }),
    });

    const res = await request(app).post('/players/external/import').send([100]);
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].externalId).toBe(100);
    expect(res.body[0].name).toBe('Imported');
    expect(res.body[0]._id).toBeDefined();

    // verificación: existe en DB
    const fromDb = await Player.findOne({ externalId: 100 });
    expect(fromDb).not.toBeNull();
  });

  it('skips players already imported (same externalId)', async () => {
    await Player.create({ externalId: 200, name: 'Existing' });

    const res = await request(app).post('/players/external/import').send([200]);
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(0);          // nada importado
    expect(global.fetch).not.toHaveBeenCalled();  // no se llamó al API
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/players/external/import').send([]);
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is not an array', async () => {
    const res = await request(app)
      .post('/players/external/import')
      .send({ ids: [1, 2] });
    expect(res.status).toBe(400);
  });

  it('returns 503 when API_FOOTBALL_KEY is not configured', async () => {
    delete process.env.API_FOOTBALL_KEY;
    const res = await request(app).post('/players/external/import').send([1]);
    expect(res.status).toBe(503);
  });
});

// ─── POST /players/ideal-team (LLM) ────────────────────────────────────

describe('POST /players/ideal-team', () => {
  let savedFetch;
  let savedKey;

  beforeEach(() => {
    savedFetch = global.fetch;
    savedKey = process.env.LLM_KEY;
    process.env.LLM_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = savedFetch;
    if (savedKey === undefined) delete process.env.LLM_KEY;
    else process.env.LLM_KEY = savedKey;
  });

  it('returns players in the order suggested by Gemini', async () => {
    const p1 = await seedPlayer({ name: 'Pedri' });
    const p2 = await seedPlayer({ name: 'Yamal' });
    const p3 = await seedPlayer({ name: 'Vinicius' });

    // Gemini elige Yamal, Pedri y omite Vinicius
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({ team: [p2._id.toString(), p1._id.toString()] }) }] },
        }],
      }),
    });

    const res = await request(app).post('/players/ideal-team');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('Yamal');     // primero el que dijo Gemini
    expect(res.body[1].name).toBe('Pedri');
    // p3 (Vinicius) no aparece
    expect(res.body.find(p => p._id === p3._id.toString())).toBeUndefined();
  });

  it('returns [] when DB has no players (no LLM call)', async () => {
    const res = await request(app).post('/players/ideal-team');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns 503 when LLM_KEY is not configured', async () => {
    await seedPlayer({ name: 'Pedri' });
    delete process.env.LLM_KEY;
    const res = await request(app).post('/players/ideal-team');
    expect(res.status).toBe(503);
  });

  it('returns 502 when Gemini returns non-OK', async () => {
    await seedPlayer({ name: 'Pedri' });
    global.fetch.mockResolvedValue({ ok: false, status: 429 });
    const res = await request(app).post('/players/ideal-team');
    expect(res.status).toBe(502);
  });

  it('filters out ids returned by LLM that no longer exist in DB', async () => {
    const p1 = await seedPlayer({ name: 'Pedri' });
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: JSON.stringify({ team: [p1._id.toString(), 'ghostid'] }) }] },
        }],
      }),
    });
    const res = await request(app).post('/players/ideal-team');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Pedri');
  });
});

// ─── DELETE /players/:id/comments/:commentId ───────────────────────────

describe('DELETE /players/:id/comments/:commentId', () => {
  it('deletes a comment and returns 204', async () => {
    const p = await seedPlayer();
    p.comments.push({ author: 'A', text: 'borrame', rating: 2 });
    await p.save();
    const commentId = p.comments[0]._id;

    const res = await request(app).delete(`/players/${p._id}/comments/${commentId}`);
    expect(res.status).toBe(204);

    // verificación
    const fresh = await Player.findById(p._id);
    expect(fresh.comments).toHaveLength(0);
  });

  it('returns 404 when player does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const fakeCommentId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/players/${fakeId}/comments/${fakeCommentId}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when comment does not exist in the player', async () => {
    const p = await seedPlayer();
    const fakeCommentId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/players/${p._id}/comments/${fakeCommentId}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 on invalid comment id', async () => {
    const p = await seedPlayer();
    const res = await request(app).delete(`/players/${p._id}/comments/not-valid`);
    expect(res.status).toBe(400);
  });
});

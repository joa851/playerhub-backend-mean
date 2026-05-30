const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Player = require('../src/models/player');
const playerService = require('../src/services/playerService');

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

describe('playerService — directo (sin rutas)', () => {

  // ─── findAll con todos los filtros ─────────────────────────────────

  describe('findAll', () => {
    beforeEach(async () => {
      await Player.create([
        { name: 'Pedri',        team: 'Barcelona',   league: 'La Liga'    },
        { name: 'Lamine Yamal', team: 'Barcelona',   league: 'La Liga'    },
        { name: 'Vinicius',     team: 'Real Madrid', league: 'La Liga'    },
        { name: 'Haaland',      team: 'Man City',    league: 'Premier'    },
      ]);
    });

    it('returns all when no filter', async () => {
      const result = await playerService.findAll();
      expect(result).toHaveLength(4);
    });

    it('filters by team', async () => {
      const result = await playerService.findAll({ team: 'Barcelona' });
      expect(result).toHaveLength(2);
    });

    it('filters by league', async () => {
      const result = await playerService.findAll({ league: 'Premier' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Haaland');
    });

    it('filters by name (regex case-insensitive)', async () => {
      const result = await playerService.findAll({ name: 'PEDR' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pedri');
    });

    it('combines multiple filters', async () => {
      const result = await playerService.findAll({ team: 'Barcelona', name: 'yamal' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Lamine Yamal');
    });

    it('filters by from/to date range', async () => {
      const future = new Date(Date.now() + 1000 * 60 * 60);
      const result = await playerService.findAll({ from: future.toISOString() });
      expect(result).toHaveLength(0);   // nada creado en el futuro
    });
  });

  // ─── findById ───────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the player', async () => {
      const created = await Player.create({ name: 'Pedri' });
      const found = await playerService.findById(created._id);
      expect(found.name).toBe('Pedri');
    });

    it('returns null when not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const found = await playerService.findById(fakeId);
      expect(found).toBeNull();
    });
  });

  // ─── create ─────────────────────────────────────────────────────────

  describe('create', () => {
    it('strips _id from payload', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const created = await playerService.create({ _id: fakeId, name: 'X' });
      expect(created._id.toString()).not.toBe(fakeId.toString());
    });

    it('rejects when name missing (ValidationError)', async () => {
      await expect(playerService.create({ team: 'Barcelona' }))
        .rejects.toThrow(/Player validation failed/);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns updated player', async () => {
      const p = await Player.create({ name: 'Pedri' });
      const updated = await playerService.update(p._id, { number: 10 });
      expect(updated.number).toBe(10);
      expect(updated.name).toBe('Pedri');
    });

    it('returns null when not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await playerService.update(fakeId, { number: 99 });
      expect(result).toBeNull();
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns true after deleting', async () => {
      const p = await Player.create({ name: 'Pedri' });
      const ok = await playerService.remove(p._id);
      expect(ok).toBe(true);
    });

    it('returns false when player not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ok = await playerService.remove(fakeId);
      expect(ok).toBe(false);
    });
  });

  // ─── addComment ─────────────────────────────────────────────────────

  describe('addComment', () => {
    it('appends to comments array', async () => {
      const p = await Player.create({ name: 'Pedri' });
      const created = await playerService.addComment(p._id, {
        author: 'X', text: 'Y', rating: 4,
      });
      expect(created._id).toBeDefined();
      const fresh = await Player.findById(p._id);
      expect(fresh.comments).toHaveLength(1);
    });

    it('returns null if player does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const result = await playerService.addComment(fakeId, {
        author: 'X', text: 'Y', rating: 3,
      });
      expect(result).toBeNull();
    });
  });

  // ─── removeComment ──────────────────────────────────────────────────

  describe('removeComment', () => {
    it('returns playerFound:false when player missing', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const r = await playerService.removeComment(fakeId, new mongoose.Types.ObjectId());
      expect(r.playerFound).toBe(false);
    });

    it('returns commentFound:false when comment id not in array', async () => {
      const p = await Player.create({ name: 'Pedri' });
      const r = await playerService.removeComment(p._id, new mongoose.Types.ObjectId());
      expect(r.playerFound).toBe(true);
      expect(r.commentFound).toBe(false);
    });

    it('returns both true after successful removal', async () => {
      const p = await Player.create({ name: 'Pedri' });
      p.comments.push({ author: 'A', text: 'B', rating: 1 });
      await p.save();
      const commentId = p.comments[0]._id;
      const r = await playerService.removeComment(p._id, commentId);
      expect(r).toEqual({ playerFound: true, commentFound: true });
    });
  });
});

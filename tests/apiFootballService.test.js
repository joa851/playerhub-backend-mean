const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Player = require('../src/models/player');
const apiFootballService = require('../src/services/apiFootballService');

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
  process.env.API_FOOTBALL_KEY = 'test-key';
  global.fetch = jest.fn();
});

afterEach(() => {
  delete process.env.API_FOOTBALL_KEY;
  delete global.fetch;
});

describe('apiFootballService — directo', () => {

  describe('search', () => {
    it('throws NO_KEY error if key missing', async () => {
      delete process.env.API_FOOTBALL_KEY;
      await expect(apiFootballService.search('messi')).rejects.toMatchObject({
        code: 'NO_KEY',
      });
    });

    it('throws on non-OK response from API-Football', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(apiFootballService.search('messi'))
        .rejects.toThrow(/API-Football returned 500/);
    });

    it('returns empty array if response has no .response field', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });
      const result = await apiFootballService.search('x');
      expect(result).toEqual([]);
    });

    it('filters out items without player', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: [
            { player: { id: 1, name: 'Messi' } },
            { player: null },          // se filtra
            {},                         // se filtra
            { player: { id: 2, name: 'Ronaldo' } },
          ],
        }),
      });
      const result = await apiFootballService.search('x');
      expect(result).toHaveLength(2);
    });
  });

  describe('importByIds', () => {
    it('skips ids already imported (no fetch hit)', async () => {
      await Player.create({ externalId: 100, name: 'Existing' });
      const imported = await apiFootballService.importByIds([100]);
      expect(imported).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('imports new player and maps id → externalId', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: [{ player: { id: 200, name: 'New', position: 'Attacker' } }],
        }),
      });
      const imported = await apiFootballService.importByIds([200]);
      expect(imported).toHaveLength(1);
      expect(imported[0].externalId).toBe(200);
      // El _id de Mongo es distinto del id externo:
      expect(imported[0]._id.toString()).not.toBe('200');
    });

    it('skips when remote returns no player for an id', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: [] }),
      });
      const imported = await apiFootballService.importByIds([404]);
      expect(imported).toHaveLength(0);
    });

    it('uses `player` query param (not `id`)', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ response: [{ player: { id: 9, name: 'Z' } }] }),
      });
      await apiFootballService.importByIds([9]);
      const calledUrl = global.fetch.mock.calls[0][0];
      // El primer arg de fetch es un URL object; comprobamos su query.
      expect(calledUrl.searchParams.get('player')).toBe('9');
      expect(calledUrl.searchParams.get('id')).toBeNull();
    });
  });
});

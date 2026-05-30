const llmService = require('../src/services/llmService');

beforeEach(() => {
  process.env.LLM_KEY = 'test-key';
  global.fetch = jest.fn();
});

afterEach(() => {
  delete process.env.LLM_KEY;
  delete process.env.LLM_MODEL;
  delete process.env.LLM_BASE_URL;
  delete global.fetch;
});

describe('llmService.selectIdealTeamIds', () => {
  it('throws NO_KEY when LLM_KEY missing', async () => {
    delete process.env.LLM_KEY;
    await expect(llmService.selectIdealTeamIds([{ _id: 'a', name: 'X' }]))
      .rejects.toMatchObject({ code: 'NO_KEY' });
  });

  it('returns empty array when no candidates', async () => {
    const result = await llmService.selectIdealTeamIds([]);
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('parses Gemini response and returns team ids', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '{"team":["aaa111","bbb222","ccc333"]}' }],
          },
        }],
      }),
    });

    const result = await llmService.selectIdealTeamIds([
      { _id: 'aaa111', name: 'P1' },
      { _id: 'bbb222', name: 'P2' },
      { _id: 'ccc333', name: 'P3' },
    ]);

    expect(result).toEqual(['aaa111', 'bbb222', 'ccc333']);
  });

  it('throws when Gemini returns non-OK status', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 429 });
    await expect(llmService.selectIdealTeamIds([{ _id: 'a', name: 'X' }]))
      .rejects.toThrow(/Gemini returned 429/);
  });

  it('returns [] when Gemini response is malformed', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
    });
    const result = await llmService.selectIdealTeamIds([{ _id: 'a', name: 'X' }]);
    expect(result).toEqual([]);
  });

  it('returns [] when team field is missing', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"other":"foo"}' }] } }],
      }),
    });
    const result = await llmService.selectIdealTeamIds([{ _id: 'a', name: 'X' }]);
    expect(result).toEqual([]);
  });

  it('calls Gemini with the expected URL and body shape', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{"team":[]}' }] } }] }),
    });

    await llmService.selectIdealTeamIds([{ _id: 'x', name: 'X', position: 'Attacker' }]);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('generateContent');
    expect(url).toContain('key=test-key');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.contents[0].parts[0].text).toContain('_id x');
    expect(body.contents[0].parts[0].text).toContain('nombre: X');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });
});

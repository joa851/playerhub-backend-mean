/**
 * Cliente del LLM (Google Gemini vía AI Studio) para generar el "Equipo Ideal".
 *
 * Mismo patrón que la versión Spring del backend Java: construye un prompt
 * con los jugadores disponibles, pide a Gemini que seleccione 11 _id en
 * JSON estricto, y devuelve la lista de _id.
 *
 * NOTA: en MEAN los ids son ObjectId (string hex 24), no Long. Pedimos
 * al LLM que use el _id tal cual.
 */

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL    = 'gemini-2.0-flash-001';

function getConfig() {
  return {
    apiKey:  process.env.LLM_KEY      || '',
    baseUrl: process.env.LLM_BASE_URL || DEFAULT_BASE_URL,
    model:   process.env.LLM_MODEL    || DEFAULT_MODEL,
  };
}

function buildPrompt(players) {
  const lines = [
    'Eres un entrenador de fútbol experto. De la siguiente lista de jugadores, ',
    'selecciona los 11 que formarían el equipo ideal (formación libre, balanceada). ',
    'Si hay menos de 11 disponibles, selecciona todos.\n\n',
    'Responde EXCLUSIVAMENTE con un JSON de la forma:\n',
    '{"team": ["<_id>", "<_id>", ...]}\n\n',
    'Lista de jugadores disponibles:\n',
  ];
  for (const p of players) {
    const parts = [`- _id ${p._id}`, `nombre: ${p.name || ''}`];
    if (p.position)    parts.push(`posición: ${p.position}`);
    if (p.team)        parts.push(`equipo: ${p.team}`);
    if (p.league)      parts.push(`liga: ${p.league}`);
    if (p.age != null) parts.push(`edad: ${p.age}`);
    if (p.nationality) parts.push(`nacionalidad: ${p.nationality}`);
    lines.push(parts.join(', ') + '\n');
  }
  return lines.join('');
}

function extractTeamIds(geminiResponse) {
  try {
    const text = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.team)) return [];
    return parsed.team.map((x) => String(x));
  } catch {
    return [];
  }
}

/**
 * Llama a Gemini con la lista de jugadores y devuelve los _id seleccionados.
 * @param {Array} candidates - Array de Player (mongoose docs).
 * @returns {Promise<string[]>}
 */
async function selectIdealTeamIds(candidates) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) {
    const err = new Error('LLM_KEY not configured');
    err.code = 'NO_KEY';
    throw err;
  }
  if (!candidates || candidates.length === 0) {
    return [];
  }

  const prompt = buildPrompt(candidates);
  const url = `${baseUrl}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini returned ${response.status}`);
  }

  const data = await response.json();
  return extractTeamIds(data);
}

module.exports = { selectIdealTeamIds };

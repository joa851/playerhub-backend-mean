const Player = require('../models/player');

const DEFAULT_BASE_URL = 'https://v3.football.api-sports.io/players/profiles';

function getConfig() {
  const apiKey = process.env.API_FOOTBALL_KEY || '';
  const baseUrl = process.env.API_FOOTBALL_BASE_URL || DEFAULT_BASE_URL;
  return { apiKey, baseUrl };
}

async function callApiFootball(queryParams) {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) {
    const err = new Error('API_FOOTBALL_KEY not configured');
    err.code = 'NO_KEY';
    throw err;
  }
  const url = new URL(baseUrl);
  for (const [k, v] of Object.entries(queryParams)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { 'x-apisports-key': apiKey },
  });
  if (!res.ok) {
    throw new Error(`API-Football returned ${res.status}`);
  }
  return res.json();
}

// La respuesta de API-Football trae:
//   { response: [ { player: {...}, statistics: [...] }, ... ] }
// Solo nos interesa cada `player`.
function extractPlayers(body) {
  if (!body || !Array.isArray(body.response)) return [];
  return body.response.map(item => item.player).filter(p => p);
}

/**
 * Busca jugadores en API-Football por nombre. NO toca la BD.
 * Devuelve los objetos crudos tal cual los entrega el proveedor.
 */
async function search(query) {
  const body = await callApiFootball({ search: query });
  return extractPlayers(body);
}

/**
 * Para cada id de API-Football: lo descarga y lo persiste en la BD local.
 * Salta los que ya existan (mismo externalId).
 * Devuelve los players creados.
 */
async function importByIds(ids) {
  const imported = [];
  for (const id of ids) {
    // Saltar duplicados.
    const existing = await Player.findOne({ externalId: id });
    if (existing) continue;

    const body = await callApiFootball({ id });
    const remote = extractPlayers(body);
    if (remote.length === 0) continue;

    const apiPlayer = remote[0];
    // El `id` del JSON externo va a `externalId`; el `_id` local lo
    // genera Mongoose automáticamente.
    const playerData = {
      externalId: apiPlayer.id,
      name:       apiPlayer.name,
      firstname:  apiPlayer.firstname,
      lastname:   apiPlayer.lastname,
      age:        apiPlayer.age,
      birth:      apiPlayer.birth,
      nationality: apiPlayer.nationality,
      height:     apiPlayer.height,
      weight:     apiPlayer.weight,
      number:     apiPlayer.number,
      position:   apiPlayer.position,
      photo:      apiPlayer.photo,
    };
    const saved = await Player.create(playerData);
    imported.push(saved);
  }
  return imported;
}

module.exports = { search, importByIds };

const Player = require('../models/player');

/**
 * Busca players locales con filtros opcionales.
 * Filtros aceptados: name (regex case-insensitive), team, league (exactos),
 * from / to (rango sobre createdAt).
 */
async function findAll({ name, team, league, from, to } = {}) {
  const query = {};

  if (name)   query.name   = { $regex: name, $options: 'i' };
  if (team)   query.team   = team;
  if (league) query.league = league;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(to);
  }

  return Player.find(query).sort({ createdAt: -1 });
}

async function findById(id) {
  return Player.findById(id);
}

async function create(data) {
  // Por si llega un _id desde el cliente, lo ignoramos (mongoose generará uno).
  delete data._id;
  return Player.create(data);
}

async function update(id, data) {
  delete data._id;
  // new: true → devuelve el documento ya actualizado.
  // runValidators: aplica las validaciones del schema en update.
  return Player.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

async function remove(id) {
  const result = await Player.findByIdAndDelete(id);
  return result !== null;   // true si se borró, false si no existía
}

/**
 * Añade un comment embebido al array `comments` del player.
 * Devuelve el comment ya creado (con _id) o null si el player no existe.
 */
async function addComment(playerId, commentData) {
  const player = await Player.findById(playerId);
  if (!player) return null;

  player.comments.push(commentData);
  await player.save();          // dispara validators del subschema
  // El comment recién añadido es el último del array.
  return player.comments[player.comments.length - 1];
}

/**
 * Borra un comment embebido por su _id.
 * Devuelve un objeto:
 *   - { playerFound: false }  si el player no existe
 *   - { playerFound: true, commentFound: false }  si el player existe pero no el comment
 *   - { playerFound: true, commentFound: true }   si se borró OK
 */
async function removeComment(playerId, commentId) {
  const player = await Player.findById(playerId);
  if (!player) return { playerFound: false };

  const before = player.comments.length;
  player.comments.pull({ _id: commentId });
  if (player.comments.length === before) {
    return { playerFound: true, commentFound: false };
  }
  await player.save();
  return { playerFound: true, commentFound: true };
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  addComment,
  removeComment,
};

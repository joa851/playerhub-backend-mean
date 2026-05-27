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

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};

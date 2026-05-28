const express = require('express');
const mongoose = require('mongoose');
const playerService = require('../services/playerService');
const apiFootballService = require('../services/apiFootballService');

const router = express.Router();

// Helper para validar ObjectId antes de pegar a Mongo.
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Helper para traducir errores de API-Football a códigos HTTP.
function handleExternalError(res, err) {
  if (err.code === 'NO_KEY') {
    return res.status(503).json({ error: err.message });
  }
  return res.status(502).json({ error: 'API-Football unreachable: ' + err.message });
}

// ─── API-Football ──────────────────────────────────────────────────────
// GET /players/external?query=
router.get('/external', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }
    const results = await apiFootballService.search(query);
    res.json(results);
  } catch (err) {
    return handleExternalError(res, err);
  }
});

// POST /players/external/import   body: [123, 456, ...]
router.post('/external/import', async (req, res) => {
  try {
    const ids = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Body must be a non-empty array of ids' });
    }
    const imported = await apiFootballService.importByIds(ids);
    res.status(201).json(imported);
  } catch (err) {
    return handleExternalError(res, err);
  }
});

// ─── CRUD local ────────────────────────────────────────────────────────

// GET /players?name=&team=&league=&from=&to=
router.get('/', async (req, res, next) => {
  try {
    const players = await playerService.findAll(req.query);
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// GET /players/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    const player = await playerService.findById(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (err) {
    next(err);
  }
});

// POST /players
router.post('/', async (req, res, next) => {
  try {
    const created = await playerService.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    // Validación de schema falla → 400
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// PUT /players/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    const updated = await playerService.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /players/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    const deleted = await playerService.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── Comments (embebidos en el player) ─────────────────────────────────

// POST /players/:id/comments
router.post('/:id/comments', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    const created = await playerService.addComment(req.params.id, req.body);
    if (created === null) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(201).json(created);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /players/:id/comments/:commentId
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid player id' });
    }
    if (!isValidId(req.params.commentId)) {
      return res.status(400).json({ error: 'Invalid comment id' });
    }
    const result = await playerService.removeComment(req.params.id, req.params.commentId);
    if (!result.playerFound) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (!result.commentFound) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;

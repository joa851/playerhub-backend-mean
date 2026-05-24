const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'playerhub-backend-mean',
    uptime: process.uptime(),
    mongo: mongoStates[mongoose.connection.readyState] || 'unknown',
  });
});

module.exports = router;

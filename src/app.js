const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const playersRouter = require('./routes/players');

const app = express();
// Permite que el frontend (servido en otro origin) llame a este backend.
// Default: cualquier origen, sin cookies. Sin restricciones porque
// la API es pública (JWT para endpoints registrados en MEAN-D).
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/players', playersRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'playerhub-backend-mean',
    status: 'running',
  });
});

module.exports = app;

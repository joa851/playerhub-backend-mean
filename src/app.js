const express = require('express');
const cors = require('cors');
const healthRouter = require('./routes/health');
const playersRouter = require('./routes/players');
const errorHandler = require('./middleware/errorHandler');

const app = express();
// Permite que el frontend (servido en otro origin) llame a este backend.
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

// Express lo invoca cuando cualquier handler llama a next(err).
app.use(errorHandler);

module.exports = app;

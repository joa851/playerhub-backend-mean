const express = require('express');
const healthRouter = require('./routes/health');

const app = express();
app.use(express.json());

app.use('/health', healthRouter);

app.get('/', (req, res) => {
  res.json({
    name: 'playerhub-backend-mean',
    status: 'running',
  });
});

module.exports = app;

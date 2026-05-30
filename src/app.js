const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const healthRouter = require('./routes/health');
const playersRouter = require('./routes/players');
const errorHandler = require('./middleware/errorHandler');
const swaggerSpec = require('./swagger');

const app = express();
// Permite que el frontend (servido en otro origin) llame a este backend.
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/players', playersRouter);

// Swagger UI en /api-docs; spec JSON crudo en /api-docs.json
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'PlayerHub MEAN API',
    swaggerOptions: { persistAuthorization: true },
  }),
);

app.get('/', (req, res) => {
  res.json({
    name: 'playerhub-backend-mean',
    status: 'running',
    docs: '/api-docs',
  });
});

// Express lo invoca cuando cualquier handler llama a next(err).
app.use(errorHandler);

module.exports = app;

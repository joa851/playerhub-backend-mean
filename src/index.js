const app = require('./app');
const connectMongo = require('./config/db');

const PORT = process.env.PORT || 8080;

// Conexión a Mongo no bloqueante: si falla, el server arranca igual y
// /health devuelve "mongo: disconnected" para que veamos qué pasa.
connectMongo().catch((err) => {
  console.error('MongoDB connection failed (continuing anyway):', err.message);
});

app.listen(PORT, () => {
  console.log(`playerhub-backend-mean listening on :${PORT}`);
});

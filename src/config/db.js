const mongoose = require('mongoose');

function buildUri() {
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASSWORD;
  const db = process.env.MONGODB_DB || 'playerhub';

  if (user && pass) {
    return `mongodb://${user}:${encodeURIComponent(pass)}@${host}:${port}/${db}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

async function connectMongo() {
  const uri = buildUri();
  const safeUri = uri.replace(/:[^:@]+@/, ':****@');
  console.log(`Connecting to MongoDB at ${safeUri}`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('MongoDB connected');
}

module.exports = connectMongo;

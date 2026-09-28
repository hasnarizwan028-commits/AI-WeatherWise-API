const mongoose = require('mongoose');

/**
 * Database Interface Layer
 * Establishes and manages the connection between the Express application and
 * MongoDB through Mongoose. No request is processed until the connection
 * reports a ready state.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('your_mongodb')) {
    console.error('[DB] MONGO_URI is missing. Copy .env.example to .env and add your Atlas connection string.');
    process.exit(1);
  }

  mongoose.connection.on('connected', () => {
    console.log(`[DB] Connected to MongoDB -> ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[DB] Connection error -> ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Disconnected from MongoDB');
  });

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    return conn;
  } catch (error) {
    console.error(`[DB] Unable to connect -> ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

/**
 * Boots the real app against an in-memory MongoDB on port 5000 so the
 * browser UI can be checked. Ctrl+C to stop.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local_preview_secret';

const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri('ai_weatherwise');
  process.env.PORT = '5000';

  const app = require('../index');
  await require('../config/db')();

  app.listen(5000, () => {
    console.log('\n>>> Preview: http://localhost:5000  (data resets when you stop this script)\n');
  });
})();

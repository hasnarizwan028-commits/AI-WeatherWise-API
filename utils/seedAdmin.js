/**
 * Creates the first Admin account so the Role Matrix routes can be tested.
 * Run with:  npm run seed
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

const ADMIN = {
  name: 'Hasna',
  email: process.env.ADMIN_EMAIL || 'hasna@weatherwise.com',
  password: process.env.ADMIN_PASSWORD || 'hasna@1234',
  role: 'admin',
};

(async () => {
  await connectDB();
  const existing = await User.findOne({ email: ADMIN.email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log(`[SEED] Existing account promoted to admin: ${ADMIN.email}`);
  } else {
    await User.create(ADMIN);
    console.log(`[SEED] Admin created -> ${ADMIN.email} / ${ADMIN.password}`);
  }
  process.exit(0);
})();

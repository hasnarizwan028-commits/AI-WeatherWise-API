/* Lightweight request logger - acts as the system log surface for Admins. */
const logs = [];

const logger = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const entry = {
      time: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      user: req.user ? req.user.email : 'anonymous',
      ms: Date.now() - startedAt,
    };
    logs.unshift(entry);
    if (logs.length > 200) logs.pop();
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${entry.method} ${entry.path} ${entry.status} ${entry.ms}ms`);
    }
  });
  next();
};

logger.getLogs = () => logs.slice(0, 100);

module.exports = logger;

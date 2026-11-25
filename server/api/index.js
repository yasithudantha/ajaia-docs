import { app } from '../src/app.js';
import { initDb } from '../src/db.js';

let initPromise = null;

function ensureDb() {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export default async function handler(req, res) {
  try {
    await ensureDb();
  } catch (err) {
    console.error('Database init error:', err);
    return res.status(500).json({
      error: 'Database initialization failed',
      details: err.message,
    });
  }

  return new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    app(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
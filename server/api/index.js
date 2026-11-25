import { app } from '../src/app.js';
import { initDb } from '../src/db.js';

let initPromise = null;

export default async function handler(req, res) {
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  return app(req, res);
}
import { pool } from '../config/db.js';

export async function getHealth(req, res) {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'La base de datos no está disponible.',
    });
  }
}

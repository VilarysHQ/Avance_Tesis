import app from './app.js';
import { pool } from './config/db.js';

const PORT = Number(process.env.PORT) || 3001;

const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  await pool.end();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

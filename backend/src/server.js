import app from './app.js';
import { pool } from './config/db.js';

const PORT = Number(process.env.PORT) || 3001;

const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`API escuchando en el puerto ${PORT}`);
});

let shuttingDown = false;

function stopAcceptingRequests() {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
    server.closeIdleConnections?.();
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} recibido. Cerrando servidor...`);

  const forceExit = setTimeout(() => {
    console.error('[shutdown] El cierre ordenado excedió el tiempo permitido.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await stopAcceptingRequests();
    await pool.end();
    clearTimeout(forceExit);
  } catch (error) {
    clearTimeout(forceExit);
    console.error('[shutdown]', {
      name: error?.name ?? 'Error',
      code: typeof error?.code === 'string' ? error.code : null,
    });
    process.exitCode = 1;
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

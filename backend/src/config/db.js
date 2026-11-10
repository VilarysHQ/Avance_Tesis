import 'dotenv/config';
import pg from 'pg';

import { getDatabasePoolConfig } from './databaseConfig.js';

const { Pool } = pg;

export const pool = new Pool(getDatabasePoolConfig());

pool.on('error', (error) => {
  console.error('[database:pool]', {
    name: error?.name ?? 'Error',
    code: typeof error?.code === 'string' ? error.code : null,
  });
});

export const query = (text, params) => pool.query(text, params);

import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { createCorsOriginValidator, getAllowedOrigins } from './config/httpSecurity.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import routes from './routes/index.js';

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = getAllowedOrigins();

app.disable('x-powered-by');
if (isProduction) app.set('trust proxy', 1);
app.use(
  helmet({
    strictTransportSecurity: isProduction ? undefined : false,
  })
);

app.use(
  cors({
    origin: createCorsOriginValidator(allowedOrigins),
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
  })
);

app.use('/api/ai', express.json({ limit: '16kb' }));
app.use(express.json({ limit: '32kb' }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;

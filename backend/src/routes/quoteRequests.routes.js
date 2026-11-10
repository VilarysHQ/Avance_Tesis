import { Router } from 'express';

import { createQuoteRequest } from '../controllers/quoteRequests.controller.js';
import { quoteRequestRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/', quoteRequestRateLimit, createQuoteRequest);

export default router;

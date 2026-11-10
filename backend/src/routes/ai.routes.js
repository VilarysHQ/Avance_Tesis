import { Router } from 'express';

import { chat } from '../controllers/ai.controller.js';
import { requirements } from '../controllers/requirements.controller.js';
import { aiRateLimit } from '../middleware/aiRateLimit.js';

const router = Router();

router.post('/chat', aiRateLimit, chat);
router.post('/requirements', aiRateLimit, requirements);

export default router;

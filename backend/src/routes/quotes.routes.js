import { Router } from 'express';

import { createQuote, listQuotes, updateQuoteStatus } from '../controllers/quotes.controller.js';
import {
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  requireTrustedOrigin,
} from '../middleware/adminAuth.js';

const router = Router();

router.get('/', authenticateAdmin, requireAdminRole, listQuotes);
router.post(
  '/',
  requireTrustedOrigin,
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  createQuote
);
router.patch(
  '/:id/status',
  requireTrustedOrigin,
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  updateQuoteStatus
);

export default router;

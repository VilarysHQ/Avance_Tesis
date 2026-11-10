import { Router } from 'express';

import { createLead, listLeads } from '../controllers/leads.controller.js';
import {
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  requireTrustedOrigin,
} from '../middleware/adminAuth.js';

const router = Router();

router.get('/', authenticateAdmin, requireAdminRole, listLeads);
router.post(
  '/',
  requireTrustedOrigin,
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  createLead
);

export default router;

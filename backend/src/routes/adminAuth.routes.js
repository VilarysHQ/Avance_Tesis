import { Router } from 'express';

import {
  getAdminSession,
  loginAdmin,
  logoutAdmin,
} from '../controllers/adminAuth.controller.js';
import {
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  requireTrustedOrigin,
} from '../middleware/adminAuth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', requireTrustedOrigin, loginRateLimit, loginAdmin);
router.get('/session', authenticateAdmin, requireAdminRole, getAdminSession);
router.post(
  '/logout',
  requireTrustedOrigin,
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  logoutAdmin
);

export default router;

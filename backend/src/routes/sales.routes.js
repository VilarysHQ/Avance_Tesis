import { Router } from 'express';

import { listSales } from '../controllers/sales.controller.js';
import { authenticateAdmin, requireAdminRole } from '../middleware/adminAuth.js';

const router = Router();

router.get('/', authenticateAdmin, requireAdminRole, listSales);

export default router;

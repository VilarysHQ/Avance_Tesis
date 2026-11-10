import { Router } from 'express';

import adminAuthRoutes from './adminAuth.routes.js';
import aiRoutes from './ai.routes.js';
import healthRoutes from './health.routes.js';
import leadsRoutes from './leads.routes.js';
import quotesRoutes from './quotes.routes.js';
import quoteRequestsRoutes from './quoteRequests.routes.js';
import salesRoutes from './sales.routes.js';
import servicesRoutes from './services.routes.js';

const router = Router();

router.use('/ai', aiRoutes);
router.use('/admin/auth', adminAuthRoutes);
router.use('/health', healthRoutes);
router.use('/services', servicesRoutes);
router.use('/leads', leadsRoutes);
router.use('/quotes', quotesRoutes);
router.use('/quote-requests', quoteRequestsRoutes);
router.use('/sales', salesRoutes);

export default router;

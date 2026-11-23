
import { Router } from 'express';

import {
  authenticateAdmin,
  requireAdminRole,
} from '../middleware/adminAuth.js';

import { getForecast } from '../services/forecast.service.js';

const router = Router();

router.get(
  '/',
  authenticateAdmin,
  requireAdminRole,
  async (req, res, next) => {
    try {
      const forecast = await getForecast();

      res.set('Cache-Control', 'no-store');

      return res.json({
        data: forecast,
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;

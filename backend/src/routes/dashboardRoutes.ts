import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, DashboardController.getStats);
router.get('/alerts', authenticate, DashboardController.getAlerts);

export default router;

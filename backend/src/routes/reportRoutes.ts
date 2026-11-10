import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/inventory', authenticate, ReportController.getInventoryReport);
router.get('/stockout', authenticate, ReportController.getStockoutReport);
router.get('/purchase-orders', authenticate, ReportController.getPurchaseOrderReport);

export default router;

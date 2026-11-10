import { Router } from 'express';
import { StockoutController } from '../controllers/stockoutController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, StockoutController.getAllStockoutRisks);
router.get('/:productId', authenticate, StockoutController.getProductStockoutRisk);

export default router;

import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, InventoryController.getInventoryOverview);
router.get('/movements', authenticate, InventoryController.getMovements);
router.post('/movements', authenticate, InventoryController.createMovement);

export default router;

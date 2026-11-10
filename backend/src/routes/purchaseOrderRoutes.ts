import { Router } from 'express';
import { PurchaseOrderController } from '../controllers/purchaseOrderController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, PurchaseOrderController.getPurchaseOrders);
router.post('/', authenticate, PurchaseOrderController.createPurchaseOrder);
router.post('/auto-recommend', authenticate, PurchaseOrderController.autoRecommend);
router.get('/:id', authenticate, PurchaseOrderController.getPurchaseOrderById);
router.post('/:id/submit-for-approval', authenticate, PurchaseOrderController.submitForApproval);
router.post(
  '/:id/approve',
  authenticate,
  authorizeRoles('Admin', 'Warehouse Manager'),
  PurchaseOrderController.approveOrder
);
router.post(
  '/:id/reject',
  authenticate,
  authorizeRoles('Admin', 'Warehouse Manager'),
  PurchaseOrderController.rejectOrder
);
router.post(
  '/:id/submit-to-supplier',
  authenticate,
  authorizeRoles('Admin', 'Warehouse Manager'),
  PurchaseOrderController.submitToSupplier
);
router.post('/:id/receive', authenticate, PurchaseOrderController.receiveOrder);

export default router;

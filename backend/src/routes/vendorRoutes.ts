import { Router } from 'express';
import { VendorController } from '../controllers/vendorController.js';
import { authenticate, authorizeRoles, requireActiveAccount } from '../middleware/auth.js';

const router = Router();

// Order matters: who are you -> is your role allowed -> is your account still active
router.use(authenticate, authorizeRoles('Vendor'), requireActiveAccount);

router.get('/overview', VendorController.getOverview);

router.get('/purchase-orders', VendorController.listOrders);
router.get('/purchase-orders/:id', VendorController.getOrder);
router.post('/purchase-orders/:id/accept', VendorController.acceptOrder);
router.post('/purchase-orders/:id/reject', VendorController.rejectOrder);
router.post('/purchase-orders/:id/ship', VendorController.shipOrder);

router.get('/profile', VendorController.getProfile);
router.patch('/profile', VendorController.updateProfile);

export default router;
import { Router } from 'express';
import { CustomerController } from '../controllers/customerController.js';
import { authenticate, authorizeRoles, requireActiveAccount } from '../middleware/auth.js';

const router = Router();

// Who are you -> is your role allowed -> is your company account still active
router.use(authenticate, authorizeRoles('Customer'), requireActiveAccount);

router.get('/overview', CustomerController.getOverview);

router.get('/profile', CustomerController.getProfile);
router.patch('/profile', CustomerController.updateProfile);

router.get('/support-requests', CustomerController.listSupportRequests);
router.post('/support-requests', CustomerController.createSupportRequest);
router.get('/support-requests/:id', CustomerController.getSupportRequest);

export default router;
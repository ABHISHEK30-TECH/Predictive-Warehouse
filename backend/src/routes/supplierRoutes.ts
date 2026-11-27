import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController.js';
import { authenticate, authorizeRoles, ADMIN_ROLES } from '../middleware/auth.js'; // CHANGED: added ADMIN_ROLES

const router = Router();

router.get('/', authenticate, SupplierController.getSuppliers);
router.get('/:id', authenticate, SupplierController.getSupplierById);
router.post('/', authenticate, authorizeRoles(...ADMIN_ROLES, 'Warehouse Manager'), SupplierController.createSupplier); // CHANGED
router.put('/:id', authenticate, authorizeRoles(...ADMIN_ROLES, 'Warehouse Manager'), SupplierController.updateSupplier); // CHANGED
router.delete('/:id', authenticate, authorizeRoles(...ADMIN_ROLES), SupplierController.deleteSupplier); // CHANGED

export default router;
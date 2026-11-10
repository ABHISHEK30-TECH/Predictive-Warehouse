import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, SupplierController.getSuppliers);
router.get('/:id', authenticate, SupplierController.getSupplierById);
router.post('/', authenticate, authorizeRoles('Admin', 'Warehouse Manager'), SupplierController.createSupplier);
router.put('/:id', authenticate, authorizeRoles('Admin', 'Warehouse Manager'), SupplierController.updateSupplier);
router.delete('/:id', authenticate, authorizeRoles('Admin'), SupplierController.deleteSupplier);

export default router;

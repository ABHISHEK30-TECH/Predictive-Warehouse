import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, ProductController.getProducts);
router.get('/:id', authenticate, ProductController.getProductById);
router.post('/', authenticate, authorizeRoles('Admin', 'Warehouse Manager'), ProductController.createProduct);
router.put('/:id', authenticate, authorizeRoles('Admin', 'Warehouse Manager'), ProductController.updateProduct);
router.delete('/:id', authenticate, authorizeRoles('Admin'), ProductController.deleteProduct);

export default router;

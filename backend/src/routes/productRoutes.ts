import { Router } from "express";
import { ProductController } from "../controllers/productController.js";
import {
  authenticate,
  authorizeRoles,
  ADMIN_ROLES,
} from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, ProductController.getProducts);
router.get("/:id", authenticate, ProductController.getProductById);
router.post(
  "/",
  authenticate,
  authorizeRoles(...ADMIN_ROLES, "Warehouse Manager"),
  ProductController.createProduct,
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles(...ADMIN_ROLES, "Warehouse Manager"),
  ProductController.updateProduct,
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles(...ADMIN_ROLES),
  ProductController.deleteProduct,
);
export default router;

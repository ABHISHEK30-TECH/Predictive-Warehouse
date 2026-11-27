import { Router } from "express";
import { PurchaseOrderController } from "../controllers/purchaseOrderController.js";
import {
  authenticate,
  authorizeRoles,
  ADMIN_ROLES,
} from "../middleware/auth.js"; // CHANGED: added ADMIN_ROLES

const router = Router();

router.get("/", authenticate, PurchaseOrderController.getPurchaseOrders);
router.post("/", authenticate, PurchaseOrderController.createPurchaseOrder);
router.post(
  "/auto-recommend",
  authenticate,
  PurchaseOrderController.autoRecommend,
);
router.get("/:id", authenticate, PurchaseOrderController.getPurchaseOrderById);
router.post(
  "/:id/submit-for-approval",
  authenticate,
  PurchaseOrderController.submitForApproval,
);
router.post(
  "/:id/approve",
  authenticate,
  authorizeRoles(...ADMIN_ROLES, "Warehouse Manager"), // CHANGED
  PurchaseOrderController.approveOrder,
);
router.post(
  "/:id/reject",
  authenticate,
  authorizeRoles(...ADMIN_ROLES, "Warehouse Manager"), // CHANGED
  PurchaseOrderController.rejectOrder,
);
router.post(
  "/:id/submit-to-supplier",
  authenticate,
  authorizeRoles(...ADMIN_ROLES, "Warehouse Manager"), // CHANGED
  PurchaseOrderController.submitToSupplier,
);
router.post("/:id/receive", authenticate, PurchaseOrderController.receiveOrder);

export default router;

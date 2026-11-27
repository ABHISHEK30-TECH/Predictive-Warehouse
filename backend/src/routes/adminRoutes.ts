import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticate, authorizeRoles, ADMIN_ROLES } from '../middleware/auth.js';

const router = Router();

// Every admin route requires a logged-in admin-level user (Super Admin, or the legacy Admin)
router.use(authenticate, authorizeRoles(...ADMIN_ROLES));

// Overview
router.get('/overview', AdminController.getOverview);

// Customers (onboarding requests)
router.get('/customers', AdminController.listCustomers);
router.post('/customers/:id/activate', AdminController.activateCustomer);
router.patch('/customers/:id/status', AdminController.updateCustomerStatus);

// Vendors (suppliers)
router.get('/vendors', AdminController.listVendors);
router.post('/vendors/:id/login', AdminController.createVendorLogin);
router.patch('/vendors/:id/approve', AdminController.approveVendor);
router.patch('/vendors/:id/suspend', AdminController.suspendVendor);
router.patch('/vendors/:id/reactivate', AdminController.reactivateVendor);

// Users
router.get('/users', AdminController.listUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.post('/users/:id/reset-password', AdminController.resetUserPassword);

// Support requests
router.get('/support-requests', AdminController.listSupportRequests);
router.patch('/support-requests/:id', AdminController.updateSupportRequest);

export default router;
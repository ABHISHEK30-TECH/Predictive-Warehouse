import { Response } from 'express'; // CHANGED: Request is no longer needed here
import mongoose from 'mongoose'; // NEW
import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { User } from '../models/User.js'; // NEW
import { AuthenticatedRequest, ADMIN_ROLES } from '../middleware/auth.js'; // NEW

// NEW: fields that any allowed user may edit
const GENERAL_FIELDS = [
  'name',
  'email',
  'phone',
  'address',
  'leadTimeDays',
  'reliabilityScore',
  'supportedCategories',
  'rating',
  'notes',
];

// NEW: fields that only Super Admin / Admin may edit
const ADMIN_ONLY_FIELDS = ['approved', 'active'];

// NEW
function isAdmin(req: AuthenticatedRequest): boolean {
  return !!req.user && ADMIN_ROLES.includes(req.user.role);
}

export class SupplierController {
  public static async getSuppliers(req: AuthenticatedRequest, res: Response): Promise<void> { // CHANGED: request type
    try {
      const { approved, active, category } = req.query;
      const query: any = {};

      if (approved !== undefined) {
        query.approved = approved === 'true';
      }
      if (active !== undefined) {
        query.active = active === 'true';
      }
      if (category) {
        query.supportedCategories = category;
      }

      const suppliers = await Supplier.find(query).sort({ reliabilityScore: -1, name: 1 });
      res.status(200).json({ success: true, data: suppliers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getSupplierById(req: AuthenticatedRequest, res: Response): Promise<void> { // CHANGED: request type
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      const purchaseOrders = await PurchaseOrder.find({ supplierId: supplier._id })
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        data: {
          ...supplier.toObject(),
          purchaseOrders,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createSupplier(req: AuthenticatedRequest, res: Response): Promise<void> { // CHANGED: request type
    try {
      const {
        name,
        email,
        phone,
        address,
        approved,
        active,
        leadTimeDays,
        reliabilityScore,
        supportedCategories,
        rating,
        notes,
      } = req.body;

      if (!name || !email || !phone || !address) {
        res.status(400).json({ success: false, message: 'Name, email, phone, and address are required' });
        return;
      }

      // CHANGED: only admins decide approval. Other roles create suppliers that wait for approval.
      const admin = isAdmin(req);
      const finalApproved = admin ? (approved !== undefined ? approved : true) : false;
      const finalActive = admin && active !== undefined ? active : true;

      const supplier = await Supplier.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        address: address.trim(),
        approved: finalApproved, // CHANGED
        active: finalActive, // CHANGED
        ...(finalApproved && req.user // NEW: record who approved it and when
          ? { approvedBy: new mongoose.Types.ObjectId(req.user.id), approvedAt: new Date() }
          : {}),
        leadTimeDays: Number(leadTimeDays) || 5,
        reliabilityScore: Number(reliabilityScore) || 90,
        supportedCategories: supportedCategories || [],
        rating: Number(rating) || 4.5,
        notes,
      });

      res.status(201).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateSupplier(req: AuthenticatedRequest, res: Response): Promise<void> { // CHANGED: request type
    try {
      // CHANGED: build the update from an allowed list instead of trusting the whole request body
      const update: Record<string, any> = {};

      for (const key of GENERAL_FIELDS) {
        if (req.body[key] !== undefined) {
          update[key] = req.body[key];
        }
      }

      if (isAdmin(req)) {
        for (const key of ADMIN_ONLY_FIELDS) {
          if (req.body[key] !== undefined) {
            update[key] = req.body[key];
          }
        }
        // Record who approved the vendor and when
        if (update.approved === true && req.user) {
          update.approvedBy = new mongoose.Types.ObjectId(req.user.id);
          update.approvedAt = new Date();
        }
      }
      // Note: for non-admin users, approved / active are silently ignored.
      // 'userId' can never be changed here; the admin vendor endpoints handle that link.

      if (Object.keys(update).length === 0) {
        res.status(400).json({ success: false, message: 'No valid fields to update' });
        return;
      }

      const supplier = await Supplier.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });

      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteSupplier(req: AuthenticatedRequest, res: Response): Promise<void> { // CHANGED: request type
    try {
      const supplier = await Supplier.findById(req.params.id); // CHANGED: load first, delete later
      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      // NEW: do not delete a supplier that has purchase orders
      const orderCount = await PurchaseOrder.countDocuments({ supplierId: supplier._id });
      if (orderCount > 0) {
        res.status(409).json({
          success: false,
          message: `Supplier '${supplier.name}' has ${orderCount} purchase order(s) and cannot be deleted. Suspend it instead by setting active to false.`,
        });
        return;
      }

      // NEW: a vendor login linked to this supplier must not stay active
      if (supplier.userId) {
        await User.findByIdAndUpdate(supplier.userId, { status: 'Suspended' });
      }

      await supplier.deleteOne();

      res.status(200).json({ success: true, message: `Supplier '${supplier.name}' deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
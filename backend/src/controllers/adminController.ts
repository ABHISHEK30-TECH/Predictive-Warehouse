import { Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { User, UserRole } from "../models/User.js";
import { Supplier } from "../models/Supplier.js";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import OnboardingRequest from "../models/OnboardingRequest.js";
import { AuthenticatedRequest, ADMIN_ROLES } from "../middleware/auth.js";
import { SupportRequest } from '../models/SupportRequest.js';

// 12-character random password, shown to the Super Admin only once
function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function badId(id: string, res: Response): boolean {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid ID" });
    return true;
  }
  return false;
}

// Only a Super Admin may manage admin-level accounts. This stops the legacy 'Admin' role
// from suspending or resetting the password of a Super Admin.
function canManageTarget(
  req: AuthenticatedRequest,
  targetRole: UserRole,
): boolean {
  if (!ADMIN_ROLES.includes(targetRole)) return true;
  return req.user?.role === "Super Admin";
}

export class AdminController {
  // ---------- Overview ----------
  public static async getOverview(
    _req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const [
        newRequests,
        contactedRequests,
        activeCustomers,
        suspendedCustomers,
        totalVendors,
        approvedVendors,
        pendingVendors,
        suspendedVendors,
        ordersAwaitingVendor,
        usersByRole,
      ] = await Promise.all([
        OnboardingRequest.countDocuments({ status: "new" }),
        OnboardingRequest.countDocuments({ status: "contacted" }),
        OnboardingRequest.countDocuments({ status: "active" }),
        OnboardingRequest.countDocuments({ status: "suspended" }),
        Supplier.countDocuments(),
        Supplier.countDocuments({ approved: true, active: true }),
        Supplier.countDocuments({ approved: false }),
        Supplier.countDocuments({ active: false }),
        PurchaseOrder.countDocuments({
          status: "SUBMITTED",
          supplierStatus: "PENDING",
        }),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      ]);

      res.status(200).json({
        success: true,
        data: {
          customers: {
            newRequests,
            contacted: contactedRequests,
            active: activeCustomers,
            suspended: suspendedCustomers,
          },
          vendors: {
            total: totalVendors,
            approvedAndActive: approvedVendors,
            pendingApproval: pendingVendors,
            suspended: suspendedVendors,
          },
          ordersAwaitingVendor,
          usersByRole: usersByRole.map((r: any) => ({
            role: r._id,
            count: r.count,
          })),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Customers (onboarding requests) ----------
  public static async listCustomers(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { status } = req.query;
      const query: any = {};
      if (status) query.status = status;

      const customers = await OnboardingRequest.find(query)
        .populate("userId", "name email status")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: customers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async activateCustomer(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const request = await OnboardingRequest.findById(id);
      if (!request) {
        res
          .status(404)
          .json({ success: false, message: "Onboarding request not found" });
        return;
      }

      if (request.status === "active" || request.userId) {
        res
          .status(409)
          .json({
            success: false,
            message: "This customer is already activated",
          });
        return;
      }

      const existing = await User.findOne({ email: request.email });
      if (existing) {
        res.status(409).json({
          success: false,
          message:
            "A user with this email address already exists. Resolve the duplicate first.",
        });
        return;
      }

      const temporaryPassword = generateTempPassword();
      const user = await User.create({
        name: request.fullName,
        email: request.email,
        password: temporaryPassword,
        role: "Customer",
        status: "Active",
        department: request.companyName,
        customerId: request._id,
      });

      let updated;
      try {
        updated = await OnboardingRequest.findByIdAndUpdate(
          request._id,
          {
            status: "active",
            userId: user._id,
            activatedBy: new mongoose.Types.ObjectId(req.user!.id),
            activatedAt: new Date(),
          },
          { new: true },
        );
      } catch (e) {
        await User.findByIdAndDelete(user._id); // do not leave an orphan login behind
        throw e;
      }

      res.status(201).json({
        success: true,
        message:
          "Customer activated. Share these credentials securely. The password is shown only once.",
        data: {
          request: updated,
          credentials: { email: user.email, temporaryPassword },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateCustomerStatus(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const { status } = req.body;
      if (!["contacted", "suspended", "active"].includes(status)) {
        res
          .status(400)
          .json({
            success: false,
            message: "Status must be 'contacted', 'suspended' or 'active'",
          });
        return;
      }

      const request = await OnboardingRequest.findById(id);
      if (!request) {
        res
          .status(404)
          .json({ success: false, message: "Onboarding request not found" });
        return;
      }

      if (status === "contacted" && request.status !== "new") {
        res
          .status(400)
          .json({
            success: false,
            message: "Only a 'new' request can be marked as contacted",
          });
        return;
      }

      if (status === "active" && !request.userId) {
        res
          .status(400)
          .json({
            success: false,
            message:
              "This customer has no login yet. Use the activate endpoint first.",
          });
        return;
      }

      const updated = await OnboardingRequest.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );

      // Keep the login in step with the company status
      if (request.userId && status === "suspended") {
        await User.findByIdAndUpdate(request.userId, { status: "Suspended" });
      }
      if (request.userId && status === "active") {
        await User.findByIdAndUpdate(request.userId, { status: "Active" });
      }

      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Vendors (suppliers) ----------
  public static async listVendors(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { approved, active } = req.query;
      const query: any = {};
      if (approved !== undefined) query.approved = approved === "true";
      if (active !== undefined) query.active = active === "true";

      const vendors = await Supplier.find(query)
        .populate("userId", "name email status")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, data: vendors });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createVendorLogin(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const supplier = await Supplier.findById(id);
      if (!supplier) {
        res.status(404).json({ success: false, message: "Vendor not found" });
        return;
      }

      if (supplier.userId) {
        res
          .status(409)
          .json({ success: false, message: "This vendor already has a login" });
        return;
      }

      if (!supplier.approved || !supplier.active) {
        res
          .status(400)
          .json({
            success: false,
            message: "Approve and activate the vendor before creating a login",
          });
        return;
      }

      const email = String(req.body?.email || supplier.email)
        .toLowerCase()
        .trim();
      const existing = await User.findOne({ email });
      if (existing) {
        res
          .status(409)
          .json({
            success: false,
            message: "A user with this email address already exists",
          });
        return;
      }

      const temporaryPassword = generateTempPassword();
      const user = await User.create({
        name: supplier.name,
        email,
        password: temporaryPassword,
        role: "Vendor",
        status: "Active",
        department: "Vendor Portal",
        supplierId: supplier._id,
      });

      try {
        await Supplier.findByIdAndUpdate(supplier._id, { userId: user._id });
      } catch (e) {
        await User.findByIdAndDelete(user._id);
        throw e;
      }

      res.status(201).json({
        success: true,
        message:
          "Vendor login created. Share these credentials securely. The password is shown only once.",
        data: { credentials: { email: user.email, temporaryPassword } },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async approveVendor(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const supplier = await Supplier.findByIdAndUpdate(
        id,
        {
          approved: true,
          approvedBy: new mongoose.Types.ObjectId(req.user!.id),
          approvedAt: new Date(),
        },
        { new: true },
      );
      if (!supplier) {
        res.status(404).json({ success: false, message: "Vendor not found" });
        return;
      }

      if (supplier.userId) {
        await User.updateOne(
          { _id: supplier.userId, status: "Pending" },
          { status: "Active" },
        );
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async suspendVendor(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const supplier = await Supplier.findByIdAndUpdate(
        id,
        { active: false },
        { new: true },
      );
      if (!supplier) {
        res.status(404).json({ success: false, message: "Vendor not found" });
        return;
      }

      if (supplier.userId) {
        await User.findByIdAndUpdate(supplier.userId, { status: "Suspended" });
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async reactivateVendor(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const supplier = await Supplier.findByIdAndUpdate(
        id,
        { active: true },
        { new: true },
      );
      if (!supplier) {
        res.status(404).json({ success: false, message: "Vendor not found" });
        return;
      }

      if (supplier.userId && supplier.approved) {
        await User.findByIdAndUpdate(supplier.userId, { status: "Active" });
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Users ----------
  public static async listUsers(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { role, status, search, page = 1, limit = 50 } = req.query;
      const query: any = {};
      if (role) query.role = role;
      if (status) query.status = status;
      if (search) {
        const rx = new RegExp(escapeRegex(String(search)), "i");
        query.$or = [{ name: rx }, { email: rx }];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [users, total] = await Promise.all([
        User.find(query)
          .select("-password")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        User.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateUserStatus(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const { status } = req.body;
      if (!["Active", "Suspended"].includes(status)) {
        res
          .status(400)
          .json({
            success: false,
            message: "Status must be 'Active' or 'Suspended'",
          });
        return;
      }

      if (id === req.user!.id) {
        res
          .status(400)
          .json({
            success: false,
            message: "You cannot change the status of your own account",
          });
        return;
      }

      const target = await User.findById(id);
      if (!target) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      if (!canManageTarget(req, target.role)) {
        res
          .status(403)
          .json({
            success: false,
            message: "Only a Super Admin can manage admin accounts",
          });
        return;
      }

      target.status = status;
      await target.save();

      res.status(200).json({ success: true, data: target });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async resetUserPassword(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const target = await User.findById(id);
      if (!target) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      if (!canManageTarget(req, target.role)) {
        res
          .status(403)
          .json({
            success: false,
            message: "Only a Super Admin can manage admin accounts",
          });
        return;
      }

      const temporaryPassword = generateTempPassword();
      target.password = temporaryPassword; // hashed by the pre-save hook in User.ts
      await target.save();

      res.status(200).json({
        success: true,
        message: "Password reset. Share it securely. It is shown only once.",
        data: { email: target.email, temporaryPassword },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

    // ---------- Support requests ----------
  public static async listSupportRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const query: any = {};
      if (typeof status === 'string' && ['open', 'in_progress', 'resolved'].includes(status)) {
        query.status = status;
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));

      const [items, total] = await Promise.all([
        SupportRequest.find(query)
          .populate('customerId', 'companyName email status')
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum),
        SupportRequest.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: items,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateSupportRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const { status, response } = req.body ?? {};
      const update: Record<string, any> = {};

      if (status !== undefined) {
        if (!['open', 'in_progress', 'resolved'].includes(status)) {
          res.status(400).json({ success: false, message: "Status must be 'open', 'in_progress' or 'resolved'" });
          return;
        }
        update.status = status;
      }

      if (response !== undefined) {
        const text = typeof response === 'string' ? response.trim().slice(0, 2000) : '';
        if (!text) {
          res.status(400).json({ success: false, message: 'Response cannot be empty' });
          return;
        }
        update.adminResponse = text;
        update.respondedBy = new mongoose.Types.ObjectId(req.user!.id);
        update.respondedAt = new Date();
      }

      if (Object.keys(update).length === 0) {
        res.status(400).json({ success: false, message: 'Provide a status or a response' });
        return;
      }

      const item = await SupportRequest.findByIdAndUpdate(id, update, { new: true })
        .populate('customerId', 'companyName email')
        .populate('createdBy', 'name email');

      if (!item) {
        res.status(404).json({ success: false, message: 'Support request not found' });
        return;
      }

      res.status(200).json({ success: true, data: item });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

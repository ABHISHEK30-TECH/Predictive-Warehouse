import { Response } from "express";
import mongoose from "mongoose";
import { PurchaseOrder } from "../models/PurchaseOrder.js";
import { Supplier } from "../models/Supplier.js";
import { ApprovalLog, ApprovalAction } from "../models/ApprovalLog.js";
import { Notification } from "../models/Notification.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const VALID_SUPPLIER_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "SHIPPED"];
const NON_PENDING = ["ACCEPTED", "REJECTED", "SHIPPED"];

// A vendor only sees orders that were really sent to suppliers (never drafts or orders awaiting internal approval).
const VISIBLE_STATUSES = [
  "SUBMITTED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

// Whitelist of fields a vendor may see. Internal fields (notes, createdBy, approvedBy,
// rejectionReason, isAutoRecommended) are deliberately left out.
const VENDOR_FIELDS =
  "purchaseOrderNumber items totalAmount status supplierStatus supplierRespondedAt shippedAt trackingRef vendorNote expectedDeliveryDate submittedAt supplierSubmissionRef createdAt";

// Orders sent before the vendor panel existed may hold free text (or nothing) in supplierStatus.
// We treat anything that is not ACCEPTED / REJECTED / SHIPPED as PENDING.
function pendingFilter() {
  return { supplierStatus: { $nin: NON_PENDING } };
}

function visibleFilter(req: AuthenticatedRequest) {
  return {
    supplierId: req.supplierId,
    status: { $in: VISIBLE_STATUSES },
    submittedAt: { $exists: true },
  };
}

function toVendorView(po: any) {
  return {
    ...po,
    supplierStatus: VALID_SUPPLIER_STATUSES.includes(po.supplierStatus)
      ? po.supplierStatus
      : "PENDING",
  };
}

function badId(id: string, res: Response): boolean {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: "Invalid ID" });
    return true;
  }
  return false;
}

// Returns undefined (not given), null (invalid or in the past) or a Date
function parseFutureDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return d < startOfToday ? null : d;
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface TransitionConfig {
  from: "PENDING" | "ACCEPTED";
  to: "ACCEPTED" | "REJECTED" | "SHIPPED";
  action: ApprovalAction;
  set: Record<string, any>;
  comment: string;
  notificationTitle: string;
  notificationMessage: (poNumber: string) => string;
  notificationType: "SUCCESS" | "ALERT";
  metadata?: Record<string, any>;
}

async function runTransition(
  req: AuthenticatedRequest,
  res: Response,
  cfg: TransitionConfig,
): Promise<void> {
  const { id } = req.params;
  const fromFilter =
    cfg.from === "PENDING" ? pendingFilter() : { supplierStatus: cfg.from };

  // One atomic update: it succeeds only if the order belongs to this vendor AND is in the expected state.
  // This also prevents two quick clicks from applying the same change twice.
  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: id, supplierId: req.supplierId, status: "SUBMITTED", ...fromFilter },
    { $set: { supplierStatus: cfg.to, ...cfg.set } },
    { new: true },
  )
    .select(VENDOR_FIELDS)
    .lean();

  if (!po) {
    const existing = await PurchaseOrder.findOne({
      _id: id,
      supplierId: req.supplierId,
      submittedAt: { $exists: true },
    })
      .select("status supplierStatus")
      .lean();

    if (!existing) {
      res
        .status(404)
        .json({ success: false, message: "Purchase order not found" });
      return;
    }

    const current = VALID_SUPPLIER_STATUSES.includes(
      existing.supplierStatus as string,
    )
      ? existing.supplierStatus
      : "PENDING";
    res.status(409).json({
      success: false,
      message: `This order cannot be changed now. Order status: ${existing.status}, vendor status: ${current}.`,
    });
    return;
  }

  await ApprovalLog.create({
    purchaseOrderId: po._id,
    action: cfg.action,
    performedBy: new mongoose.Types.ObjectId(req.user!.id),
    comments: cfg.comment,
    metadata: { from: cfg.from, to: cfg.to, ...(cfg.metadata || {}) },
  });

  await Notification.create({
    title: cfg.notificationTitle,
    message: cfg.notificationMessage(po.purchaseOrderNumber),
    type: cfg.notificationType,
    link: `/purchase-orders/${po._id}`,
  });

  res.status(200).json({ success: true, data: toVendorView(po) });
}

export class VendorController {
  // ---------- Overview ----------
  public static async getOverview(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const base = visibleFilter(req);

      const [awaitingResponse, toShip, inTransit, rejected, received] =
        await Promise.all([
          PurchaseOrder.countDocuments({
            ...base,
            status: "SUBMITTED",
            ...pendingFilter(),
          }),
          PurchaseOrder.countDocuments({
            ...base,
            status: "SUBMITTED",
            supplierStatus: "ACCEPTED",
          }),
          PurchaseOrder.countDocuments({
            ...base,
            status: "SUBMITTED",
            supplierStatus: "SHIPPED",
          }),
          PurchaseOrder.countDocuments({ ...base, supplierStatus: "REJECTED" }),
          PurchaseOrder.countDocuments({ ...base, status: "RECEIVED" }),
        ]);

      res.status(200).json({
        success: true,
        data: { awaitingResponse, toShip, inTransit, rejected, received },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Purchase orders ----------
  public static async listOrders(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { supplierStatus, search, page = 1, limit = 25 } = req.query;
      const query: any = { ...visibleFilter(req) };

      if (supplierStatus === "PENDING") {
        Object.assign(query, pendingFilter());
      } else if (
        typeof supplierStatus === "string" &&
        NON_PENDING.includes(supplierStatus)
      ) {
        query.supplierStatus = supplierStatus;
      }

      if (search) {
        const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.purchaseOrderNumber = { $regex: escaped, $options: "i" };
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));

      const [orders, total] = await Promise.all([
        PurchaseOrder.find(query)
          .select(VENDOR_FIELDS)
          .sort({ submittedAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        PurchaseOrder.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: orders.map(toVendorView),
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getOrder(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      const po = await PurchaseOrder.findOne({ _id: id, ...visibleFilter(req) })
        .select(VENDOR_FIELDS)
        .lean();

      if (!po) {
        res
          .status(404)
          .json({ success: false, message: "Purchase order not found" });
        return;
      }

      res.status(200).json({ success: true, data: toVendorView(po) });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async acceptOrder(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (badId(req.params.id, res)) return;

      const delivery = parseFutureDate(req.body?.expectedDeliveryDate);
      if (delivery === null) {
        res
          .status(400)
          .json({
            success: false,
            message: "Expected delivery date is invalid or in the past",
          });
        return;
      }

      const note = cleanText(req.body?.note, 500);
      await runTransition(req, res, {
        from: "PENDING",
        to: "ACCEPTED",
        action: "VENDOR_ACCEPTED",
        set: {
          supplierRespondedAt: new Date(),
          ...(note ? { vendorNote: note } : {}),
          ...(delivery ? { expectedDeliveryDate: delivery } : {}),
        },
        comment: `Vendor ${req.user!.name} accepted the order${note ? `: ${note}` : ""}`,
        notificationTitle: "Vendor accepted a purchase order",
        notificationMessage: (n) =>
          `${req.user!.name} accepted purchase order ${n}.`,
        notificationType: "SUCCESS",
        metadata: delivery ? { expectedDeliveryDate: delivery } : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async rejectOrder(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (badId(req.params.id, res)) return;

      const reason = cleanText(req.body?.reason, 500);
      if (reason.length < 5) {
        res
          .status(400)
          .json({
            success: false,
            message: "Please give a reason of at least 5 characters",
          });
        return;
      }

      await runTransition(req, res, {
        from: "PENDING",
        to: "REJECTED",
        action: "VENDOR_REJECTED",
        set: { supplierRespondedAt: new Date(), vendorNote: reason },
        comment: `Vendor ${req.user!.name} rejected the order: ${reason}`,
        notificationTitle: "Vendor rejected a purchase order",
        notificationMessage: (n) =>
          `${req.user!.name} rejected purchase order ${n}. Reason: ${reason}`,
        notificationType: "ALERT",
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async shipOrder(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (badId(req.params.id, res)) return;

      const delivery = parseFutureDate(req.body?.expectedDeliveryDate);
      if (delivery === null) {
        res
          .status(400)
          .json({
            success: false,
            message: "Expected delivery date is invalid or in the past",
          });
        return;
      }

      const trackingRef = cleanText(req.body?.trackingRef, 80);
      const note = cleanText(req.body?.note, 500);

      await runTransition(req, res, {
        from: "ACCEPTED",
        to: "SHIPPED",
        action: "VENDOR_SHIPPED",
        set: {
          shippedAt: new Date(),
          ...(trackingRef ? { trackingRef } : {}),
          ...(note ? { vendorNote: note } : {}),
          ...(delivery ? { expectedDeliveryDate: delivery } : {}),
        },
        comment: `Vendor ${req.user!.name} shipped the order${trackingRef ? ` (tracking: ${trackingRef})` : ""}`,
        notificationTitle: "Vendor shipped a purchase order",
        notificationMessage: (n) =>
          `${req.user!.name} shipped purchase order ${n}${trackingRef ? `. Tracking: ${trackingRef}` : ""}.`,
        notificationType: "SUCCESS",
        metadata: {
          trackingRef: trackingRef || undefined,
          expectedDeliveryDate: delivery || undefined,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Profile ----------
  public static async getProfile(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      const supplier = await Supplier.findById(req.supplierId)
        .select(
          "name email phone address leadTimeDays supportedCategories reliabilityScore rating approved active approvedAt",
        )
        .lean();

      if (!supplier) {
        res
          .status(404)
          .json({ success: false, message: "Vendor profile not found" });
        return;
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateProfile(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      // A vendor may change only contact details. Lead time, categories, rating, reliability
      // and approval status stay under the control of the warehouse team and the Super Admin.
      const update: Record<string, string> = {};

      if (req.body?.phone !== undefined) {
        const phone = cleanText(req.body.phone, 30);
        if (phone.replace(/\D/g, "").length < 7) {
          res
            .status(400)
            .json({ success: false, message: "Phone number is not valid" });
          return;
        }
        update.phone = phone;
      }

      if (req.body?.address !== undefined) {
        const address = cleanText(req.body.address, 200);
        if (address.length < 5) {
          res
            .status(400)
            .json({ success: false, message: "Address is too short" });
          return;
        }
        update.address = address;
      }

      if (Object.keys(update).length === 0) {
        res
          .status(400)
          .json({
            success: false,
            message: "Nothing to update. You can change phone and address.",
          });
        return;
      }

      const supplier = await Supplier.findByIdAndUpdate(
        req.supplierId,
        update,
        { new: true },
      )
        .select(
          "name email phone address leadTimeDays supportedCategories reliabilityScore rating approved active",
        )
        .lean();

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

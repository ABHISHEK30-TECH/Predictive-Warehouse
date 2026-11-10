import { Response } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { ApprovalLog } from '../models/ApprovalLog.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { ApprovalService } from '../services/approvalService.js';
import { ReorderingService } from '../services/reorderingService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';

export class PurchaseOrderController {
  public static async getPurchaseOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, supplierId, search, page = 1, limit = 50 } = req.query;
      const query: any = {};

      if (status) {
        query.status = status;
      }
      if (supplierId && mongoose.Types.ObjectId.isValid(supplierId as string)) {
        query.supplierId = supplierId;
      }
      if (search) {
        query.purchaseOrderNumber = { $regex: search as string, $options: 'i' };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [orders, total] = await Promise.all([
        PurchaseOrder.find(query)
          .populate('supplierId', 'name email reliabilityScore leadTimeDays approved')
          .populate('createdBy', 'name email role')
          .populate('approvedBy', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        PurchaseOrder.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: orders,
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

  public static async getPurchaseOrderById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const po = await PurchaseOrder.findById(req.params.id)
        .populate('supplierId')
        .populate('createdBy', 'name email role department')
        .populate('approvedBy', 'name email role department')
        .populate('rejectedBy', 'name email role department')
        .populate('items.productId');

      if (!po) {
        res.status(404).json({ success: false, message: 'Purchase order not found' });
        return;
      }

      const auditLogs = await ApprovalLog.find({ purchaseOrderId: po._id })
        .populate('performedBy', 'name email role')
        .sort({ timestamp: -1 });

      res.status(200).json({
        success: true,
        data: {
          ...po.toObject(),
          auditLogs,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createPurchaseOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { supplierId, items, expectedDeliveryDate, notes } = req.body;

      if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ success: false, message: 'Supplier ID and items array are required' });
        return;
      }

      const supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      if (!supplier.approved) {
        res.status(400).json({
          success: false,
          message: 'Selected supplier is not pre-approved. Orders may only be created for pre-approved suppliers.',
        });
        return;
      }

      let calculatedTotal = 0;
      const formattedItems = [];

      for (const it of items) {
        const prod = await Product.findById(it.productId);
        if (!prod) {
          res.status(404).json({ success: false, message: `Product ${it.productId} not found` });
          return;
        }

        const qty = Number(it.quantity) || 1;
        const price = Number(it.unitPrice !== undefined ? it.unitPrice : prod.unitPrice);
        const subtotal = Math.round(qty * price * 100) / 100;
        calculatedTotal += subtotal;

        formattedItems.push({
          productId: prod._id,
          sku: prod.sku,
          name: prod.name,
          quantity: qty,
          unitPrice: price,
          subtotal,
        });
      }

      const poCount = await PurchaseOrder.countDocuments();
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(5, '0')}`;
      const delivery = expectedDeliveryDate
        ? new Date(expectedDeliveryDate)
        : new Date(Date.now() + supplier.leadTimeDays * 86400000);

      const po = await PurchaseOrder.create({
        purchaseOrderNumber: poNumber,
        supplierId: supplier._id,
        items: formattedItems,
        totalAmount: calculatedTotal,
        status: 'DRAFT',
        createdBy: req.user ? new mongoose.Types.ObjectId(req.user.id) : new mongoose.Types.ObjectId(),
        expectedDeliveryDate: delivery,
        notes,
      });

      await ApprovalLog.create({
        purchaseOrderId: po._id,
        action: 'CREATED',
        performedBy: po.createdBy,
        comments: 'Purchase order draft created manually by inventory staff',
        newStatus: 'DRAFT',
      });

      res.status(201).json({ success: true, data: po });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async autoRecommend(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const recommendations = await ReorderingService.generateReorderRecommendations();
      const createdOrders = await ReorderingService.autoCreateDraftPurchaseOrders(req.user?.id);

      res.status(200).json({
        success: true,
        message: `Generated ${recommendations.length} recommendations and created ${createdOrders.length} draft purchase orders`,
        data: {
          recommendations,
          createdOrders,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async submitForApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { comments } = req.body;
      const updatedPO = await ApprovalService.submitForApproval(req.params.id, req.user, comments);
      res.status(200).json({
        success: true,
        message: 'Purchase order successfully submitted for manager approval',
        data: updatedPO,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async approveOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { comments } = req.body;
      const updatedPO = await ApprovalService.approveOrder(req.params.id, req.user, comments);
      res.status(200).json({
        success: true,
        message: 'Purchase order approved. Eligible for supplier dispatch.',
        data: updatedPO,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async rejectOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { reason } = req.body;
      const updatedPO = await ApprovalService.rejectOrder(req.params.id, req.user, reason);
      res.status(200).json({
        success: true,
        message: 'Purchase order has been rejected',
        data: updatedPO,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async submitToSupplier(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const result = await ApprovalService.submitToSupplier(req.params.id, req.user);
      res.status(200).json({
        success: true,
        message: 'Purchase order electronically submitted to supplier',
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  public static async receiveOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const po = await PurchaseOrder.findById(req.params.id);
      if (!po) {
        res.status(404).json({ success: false, message: 'Purchase order not found' });
        return;
      }

      if (po.status !== 'SUBMITTED' && po.status !== 'PARTIALLY_RECEIVED') {
        res.status(400).json({
          success: false,
          message: `Cannot receive PO with status '${po.status}'. Must be SUBMITTED or PARTIALLY_RECEIVED.`,
        });
        return;
      }

      // Automatically replenish product stocks in warehouse
      for (const item of po.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          const oldStock = prod.currentStock;
          prod.currentStock += item.quantity;
          await prod.save();

          await InventoryMovement.create({
            productId: prod._id,
            warehouseId: prod.warehouseId,
            movementType: 'INBOUND',
            quantity: item.quantity,
            previousStock: oldStock,
            newStock: prod.currentStock,
            reference: `RECEIPT_PO_${po.purchaseOrderNumber}`,
            notes: `Inventory replenished upon receiving PO ${po.purchaseOrderNumber}`,
            performedBy: req.user ? new mongoose.Types.ObjectId(req.user.id) : undefined,
          });
        }
      }

      po.status = 'RECEIVED';
      await po.save();

      await ApprovalLog.create({
        purchaseOrderId: po._id,
        action: 'STATUS_CHANGE',
        performedBy: req.user ? new mongoose.Types.ObjectId(req.user.id) : po.createdBy,
        comments: 'Purchase order marked as fully received. Inventory replenished.',
        previousStatus: 'SUBMITTED',
        newStatus: 'RECEIVED',
      });

      res.status(200).json({
        success: true,
        message: 'Purchase order items received and added to inventory',
        data: po,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

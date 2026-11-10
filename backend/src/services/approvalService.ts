import mongoose from 'mongoose';
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder.js';
import { Supplier } from '../models/Supplier.js';
import { ApprovalLog } from '../models/ApprovalLog.js';
import { Notification } from '../models/Notification.js';
import { SupplierIntegrationService } from './supplierIntegrationService.js';
import { JwtPayload } from '../utils/jwt.js';

export class ApprovalService {
  /**
   * Submits a draft purchase order for manager approval review
   */
  public static async submitForApproval(
    purchaseOrderId: string,
    user: JwtPayload,
    comments?: string
  ): Promise<IPurchaseOrder> {
    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== 'DRAFT' && po.status !== 'REJECTED') {
      throw new Error(`Cannot submit PO for approval when status is '${po.status}'`);
    }

    const previousStatus = po.status;
    po.status = 'PENDING_APPROVAL';
    await po.save();

    await ApprovalLog.create({
      purchaseOrderId: po._id,
      action: 'SUBMITTED_FOR_APPROVAL',
      performedBy: new mongoose.Types.ObjectId(user.id),
      comments: comments || 'Submitted for manager review and authorization',
      previousStatus,
      newStatus: 'PENDING_APPROVAL',
    });

    await Notification.create({
      title: `PO Pending Approval: ${po.purchaseOrderNumber}`,
      message: `Purchase order ${po.purchaseOrderNumber} ($${po.totalAmount.toLocaleString()}) submitted by ${user.name} awaiting manager authorization.`,
      type: 'WARNING',
      link: `/purchase-orders/${po._id}`,
    });

    return po;
  }

  /**
   * Authorizes and approves a purchase order (Admin or Warehouse Manager ONLY)
   */
  public static async approveOrder(
    purchaseOrderId: string,
    user: JwtPayload,
    comments?: string
  ): Promise<IPurchaseOrder> {
    if (user.role !== 'Admin' && user.role !== 'Warehouse Manager') {
      throw new Error('Unauthorized: Only Admin and Warehouse Manager can approve purchase orders.');
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    if (po.status !== 'PENDING_APPROVAL' && po.status !== 'DRAFT') {
      throw new Error(`Cannot approve purchase order with status '${po.status}'`);
    }

    const previousStatus = po.status;
    po.status = 'APPROVED';
    po.approvedBy = new mongoose.Types.ObjectId(user.id);
    po.approvedAt = new Date();
    await po.save();

    await ApprovalLog.create({
      purchaseOrderId: po._id,
      action: 'APPROVED',
      performedBy: new mongoose.Types.ObjectId(user.id),
      comments: comments || 'Authorized and approved by Warehouse Manager',
      previousStatus,
      newStatus: 'APPROVED',
    });

    await Notification.create({
      title: `PO Approved: ${po.purchaseOrderNumber}`,
      message: `Order approved by ${user.name}. Eligible for electronic supplier dispatch.`,
      type: 'SUCCESS',
      link: `/purchase-orders/${po._id}`,
    });

    return po;
  }

  /**
   * Rejects a purchase order with reason (Admin or Warehouse Manager ONLY)
   */
  public static async rejectOrder(
    purchaseOrderId: string,
    user: JwtPayload,
    reason: string
  ): Promise<IPurchaseOrder> {
    if (user.role !== 'Admin' && user.role !== 'Warehouse Manager') {
      throw new Error('Unauthorized: Only Admin and Warehouse Manager can reject purchase orders.');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('A valid rejection reason must be provided.');
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    const previousStatus = po.status;
    po.status = 'REJECTED';
    po.rejectedBy = new mongoose.Types.ObjectId(user.id);
    po.rejectedAt = new Date();
    po.rejectionReason = reason;
    await po.save();

    await ApprovalLog.create({
      purchaseOrderId: po._id,
      action: 'REJECTED',
      performedBy: new mongoose.Types.ObjectId(user.id),
      comments: `Rejected: ${reason}`,
      previousStatus,
      newStatus: 'REJECTED',
    });

    await Notification.create({
      title: `PO Rejected: ${po.purchaseOrderNumber}`,
      message: `Order was rejected by ${user.name}. Reason: ${reason}`,
      type: 'ALERT',
      link: `/purchase-orders/${po._id}`,
    });

    return po;
  }

  /**
   * Submits an approved purchase order to the external supplier via integration layer.
   * Strictly enforces: PO MUST BE IN 'APPROVED' STATE.
   */
  public static async submitToSupplier(
    purchaseOrderId: string,
    user: JwtPayload
  ): Promise<{ purchaseOrder: IPurchaseOrder; submissionResult: any }> {
    if (user.role !== 'Admin' && user.role !== 'Warehouse Manager') {
      throw new Error('Unauthorized: Only Admin and Warehouse Manager can submit purchase orders to suppliers.');
    }

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) {
      throw new Error('Purchase order not found');
    }

    // STRICT BUSINESS RULE: MUST BE APPROVED FIRST
    if (po.status !== 'APPROVED') {
      throw new Error(
        `Business Rule Violation: Purchase Order ${po.purchaseOrderNumber} cannot be submitted to supplier because it is '${po.status}'. It MUST be explicitly APPROVED by a manager first.`
      );
    }

    const supplier = await Supplier.findById(po.supplierId);
    if (!supplier) {
      throw new Error('Assigned supplier not found');
    }

    if (!supplier.approved) {
      throw new Error(
        `Supplier '${supplier.name}' is not pre-approved. Orders can only be submitted to pre-approved suppliers.`
      );
    }

    const result = await SupplierIntegrationService.dispatchOrderToSupplier(supplier, po);

    if (!result.success) {
      throw new Error(`Supplier Dispatch Failed: ${result.statusMessage}`);
    }

    const previousStatus = po.status;
    po.status = 'SUBMITTED';
    po.submittedAt = new Date();
    po.supplierSubmissionRef = result.externalReference;
    po.supplierStatus = result.statusMessage;
    if (result.estimatedFulfillmentDate) {
      po.expectedDeliveryDate = result.estimatedFulfillmentDate;
    }
    await po.save();

    await ApprovalLog.create({
      purchaseOrderId: po._id,
      action: 'SUBMITTED_TO_SUPPLIER',
      performedBy: new mongoose.Types.ObjectId(user.id),
      comments: `Transmitted electronically to ${supplier.name}. Ref: ${result.externalReference}`,
      previousStatus,
      newStatus: 'SUBMITTED',
      metadata: result,
    });

    await Notification.create({
      title: `PO Dispatched to Supplier: ${po.purchaseOrderNumber}`,
      message: `Order successfully confirmed by ${supplier.name}. Tracking ID: ${result.supplierConfirmationId}`,
      type: 'SUCCESS',
      link: `/purchase-orders/${po._id}`,
    });

    return { purchaseOrder: po, submissionResult: result };
  }
}

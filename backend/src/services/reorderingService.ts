import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Supplier, ISupplier } from '../models/Supplier.js';
import { PurchaseOrder, IPurchaseOrder } from '../models/PurchaseOrder.js';
import { StockoutRisk } from '../models/StockoutRisk.js';
import { ApprovalLog } from '../models/ApprovalLog.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { StockoutService } from './stockoutService.js';
import { addDays } from 'date-fns';

export interface ReorderRecommendation {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedQuantity: number;
  estimatedCost: number;
  riskLevel: string;
  selectedSupplier: {
    id: string;
    name: string;
    leadTimeDays: number;
    reliabilityScore: number;
  };
  reason: string;
}

export class ReorderingService {
  /**
   * Scans inventory for products at risk and prepares purchase order recommendations
   */
  public static async generateReorderRecommendations(): Promise<ReorderRecommendation[]> {
    // Refresh risk evaluations
    const risks = await StockoutService.evaluateAllProducts();
    const recommendations: ReorderRecommendation[] = [];

    for (const risk of risks) {
      if (risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH' || risk.recommendedReorderQuantity > 0) {
        const product = await Product.findById(risk.productId).populate('supplierIds');
        if (!product) continue;

        // Check if an active open draft or pending approval PO already exists containing this product
        const existingActivePO = await PurchaseOrder.findOne({
          'items.productId': product._id,
          status: { $in: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'] },
        });

        if (existingActivePO) {
          // Prevent redundant reordering
          continue;
        }

        // Find eligible pre-approved suppliers
        const eligibleSuppliers = await Supplier.find({
          approved: true,
          active: true,
          $or: [
            { _id: { $in: product.supplierIds } },
            { supportedCategories: product.category },
          ],
        });

        if (eligibleSuppliers.length === 0) {
          console.warn(
            `[Reordering] No pre-approved active supplier found for product ${product.sku} (${product.category})`
          );
          continue;
        }

        // Rank suppliers: prioritize reliability score (70% weight) and lower lead time (30% weight)
        const sortedSuppliers = eligibleSuppliers.sort((a, b) => {
          const scoreA = a.reliabilityScore - a.leadTimeDays * 2;
          const scoreB = b.reliabilityScore - b.leadTimeDays * 2;
          return scoreB - scoreA;
        });

        const bestSupplier = sortedSuppliers[0];
        const quantity = Math.max(risk.recommendedReorderQuantity, product.safetyStock * 2);
        const estimatedCost = Math.round(quantity * product.unitPrice * 100) / 100;

        recommendations.push({
          productId: product._id.toString(),
          productName: product.name,
          sku: product.sku,
          currentStock: product.currentStock,
          safetyStock: product.safetyStock,
          reorderPoint: product.reorderPoint,
          recommendedQuantity: quantity,
          estimatedCost,
          riskLevel: risk.riskLevel,
          selectedSupplier: {
            id: bestSupplier._id.toString(),
            name: bestSupplier.name,
            leadTimeDays: bestSupplier.leadTimeDays,
            reliabilityScore: bestSupplier.reliabilityScore,
          },
          reason: risk.riskExplanation,
        });
      }
    }

    return recommendations;
  }

  /**
   * Automatically creates draft Purchase Orders from recommended replenishment candidates
   */
  public static async autoCreateDraftPurchaseOrders(systemUserId?: string): Promise<IPurchaseOrder[]> {
    const recommendations = await this.generateReorderRecommendations();
    const createdPOs: IPurchaseOrder[] = [];

    let fallbackUser = systemUserId ? await User.findById(systemUserId) : null;
    if (!fallbackUser) {
      fallbackUser = await User.findOne({ role: 'Admin' });
    }

    const creatorId = fallbackUser?._id || new mongoose.Types.ObjectId();

    for (const rec of recommendations) {
      // Re-verify no duplicate was created concurrently
      const duplicateCheck = await PurchaseOrder.findOne({
        'items.productId': rec.productId,
        status: { $in: ['DRAFT', 'PENDING_APPROVAL'] },
      });

      if (duplicateCheck) continue;

      const product = await Product.findById(rec.productId);
      if (!product) continue;

      const poCount = await PurchaseOrder.countDocuments();
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(5, '0')}`;
      const deliveryDate = addDays(new Date(), rec.selectedSupplier.leadTimeDays);

      const po = await PurchaseOrder.create({
        purchaseOrderNumber: poNumber,
        supplierId: rec.selectedSupplier.id,
        items: [
          {
            productId: product._id,
            sku: product.sku,
            name: product.name,
            quantity: rec.recommendedQuantity,
            unitPrice: product.unitPrice,
            subtotal: rec.estimatedCost,
          },
        ],
        totalAmount: rec.estimatedCost,
        status: 'DRAFT',
        createdBy: creatorId,
        expectedDeliveryDate: deliveryDate,
        notes: `System-generated replenishment recommendation based on ${rec.riskLevel} stockout risk. ${rec.reason}`,
        isAutoRecommended: true,
      });

      // Audit Log
      await ApprovalLog.create({
        purchaseOrderId: po._id,
        action: 'CREATED',
        performedBy: creatorId,
        comments: `Automated reordering engine generated draft recommendation for SKU: ${product.sku}`,
        newStatus: 'DRAFT',
      });

      // In-App Notification
      await Notification.create({
        title: `Draft PO Created: ${po.purchaseOrderNumber}`,
        message: `Replenishment recommendation generated for ${product.name} (${rec.recommendedQuantity} units). Ready for manager review.`,
        type: 'INFO',
        link: `/purchase-orders/${po._id}`,
      });

      createdPOs.push(po);
    }

    return createdPOs;
  }
}

import { Request, Response } from 'express';
import { Product } from '../models/Product.js';
import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { StockoutRisk } from '../models/StockoutRisk.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Forecast } from '../models/Forecast.js';

export class DashboardController {
  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [
        products,
        activeSuppliersCount,
        pendingPOsCount,
        recentMovements,
        recentPOs,
        stockoutRisks,
      ] = await Promise.all([
        Product.find().select('currentStock unitPrice safetyStock reorderPoint status category'),
        Supplier.countDocuments({ active: true, approved: true }),
        PurchaseOrder.countDocuments({ status: 'PENDING_APPROVAL' }),
        InventoryMovement.find()
          .populate('productId', 'name sku')
          .populate('warehouseId', 'name')
          .sort({ timestamp: -1 })
          .limit(6),
        PurchaseOrder.find()
          .populate('supplierId', 'name')
          .sort({ createdAt: -1 })
          .limit(6),
        StockoutRisk.find().populate('productId', 'name sku currentStock safetyStock'),
      ]);

      const totalProducts = products.length;
      const totalInventoryValue = products.reduce(
        (sum, p) => sum + p.currentStock * p.unitPrice,
        0
      );

      const lowStockProductsCount = products.filter(
        (p) => p.currentStock <= p.reorderPoint
      ).length;

      const criticalRisksCount = stockoutRisks.filter(
        (r) => r.riskLevel === 'CRITICAL'
      ).length;

      const highRisksCount = stockoutRisks.filter(
        (r) => r.riskLevel === 'HIGH'
      ).length;

      const predictedStockoutsCount = criticalRisksCount + highRisksCount;

      // Inventory health distribution
      const health = {
        healthy: products.filter((p) => p.currentStock > p.reorderPoint).length,
        warning: products.filter(
          (p) => p.currentStock <= p.reorderPoint && p.currentStock > p.safetyStock
        ).length,
        critical: products.filter((p) => p.currentStock <= p.safetyStock).length,
      };

      // Aggregated recent forecasts for the charts
      const sampleForecasts = await Forecast.find({ horizonDays: 30 })
        .populate('productId', 'name sku')
        .limit(5);

      res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalProducts,
            totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
            lowStockProducts: lowStockProductsCount,
            predictedStockouts: predictedStockoutsCount,
            criticalStockouts: criticalRisksCount,
            pendingPurchaseOrders: pendingPOsCount,
            activeSuppliers: activeSuppliersCount,
          },
          inventoryHealth: health,
          recentMovements,
          recentPurchaseOrders: recentPOs,
          topRisks: stockoutRisks.slice(0, 5),
          sampleForecasts,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const [criticalRisks, pendingApprovals] = await Promise.all([
        StockoutRisk.find({ riskLevel: { $in: ['CRITICAL', 'HIGH'] } })
          .populate('productId', 'name sku currentStock safetyStock reorderPoint')
          .sort({ daysUntilStockout: 1 }),
        PurchaseOrder.find({ status: 'PENDING_APPROVAL' })
          .populate('supplierId', 'name')
          .populate('createdBy', 'name')
          .sort({ createdAt: -1 }),
      ]);

      const alerts: any[] = [];

      for (const r of criticalRisks) {
        alerts.push({
          id: `stockout-${r._id}`,
          severity: r.riskLevel === 'CRITICAL' ? 'critical' : 'warning',
          title: `${r.riskLevel} Stockout Risk: ${(r.productId as any)?.name || 'Product'} (${(r.productId as any)?.sku})`,
          message: r.riskExplanation,
          date: r.calculatedAt,
          actionUrl: '/stockout',
          actionText: 'View Stockout Details',
        });
      }

      for (const po of pendingApprovals) {
        alerts.push({
          id: `approval-${po._id}`,
          severity: 'info',
          title: `Action Required: PO ${po.purchaseOrderNumber} Pending Approval`,
          message: `Purchase Order totaling $${po.totalAmount.toLocaleString()} submitted by ${(po.createdBy as any)?.name || 'Staff'} requires manager authorization before supplier dispatch.`,
          date: po.createdAt,
          actionUrl: `/purchase-orders/${po._id}`,
          actionText: 'Review & Authorize',
        });
      }

      res.status(200).json({
        success: true,
        data: alerts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

import { Request, Response } from 'express';
import { Product } from '../models/Product.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { StockoutRisk } from '../models/StockoutRisk.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Supplier } from '../models/Supplier.js';

export class ReportController {
  public static async getInventoryReport(req: Request, res: Response): Promise<void> {
    try {
      const products = await Product.find()
        .populate('warehouseId', 'name code location')
        .sort({ category: 1 });

      const categoryMap: Record<string, { count: number; value: number; stock: number }> = {};
      let totalValue = 0;
      let totalStock = 0;

      for (const p of products) {
        const val = p.currentStock * p.unitPrice;
        totalValue += val;
        totalStock += p.currentStock;

        if (!categoryMap[p.category]) {
          categoryMap[p.category] = { count: 0, value: 0, stock: 0 };
        }
        categoryMap[p.category].count += 1;
        categoryMap[p.category].value += Math.round(val * 100) / 100;
        categoryMap[p.category].stock += p.currentStock;
      }

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalProducts: products.length,
            totalStock,
            totalValue: Math.round(totalValue * 100) / 100,
          },
          categoryBreakdown: categoryMap,
          products: products.map((p) => ({
            sku: p.sku,
            name: p.name,
            category: p.category,
            currentStock: p.currentStock,
            unitPrice: p.unitPrice,
            inventoryValue: Math.round(p.currentStock * p.unitPrice * 100) / 100,
            warehouse: (p.warehouseId as any)?.name || 'Central',
            reorderPoint: p.reorderPoint,
            safetyStock: p.safetyStock,
            status: p.status,
          })),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getStockoutReport(req: Request, res: Response): Promise<void> {
    try {
      const risks = await StockoutRisk.find()
        .populate('productId', 'name sku category currentStock safetyStock reorderPoint unitPrice')
        .sort({ daysUntilStockout: 1 });

      const summary = {
        totalEvaluated: risks.length,
        critical: risks.filter((r) => r.riskLevel === 'CRITICAL').length,
        high: risks.filter((r) => r.riskLevel === 'HIGH').length,
        medium: risks.filter((r) => r.riskLevel === 'MEDIUM').length,
        low: risks.filter((r) => r.riskLevel === 'LOW').length,
        totalRecommendedReorderUnits: risks.reduce((acc, r) => acc + r.recommendedReorderQuantity, 0),
      };

      res.status(200).json({
        success: true,
        data: {
          summary,
          riskList: risks,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getPurchaseOrderReport(req: Request, res: Response): Promise<void> {
    try {
      const orders = await PurchaseOrder.find()
        .populate('supplierId', 'name reliabilityScore leadTimeDays')
        .populate('createdBy', 'name')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 });

      const statusBreakdown: Record<string, { count: number; totalAmount: number }> = {};
      let grandTotal = 0;

      for (const po of orders) {
        grandTotal += po.totalAmount;
        if (!statusBreakdown[po.status]) {
          statusBreakdown[po.status] = { count: 0, totalAmount: 0 };
        }
        statusBreakdown[po.status].count += 1;
        statusBreakdown[po.status].totalAmount += Math.round(po.totalAmount * 100) / 100;
      }

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalOrders: orders.length,
            totalSpend: Math.round(grandTotal * 100) / 100,
            statusBreakdown,
          },
          orders,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

import { Request, Response } from 'express';
import { StockoutService } from '../services/stockoutService.js';
import { Product } from '../models/Product.js';
import { StockoutRisk } from '../models/StockoutRisk.js';

export class StockoutController {
  public static async getAllStockoutRisks(req: Request, res: Response): Promise<void> {
    try {
      const { level, refresh = 'false' } = req.query;

      if (refresh === 'true') {
        await StockoutService.evaluateAllProducts();
      }

      const query: any = {};
      if (level) {
        query.riskLevel = (level as string).toUpperCase();
      }

      const risks = await StockoutRisk.find(query)
        .populate({
          path: 'productId',
          select: 'name sku category currentStock safetyStock reorderPoint unitPrice warehouseId supplierIds',
          populate: [
            { path: 'warehouseId', select: 'name code location' },
            { path: 'supplierIds', select: 'name reliabilityScore leadTimeDays approved' },
          ],
        })
        .sort({ daysUntilStockout: 1, currentStock: 1 });

      // Group counts for dashboard summary
      const counts = {
        CRITICAL: await StockoutRisk.countDocuments({ riskLevel: 'CRITICAL' }),
        HIGH: await StockoutRisk.countDocuments({ riskLevel: 'HIGH' }),
        MEDIUM: await StockoutRisk.countDocuments({ riskLevel: 'MEDIUM' }),
        LOW: await StockoutRisk.countDocuments({ riskLevel: 'LOW' }),
      };

      res.status(200).json({
        success: true,
        data: risks,
        summary: counts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getProductStockoutRisk(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const risk = await StockoutService.evaluateProductRisk(product);
      res.status(200).json({
        success: true,
        data: risk,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

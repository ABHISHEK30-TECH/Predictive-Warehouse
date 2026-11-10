import mongoose from 'mongoose';
import { Product, IProduct } from '../models/Product.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { StockoutRisk, IStockoutRisk, RiskLevel } from '../models/StockoutRisk.js';
import { ForecastingService } from './forecastingService.js';
import { addDays } from 'date-fns';

export class StockoutService {
  /**
   * Evaluates stockout risk for a specific product
   */
  public static async evaluateProductRisk(product: IProduct): Promise<IStockoutRisk> {
    // Generate or get 30-day forecast to know future daily demand trajectory
    const forecast = await ForecastingService.generateForecast({
      productId: product._id.toString(),
      horizonDays: 30,
      method: 'SEASONAL',
    });

    const currentStock = product.currentStock;
    const safetyStock = product.safetyStock;
    const reorderPoint = product.reorderPoint;
    const leadTimeDays = product.leadTimeDays || 5;

    // Check if there are confirmed incoming purchase orders for this product
    const incomingPOs = await PurchaseOrder.find({
      'items.productId': product._id,
      status: { $in: ['APPROVED', 'SUBMITTED', 'PARTIALLY_RECEIVED'] },
    });

    const incomingConfirmedQuantity = incomingPOs.reduce((total, po) => {
      const item = po.items.find((i) => i.productId.toString() === product._id.toString());
      return total + (item ? item.quantity : 0);
    }, 0);

    // Calculate days until stockout by stepping through daily predicted demands
    let remainingStock = currentStock;
    let daysUntilStockout = 0;
    let daysUntilSafetyStockBreached = -1;

    for (let i = 0; i < forecast.dailyPredictions.length; i++) {
      const dailyQty = forecast.dailyPredictions[i].predictedQuantity;
      remainingStock -= dailyQty;

      if (remainingStock <= safetyStock && daysUntilSafetyStockBreached === -1) {
        daysUntilSafetyStockBreached = i + 1;
      }

      if (remainingStock <= 0) {
        daysUntilStockout = i + 1;
        break;
      }
    }

    // If stock lasts beyond the 30-day prediction window
    if (remainingStock > 0) {
      const avgDaily = forecast.baselineDemand > 0 ? forecast.baselineDemand : 1;
      daysUntilStockout = Math.round(30 + remainingStock / avgDaily);
    }

    const today = new Date();
    const estimatedStockoutDate = addDays(today, Math.max(daysUntilStockout, 0));
    const replenishmentDeadline = addDays(
      today,
      Math.max(daysUntilStockout - leadTimeDays, 0)
    );

    // Calculate Recommended Reorder Quantity:
    // Lead time demand + Safety Stock buffer - Current Available Stock
    const avgDailyRate = forecast.baselineDemand > 0 ? forecast.baselineDemand : 5;
    const leadTimeDemand = Math.round(avgDailyRate * leadTimeDays);
    const targetStockLevel = leadTimeDemand + safetyStock * 2;
    const effectiveStock = currentStock + incomingConfirmedQuantity;
    const recommendedReorderQuantity = Math.max(0, targetStockLevel - effectiveStock);

    // Determine Risk Level & Detailed Explanation
    let riskLevel: RiskLevel = 'LOW';
    let riskExplanation = '';

    const effectiveDaysToDepletion = daysUntilStockout;

    if (currentStock <= safetyStock || effectiveDaysToDepletion <= Math.max(1, Math.floor(leadTimeDays * 0.5))) {
      riskLevel = 'CRITICAL';
      riskExplanation = `CRITICAL: Current inventory (${currentStock} units) is at or below safety stock (${safetyStock} units). At the forecasted burn rate of ${avgDailyRate.toFixed(1)} units/day, stockout is projected in ${daysUntilStockout} days, which is well below the supplier lead time of ${leadTimeDays} days. Emergency replenishment is essential.`;
    } else if (
      currentStock <= reorderPoint ||
      effectiveDaysToDepletion <= leadTimeDays + 2 ||
      (daysUntilSafetyStockBreached !== -1 && daysUntilSafetyStockBreached <= leadTimeDays)
    ) {
      riskLevel = 'HIGH';
      riskExplanation = `HIGH RISK: Inventory is within reorder threshold (${currentStock} ≤ ${reorderPoint}). Safety stock will be breached in ${daysUntilSafetyStockBreached} days, which is within the supplier lead time window of ${leadTimeDays} days. Reorder must be placed immediately.`;
    } else if (
      currentStock <= reorderPoint * 1.3 ||
      effectiveDaysToDepletion <= leadTimeDays + 7
    ) {
      riskLevel = 'MEDIUM';
      riskExplanation = `MODERATE: Stock level is healthy today (${currentStock} units), but projected demand suggests inventory will dip toward reorder levels within ~${daysUntilStockout} days. Monitor incoming orders and lead times.`;
    } else {
      riskLevel = 'LOW';
      riskExplanation = `OPTIMAL: Inventory level is sufficient (${currentStock} units). Projected runway is approximately ${daysUntilStockout} days, exceeding lead time plus safety buffers.`;
    }

    if (incomingConfirmedQuantity > 0) {
      riskExplanation += ` (Note: ${incomingConfirmedQuantity} units are already in active replenishment pipeline).`;
    }

    // Persist or update risk prediction record
    const record = await StockoutRisk.findOneAndUpdate(
      { productId: product._id },
      {
        productId: product._id,
        currentStock,
        averageDailyDemand: avgDailyRate,
        leadTimeDays,
        safetyStock,
        reorderPoint,
        estimatedStockoutDate,
        daysUntilStockout,
        riskLevel,
        recommendedReorderQuantity,
        riskExplanation,
        replenishmentDeadline,
        calculatedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    return record;
  }

  /**
   * Evaluates all active warehouse products and returns comprehensive risk assessment
   */
  public static async evaluateAllProducts(): Promise<IStockoutRisk[]> {
    const products = await Product.find().populate('warehouseId');
    const results: IStockoutRisk[] = [];

    for (const prod of products) {
      try {
        const risk = await this.evaluateProductRisk(prod);
        results.push(risk);
      } catch (err: any) {
        console.error(`Error evaluating risk for product ${prod.sku}:`, err);
      }
    }

    return results;
  }
}

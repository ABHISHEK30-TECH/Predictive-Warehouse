import mongoose from 'mongoose';
import { DemandHistory } from '../models/DemandHistory.js';
import { Product } from '../models/Product.js';
import { Forecast, IForecast, IDailyPrediction } from '../models/Forecast.js';
import { addDays, format, subDays } from 'date-fns';

export interface ForecastOptions {
  productId: string;
  horizonDays?: 7 | 30 | 90;
  method?: 'MOVING_AVERAGE' | 'SEASONAL';
  historicalWindowDays?: number;
}

export class ForecastingService {
  /**
   * Generates or retrieves an up-to-date demand forecast for a product
   */
  public static async generateForecast(options: ForecastOptions): Promise<IForecast> {
    const {
      productId,
      horizonDays = 30,
      method = 'SEASONAL',
      historicalWindowDays = 30,
    } = options;

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // Fetch historical demand records
    const startDate = subDays(new Date(), Math.max(historicalWindowDays, 60));
    const demandRecords = await DemandHistory.find({
      productId: new mongoose.Types.ObjectId(productId),
      date: { $gte: startDate },
    }).sort({ date: -1 });

    let isBaselineFallback = false;
    let baselineDemand = product.averageDailyDemand || 10;
    let seasonalAdjustment = 1.0;
    let confidenceScore = 88;

    // If records are fewer than 7 days, fallback gracefully
    if (demandRecords.length < 7) {
      isBaselineFallback = true;
      confidenceScore = 45;
      console.warn(
        `[Forecasting] Insufficient demand history for product ${product.sku} (${demandRecords.length} records). Utilizing baseline fallback.`
      );
    } else {
      // Calculate Moving Average on the requested historical window
      const windowRecords = demandRecords.slice(0, historicalWindowDays);
      const totalQuantity = windowRecords.reduce((sum, rec) => sum + rec.quantitySold, 0);
      baselineDemand = Math.round((totalQuantity / windowRecords.length) * 100) / 100;
    }

    // Day-of-week demand multipliers (Sunday=0 to Saturday=6)
    const dayOfWeekSums = Array(7).fill(0);
    const dayOfWeekCounts = Array(7).fill(0);

    if (demandRecords.length >= 7) {
      for (const rec of demandRecords) {
        const d = new Date(rec.date);
        const dow = d.getUTCDay();
        dayOfWeekSums[dow] += rec.quantitySold;
        dayOfWeekCounts[dow] += 1;
      }
    }

    const overallAvg = baselineDemand > 0 ? baselineDemand : 1;
    const dayOfWeekMultipliers = dayOfWeekSums.map((sum, dow) => {
      if (dayOfWeekCounts[dow] === 0) return 1.0;
      const dowAvg = sum / dayOfWeekCounts[dow];
      const mult = dowAvg / overallAvg;
      // Clamp multiplier between 0.6 and 1.6 for stability
      return Math.min(Math.max(mult, 0.6), 1.6);
    });

    // Compute seasonal factors based on recent records
    if (!isBaselineFallback && demandRecords.length >= 14) {
      const avgSeasonal =
        demandRecords.reduce((sum, r) => sum + (r.seasonalFactor || 1.0), 0) /
        demandRecords.length;
      seasonalAdjustment = Math.round(avgSeasonal * 100) / 100;
      confidenceScore = Math.min(94, 75 + Math.min(demandRecords.length / 2, 20));
    }

    // Generate daily predictions for the entire horizon
    const dailyPredictions: IDailyPrediction[] = [];
    const today = new Date();
    let totalPredictedQuantity = 0;

    for (let i = 1; i <= horizonDays; i++) {
      const targetDate = addDays(today, i);
      const dow = targetDate.getUTCDay();

      let dailyQty = baselineDemand;

      if (method === 'SEASONAL' && !isBaselineFallback) {
        const dowMult = dayOfWeekMultipliers[dow] || 1.0;
        dailyQty = Math.round(baselineDemand * dowMult * seasonalAdjustment * 10) / 10;
      } else {
        // Pure moving average with mild variance
        dailyQty = Math.round(baselineDemand * 10) / 10;
      }

      // Ensure minimum non-negative demand
      dailyQty = Math.max(dailyQty, 0);
      totalPredictedQuantity += dailyQty;

      dailyPredictions.push({
        date: targetDate,
        predictedQuantity: dailyQty,
        seasonalFactor: seasonalAdjustment,
        dayOfWeek: dow,
      });
    }

    // Upsert or save forecast
    const forecast = await Forecast.findOneAndUpdate(
      {
        productId: product._id,
        horizonDays,
        method,
      },
      {
        forecastDate: new Date(),
        horizonDays,
        method,
        baselineDemand,
        seasonalAdjustment,
        predictedDemand: Math.round(totalPredictedQuantity),
        historicalWindowDays,
        confidenceScore,
        isBaselineFallback,
        dailyPredictions,
      },
      { new: true, upsert: true }
    );

    return forecast;
  }

  /**
   * Computes demand trends, comparing historical actuals with forecasts
   */
  public static async getForecastAnalytics(productId: string) {
    const product = await Product.findById(productId).populate('warehouseId');
    if (!product) {
      throw new Error(`Product not found`);
    }

    const past30Days = await DemandHistory.find({
      productId: new mongoose.Types.ObjectId(productId),
      date: { $gte: subDays(new Date(), 30) },
    }).sort({ date: 1 });

    const forecast30 = await this.generateForecast({
      productId,
      horizonDays: 30,
      method: 'SEASONAL',
    });

    return {
      product,
      historicalDemand: past30Days.map((d) => ({
        date: format(d.date, 'yyyy-MM-dd'),
        quantity: d.quantitySold,
        seasonalFactor: d.seasonalFactor,
      })),
      predictedDemand: forecast30.dailyPredictions.map((p) => ({
        date: format(p.date, 'yyyy-MM-dd'),
        predictedQuantity: p.predictedQuantity,
      })),
      summary: {
        baselineDailyDemand: forecast30.baselineDemand,
        totalPredicted30Days: forecast30.predictedDemand,
        confidenceScore: forecast30.confidenceScore,
        isBaselineFallback: forecast30.isBaselineFallback,
        method: forecast30.method,
      },
    };
  }
}

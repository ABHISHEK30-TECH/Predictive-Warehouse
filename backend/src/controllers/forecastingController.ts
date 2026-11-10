import { Request, Response } from 'express';
import { ForecastingService } from '../services/forecastingService.js';
import { Forecast } from '../models/Forecast.js';
import { Product } from '../models/Product.js';

export class ForecastingController {
  public static async getForecasts(req: Request, res: Response): Promise<void> {
    try {
      const { horizon = 30 } = req.query;
      const forecasts = await Forecast.find({ horizonDays: Number(horizon) })
        .populate('productId', 'name sku category currentStock unitPrice')
        .sort({ updatedAt: -1 });

      res.status(200).json({
        success: true,
        data: forecasts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async generateForecast(req: Request, res: Response): Promise<void> {
    try {
      const { productId, horizonDays = 30, method = 'SEASONAL', historicalWindowDays = 30 } = req.body;

      if (!productId) {
        res.status(400).json({ success: false, message: 'productId is required' });
        return;
      }

      const forecast = await ForecastingService.generateForecast({
        productId,
        horizonDays: Number(horizonDays) as 7 | 30 | 90,
        method,
        historicalWindowDays: Number(historicalWindowDays),
      });

      res.status(200).json({
        success: true,
        data: forecast,
        message: forecast.isBaselineFallback
          ? 'Forecast calculated with fallback baseline due to limited historical data'
          : 'Forecast successfully calculated using seasonal modeling',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getProductForecastAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const analytics = await ForecastingService.getForecastAnalytics(productId);
      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

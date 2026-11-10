import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDailyPrediction {
  date: Date;
  predictedQuantity: number;
  seasonalFactor: number;
  dayOfWeek: number;
}

export interface IForecast extends Document {
  productId: Types.ObjectId;
  forecastDate: Date;
  horizonDays: 7 | 30 | 90;
  method: 'MOVING_AVERAGE' | 'SEASONAL';
  baselineDemand: number;
  seasonalAdjustment: number;
  predictedDemand: number;
  historicalWindowDays: number;
  confidenceScore: number;
  isBaselineFallback: boolean;
  dailyPredictions: IDailyPrediction[];
  createdAt: Date;
  updatedAt: Date;
}

const DailyPredictionSchema = new Schema<IDailyPrediction>(
  {
    date: { type: Date, required: true },
    predictedQuantity: { type: Number, required: true },
    seasonalFactor: { type: Number, default: 1.0 },
    dayOfWeek: { type: Number },
  },
  { _id: false }
);

const ForecastSchema = new Schema<IForecast>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    forecastDate: { type: Date, default: Date.now, index: true },
    horizonDays: { type: Number, enum: [7, 30, 90], default: 30, required: true },
    method: {
      type: String,
      enum: ['MOVING_AVERAGE', 'SEASONAL'],
      required: true,
      default: 'SEASONAL',
    },
    baselineDemand: { type: Number, required: true },
    seasonalAdjustment: { type: Number, default: 1.0 },
    predictedDemand: { type: Number, required: true },
    historicalWindowDays: { type: Number, default: 30 },
    confidenceScore: { type: Number, default: 85 },
    isBaselineFallback: { type: Boolean, default: false },
    dailyPredictions: [DailyPredictionSchema],
  },
  { timestamps: true }
);

ForecastSchema.index({ productId: 1, horizonDays: 1, forecastDate: -1 });

export const Forecast = mongoose.model<IForecast>('Forecast', ForecastSchema);

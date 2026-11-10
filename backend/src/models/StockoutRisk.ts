import mongoose, { Schema, Document, Types } from 'mongoose';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IStockoutRisk extends Document {
  productId: Types.ObjectId;
  currentStock: number;
  averageDailyDemand: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  estimatedStockoutDate: Date;
  daysUntilStockout: number;
  riskLevel: RiskLevel;
  recommendedReorderQuantity: number;
  riskExplanation: string;
  replenishmentDeadline: Date;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockoutRiskSchema = new Schema<IStockoutRisk>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    currentStock: { type: Number, required: true },
    averageDailyDemand: { type: Number, required: true },
    leadTimeDays: { type: Number, required: true },
    safetyStock: { type: Number, required: true },
    reorderPoint: { type: Number, required: true },
    estimatedStockoutDate: { type: Date, required: true },
    daysUntilStockout: { type: Number, required: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    recommendedReorderQuantity: { type: Number, required: true },
    riskExplanation: { type: String, required: true },
    replenishmentDeadline: { type: Date, required: true },
    calculatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

StockoutRiskSchema.index({ riskLevel: 1, calculatedAt: -1 });

export const StockoutRisk = mongoose.model<IStockoutRisk>('StockoutRisk', StockoutRiskSchema);

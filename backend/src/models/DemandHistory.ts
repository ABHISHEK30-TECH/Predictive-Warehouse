import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDemandHistory extends Document {
  productId: Types.ObjectId;
  date: Date;
  quantitySold: number;
  seasonalFactor: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  month: number; // 1-12
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DemandHistorySchema = new Schema<IDemandHistory>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    date: { type: Date, required: true, index: true },
    quantitySold: { type: Number, required: true, min: 0 },
    seasonalFactor: { type: Number, default: 1.0 },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    month: { type: Number, min: 1, max: 12 },
    notes: { type: String },
  },
  { timestamps: true }
);

DemandHistorySchema.index({ productId: 1, date: -1 });

DemandHistorySchema.pre<IDemandHistory>('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    this.dayOfWeek = d.getUTCDay();
    this.month = d.getUTCMonth() + 1;
  }
  next();
});

export const DemandHistory = mongoose.model<IDemandHistory>(
  'DemandHistory',
  DemandHistorySchema
);

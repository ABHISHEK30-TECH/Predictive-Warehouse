import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  sku: string;
  description: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  safetyStock: number;
  unitPrice: number;
  warehouseId: Types.ObjectId;
  supplierIds: Types.ObjectId[];
  averageDailyDemand: number;
  leadTimeDays: number;
  status: 'In Stock' | 'Low Stock' | 'Critical Stockout Risk';
  unitOfMeasure: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, trim: true, index: true },
    currentStock: { type: Number, required: true, default: 0, min: 0 },
    minimumStock: { type: Number, required: true, default: 10, min: 0 },
    reorderPoint: { type: Number, required: true, default: 25, min: 0 },
    safetyStock: { type: Number, required: true, default: 15, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    supplierIds: [{ type: Schema.Types.ObjectId, ref: 'Supplier' }],
    averageDailyDemand: { type: Number, default: 5, min: 0 },
    leadTimeDays: { type: Number, default: 5, min: 1 },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Critical Stockout Risk'],
      default: 'In Stock',
      index: true,
    },
    unitOfMeasure: { type: String, default: 'Units' },
  },
  { timestamps: true }
);

ProductSchema.pre<IProduct>('save', function (next) {
  if (this.currentStock <= this.safetyStock) {
    this.status = 'Critical Stockout Risk';
  } else if (this.currentStock <= this.reorderPoint) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  next();
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);

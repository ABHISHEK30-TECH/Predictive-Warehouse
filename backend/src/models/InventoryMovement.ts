import mongoose, { Schema, Document, Types } from 'mongoose';

export type MovementType = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'RETURN';

export interface IInventoryMovement extends Document {
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  timestamp: Date;
  reference: string;
  notes?: string;
  performedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    movementType: {
      type: String,
      enum: ['INBOUND', 'OUTBOUND', 'ADJUSTMENT', 'RETURN'],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    reference: { type: String, required: true, trim: true },
    notes: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

InventoryMovementSchema.index({ productId: 1, timestamp: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  InventoryMovementSchema
);

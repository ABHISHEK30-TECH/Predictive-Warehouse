import mongoose, { Schema, Document, Types } from "mongoose"; // NEW: added Types

export interface ISupplier extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  approved: boolean;
  active: boolean;
  leadTimeDays: number;
  reliabilityScore: number; // 0 - 100%
  supportedCategories: string[];
  rating: number; // 1 - 5
  notes?: string;
  userId?: Types.ObjectId; // NEW: the vendor's login account
  approvedBy?: Types.ObjectId; // NEW: Super Admin who approved this vendor
  approvedAt?: Date; // NEW: when the vendor was approved
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    approved: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    leadTimeDays: { type: Number, required: true, default: 5 },
    reliabilityScore: {
      type: Number,
      required: true,
      default: 90,
      min: 0,
      max: 100,
    },
    supportedCategories: [{ type: String, trim: true }],
    rating: { type: Number, default: 4.5, min: 1, max: 5 },
    notes: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User" }, // NEW
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" }, // NEW
    approvedAt: { type: Date }, // NEW
  },
  { timestamps: true },
);

SupplierSchema.index({ approved: 1, active: 1 });

export const Supplier = mongoose.model<ISupplier>("Supplier", SupplierSchema);

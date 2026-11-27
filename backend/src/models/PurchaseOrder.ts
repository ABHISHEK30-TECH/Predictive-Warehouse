import mongoose, { Schema, Document, Types } from "mongoose";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SUBMITTED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

// NEW: the vendor's side of the process (kept separate from the internal status)
export type SupplierResponseStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "SHIPPED";

export interface IPOItem {
  productId: Types.ObjectId;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface IPurchaseOrder extends Document {
  purchaseOrderNumber: string;
  supplierId: Types.ObjectId;
  items: IPOItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: Types.ObjectId;
  rejectedAt?: Date;
  rejectionReason?: string;
  submittedAt?: Date;
  supplierSubmissionRef?: string;
  supplierStatus?: string;
  supplierRespondedAt?: Date; // NEW: when the vendor accepted or rejected
  shippedAt?: Date; // NEW: when the vendor marked it as shipped
  trackingRef?: string; // NEW: courier or tracking number
  vendorNote?: string; // NEW: rejection reason or delivery note from the vendor
  expectedDeliveryDate: Date;
  notes?: string;
  isAutoRecommended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const POItemSchema = new Schema<IPOItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    purchaseOrderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    items: [POItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "SUBMITTED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CANCELLED",
      ],
      default: "DRAFT",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    submittedAt: { type: Date },
    supplierSubmissionRef: { type: String },
    supplierStatus: { type: String },
    supplierRespondedAt: { type: Date }, // NEW
    shippedAt: { type: Date }, // NEW
    trackingRef: { type: String, trim: true }, // NEW
    vendorNote: { type: String, trim: true }, // NEW
    expectedDeliveryDate: { type: Date, required: true },
    notes: { type: String },
    isAutoRecommended: { type: Boolean, default: false },
  },
  { timestamps: true },
);

PurchaseOrderSchema.index({ status: 1, createdAt: -1 });
PurchaseOrderSchema.index({ supplierId: 1, status: 1 }); // NEW: fast vendor queries

export const PurchaseOrder = mongoose.model<IPurchaseOrder>(
  "PurchaseOrder",
  PurchaseOrderSchema,
);

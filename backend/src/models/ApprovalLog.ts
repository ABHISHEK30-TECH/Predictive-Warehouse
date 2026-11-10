import mongoose, { Schema, Document, Types } from 'mongoose';

export type ApprovalAction =
  | 'CREATED'
  | 'SUBMITTED_FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUBMITTED_TO_SUPPLIER'
  | 'STATUS_CHANGE';

export interface IApprovalLog extends Document {
  purchaseOrderId: Types.ObjectId;
  action: ApprovalAction;
  performedBy: Types.ObjectId;
  comments?: string;
  previousStatus?: string;
  newStatus?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalLogSchema = new Schema<IApprovalLog>(
  {
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'CREATED',
        'SUBMITTED_FOR_APPROVAL',
        'APPROVED',
        'REJECTED',
        'SUBMITTED_TO_SUPPLIER',
        'STATUS_CHANGE',
      ],
      required: true,
      index: true,
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comments: { type: String, default: '' },
    previousStatus: { type: String },
    newStatus: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ApprovalLogSchema.index({ purchaseOrderId: 1, timestamp: -1 });

export const ApprovalLog = mongoose.model<IApprovalLog>('ApprovalLog', ApprovalLogSchema);

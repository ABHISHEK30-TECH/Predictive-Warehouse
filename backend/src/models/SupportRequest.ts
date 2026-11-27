import mongoose, { Schema, Document, Types } from 'mongoose';

export type SupportStatus = 'open' | 'in_progress' | 'resolved';
export type SupportCategory = 'General' | 'Billing' | 'Technical' | 'Onboarding';

export interface ISupportRequest extends Document {
  customerId: Types.ObjectId; // the OnboardingRequest (company) that sent it
  createdBy: Types.ObjectId;  // the Customer login
  subject: string;
  message: string;
  category: SupportCategory;
  status: SupportStatus;
  adminResponse?: string;
  respondedBy?: Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportRequestSchema = new Schema<ISupportRequest>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'OnboardingRequest', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    category: {
      type: String,
      enum: ['General', 'Billing', 'Technical', 'Onboarding'],
      default: 'General',
    },
    status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
    adminResponse: { type: String, trim: true, maxlength: 2000 },
    respondedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

SupportRequestSchema.index({ customerId: 1, createdAt: -1 });

export const SupportRequest = mongoose.model<ISupportRequest>('SupportRequest', SupportRequestSchema);
import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType = 'ALERT' | 'INFO' | 'WARNING' | 'SUCCESS';

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ALERT', 'INFO', 'WARNING', 'SUCCESS'],
      default: 'INFO',
    },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

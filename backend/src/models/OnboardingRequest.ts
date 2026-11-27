import { Schema, model } from "mongoose";

const onboardingRequestSchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 120 },
    industry: { type: String, required: true, trim: true, maxlength: 80 },
    warehouses: { type: Number, required: true, min: 1, max: 10000 },
    country: { type: String, required: true, trim: true, maxlength: 80 },

    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    role: { type: String, required: true, trim: true, maxlength: 80 },

    skuCount: { type: String, required: true, trim: true, maxlength: 40 },
    reorderPolicy: { type: String, required: true, trim: true, maxlength: 40 },

    status: {
      type: String,
      enum: ["new", "contacted", "active", "suspended"],
      default: "new",
    }, // NEW: "suspended"

    userId: { type: Schema.Types.ObjectId, ref: "User" }, // NEW: login account created on activation
    activatedBy: { type: Schema.Types.ObjectId, ref: "User" }, // NEW: Super Admin who activated it
    activatedAt: { type: Date }, // NEW
  },
  { timestamps: true },
);

export default model("OnboardingRequest", onboardingRequestSchema);

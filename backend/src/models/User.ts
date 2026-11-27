import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

// NEW: three panel roles added. Old roles are kept until we migrate existing data.
export type UserRole =
  | "Super Admin"
  | "Vendor"
  | "Customer"
  | "Admin" // legacy: will become 'Super Admin'
  | "Warehouse Manager" // legacy
  | "Inventory Staff"; // legacy

// NEW
export type UserStatus = "Pending" | "Active" | "Suspended";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus; // NEW
  supplierId?: Types.ObjectId; // NEW: only for Vendor users
  customerId?: Types.ObjectId; // NEW: only for Customer users
  department: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: [
        "Super Admin",
        "Vendor",
        "Customer",
        "Admin",
        "Warehouse Manager",
        "Inventory Staff",
      ],
      default: "Inventory Staff",
      index: true,
    },
    // NEW
    status: {
      type: String,
      enum: ["Pending", "Active", "Suspended"],
      default: "Active", // 'Active' so existing users are not locked out
      index: true,
    },
    // NEW
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    customerId: { type: Schema.Types.ObjectId, ref: "OnboardingRequest" },
    department: { type: String, default: "Warehouse Operations" },
  },
  {
    timestamps: true,
    // NEW: never send the password hash to the client
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).password;
        return ret;
      },
    },
  },
);

// NEW: a Vendor must be linked to a supplier, and a Customer to a customer record
UserSchema.pre<IUser>("validate", function (next) {
  if (this.role === "Vendor" && !this.supplierId) {
    return next(new Error("A Vendor user must have a supplierId"));
  }
  if (this.role === "Customer" && !this.customerId) {
    return next(new Error("A Customer user must have a customerId"));
  }
  next();
});

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

UserSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);

import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../utils/jwt.js";
import { User, UserRole } from "../models/User.js";
import { Supplier } from "../models/Supplier.js";
import OnboardingRequest from "../models/OnboardingRequest.js";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  supplierId?: string; // set by requireActiveAccount for Vendor users
  customerId?: string; // set by requireActiveAccount for Customer users
}

// One place that defines "who counts as an admin".
// After the Atlas migration (Admin -> Super Admin), remove 'Admin' here.
export const ADMIN_ROLES: UserRole[] = ["Super Admin", "Admin"];

// Everyone who works inside the warehouse system (vendors and customers are not included)
export const INTERNAL_ROLES: UserRole[] = [...ADMIN_ROLES, "Warehouse Manager", "Inventory Staff"];

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Access denied. Authorization token required in Bearer format.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: "Invalid, expired, or malformed authentication token.",
    });
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required before role verification.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' lacks permissions for this operation. Requires one of: [${allowedRoles.join(", ")}].`,
      });
      return;
    }

    next();
  };
}

// Use this on /vendor and /customer routes only (after authenticate + authorizeRoles)
export async function requireActiveAccount(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(req.user.id).select("role status supplierId customerId");
    if (!user) {
      res.status(401).json({ success: false, message: "This account no longer exists." });
      return;
    }

    if (user.role !== req.user.role) {
      res.status(401).json({ success: false, message: "Your permissions have changed. Please log in again." });
      return;
    }

    if (user.status !== "Active") {
      res.status(403).json({
        success: false,
        message:
          user.status === "Pending"
            ? "Your account is waiting for approval."
            : "Your account has been suspended. Please contact support.",
      });
      return;
    }

    if (user.role === "Vendor") {
      const supplier = user.supplierId
        ? await Supplier.findById(user.supplierId).select("approved active")
        : null;
      if (!supplier || !supplier.approved || !supplier.active) {
        res.status(403).json({ success: false, message: "Your vendor profile is not approved or is inactive." });
        return;
      }
      req.supplierId = String(supplier._id);
    }

    if (user.role === "Customer") {
      const customer = user.customerId
        ? await OnboardingRequest.findById(user.customerId).select("status")
        : null;
      if (!customer || customer.status !== "active") {
        res.status(403).json({ success: false, message: "Your company account is not active." });
        return;
      }
      req.customerId = String(customer._id);
    }

    next();
  } catch (err) {
    next(err);
  }
}
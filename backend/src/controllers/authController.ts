import { Request, Response } from "express";
import { User, UserRole } from "../models/User.js";
import { generateToken } from "../utils/jwt.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, department } = req.body; // CHANGED: 'role' is no longer read from the client

      if (!name || !email || !password) {
        res.status(400).json({
          success: false,
          message: "Name, email, and password are required",
        });
        return;
      }

      const existing = await User.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existing) {
        res.status(400).json({
          success: false,
          message: "A user with this email address already exists",
        });
        return;
      }

      // CHANGED: public registration can only create the lowest internal role.
      // Admin / Super Admin / Vendor / Customer accounts are created by the seed script or by a Super Admin.
      const userRole: UserRole = "Inventory Staff";

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: userRole,
        department: department || "Warehouse Operations",
      });

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || "Registration failed",
      });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res
          .status(400)
          .json({ success: false, message: "Email and password are required" });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password." }); // CHANGED: same message as below
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res
          .status(401)
          .json({ success: false, message: "Invalid email or password." }); // CHANGED
        return;
      }

      // NEW: block accounts that are waiting for approval or have been suspended.
      // This check comes AFTER the password check, so only the real owner sees this message.
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

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
          },
        },
      });
    } catch (err: any) {
      res
        .status(500)
        .json({ success: false, message: err.message || "Login failed" });
    }
  }

  public static async getMe(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // NEW: lets any logged-in user choose their own password (also replaces a temporary one)
  public static async changePassword(
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
      }

      const { currentPassword, newPassword } = req.body ?? {};

      if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        !currentPassword ||
        !newPassword
      ) {
        res
          .status(400)
          .json({
            success: false,
            message: "Current password and new password are required",
          });
        return;
      }

      // 72 is the real limit of bcrypt: longer passwords are silently cut, so we refuse them
      if (newPassword.length < 8 || newPassword.length > 72) {
        res
          .status(400)
          .json({
            success: false,
            message: "New password must be between 8 and 72 characters",
          });
        return;
      }

      if (newPassword === currentPassword) {
        res
          .status(400)
          .json({
            success: false,
            message: "New password must be different from the current password",
          });
        return;
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      // A suspended or pending account may still hold a valid token. It must not be able to change anything.
      if (user.status !== "Active") {
        res
          .status(403)
          .json({ success: false, message: "Your account is not active." });
        return;
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        // 400, not 401: a 401 could make your frontend log the user out as if the token had expired
        res
          .status(400)
          .json({ success: false, message: "Current password is incorrect" });
        return;
      }

      user.password = newPassword; // hashed by the pre-save hook in User.ts
      await user.save();

      res
        .status(200)
        .json({ success: true, message: "Password changed successfully" });
    } catch (err: any) {
      res
        .status(500)
        .json({
          success: false,
          message: err.message || "Could not change password",
        });
    }
  }
}

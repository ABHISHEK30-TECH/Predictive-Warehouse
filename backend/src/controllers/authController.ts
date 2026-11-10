import { Request, Response } from 'express';
import { User, UserRole } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role, department } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        return;
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        res.status(400).json({ success: false, message: 'A user with this email address already exists' });
        return;
      }

      const userRole: UserRole =
        ['Admin', 'Warehouse Manager', 'Inventory Staff'].includes(role) ? role : 'Inventory Staff';

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: userRole,
        department: department || 'Warehouse Operations',
      });

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
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
      res.status(500).json({ success: false, message: err.message || 'Registration failed' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
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
        message: 'Login successful',
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
      res.status(500).json({ success: false, message: err.message || 'Login failed' });
    }
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
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
}

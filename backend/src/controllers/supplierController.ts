import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';

export class SupplierController {
  public static async getSuppliers(req: Request, res: Response): Promise<void> {
    try {
      const { approved, active, category } = req.query;
      const query: any = {};

      if (approved !== undefined) {
        query.approved = approved === 'true';
      }
      if (active !== undefined) {
        query.active = active === 'true';
      }
      if (category) {
        query.supportedCategories = category;
      }

      const suppliers = await Supplier.find(query).sort({ reliabilityScore: -1, name: 1 });
      res.status(200).json({ success: true, data: suppliers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getSupplierById(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      const purchaseOrders = await PurchaseOrder.find({ supplierId: supplier._id })
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        data: {
          ...supplier.toObject(),
          purchaseOrders,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createSupplier(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        phone,
        address,
        approved,
        active,
        leadTimeDays,
        reliabilityScore,
        supportedCategories,
        rating,
        notes,
      } = req.body;

      if (!name || !email || !phone || !address) {
        res.status(400).json({ success: false, message: 'Name, email, phone, and address are required' });
        return;
      }

      const supplier = await Supplier.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        address: address.trim(),
        approved: approved !== undefined ? approved : true,
        active: active !== undefined ? active : true,
        leadTimeDays: Number(leadTimeDays) || 5,
        reliabilityScore: Number(reliabilityScore) || 90,
        supportedCategories: supportedCategories || [],
        rating: Number(rating) || 4.5,
        notes,
      });

      res.status(201).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateSupplier(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      res.status(200).json({ success: true, data: supplier });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteSupplier(req: Request, res: Response): Promise<void> {
    try {
      const supplier = await Supplier.findByIdAndDelete(req.params.id);
      if (!supplier) {
        res.status(404).json({ success: false, message: 'Supplier not found' });
        return;
      }

      res.status(200).json({ success: true, message: `Supplier '${supplier.name}' deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

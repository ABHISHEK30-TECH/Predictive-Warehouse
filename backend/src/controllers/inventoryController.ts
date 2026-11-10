import { Request, Response } from 'express';
import { Product } from '../models/Product.js';
import { InventoryMovement, MovementType } from '../models/InventoryMovement.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';

export class InventoryController {
  public static async getInventoryOverview(req: Request, res: Response): Promise<void> {
    try {
      const products = await Product.find()
        .populate('warehouseId', 'name code location')
        .sort({ currentStock: 1 });

      const totalValuation = products.reduce((acc, p) => acc + p.currentStock * p.unitPrice, 0);
      const lowStockCount = products.filter((p) => p.currentStock <= p.reorderPoint).length;
      const criticalCount = products.filter((p) => p.currentStock <= p.safetyStock).length;

      res.status(200).json({
        success: true,
        data: {
          items: products,
          metrics: {
            totalProducts: products.length,
            totalValuation,
            lowStockCount,
            criticalCount,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getMovements(req: Request, res: Response): Promise<void> {
    try {
      const { productId, type, limit = 50, page = 1 } = req.query;
      const query: any = {};

      if (productId && mongoose.Types.ObjectId.isValid(productId as string)) {
        query.productId = productId;
      }
      if (type) {
        query.movementType = type;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [movements, total] = await Promise.all([
        InventoryMovement.find(query)
          .populate('productId', 'name sku currentStock')
          .populate('warehouseId', 'name code')
          .populate('performedBy', 'name email role')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(Number(limit)),
        InventoryMovement.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: movements,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createMovement(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId, warehouseId, movementType, quantity, reference, notes } = req.body;

      if (!productId || !movementType || quantity === undefined || !reference) {
        res.status(400).json({
          success: false,
          message: 'productId, movementType, quantity, and reference are required',
        });
        return;
      }

      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const prevStock = product.currentStock;
      const qty = Math.abs(Number(quantity));
      let newStock = prevStock;

      if (movementType === 'INBOUND' || movementType === 'RETURN') {
        newStock = prevStock + qty;
      } else if (movementType === 'OUTBOUND') {
        if (prevStock < qty) {
          res.status(400).json({
            success: false,
            message: `Insufficient stock. Current stock is ${prevStock}, requested outbound quantity is ${qty}`,
          });
          return;
        }
        newStock = prevStock - qty;
      } else if (movementType === 'ADJUSTMENT') {
        newStock = Number(quantity); // Set directly for absolute adjustments
      }

      product.currentStock = Math.max(0, newStock);
      await product.save();

      const movement = await InventoryMovement.create({
        productId: product._id,
        warehouseId: warehouseId || product.warehouseId,
        movementType: movementType as MovementType,
        quantity: qty,
        previousStock: prevStock,
        newStock: product.currentStock,
        reference: reference.trim(),
        notes,
        performedBy: req.user ? new mongoose.Types.ObjectId(req.user.id) : undefined,
      });

      res.status(201).json({
        success: true,
        data: movement,
        updatedProduct: product,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

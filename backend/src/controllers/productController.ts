import { Request, Response } from 'express';
import { Product } from '../models/Product.js';
import { Warehouse } from '../models/Warehouse.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { StockoutService } from '../services/stockoutService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import mongoose from 'mongoose';

export class ProductController {
  public static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { search, category, warehouseId, status, page = 1, limit = 50 } = req.query;
      const query: any = {};

      if (search) {
        query.$or = [
          { name: { $regex: search as string, $options: 'i' } },
          { sku: { $regex: search as string, $options: 'i' } },
        ];
      }

      if (category) {
        query.category = category;
      }

      if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId as string)) {
        query.warehouseId = warehouseId;
      }

      if (status) {
        query.status = status;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [products, total] = await Promise.all([
        Product.find(query)
          .populate('warehouseId', 'name code location')
          .populate('supplierIds', 'name reliabilityScore leadTimeDays approved')
          .sort({ name: 1 })
          .skip(skip)
          .limit(Number(limit)),
        Product.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: products,
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

  public static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const product = await Product.findById(req.params.id)
        .populate('warehouseId')
        .populate('supplierIds');

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const risk = await StockoutService.evaluateProductRisk(product);

      res.status(200).json({
        success: true,
        data: {
          ...product.toObject(),
          stockoutRisk: risk,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        sku,
        description,
        category,
        currentStock,
        minimumStock,
        reorderPoint,
        safetyStock,
        unitPrice,
        warehouseId,
        supplierIds,
        averageDailyDemand,
        leadTimeDays,
        unitOfMeasure,
      } = req.body;

      if (!name || !sku || !category || unitPrice === undefined) {
        res.status(400).json({ success: false, message: 'Name, SKU, category, and unitPrice are required' });
        return;
      }

      const existing = await Product.findOne({ sku: sku.toUpperCase().trim() });
      if (existing) {
        res.status(400).json({ success: false, message: `Product with SKU '${sku}' already exists` });
        return;
      }

      let selectedWarehouseId = warehouseId;
      if (!selectedWarehouseId) {
        const defaultWh = await Warehouse.findOne({ active: true });
        if (defaultWh) selectedWarehouseId = defaultWh._id;
      }

      const product = await Product.create({
        name: name.trim(),
        sku: sku.toUpperCase().trim(),
        description,
        category,
        currentStock: Number(currentStock) || 0,
        minimumStock: Number(minimumStock) || 10,
        reorderPoint: Number(reorderPoint) || 25,
        safetyStock: Number(safetyStock) || 15,
        unitPrice: Number(unitPrice),
        warehouseId: selectedWarehouseId,
        supplierIds: supplierIds || [],
        averageDailyDemand: Number(averageDailyDemand) || 5,
        leadTimeDays: Number(leadTimeDays) || 5,
        unitOfMeasure: unitOfMeasure || 'Units',
      });

      // Record initial inventory movement if currentStock > 0
      if (product.currentStock > 0 && selectedWarehouseId) {
        await InventoryMovement.create({
          productId: product._id,
          warehouseId: selectedWarehouseId,
          movementType: 'INBOUND',
          quantity: product.currentStock,
          previousStock: 0,
          newStock: product.currentStock,
          reference: 'INITIAL_STOCK_CREATION',
          performedBy: req.user ? new mongoose.Types.ObjectId(req.user.id) : undefined,
          notes: 'Initial stock setup upon product creation',
        });
      }

      res.status(201).json({ success: true, data: product });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const oldStock = product.currentStock;
      const updates = req.body;

      Object.assign(product, updates);
      await product.save();

      // If currentStock was modified directly, record an adjustment movement
      if (updates.currentStock !== undefined && updates.currentStock !== oldStock) {
        await InventoryMovement.create({
          productId: product._id,
          warehouseId: product.warehouseId,
          movementType: 'ADJUSTMENT',
          quantity: updates.currentStock - oldStock,
          previousStock: oldStock,
          newStock: updates.currentStock,
          reference: 'MANUAL_STOCK_ADJUSTMENT',
          performedBy: req.user ? new mongoose.Types.ObjectId(req.user.id) : undefined,
          notes: 'Manual inventory level override via product update',
        });
      }

      res.status(200).json({ success: true, data: product });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      res.status(200).json({ success: true, message: `Product '${product.name}' deleted successfully` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

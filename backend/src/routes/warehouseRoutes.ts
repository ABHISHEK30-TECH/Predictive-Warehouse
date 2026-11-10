import { Router, Request, Response } from 'express';
import { Warehouse } from '../models/Warehouse.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const warehouses = await Warehouse.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: warehouses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, code, location, capacity } = req.body;
    const wh = await Warehouse.create({ name, code, location, capacity });
    res.status(201).json({ success: true, data: wh });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

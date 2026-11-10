import { Router, Request, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(20);
    const unreadCount = await Notification.countDocuments({ read: false });
    res.status(200).json({ success: true, data: notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.status(200).json({ success: true, data: notif });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

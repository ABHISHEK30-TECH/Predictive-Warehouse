import { Response } from 'express';
import mongoose from 'mongoose';
import OnboardingRequest from '../models/OnboardingRequest.js';
import { SupportRequest } from '../models/SupportRequest.js';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Fields a customer may see on their own company record. Internal fields
// (userId, activatedBy) are left out on purpose.
const PROFILE_FIELDS =
  'companyName industry warehouses country fullName email phone role skuCount reorderPolicy status activatedAt createdAt';

const CATEGORIES = ['General', 'Billing', 'Technical', 'Onboarding'];
const MAX_OPEN_REQUESTS = 10; // simple protection against spam

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function badId(id: string, res: Response): boolean {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid ID' });
    return true;
  }
  return false;
}

// In OnboardingRequest, "role" means the person's job title. We rename it for the API
// so that it is never confused with the permission role of the login.
function toProfileView(doc: any) {
  const { role, ...rest } = doc;
  return { ...rest, jobTitle: role };
}

export class CustomerController {
  // ---------- Overview ----------
  public static async getOverview(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [profile, open, inProgress, resolved] = await Promise.all([
        OnboardingRequest.findById(req.customerId).select(PROFILE_FIELDS).lean(),
        SupportRequest.countDocuments({ customerId: req.customerId, status: 'open' }),
        SupportRequest.countDocuments({ customerId: req.customerId, status: 'in_progress' }),
        SupportRequest.countDocuments({ customerId: req.customerId, status: 'resolved' }),
      ]);

      if (!profile) {
        res.status(404).json({ success: false, message: 'Company profile not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          company: toProfileView(profile),
          supportRequests: { open, inProgress, resolved },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Profile ----------
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const profile = await OnboardingRequest.findById(req.customerId).select(PROFILE_FIELDS).lean();
      if (!profile) {
        res.status(404).json({ success: false, message: 'Company profile not found' });
        return;
      }
      res.status(200).json({ success: true, data: toProfileView(profile) });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // A customer may change only contact details. Company name, warehouses, SKU count,
      // reorder policy, and status stay under the control of the Super Admin.
      const update: Record<string, string> = {};

      if (req.body?.phone !== undefined) {
        const phone = cleanText(req.body.phone, 30);
        if (phone && phone.replace(/\D/g, '').length < 7) {
          res.status(400).json({ success: false, message: 'Phone number is not valid' });
          return;
        }
        update.phone = phone;
      }

      if (req.body?.jobTitle !== undefined) {
        const jobTitle = cleanText(req.body.jobTitle, 80);
        if (!jobTitle) {
          res.status(400).json({ success: false, message: 'Job title cannot be empty' });
          return;
        }
        update.role = jobTitle; // stored in the "role" field of OnboardingRequest
      }

      if (Object.keys(update).length === 0) {
        res.status(400).json({ success: false, message: 'Nothing to update. You can change phone and jobTitle.' });
        return;
      }

      const profile = await OnboardingRequest.findByIdAndUpdate(req.customerId, update, { new: true })
        .select(PROFILE_FIELDS)
        .lean();

      res.status(200).json({ success: true, data: profile ? toProfileView(profile) : null });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ---------- Support requests ----------
  public static async listSupportRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, page = 1, limit = 25 } = req.query;
      const query: any = { customerId: req.customerId };
      if (typeof status === 'string' && ['open', 'in_progress', 'resolved'].includes(status)) {
        query.status = status;
      }

      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));

      const [items, total] = await Promise.all([
        SupportRequest.find(query)
          .select('subject message category status adminResponse respondedAt createdAt updatedAt')
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
        SupportRequest.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: items,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async getSupportRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (badId(id, res)) return;

      // The customerId filter means a customer can never read another company's request
      const item = await SupportRequest.findOne({ _id: id, customerId: req.customerId })
        .select('subject message category status adminResponse respondedAt createdAt updatedAt')
        .lean();

      if (!item) {
        res.status(404).json({ success: false, message: 'Support request not found' });
        return;
      }

      res.status(200).json({ success: true, data: item });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  public static async createSupportRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const subject = cleanText(req.body?.subject, 150);
      const message = cleanText(req.body?.message, 2000);
      const category = req.body?.category === undefined ? 'General' : String(req.body.category);

      if (subject.length < 3) {
        res.status(400).json({ success: false, message: 'Subject must be at least 3 characters' });
        return;
      }
      if (message.length < 10) {
        res.status(400).json({ success: false, message: 'Message must be at least 10 characters' });
        return;
      }
      if (!CATEGORIES.includes(category)) {
        res.status(400).json({ success: false, message: `Category must be one of: ${CATEGORIES.join(', ')}` });
        return;
      }

      const openCount = await SupportRequest.countDocuments({
        customerId: req.customerId,
        status: { $ne: 'resolved' },
      });
      if (openCount >= MAX_OPEN_REQUESTS) {
        res.status(429).json({
          success: false,
          message: `You already have ${openCount} unresolved requests. Please wait for replies before sending more.`,
        });
        return;
      }

      const created = await SupportRequest.create({
        customerId: req.customerId,
        createdBy: new mongoose.Types.ObjectId(req.user!.id),
        subject,
        message,
        category,
      });

      const company = await OnboardingRequest.findById(req.customerId).select('companyName').lean();
      await Notification.create({
        title: `New support request: ${subject}`,
        message: `${company?.companyName || 'A customer'} sent a ${category} request.`,
        type: 'WARNING',
        link: '/admin/support-requests', // adjust when the frontend page exists
      });

      res.status(201).json({
        success: true,
        data: {
          _id: created._id,
          subject: created.subject,
          message: created.message,
          category: created.category,
          status: created.status,
          createdAt: created.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
import { Router, Request, Response } from "express";
import OnboardingRequest from "../models/OnboardingRequest";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: unknown, max = 120): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

// Public route: new customers do not have an account yet, so do NOT put JWT auth on it.
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};

    // Honeypot: real people never fill this hidden field, bots usually do.
    if (clean(body.website)) {
      return res.status(201).json({ ok: true });
    }

    const data = {
      companyName: clean(body.companyName),
      industry: clean(body.industry, 80),
      warehouses: Number.parseInt(String(body.warehouses), 10),
      country: clean(body.country, 80),
      fullName: clean(body.fullName),
      email: clean(body.email, 160).toLowerCase(),
      phone: clean(body.phone, 30),
      role: clean(body.role, 80),
      skuCount: clean(body.skuCount, 40),
      reorderPolicy: clean(body.reorderPolicy, 40),
    };

    const errors: string[] = [];
    if (!data.companyName) errors.push("companyName");
    if (!data.industry) errors.push("industry");
    if (!Number.isInteger(data.warehouses) || data.warehouses < 1) errors.push("warehouses");
    if (!data.country) errors.push("country");
    if (!data.fullName) errors.push("fullName");
    if (!EMAIL_RE.test(data.email)) errors.push("email");
    if (data.phone && data.phone.replace(/\D/g, "").length < 7) errors.push("phone");
    if (!data.role) errors.push("role");
    if (!data.skuCount) errors.push("skuCount");
    if (!data.reorderPolicy) errors.push("reorderPolicy");

    if (errors.length > 0) {
      return res.status(400).json({ message: "Some fields are missing or invalid.", errors });
    }

    const saved = await OnboardingRequest.create(data);
    return res.status(201).json({ ok: true, id: saved._id });
  } catch (err) {
    console.error("Onboarding request failed:", err);
    return res.status(500).json({ message: "Could not save your request. Please try again." });
  }
});

export default router;
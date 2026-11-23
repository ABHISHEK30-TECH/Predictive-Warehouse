"use client";

import { useEffect, useRef, useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";
import styles from "./onboarding.module.css";

// NEXT_PUBLIC_API_URL already ends with /api, so we only add /onboarding.
const API = process.env.NEXT_PUBLIC_API_URL;

type Data = {
  companyName: string;
  industry: string;
  warehouses: string;
  country: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  skuCount: string;
  reorderPolicy: string;
  website: string; // honeypot, must stay empty
};

type Errors = Partial<Record<keyof Data, string>>;

const EMPTY: Data = {
  companyName: "",
  industry: "",
  warehouses: "1",
  country: "",
  fullName: "",
  email: "",
  phone: "",
  role: "",
  skuCount: "",
  reorderPolicy: "",
  website: "",
};

const STEPS = ["Company", "Contact", "Inventory"];

const INDUSTRIES = [
  "Retail and e-commerce",
  "Manufacturing",
  "Distribution and wholesale",
  "Food and beverage",
  "Healthcare and pharma",
  "Other",
];

const SKU_RANGES = [
  "Under 100",
  "100 to 1,000",
  "1,000 to 10,000",
  "More than 10,000",
];

const POLICIES = [
  {
    value: "safety-stock",
    label: "Reorder when stock reaches the safety level",
  },
  { value: "forecast", label: "Reorder based on forecast demand" },
  { value: "unsure", label: "I am not sure yet, please recommend one" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(step: number, d: Data): Errors {
  const e: Errors = {};
  if (step === 1) {
    if (!d.companyName.trim()) e.companyName = "Enter your company name.";
    if (!d.industry) e.industry = "Choose an industry.";
    const w = Number(d.warehouses);
    if (!Number.isInteger(w) || w < 1)
      e.warehouses = "Enter a whole number, 1 or more.";
    if (!d.country.trim()) e.country = "Enter your country.";
  }
  if (step === 2) {
    if (!d.fullName.trim()) e.fullName = "Enter your full name.";
    if (!EMAIL_RE.test(d.email.trim()))
      e.email = "Enter a valid work email, like name@company.com.";
    if (d.phone.trim() && d.phone.replace(/\D/g, "").length < 7)
      e.phone = "Enter at least 7 digits, or leave this blank.";
    if (!d.role.trim()) e.role = "Enter your role.";
  }
  if (step === 3) {
    if (!d.skuCount) e.skuCount = "Choose a range.";
    if (!d.reorderPolicy) e.reorderPolicy = "Choose a reorder approach.";
  }
  return e;
}

export default function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Data>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [serverMessage, setServerMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the step heading when the step changes, so keyboard and
  // screen reader users know the form moved on.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, status]);

  const field = (name: keyof Data) => ({
    id: name,
    name,
    value: data[name],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setData((d) => ({ ...d, [name]: e.target.value })),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  const message = (name: keyof Data) =>
    errors[name] ? (
      <p id={`${name}-error`} className={styles.fieldError}>
        {errors[name]}
      </p>
    ) : null;

  function goNext() {
    const found = validate(step, data);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep((s) => s + 1);
  }

  function goBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step < 3) return goNext();

    const found = validate(3, data);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (!API) {
      setServerMessage(
        "The server address is not set. Add NEXT_PUBLIC_API_URL to the frontend environment and redeploy.",
      );
      setStatus("error");
      return;
    }

    setStatus("sending");
    setServerMessage("");
    try {
      const res = await fetch(`${API}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, warehouses: Number(data.warehouses) }),
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 400) {
        // The server found a problem we missed. Go back to the first step with an error.
        const bad: string[] = body.errors ?? [];
        const mapped: Errors = {};
        bad.forEach(
          (k) => ((mapped as Record<string, string>)[k] = "Check this field."),
        );
        setErrors(mapped);
        const inStep1 = [
          "companyName",
          "industry",
          "warehouses",
          "country",
        ].some((k) => bad.includes(k));
        const inStep2 = ["fullName", "email", "phone", "role"].some((k) =>
          bad.includes(k),
        );
        setStep(inStep1 ? 1 : inStep2 ? 2 : 3);
        setStatus("idle");
        return;
      }
      setServerMessage(
        body.message ?? "Your request was not sent. Try again in a moment.",
      );
      setStatus("error");
    } catch {
      setServerMessage(
        "Could not reach the server. Check your connection and try again.",
      );
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={styles.formCard} role="status">
        <h3 ref={headingRef} tabIndex={-1} className={styles.formHeading}>
          Request received
        </h3>
        <p className={styles.formText}>
          We will email <strong>{data.email.trim()}</strong> within one business
          day with the next steps for {data.companyName.trim()}.
        </p>
        <div className={styles.actions} style={{ marginTop: 24 }}>
          <span />
          <Link href="/login" className={styles.btnPrimary}>
            Continue to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.formCard} onSubmit={onSubmit} noValidate>
      <div className={styles.progress} aria-hidden="true">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={i < step ? styles.progressOn : styles.progressOff}
          />
        ))}
      </div>
      <h3 ref={headingRef} tabIndex={-1} className={styles.formHeading}>
        Step {step} of {STEPS.length}: {STEPS[step - 1]}
      </h3>

      {/* Honeypot: hidden from people, visible to bots */}
      <div className={styles.visuallyHidden} aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input
          id="website"
          name="website"
          value={data.website}
          tabIndex={-1}
          autoComplete="off"
          onChange={(e) => setData((d) => ({ ...d, website: e.target.value }))}
        />
      </div>

      {step === 1 && (
        <>
          <div className={styles.field}>
            <label htmlFor="companyName">Company name</label>
            <input
              type="text"
              autoComplete="organization"
              {...field("companyName")}
            />
            {message("companyName")}
          </div>
          <div className={styles.field}>
            <label htmlFor="industry">Industry</label>
            <select {...field("industry")}>
              <option value="">Choose an industry</option>
              {INDUSTRIES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {message("industry")}
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="warehouses">Number of warehouses</label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                {...field("warehouses")}
              />
              {message("warehouses")}
            </div>
            <div className={styles.field}>
              <label htmlFor="country">Country</label>
              <input
                type="text"
                autoComplete="country-name"
                {...field("country")}
              />
              {message("country")}
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.field}>
            <label htmlFor="fullName">Full name</label>
            <input type="text" autoComplete="name" {...field("fullName")} />
            {message("fullName")}
          </div>
          <div className={styles.field}>
            <label htmlFor="email">Work email</label>
            <input type="email" autoComplete="email" {...field("email")} />
            {message("email")}
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="phone">Phone (optional)</label>
              <input type="tel" autoComplete="tel" {...field("phone")} />
              {message("phone")}
            </div>
            <div className={styles.field}>
              <label htmlFor="role">Your role</label>
              <input
                type="text"
                autoComplete="organization-title"
                {...field("role")}
              />
              {message("role")}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className={styles.field}>
            <label htmlFor="skuCount">How many SKUs do you manage?</label>
            <select {...field("skuCount")}>
              <option value="">Choose a range</option>
              {SKU_RANGES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {message("skuCount")}
          </div>
          <div className={styles.field}>
            <label htmlFor="reorderPolicy">
              How do you want reorders triggered?
            </label>
            <select {...field("reorderPolicy")}>
              <option value="">Choose an approach</option>
              {POLICIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {message("reorderPolicy")}
          </div>
        </>
      )}

      {status === "error" && (
        <p role="alert" className={styles.formError}>
          {serverMessage}
        </p>
      )}

      <div className={styles.actions}>
        {step > 1 ? (
          <button type="button" className={styles.btnQuiet} onClick={goBack}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          className={styles.btnPrimary}
          disabled={status === "sending"}
        >
          {step < 3
            ? "Continue"
            : status === "sending"
              ? "Sending..."
              : "Send request"}
        </button>
      </div>
    </form>
  );
}

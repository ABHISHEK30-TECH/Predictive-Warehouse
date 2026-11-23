import type { Metadata } from "next";
import Link from "next/link";
import ForecastChart from "./ForecastChart";
import OnboardingForm from "./OnboardingForm";
import styles from "./onboarding.module.css";

export const metadata: Metadata = {
  title: "Get started | Stockout Agent",
  description:
    "Set up your warehouse with Stockout Agent and see which items will run out before they do.",
};

const CAPABILITIES = [
  {
    name: "Demand forecasting",
    text: "A 14-day forecast for every item, adjusted for seasonal demand.",
  },
  {
    name: "Stockout prediction",
    text: "Items at risk are flagged with a risk level and the date they are likely to run out.",
  },
  {
    name: "Purchase orders",
    text: "Reorders are drafted for you. A manager reviews and approves each one.",
  },
  {
    name: "Supplier directory",
    text: "Approved vendors are kept in one place, so every order goes to a verified supplier.",
  },
];

const STEPS = [
  {
    title: "Tell us about your company",
    text: "Share your company, contact and warehouse details in the form below.",
  },
  {
    title: "Connect your inventory",
    text: "We load your items, stock levels and suppliers into your workspace.",
  },
  {
    title: "Review your first forecast",
    text: "See which items are at risk over the next 14 days.",
  },
  {
    title: "Approve your first reorder",
    text: "A manager approves the suggested purchase order.",
  },
];

export default function OnboardingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topInner}>
          <span className={styles.brand}>Stockout Agent</span>
          <Link href="/login" className={styles.topLink}>
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <h1 className={styles.h1}>
                Know which items will run out, and when.
              </h1>
              <p className={styles.lead}>
                Stockout Agent watches your inventory, forecasts demand for the
                next 14 days, and drafts the reorder before you reach safety
                stock.
              </p>
              <div className={styles.heroActions}>
                <a href="#start" className={styles.btnPrimary}>
                  Start onboarding
                </a>
                <a href="#how" className={styles.btnGhost}>
                  See how it works
                </a>
              </div>
            </div>
            <ForecastChart />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="what-heading">
          <div className={styles.inner}>
            <h2 id="what-heading" className={styles.h2}>
              What your team gets
            </h2>
            <dl className={styles.capabilities}>
              {CAPABILITIES.map((c) => (
                <div key={c.name} className={styles.capRow}>
                  <dt>{c.name}</dt>
                  <dd>{c.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section
          id="how"
          className={`${styles.section} ${styles.sectionAlt}`}
          aria-labelledby="how-heading"
        >
          <div className={styles.inner}>
            <h2 id="how-heading" className={styles.h2}>
              How onboarding works
            </h2>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.title} className={styles.step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="start"
          className={styles.section}
          aria-labelledby="start-heading"
        >
          <div className={`${styles.inner} ${styles.startGrid}`}>
            <div>
              <h2 id="start-heading" className={styles.h2}>
                Request your workspace
              </h2>
              <p className={styles.sideText}>
                It takes about two minutes. We review each request and reply by
                email within one business day.
              </p>
              <p className={styles.sideText}>
                After that, we set up your workspace and book a short
                walkthrough with your team.
              </p>
            </div>
            <OnboardingForm />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}

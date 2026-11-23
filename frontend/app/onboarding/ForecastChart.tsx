import styles from "./onboarding.module.css";

// Illustrative chart: one item over 14 days.
// Stock falls, crosses the reorder point, a reorder is suggested,
// and the delivery lands before stock reaches safety stock.
export default function ForecastChart() {
  return (
    <figure className={styles.chartFigure}>
      <svg
        viewBox="0 0 560 340"
        role="img"
        aria-label="Example stock level over 14 days. Stock crosses the reorder point, a reorder is suggested, and the delivery arrives before stock falls to the safety level. Without a reorder, the item would run out."
        className={styles.chart}
      >
        {/* baseline and day labels */}
        <line
          x1="40"
          y1="300"
          x2="520"
          y2="300"
          stroke="rgba(255,255,255,0.25)"
        />
        <text x="40" y="324" fontSize="12" fill="#9fb0dc">
          Day 1
        </text>
        <text x="520" y="324" fontSize="12" fill="#9fb0dc" textAnchor="end">
          Day 14
        </text>

        {/* thresholds */}
        <line
          x1="40"
          y1="200"
          x2="520"
          y2="200"
          stroke="#7c8db5"
          strokeDasharray="5 5"
        />
        <text x="44" y="192" fontSize="12" fill="#9fb0dc">
          Reorder point
        </text>
        <line
          x1="40"
          y1="240"
          x2="520"
          y2="240"
          stroke="#7c8db5"
          strokeDasharray="5 5"
        />
        <text x="44" y="232" fontSize="12" fill="#9fb0dc">
          Safety stock
        </text>

        {/* what would happen without a reorder */}
        <path
          d="M262 226 L334 300"
          fill="none"
          stroke="#fb7185"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
        <text x="344" y="292" fontSize="12" fill="#fb7185">
          Runs out without a reorder
        </text>

        {/* stock before the delivery */}
        <path
          className={styles.draw}
          pathLength={1}
          d="M40 92 L90 122 L140 150 L194 200 L262 226"
          fill="none"
          stroke="#e6ecff"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* stock after the delivery */}
        <path
          className={`${styles.draw} ${styles.drawLate}`}
          pathLength={1}
          d="M262 226 L275 76 L400 130 L520 190"
          fill="none"
          stroke="#34d399"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* markers */}
        <circle
          cx="194"
          cy="200"
          r="6"
          fill="#60a5fa"
          stroke="#0b1437"
          strokeWidth="2"
        />
        <text x="206" y="186" fontSize="13" fontWeight="600" fill="#bfdbfe">
          Reorder suggested
        </text>

        <circle
          cx="275"
          cy="76"
          r="6"
          fill="#34d399"
          stroke="#0b1437"
          strokeWidth="2"
        />
        <text
          x="256"
          y="80"
          fontSize="13"
          fontWeight="600"
          fill="#a7f3d0"
          textAnchor="end"
        >
          Delivery arrives
        </text>
      </svg>
      <figcaption className={styles.chartCaption}>
        Example for one item over 14 days. The numbers are illustrative.
      </figcaption>
    </figure>
  );
}

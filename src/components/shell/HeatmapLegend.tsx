'use client';

import styles from './HeatmapLegend.module.scss';

export default function HeatmapLegend() {
  return (
    <div className={styles.legend} aria-hidden="true">
      <span className={styles.label}>Heat</span>
      <div className={styles.scale}>
        <span className={styles.tier1} />
        <span className={styles.tier2} />
        <span className={styles.tier3} />
        <span className={styles.tier4} />
        <span className={styles.tier5} />
      </div>
      <span className={styles.endpoint}>cold</span>
      <span className={styles.endpoint}>hot</span>
    </div>
  );
}

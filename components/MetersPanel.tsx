'use client';

import styles from './MetersPanel.module.css';

interface MetersPanelProps {
  metrics: {
    peopleCount: number;
    reflectionScore: number;
    volatility: number;
    entropy: number;
    engagement: number;
  };
}

export default function MetersPanel({ metrics }: MetersPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>Meters</div>
      <div className={styles.content}>
        <div className="daw-meter">
          <div className="daw-meter-label">People Count</div>
          <div className="daw-meter-value">
            {metrics.peopleCount}
          </div>
        </div>
        <div className="daw-meter">
          <div className="daw-meter-label">Reflection Score</div>
          <div className="daw-meter-value">
            {metrics.reflectionScore}
            <span className="daw-meter-unit">%</span>
          </div>
        </div>
        <div className="daw-meter">
          <div className="daw-meter-label">Volatility</div>
          <div className="daw-meter-value">
            {(metrics.volatility * 100).toFixed(1)}
            <span className="daw-meter-unit">%</span>
          </div>
        </div>
        <div className="daw-meter">
          <div className="daw-meter-label">Entropy</div>
          <div className="daw-meter-value">
            {metrics.entropy.toFixed(2)}
          </div>
        </div>
        <div className="daw-meter">
          <div className="daw-meter-label">Engagement</div>
          <div className="daw-meter-value">
            {(metrics.engagement * 100).toFixed(1)}
            <span className="daw-meter-unit">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}


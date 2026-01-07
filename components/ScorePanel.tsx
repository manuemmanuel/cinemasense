'use client';

import styles from './ScorePanel.module.css';

interface ScorePanelProps {
  reflectionScore: number;
}

export default function ScorePanel({ reflectionScore }: ScorePanelProps) {
  const getScoreColor = () => {
    // Professional, restrained colors for DAW-style interface
    if (reflectionScore >= 80) return '#3a6bb3'; // Professional blue
    if (reflectionScore >= 60) return '#8b7a5a'; // Muted amber
    return '#8b2e2e'; // Muted red
  };

  return (
    <div className={styles.panel}>
      <div className={styles.label}>Reflection Score</div>
      <div className={styles.score} style={{ color: getScoreColor() }}>
        {reflectionScore}%
      </div>
    </div>
  );
}


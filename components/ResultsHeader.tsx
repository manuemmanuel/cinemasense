'use client';

import styles from './ResultsHeader.module.css';

interface ResultsHeaderProps {
  movieTitle: string;
  expectedEmotion: string;
}

export default function ResultsHeader({ movieTitle, expectedEmotion }: ResultsHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.metadata}>
        <div className={styles.metadataRow}>
          <span className={styles.metadataLabel}>ANALYSIS</span>
          <span className={styles.metadataValue}>Reflection Analysis</span>
        </div>
        <div className={styles.metadataDivider} />
        <div className={styles.metadataRow}>
          <span className={styles.metadataLabel}>MOVIE</span>
          <span className={styles.metadataValue}>{movieTitle}</span>
        </div>
        <div className={styles.metadataDivider} />
        <div className={styles.metadataRow}>
          <span className={styles.metadataLabel}>EXPECTED</span>
          <span className={styles.metadataValue}>{expectedEmotion}</span>
        </div>
      </div>
    </div>
  );
}


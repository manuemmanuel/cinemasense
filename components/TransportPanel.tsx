'use client';

import { HiStop } from 'react-icons/hi2';
import styles from './TransportPanel.module.css';

interface TransportPanelProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onOpenResults: () => void;
}

export default function TransportPanel({
  isRunning,
  onStart,
  onStop,
  onOpenResults,
}: TransportPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>Transport</div>
      <div className={styles.content}>
        {!isRunning ? (
          <button className="daw-button daw-button-primary" onClick={onStart}>
            START
          </button>
        ) : (
          <button className="daw-button daw-button-danger" onClick={onStop}>
            <HiStop size={16} style={{ marginRight: '8px' }} />
            STOP
          </button>
        )}
        <button
          className="daw-button"
          onClick={onOpenResults}
          disabled={isRunning}
        >
          RESULTS
        </button>
      </div>
    </div>
  );
}


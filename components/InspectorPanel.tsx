'use client';

import { useState } from 'react';
import ConfigurationPanel from './ConfigurationPanel';
import TransportPanel from './TransportPanel';
import MetersPanel from './MetersPanel';
import styles from './InspectorPanel.module.css';

interface InspectorPanelProps {
  movieTitle: string;
  setMovieTitle: (value: string) => void;
  expectedEmotion: string;
  setExpectedEmotion: (value: string) => void;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onOpenResults: () => void;
  metrics: {
    peopleCount: number;
    reflectionScore: number;
    volatility: number;
    entropy: number;
    engagement: number;
  };
}

export default function InspectorPanel({
  movieTitle,
  setMovieTitle,
  expectedEmotion,
  setExpectedEmotion,
  isRunning,
  onStart,
  onStop,
  onOpenResults,
  metrics,
}: InspectorPanelProps) {
  return (
    <div className={styles.panel}>
      <ConfigurationPanel
        movieTitle={movieTitle}
        setMovieTitle={setMovieTitle}
        expectedEmotion={expectedEmotion}
        setExpectedEmotion={setExpectedEmotion}
        disabled={isRunning}
      />
      <TransportPanel
        isRunning={isRunning}
        onStart={onStart}
        onStop={onStop}
        onOpenResults={onOpenResults}
      />
      <MetersPanel metrics={metrics} />
    </div>
  );
}


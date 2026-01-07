'use client';

import { useRef } from 'react';
import styles from './ConfigurationPanel.module.css';

interface ConfigurationPanelProps {
  movieTitle: string;
  setMovieTitle: (value: string) => void;
  expectedEmotion: string;
  setExpectedEmotion: (value: string) => void;
  disabled: boolean;
}

const EMOTIONS = [
  'happy',
  'sad',
  'angry',
  'fear',
  'surprise',
  'disgust',
  'neutral',
];

export default function ConfigurationPanel({
  movieTitle,
  setMovieTitle,
  expectedEmotion,
  setExpectedEmotion,
  disabled,
}: ConfigurationPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>Configuration</div>
      <div className={styles.content}>
        <div className={styles.field}>
          <label className="daw-label" htmlFor="movie-title-input">
            Movie Title
          </label>
          <input
            id="movie-title-input"
            ref={inputRef}
            type="text"
            className="daw-input"
            value={movieTitle}
            onChange={(e) => setMovieTitle(e.target.value)}
            disabled={disabled}
            placeholder="Enter movie title"
            autoComplete="off"
          />
        </div>
        <div className={styles.field}>
          <label className="daw-label">Expected Emotion</label>
          <select
            className="daw-select"
            value={expectedEmotion}
            onChange={(e) => setExpectedEmotion(e.target.value)}
            disabled={disabled}
          >
            {EMOTIONS.map((emotion) => (
              <option key={emotion} value={emotion}>
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}


'use client';

import styles from './MetricsExplanationTab.module.css';

export default function MetricsExplanationTab() {
  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Reflection Score</h2>
      <div className={styles.content}>
        <p><strong>What it measures:</strong> How well detected emotions match the expected emotion.</p>
        <p><strong>How it's calculated:</strong></p>
        <ol>
          <li>For each person, count total detections (checks) and detections matching expected emotion (matches)</li>
          <li>Calculate per-person match rate: Matches ÷ Total Checks</li>
          <li>Calculate duration weight: Person Duration ÷ Total Session Duration</li>
          <li>Calculate weighted match: Weight × Match Rate</li>
          <li>Final Score = (Total Weighted Matches ÷ Total Weights) × 100</li>
        </ol>
        <p><strong>Result:</strong> Percentage from 0% to 100%</p>
        <ul>
          <li>0% = No matches</li>
          <li>100% = All detections matched expected emotion</li>
        </ul>
      </div>

      <h2 className={styles.sectionTitle}>Volatility</h2>
      <div className={styles.content}>
        <p><strong>What it measures:</strong> How often emotions change for a person.</p>
        <p><strong>How it's calculated:</strong></p>
        <ol>
          <li>Track emotion sequence for each person in chronological order</li>
          <li>Count how many times emotion changed between consecutive detections</li>
          <li>Volatility = Number of Changes ÷ Total Detections</li>
          <li>Average across all people</li>
        </ol>
        <p><strong>Result:</strong> Value from 0.0 to 1.0</p>
        <ul>
          <li>0.0 = No changes (very stable)</li>
          <li>1.0 = Changed every time (very volatile)</li>
        </ul>
      </div>

      <h2 className={styles.sectionTitle}>Entropy</h2>
      <div className={styles.content}>
        <p><strong>What it measures:</strong> Emotion diversity (how spread out emotions are).</p>
        <p><strong>How it's calculated:</strong></p>
        <ol>
          <li>Count how many times each emotion appeared</li>
          <li>Calculate probability for each emotion: Count ÷ Total Detections</li>
          <li>Calculate entropy: -Σ(p × log₂(p)) for each emotion</li>
          <li>Sum all entropy values</li>
        </ol>
        <p><strong>Result:</strong> Value from 0.0 to ~2.81</p>
        <ul>
          <li>0.0 = Only one emotion (no diversity)</li>
          <li>~2.81 = All emotions equally likely (maximum diversity for 7 emotions)</li>
        </ul>
        <p><em>Higher entropy means more diverse emotional responses.</em></p>
      </div>

      <h2 className={styles.sectionTitle}>Engagement Index</h2>
      <div className={styles.content}>
        <p><strong>What it measures:</strong> Combined measure of emotional engagement and stability.</p>
        <p><strong>How it's calculated:</strong></p>
        <ol>
          <li>Calculate average volatility across all people</li>
          <li>Calculate session entropy (all people combined)</li>
          <li>Normalize entropy: Session Entropy ÷ 2.81 (max entropy for 7 emotions)</li>
          <li>Engagement = (1 - Average Volatility) × (1 - Normalized Entropy)</li>
        </ol>
        <p><strong>Result:</strong> Value from 0.0 to 1.0</p>
        <ul>
          <li>0.0 = Low engagement (highly variable, diverse)</li>
          <li>1.0 = High engagement (stable, focused)</li>
        </ul>
        <p><em>High engagement means stable, focused emotional responses.</em></p>
      </div>

      <h2 className={styles.sectionTitle}>Dominant Emotion</h2>
      <div className={styles.content}>
        <p><strong>What it measures:</strong> The most frequently detected emotion in the session.</p>
        <p><strong>How it's calculated:</strong></p>
        <ol>
          <li>Count every emotion detection across all people</li>
          <li>Identify the emotion with the highest count</li>
          <li>Calculate percentage: (Count of Dominant Emotion ÷ Total Detections) × 100</li>
        </ol>
        <p><strong>Result:</strong> Emotion name and percentage</p>
      </div>

      <h2 className={styles.sectionTitle}>Emotion Distribution</h2>
      <div className={styles.content}>
        <p><strong>What it measures:</strong> How many times each emotion was detected (simple count).</p>
        <p><strong>How it's calculated:</strong></p>
        <ol>
          <li>Collect all emotion detections from the session</li>
          <li>Count how many times each emotion appeared</li>
          <li>Store as: {`{emotion_name: count}`}</li>
        </ol>
        <p><strong>Result:</strong> Simple count of each emotion</p>
        <p><em>Used for bar charts and visualizations.</em></p>
      </div>

    </div>
  );
}


'use client';

import styles from './MetricsTab.module.css';

interface MetricsTabProps {
  session: any;
}

export default function MetricsTab({ session }: MetricsTabProps) {
  // Support both old and new session formats
  const metrics = session.audience_metrics || session.metrics || {};
  const reflectionScore = session.reflection_score || metrics.reflectionScore || 0;
  const volatility = metrics.volatility?.average || metrics.volatility || 0;
  const entropy = metrics.entropy?.session || metrics.entropy || 0;
  const engagement = metrics.engagement_index || metrics.engagement || 0;

  // Get per-person data from person_timelines
  const personTimelines = session.person_timelines || {};

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Per-Person Metrics</h2>
      <div className={styles.content}>
        <p>
          Detailed per-person metrics are calculated based on face tracking and emotion detection
          throughout the session.
        </p>
        {Object.keys(personTimelines).length > 0 && (
          <div>
            <p><strong>People Detected:</strong> {Object.keys(personTimelines).length}</p>
            {Object.entries(personTimelines).map(([personId, detections]: [string, any]) => (
              <div key={personId} style={{ marginTop: '12px', padding: '8px', background: '#111', border: '1px solid #1a1a1a' }}>
                <p><strong>Person {personId}:</strong> {detections.length} detections</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className={styles.sectionTitle}>Volatility</h2>
      <div className={styles.content}>
        <p>
          <strong>Overall Volatility:</strong> {(volatility * 100).toFixed(1)}%
        </p>
        <p>
          Volatility measures the frequency of emotion changes. Lower volatility indicates more
          stable emotional states.
        </p>
      </div>

      <h2 className={styles.sectionTitle}>Reflection Scores</h2>
      <div className={styles.content}>
        <p>
          <strong>Overall Reflection Score:</strong> {reflectionScore}%
        </p>
        <p>
          The reflection score indicates how well the audience's detected emotions match the
          expected emotion for this session.
        </p>
      </div>

      <h2 className={styles.sectionTitle}>Engagement</h2>
      <div className={styles.content}>
        <p>
          <strong>Overall Engagement:</strong> {(engagement * 100).toFixed(1)}%
        </p>
        <p>
          Engagement is calculated as a combination of low volatility and focused emotional states.
          Higher engagement indicates more consistent audience attention.
        </p>
      </div>
    </div>
  );
}


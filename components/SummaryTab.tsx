'use client';

import styles from './SummaryTab.module.css';

interface SummaryTabProps {
  session: any;
}

export default function SummaryTab({ session }: SummaryTabProps) {
  // Support both old and new session formats
  const metrics = session.audience_metrics || session.metrics || {};
  const reflectionScore = session.reflection_score || metrics.reflectionScore || 0;
  const startTime = session.start_time || session.startTime;
  const endTime = session.end_time || session.endTime;
  const duration = session.session_duration || 0;

  // Calculate total unique people detected during the session
  // Use total_people if available, otherwise calculate from person_timelines
  const totalPeople = session.total_people || session.totalPeople || 
    (session.person_timelines ? Object.keys(session.person_timelines).length : 0);

  // Convert Unix timestamp to Date if needed
  const startDate = startTime ? (typeof startTime === 'number' ? new Date(startTime * 1000) : new Date(startTime)) : null;
  const endDate = endTime ? (typeof endTime === 'number' ? new Date(endTime * 1000) : new Date(endTime)) : null;

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Session Overview</h2>
      <div className={styles.sessionInfo}>
        {startDate && (
          <div className={styles.sessionInfoRow}>
            <span className={styles.sessionInfoLabel}>Start</span>
            <span className={styles.sessionInfoValue}>
              {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}
        {endDate && (
          <div className={styles.sessionInfoRow}>
            <span className={styles.sessionInfoLabel}>End</span>
            <span className={styles.sessionInfoValue}>
              {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}
        <div className={styles.sessionInfoRow}>
          <span className={styles.sessionInfoLabel}>Duration</span>
          <span className={styles.sessionInfoValue}>
            {duration > 0 ? `${Math.round(duration)}s` : 'N/A'}
          </span>
        </div>
        <div className={styles.sessionInfoRow}>
          <span className={styles.sessionInfoLabel}>Detections</span>
          <span className={styles.sessionInfoValue}>{session.total_detections || session.totalDetections || 0}</span>
        </div>
        <div className={styles.sessionInfoRow}>
          <span className={styles.sessionInfoLabel}>People</span>
          <span className={styles.sessionInfoValue}>{totalPeople}</span>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>Reflection Analysis</h2>
      <div className={styles.insight}>
        The reflection score of <strong>{reflectionScore}%</strong> indicates that{' '}
        {reflectionScore >= 80
          ? 'the audience strongly reflected the expected emotion.'
          : reflectionScore >= 60
          ? 'the audience moderately reflected the expected emotion.'
          : 'the audience did not strongly reflect the expected emotion.'}
      </div>

      <h2 className={styles.sectionTitle}>Audience Metrics</h2>
      <div className={styles.metricsGrid}>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>People</div>
          <div className={styles.metricValue}>{totalPeople}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Volatility</div>
          <div className={styles.metricValue}>
            {((metrics.volatility?.average || metrics.volatility || 0) * 100).toFixed(1)}%
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Entropy</div>
          <div className={styles.metricValue}>
            {(metrics.entropy?.session || metrics.entropy || 0).toFixed(2)}
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Engagement</div>
          <div className={styles.metricValue}>
            {((metrics.engagement_index || metrics.engagement || 0) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState } from 'react';
import SummaryTab from './SummaryTab';
import VisualizationTab from './VisualizationTab';
import MetricsTab from './MetricsTab';
import MetricsExplanationTab from './MetricsExplanationTab';
import AIChatTab from './AIChatTab';
import styles from './ResultsTabs.module.css';

interface ResultsTabsProps {
  session: any;
}

export default function ResultsTabs({ session }: ResultsTabsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'visualization' | 'metrics' | 'explanation' | 'ai'>('summary');

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'summary' ? styles.active : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'visualization' ? styles.active : ''}`}
          onClick={() => setActiveTab('visualization')}
        >
          Visualization
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'metrics' ? styles.active : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Metrics
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'explanation' ? styles.active : ''}`}
          onClick={() => setActiveTab('explanation')}
        >
          Explanation
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'ai' ? styles.active : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Assistant
        </button>
      </div>
      <div className={styles.content}>
        {activeTab === 'summary' && <SummaryTab session={session} />}
        {activeTab === 'visualization' && <VisualizationTab session={session} />}
        {activeTab === 'metrics' && <MetricsTab session={session} />}
        {activeTab === 'explanation' && <MetricsExplanationTab />}
        {activeTab === 'ai' && <AIChatTab session={session} />}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import styles from './VisualizationTab.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  Filler
);

interface VisualizationTabProps {
  session: any;
}

export default function VisualizationTab({ session }: VisualizationTabProps) {
  const [emotionData, setEmotionData] = useState<Record<string, number>>({});

  useEffect(() => {
    // Process emotion history to get emotion distribution
    const counts: Record<string, number> = {};
    
    // First, try to use pre-calculated emotion distribution from audience_metrics
    if (session.audience_metrics?.emotion_distribution && Object.keys(session.audience_metrics.emotion_distribution).length > 0) {
      console.log('Using pre-calculated emotion distribution:', session.audience_metrics.emotion_distribution);
      Object.assign(counts, session.audience_metrics.emotion_distribution);
    }
    // New structure: use detections array
    else if (session.detections && session.detections.length > 0) {
      console.log('Calculating from detections array, count:', session.detections.length);
      for (const detection of session.detections) {
        const emotion = detection.emotion;
        if (emotion && emotion !== 'detecting') {
          counts[emotion] = (counts[emotion] || 0) + 1;
        }
      }
      console.log('Calculated emotion counts:', counts);
    }
    // Fallback: try emotionHistory (old structure)
    else if (session.emotionHistory && session.emotionHistory.length > 0) {
      console.log('Using emotionHistory fallback');
      for (const emotion of session.emotionHistory) {
        counts[emotion] = (counts[emotion] || 0) + 1;
      }
    } 
    // Fallback: try frameData (old structure)
    else if (session.frameData) {
      console.log('Using frameData fallback');
      for (const frame of session.frameData) {
        if (frame.emotions && Array.isArray(frame.emotions)) {
          for (const emotion of frame.emotions) {
            counts[emotion] = (counts[emotion] || 0) + 1;
          }
        }
      }
    } else {
      console.warn('No emotion data found in session:', {
        hasDetections: !!session.detections,
        detectionsLength: session.detections?.length || 0,
        hasAudienceMetrics: !!session.audience_metrics,
        hasEmotionDistribution: !!session.audience_metrics?.emotion_distribution,
        hasEmotionHistory: !!session.emotionHistory,
        hasFrameData: !!session.frameData,
      });
    }
    
    setEmotionData(counts);
    console.log('Final emotion data for visualization:', counts);
  }, [session]);

  const emotions = Object.keys(emotionData);
  const values = Object.values(emotionData);

  // Enhanced color palette for DAW-style aesthetic
  const emotionColors: Record<string, string> = {
    happy: 'rgba(74, 158, 255, 0.85)',
    sad: 'rgba(255, 99, 132, 0.85)',
    angry: 'rgba(255, 159, 64, 0.85)',
    fear: 'rgba(75, 192, 192, 0.85)',
    surprise: 'rgba(153, 102, 255, 0.85)',
    disgust: 'rgba(255, 206, 86, 0.85)',
    neutral: 'rgba(160, 160, 160, 0.85)',
  };

  const emotionBorderColors: Record<string, string> = {
    happy: 'rgba(74, 158, 255, 1)',
    sad: 'rgba(255, 99, 132, 1)',
    angry: 'rgba(255, 159, 64, 1)',
    fear: 'rgba(75, 192, 192, 1)',
    surprise: 'rgba(153, 102, 255, 1)',
    disgust: 'rgba(255, 206, 86, 1)',
    neutral: 'rgba(160, 160, 160, 1)',
  };

  // Prepare timeline data
  const timelineData = useMemo(() => {
    if (!session.detections || session.detections.length === 0) return null;

    const timeBins: Record<number, Record<string, number>> = {};
    const startTime = session.start_time || (session.detections[0]?.timestamp || 0);
    const binSize = 5; // 5 second bins

    for (const detection of session.detections) {
      if (!detection.emotion || detection.emotion === 'detecting') continue;
      const time = detection.timestamp || startTime;
      const bin = Math.floor((time - startTime) / binSize);
      
      if (!timeBins[bin]) timeBins[bin] = {};
      timeBins[bin][detection.emotion] = (timeBins[bin][detection.emotion] || 0) + 1;
    }

    const bins = Object.keys(timeBins).map(Number).sort((a, b) => a - b);
    if (bins.length === 0) return null;
    const allEmotions = ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral'];

    return {
      labels: bins.map(b => `${b * binSize}s`),
      datasets: allEmotions.map(emotion => ({
        label: emotion,
        data: bins.map(b => timeBins[b]?.[emotion] || 0),
        borderColor: emotionBorderColors[emotion],
        backgroundColor: emotionColors[emotion].replace('0.85', '0.2'),
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      })),
    };
  }, [session, emotionColors, emotionBorderColors]);

  // Prepare per-person emotion data
  const perPersonData = useMemo(() => {
    if (!session.person_timelines || Object.keys(session.person_timelines).length === 0) return null;

    const personEmotions: Record<number, Record<string, number>> = {};
    
    for (const [personId, timeline] of Object.entries(session.person_timelines)) {
      const id = Number(personId);
      personEmotions[id] = {};
      
      for (const detection of timeline as any[]) {
        const emotion = detection.emotion || 'neutral';
        if (emotion !== 'detecting') {
          personEmotions[id][emotion] = (personEmotions[id][emotion] || 0) + 1;
        }
      }
    }

    const people = Object.keys(personEmotions).map(Number).sort((a, b) => a - b);
    if (people.length === 0) return null;
    const allEmotions = Object.keys(emotionColors);

    return {
      labels: people.map(p => `Person ${p}`),
      datasets: allEmotions.map(emotion => ({
        label: emotion,
        data: people.map(p => personEmotions[p]?.[emotion] || 0),
        backgroundColor: emotionColors[emotion],
        borderColor: emotionBorderColors[emotion],
        borderWidth: 1,
      })),
    };
  }, [session]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const allEmotions = ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral'];
    const total = values.reduce((sum, val) => sum + val, 0);
    
    return {
      labels: allEmotions,
      datasets: [
        {
          label: 'Emotion Distribution',
          data: allEmotions.map(emotion => {
            const count = emotionData[emotion] || 0;
            return total > 0 ? (count / total) * 100 : 0;
          }),
          backgroundColor: 'rgba(74, 158, 255, 0.2)',
          borderColor: 'rgba(74, 158, 255, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(74, 158, 255, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(74, 158, 255, 1)',
        },
      ],
    };
  }, [emotionData, values]);

  // Common chart options with Space Grotesk font
  // Chart.js needs the actual font name, not CSS variables
  const fontFamily = '"Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  
  const baseChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#b0b0b0',
          font: {
            family: fontFamily,
            size: 10,
          },
          padding: 12,
          usePointStyle: true,
        },
        position: 'bottom' as const,
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.95)',
        titleColor: '#e0e0e0',
        bodyColor: '#b0b0b0',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        padding: 10,
        titleFont: {
          family: fontFamily,
          size: 11,
          weight: '600',
        },
        bodyFont: {
          family: fontFamily,
          size: 11,
        },
        displayColors: true,
        boxPadding: 6,
      },
    },
  };

  const barChartOptions = {
    ...baseChartOptions,
    scales: {
      x: {
        ticks: {
          color: '#888888',
          font: {
            family: fontFamily,
            size: 10,
          },
          padding: 8,
        },
        grid: {
          color: '#151515',
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          color: '#888888',
          font: {
            family: fontFamily,
            size: 10,
          },
          padding: 8,
        },
        grid: {
          color: '#151515',
          drawBorder: false,
        },
        beginAtZero: true,
      },
    },
  };

  const lineChartOptions = {
    ...baseChartOptions,
    scales: {
      x: {
        ticks: {
          color: '#888888',
          font: {
            family: fontFamily,
            size: 10,
          },
          padding: 8,
        },
        grid: {
          color: '#151515',
          drawBorder: false,
        },
      },
      y: {
        ticks: {
          color: '#888888',
          font: {
            family: fontFamily,
            size: 10,
          },
          padding: 8,
        },
        grid: {
          color: '#151515',
          drawBorder: false,
        },
        beginAtZero: true,
      },
    },
  };

  const radarChartOptions = {
    ...baseChartOptions,
    scales: {
      r: {
        ticks: {
          color: '#888888',
          font: {
            family: fontFamily,
            size: 9,
          },
          backdropColor: 'transparent',
        },
        grid: {
          color: '#151515',
        },
        pointLabels: {
          color: '#b0b0b0',
          font: {
            family: fontFamily,
            size: 10,
          },
        },
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const doughnutChartOptions = {
    ...baseChartOptions,
    cutout: '60%',
  };

  const backgroundColor = emotions.length > 0
    ? emotions.map((emotion) => emotionColors[emotion] || 'rgba(160, 160, 160, 0.85)')
    : Object.values(emotionColors);

  const barData = {
    labels: emotions.length > 0 ? emotions : ['No data'],
    datasets: [
      {
        label: 'Count',
        data: values.length > 0 ? values : [0],
        backgroundColor: backgroundColor,
        borderColor: emotions.map((emotion) => emotionBorderColors[emotion] || 'rgba(160, 160, 160, 1)'),
        borderWidth: 1,
        borderRadius: 2,
      },
    ],
  };

  const doughnutData = {
    labels: emotions.length > 0 ? emotions : ['No data'],
    datasets: [
      {
        data: values.length > 0 ? values : [0],
        backgroundColor: backgroundColor,
        borderColor: '#0a0a0a',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className={styles.container}>
      <div className={styles.chartRow}>
        <div className={styles.chartHalf}>
          <h2 className={styles.sectionTitle}>Distribution</h2>
          <div className={styles.chartContainer}>
            <Bar data={barData} options={barChartOptions} />
          </div>
        </div>
        <div className={styles.chartHalf}>
          <h2 className={styles.sectionTitle}>Breakdown</h2>
          <div className={styles.chartContainer}>
            <Doughnut data={doughnutData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>

      {timelineData && (
        <>
          <h2 className={styles.sectionTitle}>Emotion Timeline</h2>
          <div className={styles.chartContainerLarge}>
            <Line data={timelineData} options={lineChartOptions} />
          </div>
        </>
      )}

      {perPersonData && (
        <>
          <h2 className={styles.sectionTitle}>Per-Person Distribution</h2>
          <div className={styles.chartContainerLarge}>
            <Bar data={perPersonData} options={barChartOptions} />
          </div>
        </>
      )}

      {emotions.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Emotion Profile</h2>
          <div className={styles.chartContainerLarge}>
            <Radar data={radarData} options={radarChartOptions} />
          </div>
        </>
      )}
    </div>
  );
}


'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CustomTitlebar from '@/components/CustomTitlebar';
import InspectorPanel from '@/components/InspectorPanel';
import CameraViewport from '@/components/CameraViewport';
import AlertModal from '@/components/AlertModal';
import { InferenceEngine } from '@/lib/inference-engine';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [movieTitle, setMovieTitle] = useState('');
  const [expectedEmotion, setExpectedEmotion] = useState('happy');
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [metrics, setMetrics] = useState({
    peopleCount: 0,
    reflectionScore: 0,
    volatility: 0,
    entropy: 0,
    engagement: 0,
  });
  
  const inferenceEngineRef = useRef<InferenceEngine | null>(null);
  const [frameData, setFrameData] = useState<any>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [alert, setAlert] = useState<{ message: string; type?: 'error' | 'warning' | 'info' } | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Set up IPC listeners
    window.electronAPI.onFrameData((data) => {
      setFrameData(data);
      // Also send frame data to main process for session storage
      if (sessionId && window.electronAPI) {
        // Store frame data (throttled to avoid too many IPC calls)
        if (data.frameNumber % 30 === 0) {
          // This will be handled by the main process if needed
        }
      }
    });

    window.electronAPI.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
    });

    window.electronAPI.onFpsUpdate((newFps) => {
      setFps(newFps);
    });

    return () => {
      window.electronAPI?.removeAllListeners('frame-data');
      window.electronAPI?.removeAllListeners('metrics-update');
      window.electronAPI?.removeAllListeners('fps-update');
    };
  }, []);

  const handleStart = async () => {
    if (!movieTitle.trim()) {
      setAlert({ message: 'Please enter a movie title', type: 'warning' });
      return;
    }

    if (!window.electronAPI) {
      setAlert({ message: 'Electron API not available', type: 'error' });
      return;
    }

    try {
      // Start session in main process
      const result = await window.electronAPI.startSession({
        movieTitle: movieTitle.trim(),
        expectedEmotion,
      });

      if (!result.success) {
        setAlert({ message: `Failed to start session: ${result.error}`, type: 'error' });
        return;
      }

      setSessionId(result.sessionId || null);
      setIsRunning(true);

      // Initialize inference engine in renderer
      const engine = new InferenceEngine({
        movieTitle: movieTitle.trim(),
        expectedEmotion,
        onFrame: (data) => {
          // Update UI state on even frames (throttled for performance)
          if (data.frameNumber % 2 === 0) {
            setFrameData(data);
          }
          
          // Always store frame data for session analysis (log ALL detections)
          // This ensures we capture every detection, not just UI-updated frames
          if (result.sessionId && window.electronAPI) {
            // Use setTimeout to avoid blocking the main thread
            setTimeout(() => {
              if (result.sessionId) {
                window.electronAPI?.addFrameData(result.sessionId, data);
              }
            }, 0);
          }
        },
        onMetrics: (newMetrics) => {
          setMetrics(newMetrics);
          if (result.sessionId) {
            window.electronAPI?.updateMetrics(result.sessionId, newMetrics);
          }
        },
        onFps: (newFps) => {
          setFps(newFps);
        },
        onVideoReady: (video) => {
          setVideoElement(video);
        },
      });

      inferenceEngineRef.current = engine;
      
      // Small buffer before starting camera to allow UI to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await engine.start();
    } catch (error) {
      console.error('Failed to start:', error);
      setAlert({ message: `Failed to start: ${error}`, type: 'error' });
    }
  };

  const handleStop = async () => {
    // Get frame count and reflection score details before stopping
    const frameCount = inferenceEngineRef.current?.getFrameCount() || 0;
    
    // Calculate reflection score details using the calculator (before stopping)
    const [reflectionScore, reflectionScoreDetails] = 
      inferenceEngineRef.current?.getReflectionScoreDetails() || [metrics.reflectionScore, {
        score: metrics.reflectionScore,
        total_checks: 0,
        total_matches: 0,
        total_duration: 0,
        person_count: metrics.peopleCount,
        per_person: {},
      }];
    
    if (inferenceEngineRef.current) {
      inferenceEngineRef.current.stop();
      inferenceEngineRef.current = null;
    }

    if (sessionId && window.electronAPI) {
      const finalMetrics = {
        ...metrics,
        reflectionScore: reflectionScore, // Use calculated score
        frameCount: frameCount,
      };
      
      // Audience metrics will be calculated in session manager from session data
      // Provide basic structure - full calculation happens in session manager
      const audienceMetrics = {
        volatility: {
          average: metrics.volatility,
          per_person: {},
        },
        entropy: {
          session: metrics.entropy,
          per_person: {},
        },
        engagement_index: metrics.engagement,
        dominant_emotion: {
          emotion: expectedEmotion,
          percentage: metrics.reflectionScore,
        },
        transition_matrix: {},
        emotion_distribution: {},
        per_person: {},
      };
      
      await window.electronAPI.stopSession(
        sessionId,
        finalMetrics,
        reflectionScoreDetails,
        audienceMetrics,
        metrics.peopleCount
      );
    }

    setIsRunning(false);
    setFrameData(null);
    setVideoElement(null);
  };

  const handleOpenResults = () => {
    if (sessionId) {
      router.push(`/results?sessionId=${sessionId}`);
    }
  };

  return (
    <div className={styles.container}>
      <CustomTitlebar fps={fps} />
      <div className={styles.content}>
        <InspectorPanel
          movieTitle={movieTitle}
          setMovieTitle={setMovieTitle}
          expectedEmotion={expectedEmotion}
          setExpectedEmotion={setExpectedEmotion}
          isRunning={isRunning}
          onStart={handleStart}
          onStop={handleStop}
          onOpenResults={handleOpenResults}
          metrics={metrics}
        />
        <CameraViewport frameData={frameData} fps={fps} videoElement={videoElement} />
      </div>
      {alert && (
        <AlertModal
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}


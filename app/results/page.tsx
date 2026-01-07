'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CustomTitlebar from '@/components/CustomTitlebar';
import ResultsHeader from '@/components/ResultsHeader';
import ScorePanel from '@/components/ScorePanel';
import ResultsTabs from '@/components/ResultsTabs';
import styles from './page.module.css';

declare global {
  interface Window {
    electronAPI?: {
      getSession: (sessionId: string) => Promise<any>;
    };
  }
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId || !window.electronAPI) {
      setLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        const data = await window.electronAPI!.getSession(sessionId);
        console.log('Loaded session data:', data);
        console.log('Session detections:', data?.detections?.length || 0);
        console.log('Session metrics:', data?.audience_metrics || data?.metrics);
        setSession(data);
      } catch (error) {
        console.error('Failed to load session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <CustomTitlebar fps={0} />
        <div className={styles.loading}>Loading session data...</div>
        <div className={styles.backButton}>
          <button className="daw-button" onClick={() => router.push('/')}>
            Back to Main
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.container}>
        <CustomTitlebar fps={0} />
        <div className={styles.error}>Session not found</div>
        <div className={styles.backButton}>
          <button className="daw-button" onClick={() => router.push('/')}>
            Back to Main
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CustomTitlebar fps={0} />
      <div className={styles.content}>
        <ResultsHeader
          movieTitle={session.movie_title || session.movieTitle}
          expectedEmotion={session.expected_emotion || session.expectedEmotion}
        />
        <ScorePanel reflectionScore={session.reflection_score || session.metrics?.reflectionScore || 0} />
        <ResultsTabs session={session} />
        <div className={styles.backButton}>
          <button className="daw-button" onClick={() => router.push('/')}>
            Back to Main
          </button>
        </div>
      </div>
    </div>
  );
}


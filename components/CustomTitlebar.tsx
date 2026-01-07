'use client';

import { useEffect, useState } from 'react';
import { HiMinus, HiSquare2Stack, HiXMark } from 'react-icons/hi2';
import styles from './CustomTitlebar.module.css';

interface CustomTitlebarProps {
  fps: number;
}

export default function CustomTitlebar({ fps }: CustomTitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Check initial maximized state
    const checkMaximized = () => {
      // This would need to be implemented via IPC
      setIsMaximized(false);
    };
    checkMaximized();
  }, []);

  const handleWindowControl = async (action: string) => {
    if (window.electronAPI) {
      await window.electronAPI.windowControl(action);
      if (action === 'maximize') {
        setIsMaximized(!isMaximized);
      }
    }
  };

  return (
    <div className={styles.titlebar} data-tauri-drag-region>
      <div className={styles.titlebarLeft}>
        <span className={styles.title}>CINEMASENSE</span>
      </div>
      <div className={styles.titlebarRight}>
        <span className={styles.fps}>FPS: {fps}</span>
        <button
          className={styles.windowButton}
          onClick={() => handleWindowControl('minimize')}
          title="Minimize"
        >
          <HiMinus size={14} />
        </button>
        <button
          className={styles.windowButton}
          onClick={() => handleWindowControl('maximize')}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          <HiSquare2Stack size={14} />
        </button>
        <button
          className={`${styles.windowButton} ${styles.closeButton}`}
          onClick={() => handleWindowControl('close')}
          title="Close"
        >
          <HiXMark size={14} />
        </button>
      </div>
    </div>
  );
}


'use client';

import { useEffect } from 'react';
import styles from './AlertModal.module.css';

interface AlertModalProps {
  message: string;
  onClose: () => void;
  type?: 'error' | 'warning' | 'info';
}

export default function AlertModal({ message, onClose, type = 'info' }: AlertModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.content} ${styles[type]}`}>
          <div className={styles.message}>{message}</div>
          <button className={styles.button} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}


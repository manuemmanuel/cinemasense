'use client';

import { useEffect, useRef } from 'react';
import styles from './CameraViewport.module.css';

interface CameraViewportProps {
  frameData: any;
  fps: number;
  videoElement: HTMLVideoElement | null;
}

export default function CameraViewport({ frameData, fps, videoElement }: CameraViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const draw = () => {
      if (!isMounted) return;
      
      if (!videoElement || videoElement.readyState !== 4) {
        // Draw placeholder - cinematic style
        canvas.width = 1280;
        canvas.height = 720;
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Subtle grid pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }
        
        // Centered placeholder text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = '13px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Waiting for camera...', canvas.width / 2, canvas.height / 2);
        
        if (isMounted) {
          animationFrameRef.current = requestAnimationFrame(draw);
        }
        return;
      }

      // Check if video element is still valid
      try {
        // Set canvas size to match video
        canvas.width = videoElement.videoWidth || 1280;
        canvas.height = videoElement.videoHeight || 720;

        // Draw video frame
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Draw face detection overlays
        if (frameData && frameData.faces) {
          for (const face of frameData.faces) {
            const box = face.box;
            const x = box.xMin * canvas.width;
            const y = box.yMin * canvas.height;
            const width = box.width * canvas.width;
            const height = box.height * canvas.height;

            // Determine box color based on emotion state - professional, restrained colors
            const isConfirmed = face.emotion !== 'detecting' && face.confidence >= 0.7;
            const boxColor = isConfirmed ? '#3a6bb3' : '#8b7a5a'; // Blue for confirmed, amber for detecting
            const textColor = isConfirmed ? '#5a8bc5' : '#a89676';

            // Draw bounding box - subtle, professional
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, width, height);
            
            // Subtle inner border for depth
            ctx.strokeStyle = `rgba(${isConfirmed ? '58, 107, 179' : '139, 122, 90'}, 0.3)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

            // Draw person ID - compact, professional
            ctx.fillStyle = 'rgba(13, 13, 13, 0.85)';
            ctx.fillRect(x + 2, y - 18, 80, 16);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2, y - 18, 80, 16);
            ctx.fillStyle = textColor;
            ctx.font = '10px "Space Grotesk", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`Person ${face.personId}`, x + 6, y - 10);

            // Draw emotion label - compact, professional
            const emotionText = `${face.emotion} ${Math.round(face.confidence * 100)}%`;
            const textWidth = ctx.measureText(emotionText).width;
            ctx.fillStyle = 'rgba(13, 13, 13, 0.85)';
            ctx.fillRect(x + 2, y + height + 2, textWidth + 8, 16);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2, y + height + 2, textWidth + 8, 16);
            ctx.fillStyle = textColor;
            ctx.fillText(emotionText, x + 6, y + height + 10);
          }
        }

      // Draw FPS overlay - minimal, corner-anchored
      ctx.fillStyle = 'rgba(13, 13, 13, 0.85)';
      ctx.fillRect(canvas.width - 70, 8, 62, 20);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(canvas.width - 70, 8, 62, 20);
      ctx.fillStyle = '#6a6a6a';
      ctx.font = '10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`FPS ${fps}`, canvas.width - 65, 18);
      } catch (error) {
        // Video element might have been removed, stop drawing
        console.warn('Error drawing to canvas:', error);
        return;
      }

      if (isMounted) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [frameData, fps, videoElement]);

  return (
    <div className={styles.viewport}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}


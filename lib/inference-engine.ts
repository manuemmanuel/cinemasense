import * as faceapi from 'face-api.js';
import { ReflectionScoreCalculator } from './reflection-score-calculator';
import { AudienceMetricsCalculator } from './audience-metrics-calculator';

export interface InferenceConfig {
  movieTitle: string;
  expectedEmotion: string;
  onFrame: (data: any) => void;
  onMetrics: (metrics: any) => void;
  onFps: (fps: number) => void;
  onVideoReady?: (video: HTMLVideoElement) => void;
}

export class InferenceEngine {
  private config: InferenceConfig;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private modelsLoaded = false;
  private isRunning = false;
  private frameCount = 0;
  private lastFpsTime = Date.now();
  private fps = 0;
  private fpsCounter = 0;

  // Face tracking with recognition
  private trackedFaces = new Map<number, any>();
  private nextPersonId = 1;
  private emotionHistory = new Map<number, any[]>();
  private faceDescriptors = new Map<number, Float32Array>(); // Store face embeddings for recognition
  private recognitionThreshold = 0.75; // Threshold for face matching (higher = more lenient)

  // Metrics
  private metrics = {
    peopleCount: 0,
    reflectionScore: 0,
    volatility: 0,
    entropy: 0,
    engagement: 0,
  };

  // Reflection score calculator
  private reflectionCalculator: ReflectionScoreCalculator | null = null;
  private sessionStartTime: number | null = null;
  
  // Audience metrics calculator
  private audienceMetricsCalculator: AudienceMetricsCalculator | null = null;

  // Emotion detection state
  private emotionThrottle = 5; // Process emotions more frequently
  private smoothingWindow = 10;
  private lastProcessTime = 0;
  private targetFps = 30; // Target 30 FPS instead of 60 for better performance

  constructor(config: InferenceConfig) {
    this.config = config;
  }

  async start() {
    try {
      // Initialize reflection score calculator
      this.reflectionCalculator = new ReflectionScoreCalculator(this.config.expectedEmotion);
      this.reflectionCalculator.startSession();
      this.sessionStartTime = Date.now() / 1000;
      console.log('Reflection score calculator initialized for emotion:', this.config.expectedEmotion);
      
      // Initialize audience metrics calculator
      this.audienceMetricsCalculator = new AudienceMetricsCalculator();

      // Initialize camera
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      // Load face-api.js models
      if (!this.modelsLoaded) {
        // Use GitHub raw content CDN - this is the most reliable source
        const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
        
        try {
          console.log('Loading face-api.js models from:', MODEL_URL);
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL), // For face recognition/identification
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
          
          this.modelsLoaded = true;
          console.log('face-api.js models loaded successfully');
        } catch (error) {
          console.error('Failed to load models from GitHub:', error);
          // Try unpkg as fallback
          const ALT_MODEL_URL = 'https://unpkg.com/face-api.js@0.22.2/weights';
          try {
            console.log('Trying alternative CDN:', ALT_MODEL_URL);
            await Promise.all([
              faceapi.nets.tinyFaceDetector.loadFromUri(ALT_MODEL_URL),
              faceapi.nets.faceLandmark68Net.loadFromUri(ALT_MODEL_URL),
              faceapi.nets.faceRecognitionNet.loadFromUri(ALT_MODEL_URL),
              faceapi.nets.faceExpressionNet.loadFromUri(ALT_MODEL_URL),
            ]);
            this.modelsLoaded = true;
            console.log('face-api.js models loaded successfully from unpkg');
          } catch (error2) {
            console.error('Failed to load models from all CDNs:', error2);
            throw new Error('Failed to load face-api.js models. Please check your internet connection and try again.');
          }
        }
      }

      this.isRunning = true;

      // Create video element for processing
      this.video = document.createElement('video');
      this.video.srcObject = this.stream;
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.play();

      // Notify that video is ready for display
      if (this.config.onVideoReady) {
        this.config.onVideoReady(this.video);
      }

      this.video.addEventListener('loadedmetadata', () => {
        this.processFrame();
      });
    } catch (error) {
      console.error('Failed to start inference engine:', error);
      throw error;
    }
  }

  private async processFrame() {
    if (!this.isRunning || !this.video || this.video.readyState !== 4) {
      if (this.isRunning) {
        requestAnimationFrame(() => this.processFrame());
      }
      return;
    }

    const startTime = performance.now();
    const now = Date.now();
    
    // Throttle processing to target FPS
    const timeSinceLastFrame = now - this.lastProcessTime;
    const minFrameTime = 1000 / this.targetFps;
    
    if (timeSinceLastFrame < minFrameTime) {
      requestAnimationFrame(() => this.processFrame());
      return;
    }
    
    this.lastProcessTime = now;

    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      requestAnimationFrame(() => this.processFrame());
      return;
    }
    ctx.drawImage(this.video, 0, 0);

    // Face detection with emotion recognition using face-api.js
    // Only run emotion detection every N frames to reduce load
    const shouldDetectEmotions = this.frameCount % this.emotionThrottle === 0;
    
    let faces: any[] = [];
    try {
      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320, // Smaller input size for better performance
        scoreThreshold: 0.5,
      });
      
      if (shouldDetectEmotions) {
        // Full detection with emotions (slower)
        const detections = await faceapi
          .detectAllFaces(canvas, detectionOptions)
          .withFaceLandmarks()
          .withFaceExpressions();

        // Convert face-api.js detections to our format
        faces = detections.map((detection: any) => {
          const box = detection.detection.box;
          
          // Normalize coordinates to 0-1
          const xMin = box.x / canvas.width;
          const yMin = box.y / canvas.height;
          const width = box.width / canvas.width;
          const height = box.height / canvas.height;
          
          // Get emotion with highest confidence
          const expressions = detection.expressions || {};
          let topEmotion = 'neutral';
          let topConfidence = 0;
          
          // Map face-api.js emotions to our format
          const emotionMap: Record<string, string> = {
            'happy': 'happy',
            'sad': 'sad',
            'angry': 'angry',
            'fearful': 'fear',
            'surprised': 'surprise',
            'disgusted': 'disgust',
            'neutral': 'neutral',
          };
          
          // Map expressions to our emotion format
          const allEmotions: Record<string, number> = {};
          for (const [emotion, confidence] of Object.entries(expressions)) {
            const mappedEmotion = emotionMap[emotion] || emotion;
            allEmotions[mappedEmotion] = confidence as number;
            if ((confidence as number) > topConfidence) {
              topConfidence = confidence as number;
              topEmotion = mappedEmotion;
            }
          }
          
          return {
            box: {
              xMin,
              yMin,
              width,
              height,
            },
            score: detection.detection.score || 0,
            emotion: topEmotion,
            confidence: topConfidence,
            expressions: expressions,
            allEmotions: allEmotions,
          };
        });
      } else {
        // Fast detection without emotions (just tracking)
        const detections = await faceapi.detectAllFaces(canvas, detectionOptions);
        
        faces = detections.map((detection: any) => {
          const box = detection.box;
          const xMin = box.x / canvas.width;
          const yMin = box.y / canvas.height;
          const width = box.width / canvas.width;
          const height = box.height / canvas.height;
          
          return {
            box: {
              xMin,
              yMin,
              width,
              height,
            },
            score: detection.score || 0,
            emotion: 'neutral', // Will be updated when emotions are detected
            confidence: 0,
            descriptor: undefined, // No descriptor in fast mode
          };
        });
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }

    // Update face tracking
    this.updateFaceTracking(faces);

    // Update emotion tracking only when emotions were detected
    if (shouldDetectEmotions) {
      this.inferEmotions(faces);
    }

    // Calculate metrics
    this.calculateMetrics();

    // Prepare faces with complete detection data
    const facesWithData = Array.from(this.trackedFaces.values()).map(face => ({
      ...face,
      personId: face.personId,
      emotion: face.emotion || 'neutral', // Ensure emotion is always set
      confidence: face.confidence || 0,
      box: face.box || { xMin: 0, yMin: 0, width: 0, height: 0 },
      allEmotions: face.allEmotions || { [face.emotion || 'neutral']: face.confidence || 0 },
    }));
    
    // Always send frame data for logging (to capture all detections)
    // Throttle UI updates but log everything
    this.config.onFrame({
      faces: facesWithData,
      frameNumber: this.frameCount,
      timestamp: Date.now() / 1000, // Unix timestamp in seconds
      peopleCount: this.metrics.peopleCount,
    });

    // Update FPS
    this.fpsCounter++;
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.fpsCounter * 1000) / (now - this.lastFpsTime));
      this.fpsCounter = 0;
      this.lastFpsTime = now;
      this.config.onFps(this.fps);
    }

    // Emit metrics (throttled)
    if (this.frameCount % 5 === 0) {
      this.config.onMetrics({ ...this.metrics });
    }

    this.frameCount++;

    // Use requestAnimationFrame for smoother performance
    requestAnimationFrame(() => this.processFrame());
  }

  private updateFaceTracking(faces: any[]) {
    const currentFaceIds = new Set<number>();
    const now = Date.now();

    for (const face of faces) {
      const box = face.box;
      const centerX = box.xMin + box.width / 2;
      const centerY = box.yMin + box.height / 2;
      const descriptor = face.descriptor;

      // Try to match by face descriptor (recognition) first
      let matchedPersonId: number | null = null;
      let minDistance = Infinity;

      if (descriptor) {
        // Compare with stored face descriptors using Euclidean distance
        for (const [personId, storedDescriptor] of this.faceDescriptors.entries()) {
          const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
          if (distance < minDistance && distance < this.recognitionThreshold) {
            minDistance = distance;
            matchedPersonId = personId;
          }
        }
      }

      // If no match by descriptor, try spatial matching as fallback
      if (!matchedPersonId) {
        for (const [personId, tracked] of this.trackedFaces.entries()) {
          const trackedCenterX = tracked.box.xMin + tracked.box.width / 2;
          const trackedCenterY = tracked.box.yMin + tracked.box.height / 2;
          const spatialDistance = Math.sqrt(
            Math.pow(centerX - trackedCenterX, 2) +
            Math.pow(centerY - trackedCenterY, 2)
          );

          // Use spatial matching if reasonably close (within 0.2 normalized distance - more lenient)
          if (spatialDistance < 0.2 && spatialDistance < minDistance) {
            minDistance = spatialDistance;
            matchedPersonId = personId;
          }
        }
      }

      if (matchedPersonId) {
        // Update existing face
        const tracked = this.trackedFaces.get(matchedPersonId);
        // Preserve existing emotion if new one is 'detecting' or missing
        let emotionToUse = tracked?.emotion || 'neutral';
        let confidenceToUse = tracked?.confidence || 0;
        
        if (face.emotion && face.emotion !== 'detecting' && face.emotion !== 'neutral') {
          emotionToUse = face.emotion;
          confidenceToUse = face.confidence || 0;
        } else if (face.emotion === 'neutral' && face.confidence > 0.5) {
          // Only update to neutral if confidence is high
          emotionToUse = 'neutral';
          confidenceToUse = face.confidence;
        }
        
        this.trackedFaces.set(matchedPersonId, {
          personId: matchedPersonId,
          box: box,
          lastSeen: now,
          firstSeen: tracked?.firstSeen || now,
          emotion: emotionToUse,
          confidence: confidenceToUse,
        });
        
        // Update descriptor if we have a better/newer one
        if (descriptor) {
          this.faceDescriptors.set(matchedPersonId, descriptor);
        }
        
        currentFaceIds.add(matchedPersonId);
      } else {
        // New face - assign new ID
        const newId = this.nextPersonId++;
        this.trackedFaces.set(newId, {
          personId: newId,
          box: box,
          lastSeen: now,
          firstSeen: now,
          emotion: (face.emotion && face.emotion !== 'detecting') ? face.emotion : 'neutral',
          confidence: face.confidence || 0,
        });
        
        // Store face descriptor for future recognition
        if (descriptor) {
          this.faceDescriptors.set(newId, descriptor);
        }
        
        this.emotionHistory.set(newId, []);
        currentFaceIds.add(newId);
      }
    }

    // Remove faces not seen recently (with timeout)
    for (const [personId, face] of this.trackedFaces.entries()) {
      if (!currentFaceIds.has(personId) && now - face.lastSeen > 2000) { // 2 second timeout
        this.trackedFaces.delete(personId);
        this.emotionHistory.delete(personId);
        this.faceDescriptors.delete(personId);
      }
    }
  }

  private async inferEmotions(faces: any[]) {
    // Emotions are already detected by face-api.js, just update tracking
    for (const face of faces) {
      const personId = this.findPersonIdForFace(face);
      if (!personId) continue;

      // face-api.js already provides emotion, use it directly
      const emotion = {
        emotion: face.emotion || 'neutral',
        confidence: face.confidence || 0,
      };

      if (!this.emotionHistory.has(personId)) {
        this.emotionHistory.set(personId, []);
      }

      const history = this.emotionHistory.get(personId)!;
      history.push(emotion);

      if (history.length > this.smoothingWindow) {
        history.shift();
      }

      const smoothed = this.smoothEmotion(history);

      const tracked = this.trackedFaces.get(personId);
      if (tracked) {
        // Determine the emotion to use and ensure it's always set
        let emotionToUse = tracked.emotion || 'neutral';
        let confidenceToUse = tracked.confidence || 0;
        
        // Always update emotion if we have a valid one (not 'detecting')
        if (smoothed.emotion !== 'detecting' && smoothed.confidence > 0) {
          emotionToUse = smoothed.emotion;
          confidenceToUse = smoothed.confidence;
          tracked.emotion = emotionToUse;
          tracked.confidence = confidenceToUse;
          
          // Record detection for reflection score calculation
          if (this.reflectionCalculator) {
            const timestamp = Date.now() / 1000;
            this.reflectionCalculator.recordDetection(personId, emotionToUse, timestamp);
          }
        } else if (tracked.emotion === 'detecting' || !tracked.emotion) {
          // If still detecting, use the most recent emotion from history
          const lastEmotion = history[history.length - 1];
          if (lastEmotion && lastEmotion.emotion && lastEmotion.emotion !== 'detecting') {
            emotionToUse = lastEmotion.emotion;
            confidenceToUse = lastEmotion.confidence || 0;
            tracked.emotion = emotionToUse;
            tracked.confidence = confidenceToUse;
            
            // Record detection for reflection score calculation
            if (this.reflectionCalculator) {
              const timestamp = Date.now() / 1000;
              this.reflectionCalculator.recordDetection(personId, emotionToUse, timestamp);
            }
            
            // Record detection for audience metrics
            if (this.audienceMetricsCalculator) {
              const timestamp = Date.now() / 1000;
              this.audienceMetricsCalculator.recordDetection(personId, emotionToUse, timestamp);
            }
          } else {
            // Default to neutral if no valid emotion
            emotionToUse = 'neutral';
            confidenceToUse = 0.5;
            tracked.emotion = emotionToUse;
            tracked.confidence = confidenceToUse;
            
            // Record detection even for neutral/default emotions
            if (this.reflectionCalculator) {
              const timestamp = Date.now() / 1000;
              this.reflectionCalculator.recordDetection(personId, emotionToUse, timestamp);
            }
            
            // Record detection for audience metrics
            if (this.audienceMetricsCalculator) {
              const timestamp = Date.now() / 1000;
              this.audienceMetricsCalculator.recordDetection(personId, emotionToUse, timestamp);
            }
          }
        } else {
          // If we're keeping existing emotion, record it periodically for reflection score
          // This ensures we capture ongoing detections, not just when emotion changes
          if (this.reflectionCalculator && tracked.emotion && tracked.emotion !== 'detecting') {
            const timestamp = Date.now() / 1000;
            // Record every 5th frame to avoid over-counting but still capture ongoing presence
            if (this.frameCount % 5 === 0) {
              this.reflectionCalculator.recordDetection(personId, tracked.emotion, timestamp);
            }
          }
        }
        
        // Ensure emotion is always set (for frame data emission)
        if (!tracked.emotion) {
          tracked.emotion = 'neutral';
          tracked.confidence = 0.5;
        }
      }
    }
  }

  private findPersonIdForFace(face: any): number | null {
    // Handle different face formats
    let box: any;
    if (face.boundingBox) {
      box = face.boundingBox;
    } else if (face.box) {
      box = face.box;
    } else {
      return null;
    }
    
    const centerX = (box.xMin || box.x || 0) + (box.width || 0) / 2;
    const centerY = (box.yMin || box.y || 0) + (box.height || 0) / 2;

    for (const [personId, tracked] of this.trackedFaces.entries()) {
      const trackedCenterX = tracked.box.xMin + tracked.box.width / 2;
      const trackedCenterY = tracked.box.yMin + tracked.box.height / 2;
      const distance = Math.sqrt(
        Math.pow(centerX - trackedCenterX, 2) +
        Math.pow(centerY - trackedCenterY, 2)
      );

      if (distance < 0.1) { // Normalized distance threshold (0-1 range)
        return personId;
      }
    }
    return null;
  }

  // Emotion detection is now handled by face-api.js, no need for this method

  private smoothEmotion(history: any[]): { emotion: string; confidence: number } {
    if (history.length === 0) {
      return { emotion: 'neutral', confidence: 0 };
    }

    const counts: Record<string, number> = {};
    for (const item of history) {
      const emo = item.emotion || item;
      counts[emo] = (counts[emo] || 0) + 1;
    }

    let maxCount = 0;
    let dominantEmotion = 'neutral';
    for (const [emotion, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    const consistency = maxCount / history.length;
    const avgConfidence =
      history.reduce((sum, item) => sum + (item.confidence || 0.7), 0) / history.length;

    // Lower consistency threshold to be more lenient (0.5 instead of 0.7)
    // Also, if we have any emotion data, use it instead of 'detecting'
    if (consistency >= 0.5) {
      return {
        emotion: dominantEmotion,
        confidence: avgConfidence * consistency,
      };
    } else if (history.length > 0) {
      // If we have history but low consistency, use the most recent emotion
      const lastEmotion = history[history.length - 1];
      return {
        emotion: lastEmotion.emotion || dominantEmotion || 'neutral',
        confidence: lastEmotion.confidence || avgConfidence * 0.5,
      };
    } else {
      return {
        emotion: 'neutral',
        confidence: 0,
      };
    }
  }

  private calculateMetrics() {
    const now = Date.now();
    const activeFaces = Array.from(this.trackedFaces.values()).filter(
      (face) => now - face.lastSeen < 1000
    );

    // People Count
    this.metrics.peopleCount = activeFaces.length;

    // Reflection Score - use calculator if available
    if (this.reflectionCalculator) {
      const score = this.reflectionCalculator.getCurrentScore();
      this.metrics.reflectionScore = Math.round(score);
      // Debug logging (every 30 frames)
      if (this.frameCount % 30 === 0 && this.frameCount > 0) {
        const [detailedScore, details] = this.reflectionCalculator.calculateSessionScore();
        console.log(`Reflection Score: ${this.metrics.reflectionScore}%`, {
          totalChecks: details.total_checks,
          totalMatches: details.total_matches,
          personCount: details.person_count,
          duration: details.total_duration.toFixed(2),
        });
      }
    } else {
      // Fallback to simple calculation
      console.warn('Reflection calculator not initialized, using fallback');
      let totalWeight = 0;
      let totalMatch = 0;

      for (const face of activeFaces) {
        const presenceDuration = Math.min(now - (face.firstSeen || now), 60000);
        const weight = presenceDuration / 60000;
        const match = face.emotion === this.config.expectedEmotion ? 1 : 0;

        totalWeight += weight;
        totalMatch += weight * match;
      }

      this.metrics.reflectionScore = totalWeight > 0 ? Math.round((totalMatch / totalWeight) * 100) : 0;
    }

    // Volatility
    let totalChanges = 0;
    let totalDetections = 0;

    for (const [personId, history] of this.emotionHistory.entries()) {
      if (history.length < 2) continue;

      let changes = 0;
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].emotion || history[i - 1];
        const curr = history[i].emotion || history[i];
        if (prev !== curr) changes++;
      }

      totalChanges += changes;
      totalDetections += history.length;
    }

    this.metrics.volatility = totalDetections > 0 ? totalChanges / totalDetections : 0;

    // Entropy
    const emotionCounts: Record<string, number> = {};
    let totalEmotions = 0;

    for (const history of this.emotionHistory.values()) {
      for (const item of history) {
        const emo = item.emotion || item;
        emotionCounts[emo] = (emotionCounts[emo] || 0) + 1;
        totalEmotions++;
      }
    }

    let entropy = 0;
    if (totalEmotions > 0) {
      for (const count of Object.values(emotionCounts)) {
        const p = count / totalEmotions;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
    }

    this.metrics.entropy = entropy;

    // Engagement
    const normalizedEntropy = Math.min(entropy / 3, 1);
    this.metrics.engagement = (1 - this.metrics.volatility) * (1 - normalizedEntropy);
  }

  stop() {
    this.isRunning = false;

    if (this.stream) {
      try {
        this.stream.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (error) {
        console.warn('Error stopping stream tracks:', error);
      }
      this.stream = null;
    }

    if (this.video) {
      try {
        this.video.pause();
        this.video.srcObject = null;
        // Don't set to null immediately, let React handle cleanup
      } catch (error) {
        console.warn('Error cleaning up video element:', error);
      }
      // Set to null after a small delay to avoid race conditions
      setTimeout(() => {
        this.video = null;
      }, 100);
    }

    // face-api.js models are static, no need to dispose

    this.trackedFaces.clear();
    this.emotionHistory.clear();
    this.faceDescriptors.clear();
    // Note: ReflectionScoreCalculator doesn't have endSession, it's stateless
    this.audienceMetricsCalculator?.reset();
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Get reflection score details (for session finalization)
   */
  getReflectionScoreDetails(): [number, any] {
    if (this.reflectionCalculator) {
      return this.reflectionCalculator.calculateSessionScore();
    }
    return [this.metrics.reflectionScore, {
      score: this.metrics.reflectionScore,
      total_checks: 0,
      total_matches: 0,
      total_duration: this.sessionStartTime ? (Date.now() / 1000 - this.sessionStartTime) : 0,
      person_count: this.metrics.peopleCount,
      per_person: {},
    }];
  }
}


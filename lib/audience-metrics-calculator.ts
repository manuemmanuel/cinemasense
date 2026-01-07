/**
 * Audience Metrics Calculator
 * 
 * Calculates comprehensive metrics from emotion detection data:
 * - Volatility (per-person and average)
 * - Entropy (per-person and session)
 * - Engagement Index
 * - Dominant Emotion
 * - Transition Matrix
 * - Emotion Distribution
 * - Per-Person Metrics
 */

export interface AudienceMetrics {
  volatility: {
    per_person: Record<number, number>;
    average: number;
  };
  entropy: {
    per_person: Record<number, number>;
    session: number;
  };
  engagement_index: number;
  dominant_emotion: {
    emotion: string;
    percentage: number;
  };
  transition_matrix: Record<string, Record<string, number>>;
  emotion_distribution: Record<string, number>;
  per_person: Record<number, {
    volatility: number;
    entropy: number;
    reflection_score: number;
    duration: number;
    detection_count: number;
  }>;
}

export class AudienceMetricsCalculator {
  private emotionSequences: Map<number, string[]> = new Map(); // Per-person emotion sequences
  private allEmotions: string[] = []; // All emotions across all people
  private personDurations: Map<number, { start: number; end: number }> = new Map();

  /**
   * Record an emotion detection
   */
  recordDetection(personId: number, emotion: string, timestamp: number): void {
    // Initialize sequence if first detection for this person
    if (!this.emotionSequences.has(personId)) {
      this.emotionSequences.set(personId, []);
      this.personDurations.set(personId, { start: timestamp, end: timestamp });
    }

    // Add emotion to person's sequence
    const sequence = this.emotionSequences.get(personId)!;
    sequence.push(emotion);

    // Add to all emotions list
    this.allEmotions.push(emotion);

    // Update person duration
    const duration = this.personDurations.get(personId)!;
    duration.end = timestamp;
  }

  /**
   * Calculate all audience metrics
   */
  calculateMetrics(
    detections: Array<{ face_id: number; emotion: string; timestamp: number }>,
    personTimelines: Record<number, Array<{ emotion: string; timestamp: number }>>,
    reflectionScoreDetails?: any
  ): AudienceMetrics {
    // Build emotion sequences from detections
    this.buildSequencesFromDetections(detections, personTimelines);

    // Calculate volatility (per-person and average)
    const volatility = this.calculateVolatility();

    // Calculate entropy (per-person and session)
    const entropy = this.calculateEntropy();

    // Calculate engagement index
    const engagementIndex = this.calculateEngagement(volatility.average, entropy.session);

    // Calculate dominant emotion
    const dominantEmotion = this.calculateDominantEmotion();

    // Calculate transition matrix
    const transitionMatrix = this.calculateTransitionMatrix();

    // Calculate emotion distribution
    const emotionDistribution = this.calculateEmotionDistribution();

    // Calculate per-person metrics
    const perPerson = this.calculatePerPersonMetrics(entropy.per_person, volatility.per_person, reflectionScoreDetails);

    return {
      volatility,
      entropy,
      engagement_index: engagementIndex,
      dominant_emotion: dominantEmotion,
      transition_matrix: transitionMatrix,
      emotion_distribution: emotionDistribution,
      per_person: perPerson,
    };
  }

  /**
   * Build emotion sequences from detections
   */
  private buildSequencesFromDetections(
    detections: Array<{ face_id: number; emotion: string; timestamp: number }>,
    personTimelines: Record<number, Array<{ emotion: string; timestamp: number }>>
  ): void {
    this.emotionSequences.clear();
    this.allEmotions = [];

    // Build from person timelines (more reliable)
    for (const [personId, timeline] of Object.entries(personTimelines)) {
      const id = Number(personId);
      const sequence: string[] = [];
      let startTime: number | null = null;
      let endTime: number | null = null;

      for (const detection of timeline) {
        const emotion = detection.emotion || 'neutral';
        sequence.push(emotion);
        this.allEmotions.push(emotion);

        const timestamp = detection.timestamp || 0;
        if (startTime === null || timestamp < startTime) {
          startTime = timestamp;
        }
        if (endTime === null || timestamp > endTime) {
          endTime = timestamp;
        }
      }

      if (sequence.length > 0) {
        this.emotionSequences.set(id, sequence);
        if (startTime !== null && endTime !== null) {
          this.personDurations.set(id, { start: startTime, end: endTime });
        }
      }
    }

    // Fallback to detections array if timelines are empty
    if (this.emotionSequences.size === 0 && detections.length > 0) {
      const sequencesByPerson = new Map<number, string[]>();
      const durationsByPerson = new Map<number, { start: number; end: number }>();

      for (const detection of detections) {
        const personId = detection.face_id;
        const emotion = detection.emotion || 'neutral';
        const timestamp = detection.timestamp || 0;

        if (!sequencesByPerson.has(personId)) {
          sequencesByPerson.set(personId, []);
          durationsByPerson.set(personId, { start: timestamp, end: timestamp });
        }

        sequencesByPerson.get(personId)!.push(emotion);
        this.allEmotions.push(emotion);

        const duration = durationsByPerson.get(personId)!;
        if (timestamp < duration.start) duration.start = timestamp;
        if (timestamp > duration.end) duration.end = timestamp;
      }

      for (const [personId, sequence] of sequencesByPerson.entries()) {
        this.emotionSequences.set(personId, sequence);
        this.personDurations.set(personId, durationsByPerson.get(personId)!);
      }
    }
  }

  /**
   * Calculate volatility (per-person and average)
   */
  private calculateVolatility(): { per_person: Record<number, number>; average: number } {
    const perPerson: Record<number, number> = {};
    let totalVolatility = 0;
    let personCount = 0;

    for (const [personId, sequence] of this.emotionSequences.entries()) {
      if (sequence.length < 2) {
        perPerson[personId] = 0;
        continue;
      }

      let changes = 0;
      for (let i = 1; i < sequence.length; i++) {
        if (sequence[i - 1] !== sequence[i]) {
          changes++;
        }
      }

      const volatility = changes / sequence.length;
      perPerson[personId] = volatility;
      totalVolatility += volatility;
      personCount++;
    }

    const average = personCount > 0 ? totalVolatility / personCount : 0;

    return { per_person: perPerson, average };
  }

  /**
   * Calculate entropy (per-person and session)
   */
  private calculateEntropy(): { per_person: Record<number, number>; session: number } {
    const perPerson: Record<number, number> = {};

    // Calculate per-person entropy
    for (const [personId, sequence] of this.emotionSequences.entries()) {
      if (sequence.length === 0) {
        perPerson[personId] = 0;
        continue;
      }

      // Count emotion frequencies
      const counts: Record<string, number> = {};
      for (const emotion of sequence) {
        counts[emotion] = (counts[emotion] || 0) + 1;
      }

      // Calculate entropy
      let entropy = 0;
      const total = sequence.length;
      for (const count of Object.values(counts)) {
        const p = count / total;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }

      perPerson[personId] = entropy;
    }

    // Calculate session entropy (all emotions combined)
    let sessionEntropy = 0;
    if (this.allEmotions.length > 0) {
      const counts: Record<string, number> = {};
      for (const emotion of this.allEmotions) {
        counts[emotion] = (counts[emotion] || 0) + 1;
      }

      const total = this.allEmotions.length;
      for (const count of Object.values(counts)) {
        const p = count / total;
        if (p > 0) {
          sessionEntropy -= p * Math.log2(p);
        }
      }
    }

    return { per_person: perPerson, session: sessionEntropy };
  }

  /**
   * Calculate engagement index
   */
  private calculateEngagement(averageVolatility: number, sessionEntropy: number): number {
    // Normalize entropy (max entropy for 7 emotions ≈ 2.81)
    const maxEntropy = Math.log2(7); // ≈ 2.81
    const normalizedEntropy = Math.min(sessionEntropy / maxEntropy, 1);

    // Engagement = (1 - volatility) × (1 - normalized entropy)
    const engagement = (1 - averageVolatility) * (1 - normalizedEntropy);

    return Math.max(0, Math.min(1, engagement)); // Clamp to 0-1
  }

  /**
   * Calculate dominant emotion
   */
  private calculateDominantEmotion(): { emotion: string; percentage: number } {
    if (this.allEmotions.length === 0) {
      return { emotion: 'neutral', percentage: 0 };
    }

    const counts: Record<string, number> = {};
    for (const emotion of this.allEmotions) {
      counts[emotion] = (counts[emotion] || 0) + 1;
    }

    let maxCount = 0;
    let dominantEmotion = 'neutral';

    for (const [emotion, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    const percentage = (maxCount / this.allEmotions.length) * 100;

    return { emotion: dominantEmotion, percentage: Math.round(percentage * 100) / 100 };
  }

  /**
   * Calculate transition matrix
   */
  private calculateTransitionMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};
    const transitionCounts: Record<string, Record<string, number>> = {};

    // Count all transitions
    for (const sequence of this.emotionSequences.values()) {
      for (let i = 1; i < sequence.length; i++) {
        const from = sequence[i - 1];
        const to = sequence[i];

        if (!transitionCounts[from]) {
          transitionCounts[from] = {};
        }
        transitionCounts[from][to] = (transitionCounts[from][to] || 0) + 1;
      }
    }

    // Convert to percentages
    for (const [from, toCounts] of Object.entries(transitionCounts)) {
      const total = Object.values(toCounts).reduce((sum, count) => sum + count, 0);
      matrix[from] = {};

      for (const [to, count] of Object.entries(toCounts)) {
        matrix[from][to] = (count / total) * 100; // Percentage
      }
    }

    return matrix;
  }

  /**
   * Calculate emotion distribution
   */
  private calculateEmotionDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const emotion of this.allEmotions) {
      distribution[emotion] = (distribution[emotion] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Calculate per-person metrics
   */
  private calculatePerPersonMetrics(
    perPersonEntropy: Record<number, number>,
    perPersonVolatility: Record<number, number>,
    reflectionScoreDetails?: any
  ): Record<number, any> {
    const perPerson: Record<number, any> = {};

    for (const personId of this.emotionSequences.keys()) {
      const sequence = this.emotionSequences.get(personId)!;
      const duration = this.personDurations.get(personId);

      // Get reflection score for this person
      let reflectionScore = 0;
      if (reflectionScoreDetails?.per_person?.[personId]) {
        const personDetails = reflectionScoreDetails.per_person[personId];
        reflectionScore = personDetails.match_rate * 100; // Convert to percentage
      }

      perPerson[personId] = {
        volatility: perPersonVolatility[personId] || 0,
        entropy: perPersonEntropy[personId] || 0,
        reflection_score: reflectionScore,
        duration: duration ? duration.end - duration.start : 0,
        detection_count: sequence.length,
      };
    }

    return perPerson;
  }

  /**
   * Reset calculator for new session
   */
  reset(): void {
    this.emotionSequences.clear();
    this.allEmotions = [];
    this.personDurations.clear();
  }
}


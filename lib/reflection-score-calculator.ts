/**
 * Reflection Score Calculator
 * 
 * Calculates how well detected emotions match the expected emotion
 * using a duration-weighted average across all people.
 * 
 * Formula: RS = Σ(weight_person × match_rate_person) / Σ(weight_person) × 100
 * Where:
 *   - weight_person = duration_person / total_duration
 *   - match_rate_person = matches_person / checks_person
 */

export interface ReflectionScoreDetails {
  score: number;
  total_checks: number;
  total_matches: number;
  total_duration: number;
  person_count: number;
  per_person: Record<number, {
    checks: number;
    matches: number;
    match_rate: number;
    duration: number;
    weight: number;
    weighted_match: number;
  }>;
}

export class ReflectionScoreCalculator {
  private expectedEmotion: string;
  private sessionStartTime: number | null = null;
  
  // Per-person tracking
  private personChecks: Map<number, number> = new Map();      // Count of detections per person
  private personMatches: Map<number, number> = new Map();    // Count of matches per person
  private personDurations: Map<number, number> = new Map();   // Total time tracked per person
  private personStartTimes: Map<number, number> = new Map(); // When each person first appeared
  private personLastUpdate: Map<number, number> = new Map(); // Last detection timestamp per person
  
  private totalDuration: number = 0;

  constructor(expectedEmotion: string) {
    this.expectedEmotion = expectedEmotion.toLowerCase().trim();
  }

  /**
   * Start a new session
   */
  startSession(): void {
    this.sessionStartTime = Date.now() / 1000; // Unix timestamp in seconds
    this.personChecks.clear();
    this.personMatches.clear();
    this.personDurations.clear();
    this.personStartTimes.clear();
    this.personLastUpdate.clear();
    this.totalDuration = 0;
  }

  /**
   * Record a detection for reflection score calculation
   * @param faceId - Person ID
   * @param detectedEmotion - Detected emotion
   * @param timestamp - Unix timestamp in seconds (optional, defaults to now)
   */
  recordDetection(faceId: number, detectedEmotion: string, timestamp?: number): void {
    const now = timestamp || (Date.now() / 1000);
    
    // Initialize person tracking if first detection
    if (!this.personStartTimes.has(faceId)) {
      this.personStartTimes.set(faceId, now);
      this.personLastUpdate.set(faceId, now);
      this.personChecks.set(faceId, 0);
      this.personMatches.set(faceId, 0);
      this.personDurations.set(faceId, 0);
    }

    // Update person duration (time since last detection)
    const lastUpdate = this.personLastUpdate.get(faceId)!;
    const durationSinceLastUpdate = Math.max(0, now - lastUpdate); // Ensure non-negative
    const currentDuration = this.personDurations.get(faceId)!;
    this.personDurations.set(faceId, currentDuration + durationSinceLastUpdate);
    this.personLastUpdate.set(faceId, now);

    // Increment check counter
    const currentChecks = this.personChecks.get(faceId)!;
    this.personChecks.set(faceId, currentChecks + 1);

    // Check if emotion matches (case-insensitive)
    const detectedEmotionLower = (detectedEmotion || 'neutral').toLowerCase().trim();
    const expectedEmotionLower = this.expectedEmotion.toLowerCase().trim();
    const isMatch = detectedEmotionLower === expectedEmotionLower;
    
    if (isMatch) {
      const currentMatches = this.personMatches.get(faceId)!;
      this.personMatches.set(faceId, currentMatches + 1);
    }

    // Update total session duration
    if (this.sessionStartTime) {
      this.totalDuration = Math.max(this.totalDuration, now - this.sessionStartTime);
    }
    
    // Debug logging (first 10 detections per person)
    const checks = this.personChecks.get(faceId)!;
    if (checks <= 10) {
      console.log(`Reflection Score: Person ${faceId} - Detection ${checks}: ${detectedEmotionLower} (Expected: ${expectedEmotionLower}, Match: ${isMatch})`);
    }
  }

  /**
   * Calculate the final reflection score for the session
   * @returns Tuple of [score, details]
   */
  calculateSessionScore(): [number, ReflectionScoreDetails] {
    // Validate data
    if (this.personChecks.size === 0) {
      console.warn('Reflection score calculation: No person checks recorded');
      return [0.0, {
        score: 0.0,
        total_checks: 0,
        total_matches: 0,
        total_duration: this.totalDuration,
        person_count: 0,
        per_person: {},
      }];
    }
    
    // If total duration is 0 but we have checks, use a minimum duration
    if (this.totalDuration === 0 && this.personChecks.size > 0) {
      console.warn('Reflection score calculation: Total duration is 0, using minimum duration');
      // Use the maximum person duration as total duration
      let maxDuration = 0;
      for (const duration of this.personDurations.values()) {
        if (duration > maxDuration) {
          maxDuration = duration;
        }
      }
      this.totalDuration = maxDuration || 1; // Minimum 1 second
    }

    let totalWeightedMatches = 0;
    let totalWeights = 0;
    let totalChecks = 0;
    let totalMatches = 0;
    const perPersonDetails: Record<number, any> = {};

    // Calculate for each person
    for (const faceId of this.personChecks.keys()) {
      const checks = this.personChecks.get(faceId)!;
      const matches = this.personMatches.get(faceId)!;
      const duration = this.personDurations.get(faceId)!;

      // Skip if no checks
      if (checks === 0) continue;

      // Calculate match rate
      const matchRate = matches / checks;

      // Calculate duration weight
      const weight = this.totalDuration > 0 ? duration / this.totalDuration : 0;

      // Calculate weighted match
      const weightedMatch = weight * matchRate;

      // Accumulate totals
      totalWeightedMatches += weightedMatch;
      totalWeights += weight;
      totalChecks += checks;
      totalMatches += matches;

      // Store per-person details
      perPersonDetails[faceId] = {
        checks,
        matches,
        match_rate: matchRate,
        duration,
        weight,
        weighted_match: weightedMatch,
      };
    }

    // Calculate final score
    const score = totalWeights > 0 
      ? (totalWeightedMatches / totalWeights) * 100 
      : 0.0;

    const details: ReflectionScoreDetails = {
      score: Math.round(score * 100) / 100, // Round to 2 decimal places
      total_checks: totalChecks,
      total_matches: totalMatches,
      total_duration: this.totalDuration,
      person_count: this.personChecks.size,
      per_person: perPersonDetails,
    };

    return [score, details];
  }

  /**
   * Get current reflection score (for real-time updates)
   * Uses current state without requiring session end
   */
  getCurrentScore(): number {
    const [score] = this.calculateSessionScore();
    return score;
  }

  /**
   * Reset calculator for new session
   */
  reset(): void {
    this.startSession();
  }
}


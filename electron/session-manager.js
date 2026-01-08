const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * DetectionLog - Represents a single emotion detection event
 * @typedef {Object} DetectionLog
 * @property {number} timestamp - Unix timestamp when detection occurred
 * @property {number} face_id - Persistent face tracking ID (0, 1, 2, etc.)
 * @property {string} emotion - Detected emotion (happy, sad, neutral, etc.)
 * @property {number} confidence - Confidence score (0.0 to 1.0)
 * @property {number[]} bbox - Bounding box [x, y, width, height] (normalized 0-1)
 * @property {Object<string, number>} all_emotions - All emotion probabilities
 */

/**
 * SessionData - Complete session with all data and metrics
 * @typedef {Object} SessionData
 * @property {string} session_id - Unique ID (format: YYYYMMDD_HHMMSS)
 * @property {number} start_time - Session start timestamp (Unix)
 * @property {number|null} end_time - Session end timestamp (Unix, null if active)
 * @property {string} movie_title - Movie title from user input
 * @property {string} expected_emotion - Expected emotion (baseline for scoring)
 * @property {DetectionLog[]} detections - All detection logs (chronological)
 * @property {number} reflection_score - Final reflection score (0-100)
 * @property {Object} reflection_score_details - Score calculation breakdown
 * @property {Object} audience_metrics - Volatility, entropy, engagement, etc.
 * @property {Object<number, DetectionLog[]>} person_timelines - Detections grouped by person
 * @property {number} total_people - Unique people detected
 * @property {number} total_detections - Total detection count
 * @property {number} session_duration - Duration in seconds
 */

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionsDir = path.join(app.getPath('userData'), 'sessions');
    
    // Ensure sessions directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Generate session ID in format YYYYMMDD_HHMMSS
   * @returns {string} Session ID
   */
  generateSessionId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  /**
   * Start a new session
   * @param {Object} config - Session configuration
   * @param {string} config.movieTitle - Movie title
   * @param {string} config.expectedEmotion - Expected emotion
   * @returns {string} Session ID
   */
  createSession(config) {
    const sessionId = this.generateSessionId();
    const startTime = Date.now() / 1000; // Unix timestamp in seconds
    
    /** @type {SessionData} */
    const session = {
      session_id: sessionId,
      start_time: startTime,
      end_time: null,
      movie_title: config.movieTitle,
      expected_emotion: config.expectedEmotion,
      detections: [],
      reflection_score: 0.0,
      reflection_score_details: {},
      audience_metrics: {},
      person_timelines: {},
      total_people: 0,
      total_detections: 0,
      session_duration: 0.0,
    };
    
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Log a single detection
   * @param {string} sessionId - Session ID
   * @param {number} faceId - Face tracking ID
   * @param {string} emotion - Detected emotion
   * @param {number} confidence - Confidence score (0-1)
   * @param {Object} bbox - Bounding box {xMin, yMin, width, height} (normalized 0-1)
   * @param {Object<string, number>} allEmotions - All emotion probabilities
   */
  logDetection(sessionId, faceId, emotion, confidence, bbox, allEmotions) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found when logging detection`);
      return;
    }

    const timestamp = Date.now() / 1000; // Unix timestamp in seconds
    
    /** @type {DetectionLog} */
    const detection = {
      timestamp,
      face_id: faceId,
      emotion: emotion || 'neutral', // Ensure emotion is always set
      confidence: confidence || 0,
      bbox: [bbox.xMin || 0, bbox.yMin || 0, bbox.width || 0, bbox.height || 0],
      all_emotions: { ...allEmotions },
    };

    // Add to chronological detections list
    session.detections.push(detection);

    // Initialize person timeline if first detection for this person
    if (!session.person_timelines[faceId]) {
      session.person_timelines[faceId] = [];
    }

    // Add to person's timeline
    session.person_timelines[faceId].push(detection);
    
    // Debug logging (first 10 detections or every 50)
    if (session.detections.length <= 10 || session.detections.length % 50 === 0) {
      console.log(`Session ${sessionId}: Logged detection ${session.detections.length} - Person ${faceId}: ${emotion} (Person ${faceId} now has ${session.person_timelines[faceId].length} detections)`);
    }
  }

  /**
   * Update session metrics (called periodically during session)
   * @param {string} sessionId - Session ID
   * @param {Object} metrics - Current metrics
   */
  updateMetrics(sessionId, metrics) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Store current metrics in audience_metrics
      session.audience_metrics = {
        ...session.audience_metrics,
        ...metrics,
        last_update: Date.now() / 1000,
      };
    }
  }

  /**
   * Add frame data (legacy method for backward compatibility)
   * Now extracts individual detections and logs them
   * @param {string} sessionId - Session ID
   * @param {Object} frameData - Frame data with faces array
   */
  addFrameData(sessionId, frameData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found when adding frame data`);
      return;
    }

    // Extract detections from frame data
    if (frameData.faces && Array.isArray(frameData.faces)) {
      let loggedCount = 0;
      for (const face of frameData.faces) {
        // Log ALL faces with emotions, including 'detecting' and low confidence
        // This ensures we capture complete detection history
        const emotion = face.emotion || 'neutral';
        const confidence = face.confidence || 0;
        const personId = face.personId || face.face_id || 0;
        const box = face.box || { xMin: 0, yMin: 0, width: 0, height: 0 };
        
        // Extract all emotions if available, otherwise create from single emotion
        const allEmotions = face.allEmotions || {
          [emotion]: confidence,
        };

        // Always log detection, regardless of emotion state or confidence
        this.logDetection(
          sessionId,
          personId,
          emotion,
          confidence,
          box,
          allEmotions
        );
        loggedCount++;
      }
      if (loggedCount > 0 && session.detections.length % 50 === 0) {
        console.log(`Session ${sessionId}: Logged ${session.detections.length} total detections (just added ${loggedCount})`);
      }
    }
  }

  /**
   * Finalize and save a session
   * @param {string} sessionId - Session ID
   * @param {Object} finalMetrics - Final metrics including reflection_score and details
   * @param {Object} reflectionScoreDetails - Detailed reflection score breakdown
   * @param {Object} audienceMetrics - Complete audience metrics
   * @param {number} totalPeople - Total unique people detected
   */
  finalizeSession(sessionId, finalMetrics, reflectionScoreDetails = {}, audienceMetrics = {}, totalPeople = 0) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`Session ${sessionId} not found when finalizing`);
      return null;
    }

    const endTime = Date.now() / 1000; // Unix timestamp in seconds
    
    // Populate final session data
    session.end_time = endTime;
    session.reflection_score = finalMetrics.reflectionScore || finalMetrics.reflection_score || 0.0;
    session.reflection_score_details = reflectionScoreDetails;
    
    // Calculate comprehensive audience metrics from session detections
    const calculatedAudienceMetrics = this.calculateAudienceMetricsFromSession(session, reflectionScoreDetails);
    
    // Merge provided metrics with calculated ones (calculated metrics take precedence)
    session.audience_metrics = {
      ...calculatedAudienceMetrics,
      ...audienceMetrics,
      ...finalMetrics,
    };
    
    // Use person_timelines as source of truth for total unique people detected during session
    // totalPeople parameter represents currently active people, not total unique people
    session.total_people = Object.keys(session.person_timelines || {}).length || totalPeople || 0;
    session.total_detections = session.detections.length;
    session.session_duration = endTime - session.start_time;

    console.log(`Finalizing session ${sessionId}:`, {
      detections: session.detections.length,
      people: session.total_people,
      duration: session.session_duration,
      reflectionScore: session.reflection_score,
    });

    // Save to disk
    this.saveSession(sessionId);

    // Return completed session
    return session;
  }

  /**
   * Get session by ID (from memory or disk)
   * @param {string} sessionId - Session ID
   * @returns {SessionData|null} Session data or null if not found
   */
  getSession(sessionId) {
    // First try memory
    let session = this.sessions.get(sessionId);
    if (session) {
      return session;
    }
    
    // If not in memory, try loading from disk
    session = this.loadSession(sessionId);
    if (session) {
      this.sessions.set(sessionId, session);
      return session;
    }
    
    return null;
  }

  /**
   * Save session to disk
   * @param {string} sessionId - Session ID
   */
  saveSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
    
    // Convert to JSON-serializable format
    const sessionData = {
      ...session,
      // Ensure person_timelines keys are strings for JSON
      person_timelines: Object.fromEntries(
        Object.entries(session.person_timelines).map(([k, v]) => [String(k), v])
      ),
    };
    
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf8');
  }

  /**
   * Load session from disk
   * @param {string} sessionId - Session ID
   * @returns {SessionData|null} Session data or null if not found
   */
  loadSession(sessionId) {
    const filePath = path.join(this.sessionsDir, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      const session = JSON.parse(data);
      
      // Convert person_timelines keys back to numbers
      if (session.person_timelines) {
        session.person_timelines = Object.fromEntries(
          Object.entries(session.person_timelines).map(([k, v]) => [Number(k), v])
        );
      }
      
      return session;
    }
    return null;
  }

  /**
   * List all saved sessions (metadata only)
   * @returns {Array<Object>} Array of session metadata
   */
  listSessions() {
    const sessions = [];
    
    if (!fs.existsSync(this.sessionsDir)) {
      return sessions;
    }
    
    const files = fs.readdirSync(this.sessionsDir);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const sessionId = file.replace('.json', '');
        try {
          const session = this.loadSession(sessionId);
          if (session) {
            sessions.push({
              session_id: session.session_id,
              movie_title: session.movie_title,
              start_time: session.start_time,
              duration: session.session_duration || 0,
              reflection_score: session.reflection_score || 0,
              total_people: session.total_people || 0,
              total_detections: session.total_detections || 0,
            });
          }
        } catch (error) {
          console.error(`Error loading session ${sessionId}:`, error);
        }
      }
    }
    
    // Sort by start time (newest first)
    sessions.sort((a, b) => b.start_time - a.start_time);
    
    return sessions;
  }

  /**
   * Calculate comprehensive audience metrics from session data
   */
  calculateAudienceMetricsFromSession(session, reflectionScoreDetails = {}) {
    const detections = session.detections || [];
    const personTimelines = session.person_timelines || {};

    console.log('Calculating audience metrics from session:', {
      totalDetections: detections.length,
      personTimelineCount: Object.keys(personTimelines).length,
      personTimelineDetails: Object.keys(personTimelines).map(id => ({
        personId: id,
        detectionCount: personTimelines[id]?.length || 0,
        emotions: personTimelines[id]?.slice(0, 10).map(d => d.emotion || 'neutral') || [],
      })),
    });

    const volatility = this.calculateVolatility(personTimelines);
    const entropy = this.calculateEntropy(detections, personTimelines);
    const engagementIndex = this.calculateEngagement(volatility.average, entropy.session);
    const dominantEmotion = this.calculateDominantEmotion(detections);
    const transitionMatrix = this.calculateTransitionMatrix(personTimelines);
    const emotionDistribution = this.calculateEmotionDistribution(detections);
    const perPerson = this.calculatePerPersonMetrics(
      personTimelines,
      volatility.per_person,
      entropy.per_person,
      reflectionScoreDetails
    );

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

  calculateVolatility(personTimelines) {
    const perPerson = {};
    let totalVolatility = 0;
    let personCount = 0;

    console.log('Calculating volatility from person timelines:', {
      timelineCount: Object.keys(personTimelines).length,
      timelines: Object.keys(personTimelines).map(id => ({
        personId: id,
        detectionCount: personTimelines[id]?.length || 0,
        firstFewEmotions: personTimelines[id]?.slice(0, 5).map(d => d.emotion || 'neutral') || [],
      })),
    });

    for (const [personId, timeline] of Object.entries(personTimelines)) {
      const id = Number(personId);
      
      if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
        console.warn(`Person ${id} has no timeline data`);
        perPerson[id] = 0;
        continue;
      }

      // Extract emotion sequence, filtering out 'detecting' and ensuring valid emotions
      const sequence = timeline
        .map(d => {
          const emotion = d.emotion || 'neutral';
          return emotion.toLowerCase().trim();
        })
        .filter(emotion => emotion !== 'detecting' && emotion !== '');

      if (sequence.length < 2) {
        console.log(`Person ${id} has only ${sequence.length} valid detection(s), volatility = 0`);
        perPerson[id] = 0;
        continue;
      }

      // Count emotion transitions (changes)
      let changes = 0;
      for (let i = 1; i < sequence.length; i++) {
        if (sequence[i - 1] !== sequence[i]) {
          changes++;
        }
      }

      // Volatility = changes / (sequence.length - 1)
      // Maximum possible changes is (n-1) for n detections
      // This normalizes to 0-1 range where 1 = maximum volatility (every detection differs)
      const maxPossibleChanges = sequence.length - 1;
      const volatility = maxPossibleChanges > 0 ? changes / maxPossibleChanges : 0;
      
      perPerson[id] = volatility;
      totalVolatility += volatility;
      personCount++;
      
      console.log(`Person ${id}: ${changes} changes in ${sequence.length} detections (max: ${maxPossibleChanges}) = ${(volatility * 100).toFixed(1)}% volatility`);
    }

    const average = personCount > 0 ? totalVolatility / personCount : 0;
    console.log(`Volatility calculation: ${personCount} people, average = ${(average * 100).toFixed(1)}%`);
    
    return { per_person: perPerson, average };
  }

  calculateEntropy(detections, personTimelines) {
    const perPerson = {};
    const allEmotions = [];

    console.log('Calculating entropy:', {
      detectionsCount: detections.length,
      personTimelineCount: Object.keys(personTimelines).length,
    });

    // Calculate per-person entropy
    for (const [personId, timeline] of Object.entries(personTimelines)) {
      const id = Number(personId);
      
      if (!timeline || !Array.isArray(timeline) || timeline.length === 0) {
        console.warn(`Person ${id} has no timeline data for entropy calculation`);
        perPerson[id] = 0;
        continue;
      }

      // Extract and normalize emotions, filtering out invalid ones
      const sequence = timeline
        .map(d => {
          const emotion = (d.emotion || 'neutral').toLowerCase().trim();
          return emotion;
        })
        .filter(emotion => emotion !== 'detecting' && emotion !== '' && emotion !== null && emotion !== undefined);
      
      if (sequence.length === 0) {
        console.warn(`Person ${id} has no valid emotions after filtering`);
        perPerson[id] = 0;
        continue;
      }

      // Count emotion frequencies
      const counts = {};
      for (const emotion of sequence) {
        counts[emotion] = (counts[emotion] || 0) + 1;
        allEmotions.push(emotion);
      }

      console.log(`Person ${id} emotion counts:`, counts, `(total: ${sequence.length})`);

      // Calculate Shannon entropy: H(X) = -Σ(p(x) × log₂(p(x)))
      let entropy = 0;
      const total = sequence.length;
      const emotionProbabilities = {};
      
      for (const [emotion, count] of Object.entries(counts)) {
        const p = count / total;
        emotionProbabilities[emotion] = p;
        if (p > 0) {
          // Use Math.log2 with proper handling
          entropy -= p * Math.log2(p);
        }
      }

      // Ensure entropy is a valid number
      if (isNaN(entropy) || !isFinite(entropy)) {
        console.warn(`Person ${id} entropy calculation resulted in invalid value: ${entropy}`);
        entropy = 0;
      }

      perPerson[id] = entropy;
      console.log(`Person ${id} entropy: ${entropy.toFixed(3)} (probabilities:`, emotionProbabilities, ')');
      
      // If entropy is 0, it means only one emotion was detected
      if (entropy === 0 && Object.keys(counts).length === 1) {
        console.log(`Person ${id}: Entropy is 0 because only one emotion (${Object.keys(counts)[0]}) was detected`);
      }
    }

    // Calculate session entropy from all emotions
    let sessionEntropy = 0;
    if (allEmotions.length > 0) {
      const counts = {};
      for (const emotion of allEmotions) {
        counts[emotion] = (counts[emotion] || 0) + 1;
      }

      console.log('Session emotion counts:', counts, `(total: ${allEmotions.length})`);

      const total = allEmotions.length;
      const emotionProbabilities = {};
      
      for (const [emotion, count] of Object.entries(counts)) {
        const p = count / total;
        emotionProbabilities[emotion] = p;
        if (p > 0) {
          sessionEntropy -= p * Math.log2(p);
        }
      }

      // Ensure session entropy is valid
      if (isNaN(sessionEntropy) || !isFinite(sessionEntropy)) {
        console.warn(`Session entropy calculation resulted in invalid value: ${sessionEntropy}`);
        sessionEntropy = 0;
      }

      console.log(`Session entropy: ${sessionEntropy.toFixed(3)} (probabilities:`, emotionProbabilities, ')');
      
      // If entropy is 0, it means only one emotion was detected across all people
      if (sessionEntropy === 0 && Object.keys(counts).length === 1) {
        console.log(`Session: Entropy is 0 because only one emotion (${Object.keys(counts)[0]}) was detected across all people`);
      }
    } else {
      console.warn('No emotions found for session entropy calculation - allEmotions array is empty');
    }

    return { per_person: perPerson, session: sessionEntropy };
  }

  calculateEngagement(averageVolatility, sessionEntropy) {
    const maxEntropy = Math.log2(7);
    const normalizedEntropy = Math.min(sessionEntropy / maxEntropy, 1);
    const engagement = (1 - averageVolatility) * (1 - normalizedEntropy);
    return Math.max(0, Math.min(1, engagement));
  }

  calculateDominantEmotion(detections) {
    if (detections.length === 0) {
      return { emotion: 'neutral', percentage: 0 };
    }

    const counts = {};
    for (const detection of detections) {
      const emotion = detection.emotion || 'neutral';
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

    const percentage = (maxCount / detections.length) * 100;
    return { emotion: dominantEmotion, percentage: Math.round(percentage * 100) / 100 };
  }

  calculateTransitionMatrix(personTimelines) {
    const matrix = {};
    const transitionCounts = {};

    for (const timeline of Object.values(personTimelines)) {
      const sequence = timeline.map(d => d.emotion || 'neutral');
      for (let i = 1; i < sequence.length; i++) {
        const from = sequence[i - 1];
        const to = sequence[i];

        if (!transitionCounts[from]) {
          transitionCounts[from] = {};
        }
        transitionCounts[from][to] = (transitionCounts[from][to] || 0) + 1;
      }
    }

    for (const [from, toCounts] of Object.entries(transitionCounts)) {
      const total = Object.values(toCounts).reduce((sum, count) => sum + count, 0);
      matrix[from] = {};

      for (const [to, count] of Object.entries(toCounts)) {
        matrix[from][to] = (count / total) * 100;
      }
    }

    return matrix;
  }

  calculateEmotionDistribution(detections) {
    const distribution = {};

    for (const detection of detections) {
      const emotion = detection.emotion || 'neutral';
      distribution[emotion] = (distribution[emotion] || 0) + 1;
    }

    return distribution;
  }

  calculatePerPersonMetrics(personTimelines, perPersonVolatility, perPersonEntropy, reflectionScoreDetails) {
    const perPerson = {};

    for (const [personId, timeline] of Object.entries(personTimelines)) {
      const id = Number(personId);
      const sequence = timeline.map(d => d.emotion || 'neutral');
      
      let reflectionScore = 0;
      if (reflectionScoreDetails?.per_person?.[id]) {
        const personDetails = reflectionScoreDetails.per_person[id];
        reflectionScore = personDetails.match_rate * 100;
      }

      let duration = 0;
      if (timeline.length > 0) {
        const firstTimestamp = timeline[0].timestamp || 0;
        const lastTimestamp = timeline[timeline.length - 1].timestamp || 0;
        duration = lastTimestamp - firstTimestamp;
      }

      perPerson[id] = {
        volatility: perPersonVolatility[id] || 0,
        entropy: perPersonEntropy[id] || 0,
        reflection_score: reflectionScore,
        duration: duration,
        detection_count: sequence.length,
      };
    }

    return perPerson;
  }
}

module.exports = { SessionManager };


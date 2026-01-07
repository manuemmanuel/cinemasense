# CinemaSense: Real-Time Audience Emotion Analysis System

**Repository**: [https://github.com/manuemmanuel/cinemasense](https://github.com/manuemmanuel/cinemasense)

## Abstract

CinemaSense is a production-grade desktop application for real-time audience emotion analysis during cinematic content consumption. The system employs GPU-accelerated face detection and emotion recognition to analyze audience reactions, providing comprehensive metrics including reflection scores, emotional volatility, entropy, and engagement indices. Built with Next.js, Electron, and TypeScript, the application operates entirely locally without server dependencies, ensuring privacy and real-time performance.

## Keywords

emotion analysis, face detection, real-time processing, audience analytics, emotion recognition, computer vision, GPU acceleration, desktop application, session management, reflection score, emotional volatility, entropy, engagement index, face tracking, person identification, machine learning, TensorFlow.js, WebGL, Next.js, Electron, TypeScript

## Abbreviations

- **API**: Application Programming Interface
- **DAW**: Digital Audio Workstation (referring to the UI style)
- **FPS**: Frames Per Second
- **GPU**: Graphics Processing Unit
- **GUI**: Graphical User Interface
- **IPC**: Inter-Process Communication
- **JSON**: JavaScript Object Notation
- **ML**: Machine Learning
- **RS**: Reflection Score
- **UI**: User Interface
- **WebGL**: Web Graphics Library
- **WebGPU**: Web Graphics Processing Unit

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Algorithms & Calculations](#core-algorithms--calculations)
4. [Technical Implementation](#technical-implementation)
5. [Installation & Setup](#installation--setup)
6. [Usage Guide](#usage-guide)
7. [Research Methodology](#research-methodology)
8. [Performance Optimization](#performance-optimization)
9. [Data Structures](#data-structures)
10. [API Reference](#api-reference)

---

## System Overview

CinemaSense is designed to analyze audience emotional responses to cinematic content in real-time. The system captures video from a webcam, detects faces, tracks individuals across frames, and infers emotional states using machine learning models. All processing occurs locally on the user's machine using GPU acceleration via WebGL/WebGPU.

### Key Features

- **Real-Time Emotion Detection**: GPU-accelerated face detection and emotion recognition at 30 FPS
- **Persistent Person Tracking**: Face recognition using embeddings to maintain consistent person IDs across frames
- **Comprehensive Metrics**: Reflection score, volatility, entropy, engagement index, and per-person analytics
- **Session Management**: Persistent storage of session data with detailed analysis and visualizations
- **Professional UI**: DAW-style dark interface optimized for professional use
- **AI-Powered Insights**: Integration with Google Gemini API for natural language analysis of results

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                    │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │   Window Mgmt    │  │    Session Manager            │  │
│  │   IPC Handlers   │  │    - Session Storage          │  │
│  │   File I/O       │  │    - Metrics Calculation      │  │
│  └──────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕ IPC Communication
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Renderer Process                   │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │   UI Components  │  │    Inference Engine          │  │
│  │   - React UI     │  │    - Face Detection          │  │
│  │   - Canvas       │  │    - Emotion Recognition    │  │
│  │   - Charts       │  │    - Person Tracking        │  │
│  └──────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  Score Calculator│  │    Metrics Calculator       │  │
│  │  - Reflection    │  │    - Volatility              │  │
│  │  - Duration Wt.  │  │    - Entropy                 │  │
│  └──────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: Next.js 14 (App Router) with TypeScript
- **Desktop Shell**: Electron 28
- **Face Detection**: face-api.js (TensorFlow.js backend)
- **GPU Acceleration**: WebGL via TensorFlow.js
- **Data Visualization**: Chart.js with react-chartjs-2
- **AI Integration**: Google Generative AI (Gemini API)
- **Styling**: CSS Modules with Space Grotesk font

### Process Architecture

1. **Main Process (Electron)**: Manages windows, IPC communication, and session persistence
2. **Renderer Process (Next.js)**: Handles UI rendering, camera access, and real-time inference
3. **IPC Bridge**: Secure communication channel via preload script

---

## Core Algorithms & Calculations

### 1. Reflection Score

The Reflection Score measures how well detected emotions align with the expected emotion for the session. It uses a duration-weighted average to account for varying person visibility durations.

#### Formula

```
RS = (Σ(weight_person × match_rate_person) / Σ(weight_person)) × 100
```

Where:
- `weight_person = duration_person / total_duration`
- `match_rate_person = matches_person / checks_person`

#### Step-by-Step Calculation

1. **Per-Person Tracking**:
   - For each person, track:
     - `checks`: Total number of emotion detections
     - `matches`: Number of detections matching expected emotion
     - `duration`: Total time person was visible (seconds)

2. **Match Rate Calculation**:
   ```
   match_rate_person = matches_person / checks_person
   ```

3. **Duration Weight**:
   ```
   weight_person = duration_person / total_session_duration
   ```

4. **Weighted Match**:
   ```
   weighted_match_person = weight_person × match_rate_person
   ```

5. **Final Score**:
   ```
   RS = (Σ(weighted_match_person) / Σ(weight_person)) × 100
   ```

#### Example Calculation

Given:
- Person 1: 80 matches / 100 checks, duration = 60s
- Person 2: 40 matches / 50 checks, duration = 30s
- Total session duration = 90s

Calculations:
- Person 1: match_rate = 0.8, weight = 60/90 = 0.667, weighted_match = 0.533
- Person 2: match_rate = 0.8, weight = 30/90 = 0.333, weighted_match = 0.267
- Total weights = 1.0
- RS = (0.533 + 0.267) / 1.0 × 100 = **80%**

### 2. Volatility

Volatility quantifies the frequency of emotional state changes for each person and across the session.

#### Formula

```
Volatility_person = emotion_changes / total_detections
Volatility_average = Σ(Volatility_person) / person_count
```

#### Calculation Process

1. For each person's emotion sequence, count transitions:
   ```javascript
   changes = 0
   for i = 1 to sequence.length:
     if sequence[i-1] ≠ sequence[i]:
       changes++
   ```

2. Calculate per-person volatility:
   ```
   Volatility_person = changes / sequence.length
   ```

3. Calculate session average:
   ```
   Volatility_average = Σ(Volatility_person) / N
   ```

#### Interpretation

- **0.0**: No emotion changes (perfectly stable)
- **1.0**: Every detection differs from previous (maximum volatility)
- **0.3-0.5**: Moderate emotional variability
- **>0.7**: High emotional instability

### 3. Entropy

Entropy measures the diversity and unpredictability of emotional states using Shannon entropy.

#### Formula

```
H(X) = -Σ(p(x) × log₂(p(x)))
```

Where `p(x)` is the probability of emotion `x` occurring.

#### Calculation Process

1. **Per-Person Entropy**:
   - Count emotion frequencies for each person
   - Calculate probabilities: `p(emotion) = count(emotion) / total_detections`
   - Compute entropy: `H = -Σ(p × log₂(p))`

2. **Session Entropy**:
   - Aggregate all emotions across all people
   - Calculate probabilities across entire session
   - Compute session-level entropy

#### Example

Given emotion sequence: `[happy, happy, sad, happy, neutral, happy]`

Frequencies:
- happy: 4
- sad: 1
- neutral: 1
- Total: 6

Probabilities:
- p(happy) = 4/6 = 0.667
- p(sad) = 1/6 = 0.167
- p(neutral) = 1/6 = 0.167

Entropy:
```
H = -(0.667 × log₂(0.667) + 0.167 × log₂(0.167) + 0.167 × log₂(0.167))
H = -(0.667 × -0.585 + 0.167 × -2.585 + 0.167 × -2.585)
H = -(-0.390 - 0.431 - 0.431)
H = 1.252 bits
```

#### Interpretation

- **0.0**: Only one emotion detected (no diversity)
- **~2.81**: Maximum entropy for 7 emotions (all equally likely)
- **1.0-2.0**: Moderate diversity
- **>2.5**: High emotional diversity

### 4. Engagement Index

The Engagement Index combines volatility and entropy to measure overall audience engagement.

#### Formula

```
Normalized_Entropy = Entropy_session / log₂(num_emotions)
Engagement = (1 - Volatility_average) × (1 - Normalized_Entropy)
```

#### Calculation

1. Normalize entropy to 0-1 range:
   ```
   Normalized_Entropy = Entropy / log₂(7)  // 7 emotions
   ```

2. Calculate engagement:
   ```
   Engagement = (1 - Volatility) × (1 - Normalized_Entropy)
   ```

#### Interpretation

- **1.0**: Maximum engagement (stable, focused emotions)
- **0.5-0.8**: Moderate engagement
- **<0.3**: Low engagement (highly variable, diverse emotions)

### 5. Dominant Emotion

The most frequently detected emotion across the entire session.

#### Calculation

```
Dominant_Emotion = argmax(count(emotion))
Percentage = (count(dominant_emotion) / total_detections) × 100
```

### 6. Transition Matrix

A matrix showing how emotions transition from one state to another.

#### Calculation

1. For each person, track consecutive emotion pairs: `(emotion_i, emotion_{i+1})`
2. Count transitions: `count(emotion_from → emotion_to)`
3. Normalize to percentages:
   ```
   P(emotion_to | emotion_from) = count(transition) / count(emotion_from)
   ```

#### Output Format

```
{
  "happy": { "happy": 0.7, "neutral": 0.2, "sad": 0.1 },
  "neutral": { "happy": 0.3, "neutral": 0.5, "sad": 0.2 },
  ...
}
```

### 7. Emotion Distribution

Simple frequency count of each emotion across all detections.

```
Distribution[emotion] = count(emotion) / total_detections
```

---

## Technical Implementation

### Face Detection & Tracking

#### Detection Pipeline

1. **Frame Capture**: Video frames captured at 30 FPS from webcam
2. **Face Detection**: face-api.js TinyFaceDetector (optimized for speed)
3. **Landmark Detection**: 68-point facial landmarks
4. **Face Recognition**: Face embeddings (128-dimensional vectors)
5. **Emotion Recognition**: 7-class emotion classification

#### Person Tracking Algorithm

The system maintains persistent person IDs across frames using a two-stage matching approach:

1. **Primary: Face Recognition**
   - Extract face embedding (128D vector) using face-api.js
   - Compare with stored embeddings using Euclidean distance
   - Match if distance < threshold (0.75)

2. **Fallback: Spatial Matching**
   - If no face match, use spatial proximity
   - Calculate center point of bounding box
   - Match if spatial distance < 0.2 (normalized coordinates)

```typescript
// Simplified tracking logic
for (const face of detectedFaces) {
  let matchedPersonId = null;
  let minDistance = Infinity;
  
  // Try face recognition first
  if (face.descriptor) {
    for (const [personId, storedDescriptor] of faceDescriptors) {
      const distance = euclideanDistance(face.descriptor, storedDescriptor);
      if (distance < threshold && distance < minDistance) {
        minDistance = distance;
        matchedPersonId = personId;
      }
    }
  }
  
  // Fallback to spatial matching
  if (!matchedPersonId) {
    for (const [personId, tracked] of trackedFaces) {
      const spatialDistance = calculateSpatialDistance(face, tracked);
      if (spatialDistance < 0.2 && spatialDistance < minDistance) {
        matchedPersonId = personId;
      }
    }
  }
  
  // Update or create person tracking
  if (matchedPersonId) {
    updateTrackedFace(matchedPersonId, face);
  } else {
    createNewPerson(face);
  }
}
```

#### Emotion Smoothing

To reduce noise and provide stable emotion labels, the system uses a rolling window average:

1. **History Window**: Store last 10 emotion detections per person
2. **Consistency Check**: Require ≥70% consistency for confirmation
3. **Fallback**: Use most recent valid emotion if consistency not met

```typescript
function smoothEmotion(history: EmotionDetection[]): Emotion {
  if (history.length < 3) return 'detecting';
  
  // Count emotion frequencies
  const counts = {};
  for (const detection of history) {
    counts[detection.emotion] = (counts[detection.emotion] || 0) + 1;
  }
  
  // Find most common emotion
  const maxCount = Math.max(...Object.values(counts));
  const consistency = maxCount / history.length;
  
  if (consistency >= 0.7) {
    return emotion with maxCount;
  }
  
  // Fallback to most recent
  return history[history.length - 1].emotion;
}
```

### Performance Optimizations

1. **Throttled Emotion Detection**: Process emotions every 5 frames (6 FPS for emotions, 30 FPS for tracking)
2. **Reduced Input Size**: Resize frames to 320×240 for detection
3. **Fast Detection Mode**: Skip emotion recognition on non-emotion frames
4. **Non-Blocking IPC**: Use `setTimeout(0)` for async frame data logging
5. **UI Update Throttling**: Update UI on even frames only (15 FPS UI updates)

### Session Data Structure

```typescript
interface SessionData {
  session_id: string;
  movie_title: string;
  expected_emotion: string;
  start_time: number;  // Unix timestamp (seconds)
  end_time: number;
  session_duration: number;
  
  // Core metrics
  reflection_score: number;
  reflection_score_details: ReflectionScoreDetails;
  total_people: number;
  total_detections: number;
  
  // Detection log
  detections: DetectionLog[];
  person_timelines: Record<number, DetectionLog[]>;
  
  // Calculated metrics
  audience_metrics: {
    volatility: { per_person: Record<number, number>, average: number };
    entropy: { per_person: Record<number, number>, session: number };
    engagement_index: number;
    dominant_emotion: { emotion: string, percentage: number };
    transition_matrix: Record<string, Record<string, number>>;
    emotion_distribution: Record<string, number>;
    per_person: Record<number, PersonMetrics>;
  };
}

interface DetectionLog {
  timestamp: number;      // Unix timestamp (seconds)
  person_id: number;
  emotion: string;
  confidence: number;
  box: { xMin, yMin, width, height };
}
```

---

## Installation & Setup

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher
- **Webcam**: USB or built-in camera
- **GPU**: WebGL-capable graphics card (for acceleration)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

### Installation Steps

1. **Clone or Download** the repository:
   ```bash
   git clone https://github.com/manuemmanuel/cinemasense.git
   cd cinemasense
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional):
   Create a `.env.local` file in the root directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Get your API key from: https://makersuite.google.com/app/apikey
   
   **Note**: The AI Assistant feature is optional. The application works without it, but the AI chat tab will show an error if the key is not configured.

4. **Verify Installation**:
   ```bash
   npm run type-check
   ```

### Building the Application

#### Development Mode

```bash
npm run electron:dev
```

This command:
- Starts the Next.js development server on `http://localhost:3000`
- Waits for the server to be ready
- Launches Electron with the development build

#### Production Build

```bash
# Build Next.js application
npm run build

# Build Electron application (creates distributable)
npm run build:electron
```

The production build creates platform-specific installers in the `dist/` directory.

---

## Usage Guide

### Starting a Session

1. **Launch Application**: Run `npm run electron:dev` or launch the built application
2. **Configure Session**:
   - Enter a **Movie Title** (required)
   - Select **Expected Emotion** from dropdown:
     - happy
     - sad
     - angry
     - fear
     - surprise
     - disgust
     - neutral
3. **Start Analysis**: Click the **START** button
   - Camera will activate after a 500ms buffer
   - Face detection begins immediately
   - Real-time metrics update in the left panel

### During Analysis

- **Live Viewport**: Central canvas shows camera feed with face detection overlays
  - Green boxes: Confirmed emotions (≥70% consistency)
  - Yellow boxes: Detecting (insufficient consistency)
  - Labels show: Person ID, Emotion, Confidence %

- **Real-Time Metrics** (Left Panel):
  - **People Count**: Active faces detected in last second
  - **Reflection Score**: Current duration-weighted match rate
  - **Volatility**: Average emotion change frequency
  - **Entropy**: Emotional diversity measure
  - **Engagement**: Combined engagement index

### Ending a Session

1. Click the **STOP** button
2. System will:
   - Stop camera stream
   - Finalize all metrics
   - Save session to disk
   - Enable **RESULTS** button

### Viewing Results

1. Click the **RESULTS** button
2. View comprehensive analysis:
   - **Summary Tab**: Session overview and metrics
   - **Visualization Tab**: Charts and graphs
     - Emotion distribution (bar chart)
     - Emotion breakdown (doughnut chart)
     - Emotion timeline (line chart)
     - Per-person distribution (stacked bar)
     - Emotion profile (radar chart)
   - **Metrics Tab**: Per-person detailed metrics
   - **Explanation Tab**: Metric definitions and calculations
   - **AI Assistant Tab**: Natural language analysis (requires API key)

### Session Data Location

Sessions are saved to:
- **Windows**: `%APPDATA%/cinemasense/sessions/`
- **macOS**: `~/Library/Application Support/cinemasense/sessions/`
- **Linux**: `~/.config/cinemasense/sessions/`

Each session is saved as a JSON file: `{session_id}.json`

---

## Research Methodology

### Data Collection Protocol

1. **Session Initialization**:
   - Record movie title and expected emotion
   - Initialize tracking structures
   - Start timestamp logging

2. **Real-Time Detection**:
   - Capture frames at 30 FPS
   - Detect faces and emotions
   - Track persons across frames
   - Log all detections (not just UI-updated frames)

3. **Data Logging**:
   - Every detection is logged with:
     - Timestamp (Unix seconds)
     - Person ID
     - Emotion label
     - Confidence score
     - Bounding box coordinates

4. **Session Finalization**:
   - Calculate all metrics from logged data
   - Generate per-person timelines
   - Compute aggregate statistics
   - Save to persistent storage

### Metric Calculation Timing

- **Real-Time Metrics**: Calculated every frame for UI display (may be throttled)
- **Final Metrics**: Calculated once at session end from complete detection log
- **Audience Metrics**: Computed in session manager from stored session data

### Validation & Accuracy

- **Face Recognition Threshold**: 0.75 (Euclidean distance)
- **Emotion Consistency**: ≥70% required for confirmation
- **Spatial Matching Fallback**: 0.2 normalized distance threshold
- **Active Face Window**: 1000ms (faces not seen in last second are considered inactive)

---

## Performance Optimization

### Frame Processing Pipeline

```
Frame Capture (30 FPS)
  ↓
Resize to 320×240 (fast detection)
  ↓
Face Detection (every frame)
  ↓
Emotion Recognition (every 5th frame)
  ↓
Person Tracking (every frame)
  ↓
Metrics Calculation (every frame)
  ↓
UI Update (every 2nd frame)
  ↓
Frame Data Logging (async, non-blocking)
```

### Optimization Strategies

1. **Model Selection**: TinyFaceDetector (fastest, slightly less accurate)
2. **Input Resolution**: 320×240 for detection (upscaled for display)
3. **Throttling**: Emotion detection every 5 frames
4. **Async Logging**: Frame data logged via `setTimeout(0)` to avoid blocking
5. **UI Throttling**: Visual updates on even frames only
6. **GPU Acceleration**: All TensorFlow.js operations use WebGL backend

### Performance Targets

- **Detection FPS**: 30 FPS
- **Emotion FPS**: 6 FPS (every 5th frame)
- **UI Update FPS**: 15 FPS (every 2nd frame)
- **Memory Usage**: <500MB typical
- **CPU Usage**: <30% on modern hardware

---

## Data Structures

### Core Data Types

```typescript
// Person tracking
interface TrackedFace {
  personId: number;
  box: BoundingBox;
  emotion: string;
  confidence: number;
  firstSeen: number;      // Timestamp (ms)
  lastSeen: number;       // Timestamp (ms)
  descriptor?: Float32Array;  // Face embedding
}

// Detection log entry
interface DetectionLog {
  timestamp: number;      // Unix timestamp (seconds)
  person_id: number;
  emotion: string;
  confidence: number;
  box: {
    xMin: number;         // Normalized 0-1
    yMin: number;
    width: number;
    height: number;
  };
}

// Reflection score details
interface ReflectionScoreDetails {
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
```

---

## API Reference

### Electron IPC API

#### `startSession(config)`
Start a new analysis session.

**Parameters**:
- `config.movieTitle`: string (required)
- `config.expectedEmotion`: string (required)

**Returns**: `{ success: boolean, sessionId?: string, error?: string }`

#### `stopSession(sessionId, metrics, reflectionDetails, audienceMetrics, totalPeople)`
Finalize and save a session.

**Parameters**:
- `sessionId`: string
- `metrics`: object
- `reflectionDetails`: ReflectionScoreDetails
- `audienceMetrics`: object
- `totalPeople`: number

#### `getSession(sessionId)`
Retrieve a saved session.

**Returns**: SessionData | null

#### `addFrameData(sessionId, frameData)`
Log frame detection data (async, non-blocking).

#### `updateMetrics(sessionId, metrics)`
Update real-time metrics during session.

### Inference Engine API

```typescript
class InferenceEngine {
  constructor(config: InferenceConfig);
  start(): Promise<void>;
  stop(): void;
  getFrameCount(): number;
  getReflectionScoreDetails(): [number, ReflectionScoreDetails];
}
```

### Reflection Score Calculator API

```typescript
class ReflectionScoreCalculator {
  constructor(expectedEmotion: string);
  startSession(): void;
  recordDetection(faceId: number, emotion: string, timestamp?: number): void;
  calculateSessionScore(): [number, ReflectionScoreDetails];
  getCurrentScore(): number;
  endSession(): void;
}
```

---

## Project Structure

```
cinemasensev4/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main application window
│   ├── results/
│   │   └── page.tsx              # Results analysis page
│   ├── api/
│   │   └── gemini-chat/
│   │       └── route.ts          # Gemini API integration
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
│
├── components/                    # React components
│   ├── CustomTitlebar.tsx         # Custom window titlebar
│   ├── InspectorPanel.tsx         # Left panel (config, transport, metrics)
│   ├── CameraViewport.tsx         # Central camera viewport
│   ├── ResultsTabs.tsx           # Results page tabs
│   ├── VisualizationTab.tsx       # Chart visualizations
│   ├── AIChatTab.tsx             # AI assistant chat
│   └── ...                       # Other UI components
│
├── electron/                      # Electron main process
│   ├── main.js                   # Main process entry point
│   ├── preload.js                # IPC bridge
│   └── session-manager.js        # Session storage & metrics
│
├── lib/                           # Core libraries
│   ├── inference-engine.ts       # Face detection & emotion recognition
│   ├── reflection-score-calculator.ts  # Reflection score algorithm
│   └── audience-metrics-calculator.ts  # Audience metrics
│
├── types/                         # TypeScript definitions
│   └── electron.d.ts             # Electron API types
│
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── next.config.js                 # Next.js configuration
└── README.md                      # This file
```

---

## Abbreviations

This section provides definitions for abbreviations and acronyms used throughout this documentation.

- **API**: Application Programming Interface
- **DAW**: Digital Audio Workstation (referring to the UI style)
- **FPS**: Frames Per Second
- **GPU**: Graphics Processing Unit
- **GUI**: Graphical User Interface
- **IPC**: Inter-Process Communication
- **JSON**: JavaScript Object Notation
- **ML**: Machine Learning
- **RS**: Reflection Score
- **UI**: User Interface
- **WebGL**: Web Graphics Library
- **WebGPU**: Web Graphics Processing Unit

---

## License

MIT License - See LICENSE file for details

---

## Citation

If you use CinemaSense in your research, please cite:

```
CinemaSense: Real-Time Audience Emotion Analysis System
https://github.com/manuemmanuel/cinemasense
```

---

## Acknowledgments

- **face-api.js**: Face detection and emotion recognition models
- **TensorFlow.js**: GPU-accelerated inference backend
- **Next.js**: React framework
- **Electron**: Desktop application framework
- **Chart.js**: Data visualization
- **Google Gemini**: AI-powered analysis

---

## Version History

- **Initial Release**
  - Real-time emotion detection
  - Comprehensive metrics calculation
  - Session management
  - Professional DAW-style UI
  - AI assistant integration

---

*Last Updated: 08-01-2026*

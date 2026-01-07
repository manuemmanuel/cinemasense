export interface ElectronAPI {
  startSession: (config: {
    movieTitle: string;
    expectedEmotion: string;
  }) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  stopSession: (
    sessionId: string,
    finalMetrics?: any,
    reflectionScoreDetails?: any,
    audienceMetrics?: any,
    totalPeople?: number
  ) => Promise<{ success: boolean }>;
  updateMetrics: (sessionId: string, metrics: any) => Promise<void>;
  addFrameData: (sessionId: string, frameData: any) => Promise<void>;
  windowControl: (action: string) => Promise<void>;
  openResults: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => Promise<any>;
  onFrameData: (callback: (data: any) => void) => void;
  onMetricsUpdate: (callback: (metrics: any) => void) => void;
  onFpsUpdate: (callback: (fps: number) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}


const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Session control
  startSession: (config) => ipcRenderer.invoke('start-session', config),
  stopSession: (sessionId, finalMetrics, reflectionScoreDetails, audienceMetrics, totalPeople) => 
    ipcRenderer.invoke('stop-session', sessionId, finalMetrics, reflectionScoreDetails, audienceMetrics, totalPeople),
  getSession: (sessionId) => ipcRenderer.invoke('get-session', sessionId),
  updateMetrics: (sessionId, metrics) => ipcRenderer.invoke('update-metrics', sessionId, metrics),
  addFrameData: (sessionId, frameData) => ipcRenderer.invoke('add-frame-data', sessionId, frameData),
  
  // Window controls
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  openResults: (sessionId) => ipcRenderer.invoke('open-results', sessionId),
  
  // Event listeners
  onFrameData: (callback) => {
    ipcRenderer.on('frame-data', (event, data) => callback(data));
  },
  onMetricsUpdate: (callback) => {
    ipcRenderer.on('metrics-update', (event, metrics) => callback(metrics));
  },
  onFpsUpdate: (callback) => {
    ipcRenderer.on('fps-update', (event, fps) => callback(fps));
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});


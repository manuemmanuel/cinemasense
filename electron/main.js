const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { SessionManager } = require('./session-manager');

let mainWindow = null;
let sessionManager = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Developer tools disabled
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createResultsWindow(sessionId) {
  if (resultsWindow) {
    resultsWindow.focus();
    return;
  }

  resultsWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0a0a0a',
    parent: mainWindow,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  if (isDev) {
    resultsWindow.loadURL(`http://localhost:3000/results?sessionId=${sessionId}`);
  } else {
    resultsWindow.loadFile(
      path.join(__dirname, '../out/results.html'),
      { query: { sessionId } }
    );
  }

  resultsWindow.on('closed', () => {
    resultsWindow = null;
  });
}

app.whenReady().then(() => {
  sessionManager = new SessionManager();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('start-session', async (event, config) => {
  try {
    const sessionId = sessionManager.createSession(config);
    return { success: true, sessionId };
  } catch (error) {
    console.error('Failed to start session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-session', async (event, sessionId, finalMetrics, reflectionScoreDetails, audienceMetrics, totalPeople) => {
  try {
    sessionManager.finalizeSession(
      sessionId,
      finalMetrics,
      reflectionScoreDetails || {},
      audienceMetrics || {},
      totalPeople || 0
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to stop session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-metrics', async (event, sessionId, metrics) => {
  sessionManager.updateMetrics(sessionId, metrics);
});

ipcMain.handle('add-frame-data', async (event, sessionId, frameData) => {
  sessionManager.addFrameData(sessionId, frameData);
});

ipcMain.handle('get-session', async (event, sessionId) => {
  return sessionManager.getSession(sessionId);
});

ipcMain.handle('window-control', async (event, action) => {
  const window = BrowserWindow.getFocusedWindow() || mainWindow;
  if (!window) return;

  switch (action) {
    case 'minimize':
      window.minimize();
      break;
    case 'maximize':
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      break;
    case 'close':
      window.close();
      break;
  }
});

ipcMain.handle('open-results', async (event, sessionId) => {
  // Results now shown in same window via Next.js router
  // Navigation is handled by the renderer process
  if (mainWindow) {
    const url = isDev 
      ? `http://localhost:3000/results?sessionId=${sessionId}`
      : `file://${path.join(__dirname, '../out/results.html')}?sessionId=${sessionId}`;
    mainWindow.loadURL(url);
  }
});


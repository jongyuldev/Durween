// Load environment variables
require('dotenv').config();

const { app, BrowserWindow, ipcMain, screen, globalShortcut, Tray, Menu, nativeImage } = require('electron');

// GPU configuration - Disabled due to compatibility issues with dual GPU setup
app.disableHardwareAcceleration();
const path = require('path');
const config = require('./config');
const contextAnalyzer = require('./contextAnalyzer');
const aiEngine = require('./aiEngine');

let clippyWindow;
let settingsWindow;
let tray;
let contextCheckInterval;

function createClippyWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const intrusionLevel = config.get('intrusionLevel');
  
  clippyWindow = new BrowserWindow({
    width: 420,
    height: 550,
    minWidth: 400,
    minHeight: 500,
    maxWidth: 600,
    maxHeight: 800,
    x: width - 440,
    y: height - 570,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    show: intrusionLevel !== 'off',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  clippyWindow.loadFile('index.html');
  
  // Disable mouse events ignore for scrolling
  clippyWindow.setIgnoreMouseEvents(false);
  
  // Send initial config to renderer
  clippyWindow.webContents.on('did-finish-load', () => {
    clippyWindow.webContents.send('config-update', config.getAll());
  });
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Clippy Settings',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile('settings.html');
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  // Create a simple icon for the tray (in production, use a proper icon file)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Clippy', click: () => clippyWindow.show() },
    { label: 'Settings', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('Clippy 2.0 - Your AI Assistant');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    clippyWindow.isVisible() ? clippyWindow.hide() : clippyWindow.show();
  });
}

function startContextMonitoring() {
  const intrusionLevel = config.get('intrusionLevel');
  const contextAwareness = config.get('contextAwareness');
  
  if (intrusionLevel === 'off' || !contextAwareness) return;

  // Check context every 30 seconds
  contextCheckInterval = setInterval(async () => {
    const context = await contextAnalyzer.analyzeCurrentContext();
    
    if (context && clippyWindow) {
      clippyWindow.webContents.send('context-update', context);
      
      // For proactive mode, show high-confidence suggestions
      if (intrusionLevel === 'proactive') {
        const suggestion = contextAnalyzer.getHighConfidenceSuggestion();
        if (suggestion && !config.isSuggestionDismissed(suggestion.id)) {
          clippyWindow.webContents.send('show-suggestion', suggestion);
          clippyWindow.show();
        }
      }
    }
  }, 30000);
}

function registerHotkeys() {
  const hotkey = config.get('hotkey');
  
  globalShortcut.register(hotkey, () => {
    if (clippyWindow.isVisible()) {
      clippyWindow.hide();
    } else {
      clippyWindow.show();
      clippyWindow.webContents.send('focus-input');
    }
  });
}

app.whenReady().then(() => {
  // Initialize AI engine with API key
  // ALWAYS load from .env file as source of truth
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey) {
    console.log('Initializing AI engine with Gemini API key from .env');
    console.log('Key starts with:', apiKey.substring(0, 20) + '...');
    aiEngine.setApiKey(apiKey);
  } else {
    console.log('No API key found in .env file, using fallback responses');
  }

  createClippyWindow();
  createTray();
  registerHotkeys();
  startContextMonitoring();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createClippyWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (contextCheckInterval) {
    clearInterval(contextCheckInterval);
  }
});

// IPC Handlers
ipcMain.on('close-clippy', () => {
  app.quit();
});

ipcMain.on('minimize-clippy', () => {
  clippyWindow.hide();
  setTimeout(() => {
    if (config.get('intrusionLevel') !== 'off') {
      clippyWindow.show();
      // Send the "BOO! I'm back" message when reappearing
      clippyWindow.webContents.send('show-boo-message');
    }
  }, 30000);
});

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

ipcMain.handle('get-config', () => {
  return config.getAll();
});

ipcMain.on('update-config', (event, key, value) => {
  config.set(key, value);
  
  // Update AI engine if API key or personality changed
  if (key === 'geminiApiKey') {
    aiEngine.setApiKey(value);
  } else if (key === 'personality') {
    aiEngine.resetPersonality();
  }
  
  // Notify all windows of config change
  if (clippyWindow) {
    clippyWindow.webContents.send('config-update', config.getAll());
  }
  if (settingsWindow) {
    settingsWindow.webContents.send('config-update', config.getAll());
  }
  
  // Restart context monitoring if needed
  if (key === 'intrusionLevel' || key === 'contextAwareness') {
    if (contextCheckInterval) {
      clearInterval(contextCheckInterval);
    }
    startContextMonitoring();
  }
});

ipcMain.on('dismiss-suggestion', (event, suggestionId) => {
  config.dismissSuggestion(suggestionId);
});

ipcMain.handle('get-ai-response', async (event, input) => {
  try {
    const userText = typeof input === 'string' ? input : input.text;
    const userImage = typeof input === 'object' ? input.image : null;
    const userFile = typeof input === 'object' ? input.file : null;
    
    console.log('Received chat input:', userText);
    if (userImage) {
      console.log('Image attached:', userImage.name);
    }
    if (userFile) {
      console.log('File attached:', userFile.name, `(${userFile.size} bytes)`);
    }
    
    const context = contextAnalyzer.getCurrentContext();
    console.log('Current context:', context?.type || 'none');
    
    const response = await aiEngine.generateResponse(userText, context, userImage, userFile);
    console.log('Generated response:', response.substring(0, 50) + '...');
    
    if (config.get('learningEnabled')) {
      config.addToHistory({
        input: userText,
        response,
        context: context?.type,
        hasImage: !!userImage,
        hasFile: !!userFile
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error in get-ai-response:', error);
    return 'Sorry, I encountered an error: ' + error.message + '. Please check the console for details.';
  }
});

ipcMain.handle('get-current-context', async () => {
  return await contextAnalyzer.analyzeCurrentContext();
});

ipcMain.on('clear-history', () => {
  aiEngine.clearHistory();
  config.set('userHistory', []);
});

ipcMain.on('open-file-location', (event, filePath) => {
  const { shell } = require('electron');
  // Show the file in File Explorer
  shell.showItemInFolder(filePath);
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Expand environment variables and resolve path
    let resolvedPath = folderPath;
    
    // Handle common shortcuts
    if (folderPath.toLowerCase() === 'downloads') {
      resolvedPath = path.join(require('os').homedir(), 'Downloads');
    } else if (folderPath.toLowerCase() === 'documents') {
      resolvedPath = path.join(require('os').homedir(), 'Documents');
    } else if (folderPath.toLowerCase() === 'desktop') {
      resolvedPath = path.join(require('os').homedir(), 'Desktop');
    } else if (folderPath.toLowerCase() === 'pictures') {
      resolvedPath = path.join(require('os').homedir(), 'Pictures');
    } else if (folderPath.startsWith('%')) {
      // Handle Windows environment variables like %USERPROFILE%
      resolvedPath = folderPath.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
    }
    
    // Check if path exists
    if (fs.existsSync(resolvedPath)) {
      await shell.openPath(resolvedPath);
      return { success: true, path: resolvedPath };
    } else {
      return { success: false, error: `Folder not found: ${resolvedPath}` };
    }
  } catch (error) {
    console.error('Error opening folder:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('take-screenshot', async () => {
  try {
    const screenshot = require('screenshot-desktop');
    
    // Hide Clippy window temporarily
    if (clippyWindow) {
      clippyWindow.hide();
    }
    
    // Wait a moment for window to hide
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Take screenshot
    const imgBuffer = await screenshot({ format: 'png' });
    const base64Image = imgBuffer.toString('base64');
    
    // Show Clippy window again
    if (clippyWindow) {
      clippyWindow.show();
    }
    
    return {
      data: `data:image/png;base64,${base64Image}`,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Screenshot error:', error);
    
    // Make sure window is shown again
    if (clippyWindow) {
      clippyWindow.show();
    }
    
    throw error;
  }
});

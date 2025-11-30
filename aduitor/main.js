const { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let tray = null;
let isVisible = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // Position at bottom right of screen
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow.setPosition(width - 420, height - 520);

  mainWindow.on('blur', () => {
    // Don't hide on blur - let user control visibility
  });
}

function createTray() {
  const { nativeImage } = require('electron');
  
  // Create a 16x16 icon programmatically using a data URL
  // This is a yellow/orange circle representing Aduitor
  const size = 16;
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#FFD700" stroke="#E6A000" stroke-width="1"/>
      <circle cx="5" cy="6" r="1.5" fill="#333"/>
      <circle cx="11" cy="6" r="1.5" fill="#333"/>
      <path d="M 5 10 Q 8 13 11 10" stroke="#333" stroke-width="1.5" fill="none"/>
    </svg>
  `;
  
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
  const trayIcon = nativeImage.createFromDataURL(dataUrl);
  
  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Aduitor', click: () => toggleWindow() },
    { label: 'Hide Aduitor', click: () => hideWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('Aduitor - Your Friendly Assistant');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    toggleWindow();
  });
}

function toggleWindow() {
  if (isVisible) {
    hideWindow();
  } else {
    showWindow();
  }
}

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    isVisible = true;
    mainWindow.webContents.send('window-shown');
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
    isVisible = false;
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Global shortcut to summon Aduitor (Ctrl+Shift+A)
  const shortcut = 'CommandOrControl+Shift+A';
  const registered = globalShortcut.register(shortcut, () => {
    toggleWindow();
  });

  if (!registered) {
    console.log(`Failed to register ${shortcut}, trying alternative...`);
    // Try alternative shortcut if primary fails
    const altShortcut = 'CommandOrControl+Alt+A';
    const altRegistered = globalShortcut.register(altShortcut, () => {
      toggleWindow();
    });
    if (altRegistered) {
      console.log(`Registered alternative shortcut: ${altShortcut}`);
    } else {
      console.log('Could not register any global shortcut. Use tray icon instead.');
    }
  } else {
    console.log(`Global shortcut registered: ${shortcut}`);
  }

  // Show window on first launch so user knows it's running
  setTimeout(() => {
    showWindow();
  }, 1000);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.on('hide-window', () => {
  hideWindow();
});

// Screenshot capture
ipcMain.handle('capture-screenshot', async () => {
  const { desktopCapturer, screen } = require('electron');
  
  try {
    // Hide Aduitor window temporarily so it's not in the screenshot
    const wasVisible = isVisible;
    if (wasVisible) {
      mainWindow.hide();
    }
    
    // Small delay to ensure window is hidden
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    });
    
    // Show window again
    if (wasVisible) {
      mainWindow.show();
    }
    
    if (sources.length > 0) {
      // Get the thumbnail as a base64 PNG
      const screenshot = sources[0].thumbnail.toDataURL();
      return screenshot;
    }
    
    return null;
  } catch (error) {
    console.error('Screenshot error:', error);
    // Make sure window is shown again even if error
    if (mainWindow) {
      mainWindow.show();
    }
    return null;
  }
});

ipcMain.on('open-folder', (event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.on('search-files', async (event, searchTerm) => {
  // Simple file search in common directories
  const homeDir = os.homedir();
  const searchDirs = [
    path.join(homeDir, 'Documents'),
    path.join(homeDir, 'Downloads'),
    path.join(homeDir, 'Desktop')
  ];
  
  const results = [];
  
  for (const dir of searchDirs) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push(path.join(dir, file));
        }
      });
    } catch (err) {
      // Directory might not exist
    }
  }
  
  event.reply('search-results', results);
});

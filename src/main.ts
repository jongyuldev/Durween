import { app, BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

let dragInterval: NodeJS.Timeout | null = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const mainWindow = new BrowserWindow({
    width: 300,
    height: 300,
    x: width - 320,
    y: height - 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false, // For simple prototype
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
  
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

ipcMain.on('start-drag', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const startPos = screen.getCursorScreenPoint();
  const winPos = win.getPosition();
  const offset = { x: startPos.x - winPos[0], y: startPos.y - winPos[1] };

  if (dragInterval) clearInterval(dragInterval);

  dragInterval = setInterval(() => {
    const cursor = screen.getCursorScreenPoint();
    win.setPosition(cursor.x - offset.x, cursor.y - offset.y);
  }, 16); // ~60fps
});

ipcMain.on('stop-drag', () => {
  if (dragInterval) {
    clearInterval(dragInterval);
    dragInterval = null;
  }
});

ipcMain.on('shake-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const originalPos = win.getPosition();
  let shakeCount = 0;
  const maxShakes = 20;
  const intensity = 10;

  const shakeInterval = setInterval(() => {
    if (shakeCount >= maxShakes) {
      clearInterval(shakeInterval);
      win.setPosition(originalPos[0], originalPos[1]);
      return;
    }

    const xOffset = Math.floor(Math.random() * intensity * 2) - intensity;
    const yOffset = Math.floor(Math.random() * intensity * 2) - intensity;
    win.setPosition(originalPos[0] + xOffset, originalPos[1] + yOffset);
    shakeCount++;
  }, 50);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

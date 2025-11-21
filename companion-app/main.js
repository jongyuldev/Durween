const { app, BrowserWindow, screen, globalShortcut, clipboard } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // Create a transparent, frameless window
  win = new BrowserWindow({
    width: 400,
    height: 600,
    x: width - 450,
    y: height - 650,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
  
  // Register Global Shortcut: Alt+Shift+D (Durween)
  globalShortcut.register('Alt+Shift+D', () => {
    console.log('Global shortcut triggered');
    
    // 1. Simulate Ctrl+C to copy selected text
    // Using PowerShell to avoid native module dependencies
    const script = `powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('^c')"`;
    
    exec(script, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        
        // 2. Wait a bit for clipboard to update
        setTimeout(() => {
            const text = clipboard.readText();
            if (text) {
                console.log('Captured text:', text.substring(0, 20) + '...');
                // Send to Renderer -> WebSocket -> VS Code
                win.webContents.send('analyze-clipboard', text);
            } else {
                console.log('Clipboard was empty');
            }
        }, 500);
    });
  });
}

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

let mainWindow;

const createWindow = () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 500,
        height: 800,
        x: width - 520,
        y: height - 820,
        frame: false, // Frameless for the ghost look
        transparent: true, // Transparent background
        alwaysOnTop: true, // Keep it visible
        resizable: true,
        hasShadow: false, // Let CSS handle shadows
        skipTaskbar: false, // Keep it in taskbar for now so user can find it
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },

    });

    // Load the index.html of the app.
    // We check for a command line argument or env var to decide if dev or prod
    const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

    if (isDev) {
        console.log('Running in development mode');
        mainWindow.loadURL('http://localhost:3000');
        // mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
        console.log('Running in production mode');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // IPC Handlers for window controls
    ipcMain.on('minimize-app', () => {
        mainWindow.minimize();
    });

    ipcMain.on('close-app', () => {
        app.quit();
    });

    // IPC Handler for window dragging
    ipcMain.on('move-window', (event, { deltaX, deltaY }) => {
        const [x, y] = mainWindow.getPosition();
        mainWindow.setPosition(x + deltaX, y + deltaY);
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS.
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

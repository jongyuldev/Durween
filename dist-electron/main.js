import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let clippyWindow;
let taskWindow;
function createClippyWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    clippyWindow = new BrowserWindow({
        width: 400,
        height: 400,
        x: width - 420,
        y: height - 420,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        hasShadow: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    const url = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173/#clippy'
        : `file://${path.join(__dirname, '../dist/index.html')}#clippy`;
    clippyWindow.loadURL(url);
    clippyWindow.setIgnoreMouseEvents(true, { forward: true });
    clippyWindow.on('closed', () => {
        clippyWindow = null;
        if (taskWindow)
            taskWindow.close();
    });
}
function createTaskWindow() {
    taskWindow = new BrowserWindow({
        width: 350,
        height: 500,
        show: false, // Initially hidden
        frame: false, // Retro frame handled in CSS
        transparent: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    const url = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5173/#tasks'
        : `file://${path.join(__dirname, '../dist/index.html')}#tasks`;
    taskWindow.loadURL(url);
    taskWindow.on('closed', () => {
        taskWindow = null;
    });
    return taskWindow;
}
app.whenReady().then(() => {
    createClippyWindow();
    createTaskWindow();
    // IPC Handlers
    ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.setIgnoreMouseEvents(ignore, options);
    });
    ipcMain.on('toggle-task-window', () => {
        if (taskWindow) {
            if (taskWindow.isVisible()) {
                taskWindow.hide();
            }
            else {
                taskWindow.show();
                taskWindow.focus();
            }
        }
        else {
            const win = createTaskWindow();
            win.show();
        }
    });
    ipcMain.on('task-action', (_event, action, data) => {
        if (clippyWindow) {
            clippyWindow.webContents.send('task-action-reply', action, data);
        }
    });
    // Active Window Monitoring
    setInterval(() => {
        monitorActiveWindow();
    }, 5000);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createClippyWindow();
            createTaskWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
function monitorActiveWindow() {
    const psScript = `
    $code = @'
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
'@
    Add-Type -MemberDefinition $code -Name Win32 -Namespace Win32
    $hwnd = [Win32.Win32]::GetForegroundWindow()
    $sb = [System.Text.StringBuilder]::new(256)
    [Win32.Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null
    $sb.ToString()
  `;
    const child = spawn('powershell', ['-Command', psScript]);
    child.stdout.on('data', (data) => {
        const windowTitle = data.toString().trim();
        if (windowTitle && clippyWindow) {
            clippyWindow.webContents.send('active-window-change', windowTitle);
        }
    });
}

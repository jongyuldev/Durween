import * as vscode from 'vscode';

/**
 * Manages the Durween Webview Panel
 */
export class DurweenPanel {
  public static currentPanel: DurweenPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
  }

  /**
   * Summon or reveal the Durween panel
   */
  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (DurweenPanel.currentPanel) {
      DurweenPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      'durween',
      'Durween',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    DurweenPanel.currentPanel = new DurweenPanel(panel, extensionUri);
  }

  /**
   * Send a message (tip/suggestion) to the sprite
   */
  public static speak(message: string, mood: 'happy' | 'thinking' | 'cool' = 'happy') {
    if (DurweenPanel.currentPanel) {
      DurweenPanel.currentPanel._panel.webview.postMessage({ command: 'speak', text: message, mood });
      // Make sure it's visible
      DurweenPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside, true); 
    }
  }

  public dispose() {
    DurweenPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Durween</title>
      <style>
        body {
          background-color: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          overflow: hidden;
          font-family: sans-serif;
        }

        /* The Sprite (A simple CSS Eye for now) */
        .durween-sprite {
          width: 100px;
          height: 100px;
          background: radial-gradient(circle at 30% 30%, #fff, #4a90e2);
          border-radius: 50%;
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          position: relative;
          transition: transform 0.3s ease;
          cursor: pointer;
          animation: float 3s ease-in-out infinite;
        }

        .pupil {
          width: 40px;
          height: 40px;
          background: #000;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.2s ease;
        }

        .eyebrow {
            width: 80px;
            height: 20px;
            background: #333;
            position: absolute;
            top: -10px;
            left: 10px;
            border-radius: 10px;
            transition: all 0.3s ease;
            opacity: 0; /* Hidden by default */
        }

        /* Speech Bubble */
        .bubble {
          position: relative;
          background: #fff;
          color: #333;
          border-radius: 15px;
          padding: 15px;
          margin-top: 20px;
          max-width: 90%;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .bubble::after {
          content: '';
          position: absolute;
          top: -10px;
          left: 50%;
          border-width: 0 10px 10px;
          border-style: solid;
          border-color: #fff transparent;
          display: block;
          width: 0;
          transform: translateX(-50%);
        }

        .bubble.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Animations */
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        /* Moods */
        .mood-thinking .pupil { transform: translate(-50%, -50%) scale(0.8); }
        .mood-thinking .durween-sprite { animation: shake 0.5s infinite; }
        
        .mood-cool .eyebrow { opacity: 1; transform: rotate(-10deg) translateY(5px); }

        @keyframes shake {
            0% { transform: rotate(0deg); }
            25% { transform: rotate(5deg); }
            75% { transform: rotate(-5deg); }
            100% { transform: rotate(0deg); }
        }

      </style>
    </head>
    <body>
      <div class="durween-sprite" id="sprite">
        <div class="eyebrow"></div>
        <div class="pupil"></div>
      </div>
      
      <div class="bubble" id="bubble">
        Hi! I'm Durween. I'm ready to help!
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        const sprite = document.getElementById('sprite');
        const bubble = document.getElementById('bubble');

        // Show initial message
        setTimeout(() => bubble.classList.add('visible'), 500);

        // Handle messages from extension
        window.addEventListener('message', event => {
          const message = event.data;
          
          if (message.command === 'speak') {
            // Reset mood
            document.body.className = '';
            
            // Set new mood
            if (message.mood) {
                document.body.classList.add('mood-' + message.mood);
            }

            // Update text
            bubble.textContent = message.text;
            bubble.classList.remove('visible');
            
            // Pop in effect
            setTimeout(() => {
                bubble.classList.add('visible');
            }, 100);
          }
        });

        // Make him look at the mouse (Interactive!)
        document.addEventListener('mousemove', (e) => {
            const re = sprite.getBoundingClientRect();
            const anchorX = re.left + re.width / 2;
            const anchorY = re.top + re.height / 2;
            
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            const angle = Math.atan2(mouseY - anchorY, mouseX - anchorX);
            const pupil = document.querySelector('.pupil');
            
            // Limit movement radius
            const distance = Math.min(10, Math.hypot(mouseX - anchorX, mouseY - anchorY) / 10);
            
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;
            
            pupil.style.transform = \`translate(calc(-50% + \${x}px), calc(-50% + \${y}px))\`;
        });

      </script>
    </body>
    </html>`;
  }
}

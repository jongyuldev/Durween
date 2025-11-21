"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurweenActionProvider = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const generative_ai_1 = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");
const ws_1 = require("ws");
// Load .env from the extension root
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// WebSocket Server to talk to the Desktop Companion
let wss;
function broadcastToCompanion(message, mood = 'happy') {
    if (wss) {
        wss.clients.forEach(client => {
            if (client.readyState === 1) { // Open
                client.send(JSON.stringify({ command: 'speak', text: message, mood }));
            }
        });
    }
}
// Refactored to take a raw string
async function askGeminiString(textToAnalyze) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not found in .env file");
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
You are Durween, an expert AI coding assistant.
Analyze the following text or code snippet and provide a helpful explanation, suggestion, or fix.
Be concise and use Markdown.

Text/Code:
${textToAnalyze}
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}
async function askGeminiForHelp(document, range) {
    let codeContext = document.getText(range);
    // Smart Context: If the selection is empty or small (just a cursor or single line),
    // expand the range to give the AI more context (e.g. +/- 20 lines).
    if (codeContext.trim().length < 50) {
        const startLine = Math.max(0, range.start.line - 20);
        const endLine = Math.min(document.lineCount - 1, range.end.line + 20);
        const expandedRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
        codeContext = `// Context (User cursor at line ${range.start.line + 1}):\n${document.getText(expandedRange)}`;
    }
    return askGeminiString(codeContext);
}
function activate(context) {
    console.log('Durween is now active!');
    // Start the WebSocket Server
    try {
        wss = new ws_1.WebSocketServer({ port: 54321 });
        console.log('Durween Companion Server running on port 54321');
        wss.on('connection', (ws) => {
            console.log('Companion App Connected!');
            ws.send(JSON.stringify({ command: 'speak', text: "Connected to VS Code! I'm ready.", mood: 'happy' }));
            // Listen for messages FROM the companion (e.g. "Analyze this text")
            ws.on('message', async (message) => {
                try {
                    const data = JSON.parse(message.toString());
                    if (data.command === 'analyze') {
                        broadcastToCompanion("Reading your mind... (and your clipboard)", "thinking");
                        // We need a dummy document/range for the existing function, 
                        // OR we refactor askGeminiForHelp to take a string.
                        // Let's refactor askGeminiForHelp slightly to be more flexible.
                        const aiSuggestion = await askGeminiString(data.text);
                        broadcastToCompanion(aiSuggestion, "cool");
                    }
                }
                catch (e) {
                    console.error('Error processing message from companion:', e);
                    broadcastToCompanion("I couldn't understand that.", "thinking");
                }
            });
        });
    }
    catch (e) {
        console.error('Failed to start WebSocket server:', e);
    }
    // 1. Register the CodeActionProvider
    const durweenProvider = new DurweenActionProvider();
    const selector = { scheme: 'file', language: '*' };
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, durweenProvider, {
        providedCodeActionKinds: DurweenActionProvider.providedCodeActionKinds
    }));
    // 2. Register the Panel Command (Now just a placeholder or launch instruction)
    context.subscriptions.push(vscode.commands.registerCommand('durween.start', () => {
        vscode.window.showInformationMessage('Durween Server is running! Launch the "companion-app" to see the sprite.');
    }));
    // 3. Register the Ask Gemini Command
    context.subscriptions.push(vscode.commands.registerCommand('durween.askGemini', async (document, range) => {
        // Notify Companion
        broadcastToCompanion("Hmm, let me take a look at that...", "thinking");
        try {
            const aiSuggestion = await askGeminiForHelp(document, range);
            broadcastToCompanion(aiSuggestion, "cool");
        }
        catch (error) {
            broadcastToCompanion(`Ouch! Brain freeze: ${error}`, "thinking");
        }
    }));
}
/**
 * The Provider Class
 * This must be FAST. It runs every time the cursor moves or selection changes.
 */
class DurweenActionProvider {
    provideCodeActions(document, range, context, token) {
        const actions = [];
        // --- ANALYSIS STRATEGY ---
        // Do NOT call Gemini here.
        // Do simple checks: Regex, Line count, AST (if fast), or check context.diagnostics.
        // Example Check 1: Is the user on a line with "TODO"?
        const lineText = document.lineAt(range.start.line).text;
        if (lineText.includes("TODO")) {
            const action = new vscode.CodeAction('Durween: Ask AI to solve this TODO', vscode.CodeActionKind.QuickFix);
            // We pass the document and range to the command so it knows what to analyze
            action.command = {
                command: 'durween.askGemini',
                title: 'Ask Gemini',
                arguments: [document, range]
            };
            actions.push(action);
        }
        // Generic "Ask Durween" for any selection
        if (!range.isEmpty) {
            const analyzeAction = new vscode.CodeAction('Durween: Analyze Selection', vscode.CodeActionKind.Refactor);
            analyzeAction.command = {
                command: 'durween.askGemini',
                title: 'Ask Gemini',
                arguments: [document, range]
            };
            actions.push(analyzeAction);
        }
        // Example Check 2: "Hello World" Placeholder (Always show for demo)
        const helloAction = new vscode.CodeAction('Durween: Say Hello', vscode.CodeActionKind.Empty);
        helloAction.command = {
            command: 'durween.helloWorld',
            title: 'Hello World'
        };
        // Only show if we have a selection
        if (!range.isEmpty) {
            actions.push(helloAction);
        }
        return actions;
    }
}
exports.DurweenActionProvider = DurweenActionProvider;
DurweenActionProvider.providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor
];
// Register the simple hello world command too
vscode.commands.registerCommand('durween.helloWorld', () => {
    vscode.window.showInformationMessage('Durween says: Hello World!');
});
function deactivate() { }
//# sourceMappingURL=extension.js.map
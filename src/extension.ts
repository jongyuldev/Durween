import * as vscode from 'vscode';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DurweenPanel } from './DurweenPanel';

// Load .env from the extension root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function askGeminiForHelp(document: vscode.TextDocument, range: vscode.Range): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not found in .env file");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash which is the current standard for fast/free tier usage
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const codeContext = document.getText(range);
    const prompt = `
You are Durween, an expert AI coding assistant.
Analyze the following code snippet and provide a helpful suggestion, refactor, or fix.
Be concise and provide code comments or a brief explanation.

Code:
${codeContext}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Durween is now active!');

    // 1. Register the CodeActionProvider
    const durweenProvider = new DurweenActionProvider();
    const selector = { scheme: 'file', language: '*' };
    
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(selector, durweenProvider, {
            providedCodeActionKinds: DurweenActionProvider.providedCodeActionKinds
        })
    );

    // 2. Register the Panel Command
    context.subscriptions.push(
        vscode.commands.registerCommand('durween.start', () => {
            DurweenPanel.createOrShow(context.extensionUri);
        })
    );

    // 3. Register the Ask Gemini Command
    context.subscriptions.push(
        vscode.commands.registerCommand('durween.askGemini', async (document: vscode.TextDocument, range: vscode.Range) => {
            
            // Ensure panel is open
            DurweenPanel.createOrShow(context.extensionUri);
            DurweenPanel.speak("Hmm, let me take a look at that...", "thinking");

            try {
                const aiSuggestion = await askGeminiForHelp(document, range);
                DurweenPanel.speak(aiSuggestion, "cool");
            } catch (error) {
                DurweenPanel.speak(`Ouch! Brain freeze: ${error}`, "thinking");
            }
        })
    );
}

/**
 * The Provider Class
 * This must be FAST. It runs every time the cursor moves or selection changes.
 */
export class DurweenActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Refactor
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        
        const actions: vscode.CodeAction[] = [];

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

// Register the simple hello world command too
vscode.commands.registerCommand('durween.helloWorld', () => {
    vscode.window.showInformationMessage('Durween says: Hello World!');
});

export function deactivate() {}

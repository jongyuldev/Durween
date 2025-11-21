# Durween 🧙‍♂️

**The AI Coding Navigator (that actually has a face).**

Built for the **Vibe Coding Hackathon**.

Durween isn't just another chat window tucked away in your sidebar. It's a floating, draggable companion that lives on your screen, watches your cursor, and offers help when things get messy. Think of it as Clippy's cooler, smarter cousin who actually knows TypeScript.

## What's the Vibe?

Most AI extensions feel like tools. Durween feels like a buddy. 

- **It's an App, not a Tab:** Durween runs in a draggable webview. Put him anywhere. He follows your mouse (literally).
- **Proactive, not Reactive:** You don't always have to ask. Durween hooks into VS Code's "Lightbulb" actions. See a `TODO`? Click the bulb, and Durween handles it.
- **Smart Context:** Durween doesn't just look at the line you selected. He reads the surrounding 20 lines to understand *what* you're trying to build before offering advice.

## Features

*   **🧠 Gemini 2.5 Flash Brain:** Powered by Google's latest model. It's fast, smart, and handles the free tier like a champ.
*   **🌍 Global Analysis:** Durween can now analyze your entire workspace file structure to give context-aware answers about your whole project.
*   **🖥️ Desktop Companion:** A standalone Electron app that floats on your desktop, giving you a coding buddy that lives outside the editor.
*   **💡 Lightbulb Integration:** Refactor code, fix bugs, or generate docs directly from the Quick Fix menu.
*   **💬 Rich Responses:** Code suggestions come back beautifully formatted with Markdown and syntax highlighting.
*   **👀 Interactive UI:** The sprite reacts to your mouse and changes "moods" (Thinking, Cool, Happy) based on what it's doing.

## How to Run It

### 1. The Extension
1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Get your API Key:**
    *   Grab a free API key from [Google AI Studio](https://aistudio.google.com/).
    *   Create a `.env` file in the root folder.
    *   Add: `GEMINI_API_KEY=your_key_here`

### 2. The Companion App
1.  **Navigate to the app folder:**
    ```bash
    cd companion-app
    ```
2.  **Install and Run:**
    ```bash
    npm install
    npm start
    ```
    *This launches the floating Durween sprite.*

### 3. Connect
1.  **Launch the Extension:** Press `F5` in VS Code.
2.  **Summon:** Run the command `Durween: Summon Assistant` to connect VS Code to the Companion App.

## Usage

1.  **Summon Him:** Run `Durween: Summon Assistant` to bring up the sprite. Drag the tab to make it a floating window if you want the full "desktop pet" experience.
2.  **Ask for Help:**
    *   Write a comment like `// TODO: Refactor this function`.
    *   Or just highlight some messy code.
    *   Click the **Lightbulb icon** (💡) that appears.
    *   Select **"Durween: Ask Gemini"**.
3.  **Watch him work:** The sprite will "think" (shake animation) and then pop up a speech bubble with the fix.

## Tech Stack

*   **VS Code Extension API** (CodeActions, Commands)
*   **Electron** (Companion App)
*   **WebSockets** (Real-time communication)
*   **Google Generative AI SDK**
*   **TypeScript**
*   **HTML/CSS** (for the sprite animations)

---

*Built with ❤️ (and a lot of caffeine) for the Vibe Coding Hackathon.*

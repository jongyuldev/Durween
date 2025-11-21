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
*   **💡 Lightbulb Integration:** Refactor code, fix bugs, or generate docs directly from the Quick Fix menu.
*   **💬 Rich Responses:** Code suggestions come back beautifully formatted with syntax highlighting.
*   **👀 Interactive UI:** The sprite reacts to your mouse and changes "moods" (Thinking, Cool, Happy) based on what it's doing.

## How to Run It

1.  **Clone the repo.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Get your API Key:**
    *   Grab a free API key from [Google AI Studio](https://aistudio.google.com/).
    *   Create a `.env` file in the root folder.
    *   Add: `GEMINI_API_KEY=your_key_here`
4.  **Launch:**
    *   Press `F5` in VS Code.
    *   Run the command: `Durween: Summon Assistant`.

## Usage

1.  **Summon Him:** Run `Durween: Summon Assistant` to bring up the sprite. Drag the tab to make it a floating window if you want the full "desktop pet" experience.
2.  **Ask for Help:**
    *   Write a comment like `// TODO: Refactor this function`.
    *   Or just highlight some messy code.
    *   Click the **Lightbulb icon** (💡) that appears.
    *   Select **"Durween: Ask Gemini"**.
3.  **Watch him work:** The sprite will "think" (shake animation) and then pop up a speech bubble with the fix.

## Tech Stack

*   **VS Code Extension API** (Webviews, CodeActions)
*   **Google Generative AI SDK**
*   **TypeScript**
*   **HTML/CSS** (for the sprite animations)

---

*Built with ❤️ (and a lot of caffeine) for the Vibe Coding Hackathon.*

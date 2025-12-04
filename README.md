# Aduitor - Your AI Desktop Companion

Aduitor is a charming, retro-styled desktop assistant powered by Google's Gemini API. It lives on your screen as a friendly "Ghost" character, ready to help you manage tasks, answer questions, generate images, and more.

## ✨ Features

*   **👻 Interactive Ghost Companion:** A floating, draggable character that acts as your interface.
*   **💬 Intelligent Chat:** Powered by Gemini 2.5 Flash, capable of natural conversation and "thinking" modes for complex queries.
*   **✅ Task Management:**
    *   Add tasks via natural language (e.g., "Remind me to call Mom tomorrow at 5 PM").
    *   Organize with categories, priorities, and tags.
    *   Track your productivity with streaks and stats.
*   **🎨 Creative Tools:**
    *   **Image Generation:** Create images directly from the chat interface.
    *   **Vision Analysis:** Drag and drop images or videos for AI analysis.
*   **🎙️ Voice Interaction:** Speak to Aduitor using the built-in microphone with real-time audio visualization.
*   **🌍 Grounded Knowledge:** Integrated with Google Search and Maps for up-to-date information.
*   **🔔 Proactive Assistance:** Aduitor monitors your progress and offers timely nudges or encouragement.

## 🛠️ Tech Stack

*   **Framework:** [Electron](https://www.electronjs.org/) & [React](https://react.dev/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Language:** TypeScript
*   **AI Model:** [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
*   **Styling:** Tailwind CSS & Lucide Icons

## 🚀 Getting Started

### Prerequisites

*   Node.js installed on your machine.
*   A Google Gemini API Key. You can get one [here](https://aistudio.google.com/app/apikey).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/jongyuldev/Durween.git
    cd Durween/aduitor
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    *   Create a `.env` file in the root of the `aduitor` directory.
    *   Add your API key:
        ```env
        API_KEY=your_gemini_api_key_here
        ```

### Running the App

To start the application in development mode (with hot-reload):

```bash
npm run dev
```

This will launch both the Vite dev server and the Electron window.

To build for production:

```bash
npm run electron:build
```

## 🎮 Usage

*   **Drag:** Click and hold anywhere on the character to move it around your screen.
*   **Chat:** Type or speak to interact. Use the mode selector to switch between Chat, Search, Maps, Image Gen, etc.
*   **Tasks:** Open the task list to view your to-dos. You can also ask Aduitor to "add a task" directly.
*   **Stats:** Check the stats board to see your daily streaks and completion rates.

## 📄 License

This project is licensed under the MIT License.

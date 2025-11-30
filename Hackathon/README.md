# 🎃 Spooky Clippy - Halloween Edition 🎃

> "It looks like you're trying to summon a helpful spirit. Would you like help with that?"

Welcome to **Spooky Clippy** - Microsoft's beloved paperclip assistant reimagined as a haunted jack-o'-lantern for Halloween! Now powered by Google's Gemini 2.5 Flash AI.

## ✨ Features

### 🎃 Halloween Theme
- **Haunted Jack-o'-Lantern** character with glowing eyes and evil grin
- **Dark purple/orange** color scheme with spooky glow effects
- **Floating animations** and mystical particles
- **Glowing UI elements** with pulsing effects

### 💡 Smart AI-Powered Assistance
- **Gemini 2.5 Flash Integration**: Real AI conversations powered by Google's latest model
- **Context-Aware Help**: Understands what you're working on and offers relevant suggestions
- **Proactive Task Creation**: Automatically detects tasks from conversations
- **Conversation Memory**: Maintains context across your chat session

### 📸 Advanced Features
- **Screenshot & Analyze**: Take screenshots and ask Clippy to analyze them
- **File Upload**: Upload any file (images, code, documents) for analysis
- **Folder Navigation**: Ask Clippy to open folders ("open downloads", "show documents")
- **File Explorer Integration**: Click to open files in Windows Explorer

### ⚙️ Full Customization
- **Intrusion Levels**: Off, Passive, or Proactive modes
- **Personality Options**: Formal, Friendly, Concise, or Verbose
- **Appearance Choices**: Classic Pumpkin, Minimal Dot, Modern Orb, or Text-Only
- **Learning Controls**: Enable/disable learning, clear history
- **Hotkey Summon**: Quick keyboard shortcut (Ctrl+Shift+C)

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your API Key

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

2. Get your free API key from [Google AI Studio](https://aistudio.google.com/apikey)

3. Open `.env` and add your key:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Run Spooky Clippy

```bash
npm start
```

## 🎮 How to Use

### Basic Chat
1. Click the chat button (💬) to open the input
2. Type your question or request
3. Clippy will respond using Gemini AI with full context awareness

### Screenshot Analysis
1. Click the 📸 button
2. Clippy will hide, capture your screen, then reappear
3. Ask questions about the screenshot

### File Analysis
1. Click the 📎 button
2. Select any file (images, code, documents, etc.)
3. Ask Clippy to analyze, explain, or review it

### Folder Navigation
Just ask Clippy naturally:
- "Open my Downloads folder"
- "Show me Documents"
- "Navigate to C:\Projects"

### Keyboard Shortcuts
- `Ctrl+Shift+C` (Windows/Linux) or `Cmd+Shift+C` (Mac): Show/hide Clippy
- `Enter`: Send message in chat

## 🎨 Customization

Click the Settings button (⚙️) to customize:
- **Intrusion Level**: How proactive Clippy should be
- **Appearance**: Choose your visual style
- **Personality**: Pick your preferred communication style
- **Context Awareness**: Enable smart suggestions
- **Learning**: Control what Clippy remembers

## 🔒 Security

- Your API key is stored in `.env` (not committed to git)
- All data stays on your device
- Clippy only sends data to Google's Gemini API when you chat
- No tracking or external data collection

## 🛠️ Technology Stack

- **Electron**: Cross-platform desktop framework
- **Google Gemini 2.5 Flash**: AI-powered conversations
- **Vanilla JavaScript**: No frameworks, pure JS
- **CSS Animations**: Smooth, spooky effects
- **SVG Graphics**: Scalable vector pumpkin

## 📝 Environment Variables

Create a `.env` file with:

```env
GEMINI_API_KEY=your_api_key_here
```

**Never commit your `.env` file to version control!**

## 🎃 Halloween Features

- Glowing jack-o'-lantern with animated eyes
- Purple and orange color scheme
- Spooky floating particles
- Pulsing glow effects
- Dark mystical theme
- Haunted speech bubbles

## 🤝 Contributing

Feel free to enhance Spooky Clippy! Some ideas:
- Add more Halloween animations
- Create different character skins
- Add voice commands
- Integrate with more AI models
- Add productivity tracking

## 📜 License

MIT License - Feel free to resurrect Clippy in your own spooky way!

---

*"I see you're reading the README. Would you like help with that?"* 🎃👻

**Happy Halloween! 🎃✨**

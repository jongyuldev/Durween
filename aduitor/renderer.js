const { ipcRenderer, shell } = require('electron');
const path = require('path');
const os = require('os');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Current theme
let currentTheme = localStorage.getItem('aduitor-theme') || 'default';

// Theme configurations
const themeConfig = {
  default: {
    title: 'Aduitor',
    greeting: "Hey there, friend! I'm Aduitor, your helpful buddy! 🎉 What can I help you with today?",
    placeholder: "Ask a question or just say hi! 😊",
    sendBtn: "Ask",
    thinkingMsg: "Hmm, let me think... 🤔",
    screenMsg: "Let me take a look at your screen... 📸",
    folderMsg: "Where would you like to go? 📁 Click one of the buttons below!",
    folderOpenMsg: (folder) => `Done! I opened your ${folder} folder! 🎉 Take a look!`,
    searchMsg: (query) => `I opened a search for "${query}" in your browser! 🔍 Take a look!`,
    buttons: { find: '🔍 Find Files', folder: '📁 Open Folder', screen: '📸 See Screen', help: '❓ Help Me' },
    systemPrompt: `You are Aduitor, a friendly, warm, and slightly goofy desktop assistant.
Your personality: patient, encouraging, uses simple language, occasional dad jokes, warm and supportive.
Guidelines: Keep responses SHORT (3-4 sentences max), use emojis sparingly (1-2 per response), be helpful!`
  },
  halloween: {
    title: '🎃 Aduitor 🎃',
    greeting: "Boo! 👻 I'm Aduitor, your spooky helper! What tricks or treats can I help you with? 🎃",
    placeholder: "Ask me anything... if you dare! 👻",
    sendBtn: "Boo!",
    thinkingMsg: "Hmm, let me consult the spirits... 👻",
    screenMsg: "Let me peer into my crystal ball... 🔮",
    folderMsg: "Where shall we haunt? 🦇 Pick a spooky destination!",
    folderOpenMsg: (folder) => `Abracadabra! 🎃 I summoned your ${folder} folder!`,
    searchMsg: (query) => `I conjured a search for "${query}"! 🔮 Take a peek!`,
    buttons: { find: '🔮 Find Files', folder: '🦇 Open Folder', screen: '👁️ See Screen', help: '🕯️ Help Me' },
    systemPrompt: `You are Aduitor, a friendly jack-o'-lantern desktop assistant! It's Halloween! 🎃
Use spooky-themed language playfully (fang-tastic, boo-tiful, spook-tacular).
Guidelines: Keep responses SHORT, use spooky emojis (🎃👻🦇🕷️), be helpful but festive!`
  },
  christmas: {
    title: '🎄 Aduitor 🎄',
    greeting: "Ho ho ho! 🎅 I'm Aduitor, your jolly helper! What gift of knowledge can I bring you? 🎁",
    placeholder: "What's on your wish list? 🎁",
    sendBtn: "Ho Ho!",
    thinkingMsg: "Let me check Santa's list... 🎅",
    screenMsg: "Let me peek through the frosty window... ❄️",
    folderMsg: "Where shall we sleigh to? 🛷 Pick a destination!",
    folderOpenMsg: (folder) => `Special delivery! 🎁 Your ${folder} folder is here!`,
    searchMsg: (query) => `I sent the elves to search for "${query}"! 🧝 Check your browser!`,
    buttons: { find: '⭐ Find Files', folder: '🎁 Open Folder', screen: '❄️ See Screen', help: '🔔 Help Me' },
    systemPrompt: `You are Aduitor, a cheerful snowman desktop assistant! It's Christmas! 🎄
Use festive language (jolly, merry, wonderful), occasional Christmas puns.
Guidelines: Keep responses SHORT, use festive emojis (🎄🎅❄️🎁⭐), spread holiday cheer!`
  },
  valentine: {
    title: '💕 Aduitor 💕',
    greeting: "Hello, lovely! 💖 I'm Aduitor, here to help with love and care! What can I do for you? 💕",
    placeholder: "Share what's on your heart... 💝",
    sendBtn: "Love!",
    thinkingMsg: "Let me think with all my heart... 💭💕",
    screenMsg: "Let me gaze lovingly at your screen... 👀💖",
    folderMsg: "Where would you love to go? 💕 Pick a sweet destination!",
    folderOpenMsg: (folder) => `With love! 💖 Your ${folder} folder awaits you!`,
    searchMsg: (query) => `I searched for "${query}" with all my heart! 💕`,
    buttons: { find: '💝 Find Files', folder: '💌 Open Folder', screen: '👀 See Screen', help: '💕 Help Me' },
    systemPrompt: `You are Aduitor, a sweet heart-shaped desktop assistant! It's Valentine's! 💕
Use loving, caring language, be extra supportive and warm.
Guidelines: Keep responses SHORT, use love emojis (💕💖💝💌), be sweet and helpful!`
  },
  birthday: {
    title: '🎂 Aduitor 🎂',
    greeting: "Let's party! 🎉 I'm Aduitor, your celebration buddy! What fun can we have today? 🎈",
    placeholder: "Make a wish! 🌟",
    sendBtn: "Party!",
    thinkingMsg: "Let me unwrap this thought... 🎁",
    screenMsg: "Let me peek at the party... 🎊",
    folderMsg: "Where's the party at? 🎈 Pick a fun destination!",
    folderOpenMsg: (folder) => `Surprise! 🎉 Your ${folder} folder is ready to party!`,
    searchMsg: (query) => `Party search for "${query}"! 🎊 Check it out!`,
    buttons: { find: '🎁 Find Files', folder: '🎈 Open Folder', screen: '🎊 See Screen', help: '🎉 Help Me' },
    systemPrompt: `You are Aduitor, a festive cupcake desktop assistant! It's party time! 🎂
Use celebratory language, be extra fun and energetic.
Guidelines: Keep responses SHORT, use party emojis (🎉🎈🎂🎁🎊), make everything feel like a celebration!`
  }
};


// Conversation history for context
let conversationHistory = [];

// Get current theme config
function getTheme() {
  return themeConfig[currentTheme] || themeConfig.default;
}

// Fallback responses when API fails
function getFallbackResponses() {
  const theme = getTheme();
  return {
    greeting: [theme.greeting],
    error: [
      "Oops! My brain had a little hiccup there. 🤔 Could you try asking again?",
      "Hmm, I got a bit confused. Let me try again - what did you need help with?"
    ],
    offline: [
      "I seem to be having trouble connecting! 🌧️ Check your internet connection and try again."
    ]
  };
}

// Get random item from array
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Track current typing animation
let currentTypingId = 0;

// Parse simple markdown to HTML
function parseMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

// Update speech bubble with typing effect
function speak(text, mood = 'normal') {
  const speechText = document.getElementById('speech-text');
  const aduitor = document.getElementById('aduitor');
  
  currentTypingId++;
  const thisTypingId = currentTypingId;
  
  aduitor.classList.remove('thinking', 'excited', 'happy');
  if (mood !== 'normal') {
    aduitor.classList.add(mood);
  }
  
  const parsedText = parseMarkdown(text);
  speechText.innerHTML = '';
  
  let i = 0;
  const typeWriter = () => {
    if (thisTypingId !== currentTypingId) return;
    if (i < text.length) {
      speechText.textContent = text.substring(0, i + 1);
      i++;
      setTimeout(typeWriter, 12);
    } else {
      speechText.innerHTML = parsedText;
    }
  };
  typeWriter();
}

// Call Gemini API (text only)
async function askGemini(userMessage) {
  const theme = getTheme();
  
  conversationHistory.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });
  
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }
  
  const requestBody = {
    contents: conversationHistory,
    systemInstruction: {
      parts: [{ text: theme.systemPrompt }]
    },
    generationConfig: {
      temperature: 0.8,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 200
    }
  };
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      conversationHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
      return aiResponse;
    } else {
      throw new Error('Invalid response format');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    conversationHistory.pop();
    const fallback = getFallbackResponses();
    if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
      return getRandomItem(fallback.offline);
    }
    return getRandomItem(fallback.error);
  }
}


// Call Gemini API with screenshot (vision)
async function askGeminiWithScreenshot(userMessage) {
  const theme = getTheme();
  
  try {
    const screenshotDataUrl = await ipcRenderer.invoke('capture-screenshot');
    if (!screenshotDataUrl) {
      return "Oops! I couldn't capture your screen. 😅 Make sure I have permission!";
    }
    
    const base64Data = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, '');
    
    const requestBody = {
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Data } },
          { text: userMessage || "What do you see on my screen? Please explain it simply." }
        ]
      }],
      systemInstruction: {
        parts: [{ text: theme.systemPrompt + "\n\nYou are looking at a screenshot. Describe what you see simply." }]
      },
      generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 250 }
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Screenshot analysis error:', error);
    return "I had trouble analyzing your screen. 🤔 Could you try again?";
  }
}

// Check if message is asking about screen content
function isScreenQuestion(message) {
  const screenKeywords = ['screen', 'see', 'looking at', 'showing', 'display', 'window',
    'what is this', "what's this", 'explain this', 'help with this', 'on my screen',
    'i see', 'in front of me', 'right now', 'this error', 'this message', 'this popup'];
  const lowerMessage = message.toLowerCase();
  return screenKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Handle quick action buttons
function handleAction(action) {
  const theme = getTheme();
  let prompt = '';
  
  switch(action) {
    case 'find-files':
      prompt = "How do I find files on my computer? I lost a file.";
      break;
    case 'open-folder':
      showFolderOptions();
      return;
    case 'screenshot':
      speak(theme.screenMsg, 'thinking');
      askGeminiWithScreenshot("What's on my screen? Describe what you see.").then(response => {
        speak(response, 'happy');
      });
      return;
    case 'help':
      prompt = "What kinds of things can you help me with?";
      break;
  }
  
  if (prompt) {
    speak(theme.thinkingMsg, 'thinking');
    askGemini(prompt).then(response => speak(response, 'happy'));
  }
}

// Show folder options
function showFolderOptions() {
  const theme = getTheme();
  speak(theme.folderMsg, 'happy');
  
  const quickActions = document.getElementById('quick-actions');
  quickActions.innerHTML = `
    <button class="action-btn" onclick="openFolder('documents')">📄 Documents</button>
    <button class="action-btn" onclick="openFolder('downloads')">⬇️ Downloads</button>
    <button class="action-btn" onclick="openFolder('pictures')">🖼️ Pictures</button>
    <button class="action-btn" onclick="openFolder('desktop')">🖥️ Desktop</button>
  `;
  
  setTimeout(resetQuickActions, 15000);
}

// Open specific folder
function openFolder(folder) {
  const theme = getTheme();
  const homeDir = os.homedir();
  let folderPath;
  
  switch(folder) {
    case 'documents': folderPath = path.join(homeDir, 'Documents'); break;
    case 'downloads': folderPath = path.join(homeDir, 'Downloads'); break;
    case 'pictures': folderPath = path.join(homeDir, 'Pictures'); break;
    case 'desktop': folderPath = path.join(homeDir, 'Desktop'); break;
  }
  
  shell.openPath(folderPath);
  speak(theme.folderOpenMsg(folder), 'excited');
  resetQuickActions();
}

// Reset quick actions to default
function resetQuickActions() {
  const theme = getTheme();
  const quickActions = document.getElementById('quick-actions');
  quickActions.innerHTML = `
    <button class="action-btn" onclick="handleAction('find-files')">${theme.buttons.find}</button>
    <button class="action-btn" onclick="handleAction('open-folder')">${theme.buttons.folder}</button>
    <button class="action-btn" onclick="handleAction('screenshot')">${theme.buttons.screen}</button>
    <button class="action-btn" onclick="handleAction('help')">${theme.buttons.help}</button>
  `;
}


// Web search function
function webSearch(query) {
  const theme = getTheme();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  shell.openExternal(searchUrl);
  speak(theme.searchMsg(query), 'excited');
}

// Handle user input
async function sendMessage() {
  const theme = getTheme();
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  
  if (!message) return;
  input.value = '';
  
  if (message.toLowerCase().startsWith('search ')) {
    const query = message.substring(7).trim();
    if (query) { webSearch(query); return; }
  }
  
  if (message.toLowerCase().startsWith('screenshot') || message.toLowerCase().startsWith('look at my screen')) {
    speak(theme.screenMsg, 'thinking');
    const response = await askGeminiWithScreenshot(message);
    speak(response, 'happy');
    return;
  }
  
  if (isScreenQuestion(message)) {
    speak(theme.screenMsg, 'thinking');
    const response = await askGeminiWithScreenshot(message);
    speak(response, 'happy');
    return;
  }
  
  speak(theme.thinkingMsg, 'thinking');
  const response = await askGemini(message);
  speak(response, 'happy');
}

function handleKeyPress(event) {
  if (event.key === 'Enter') sendMessage();
}

function hideWindow() {
  ipcRenderer.send('hide-window');
}

// Theme switching functions
function toggleThemeDropdown() {
  const dropdown = document.getElementById('theme-dropdown');
  dropdown.classList.toggle('show');
}

function setTheme(themeName) {
  currentTheme = themeName;
  localStorage.setItem('aduitor-theme', themeName);
  
  // Update stylesheet
  const themeStylesheet = document.getElementById('theme-stylesheet');
  themeStylesheet.href = `themes/${themeName}.css`;
  
  // Update UI elements
  const theme = getTheme();
  document.getElementById('app-title').textContent = theme.title;
  document.getElementById('user-input').placeholder = theme.placeholder;
  document.getElementById('send-btn').textContent = theme.sendBtn;
  
  // Update quick action buttons
  resetQuickActions();
  
  // Update active state in dropdown
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.theme === themeName);
  });
  
  // Close dropdown
  document.getElementById('theme-dropdown').classList.remove('show');
  
  // Clear conversation history for fresh themed responses
  conversationHistory = [];
  
  // Show themed greeting
  speak(theme.greeting, 'happy');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.theme-selector')) {
    document.getElementById('theme-dropdown').classList.remove('show');
  }
});

// Eye tracking (follows mouse)
document.addEventListener('mousemove', (e) => {
  const pupils = document.querySelectorAll('.pupil');
  const aduitorEl = document.querySelector('.aduitor');
  if (!aduitorEl) return;
  
  const rect = aduitorEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;
  
  const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
  const distance = Math.min(4, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 50);
  
  pupils.forEach(pupil => {
    pupil.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
  });
});

// Initialize
window.onload = async () => {
  // Apply saved theme
  setTheme(currentTheme);
  
  // Get AI greeting
  const theme = getTheme();
  const greeting = await askGemini(`Say hello! Introduce yourself briefly in your ${currentTheme} themed personality.`);
  speak(greeting, 'happy');
};

// Listen for window shown event
ipcRenderer.on('window-shown', async () => {
  const theme = getTheme();
  const greeting = await askGemini("The user just summoned you. Give a short, friendly greeting.");
  speak(greeting, 'happy');
});

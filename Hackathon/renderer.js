const { ipcRenderer } = require('electron');

const speechBubble = document.getElementById('speechBubble');
const bubbleContent = document.getElementById('bubbleContent');
const userInput = document.getElementById('userInput');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const settingsBtn = document.getElementById('settingsBtn');
const toggleBubbleBtn = document.getElementById('toggleBubbleBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');
const ghostContainer = document.getElementById('ghostContainer');
const controls = document.querySelector('.controls');

// Debug: Log which elements were found
console.log('Elements found:', {
  speechBubble: !!speechBubble,
  bubbleContent: !!bubbleContent,
  userInput: !!userInput,
  minimizeBtn: !!minimizeBtn,
  closeBtn: !!closeBtn,
  settingsBtn: !!settingsBtn,
  toggleBubbleBtn: !!toggleBubbleBtn,
  screenshotBtn: !!screenshotBtn,
  fileBtn: !!fileBtn,
  fileInput: !!fileInput,
  ghostContainer: !!ghostContainer,
  controls: !!controls
});

let currentConfig = {};
let currentContext = null;
let messageHistory = [];
let currentImage = null;
let currentFile = null;

const responses = {
  greetings: [
    "Hello! Ready to assist you! 📎",
    "Hi there! What can I do for you? 😊",
    "Hey! I'm here to help! 👋"
  ],
  help: [
    "I can help you with:\n• Quick tips\n• File management\n• General questions\n• Or just chat! 💬",
    "Need assistance? I'm great at:\n• Answering questions\n• Providing suggestions\n• Being your desktop buddy! 🎯"
  ],
  jokes: [
    "Why did the paperclip go to school? To get more attached to learning! 📚😄",
    "I'm not just any paperclip... I'm a SMART clip! 🧠✨",
    "What's my favorite music? Heavy metal... because I'm made of it! 🎵"
  ],
  thanks: [
    "You're welcome! Happy to help! 😊",
    "Anytime! That's what I'm here for! 📎",
    "My pleasure! Feel free to ask anything else! ✨"
  ],
  default: [
    "Interesting question! I'm still learning, but I'm here to help however I can! 🤔",
    "Hmm, let me think about that... I'm a modern Clippy, always evolving! 🚀",
    "Great question! While I may not have all the answers, I'm always here to assist! 💡"
  ]
};

const tips = [
  "💡 Tip: Press Ctrl+C to copy and Ctrl+V to paste!",
  "💡 Tip: Use Ctrl+Z to undo your last action!",
  "💡 Tip: Alt+Tab switches between open windows!",
  "💡 Tip: Windows+D shows your desktop instantly!",
  "💡 Tip: Ctrl+Shift+Esc opens Task Manager!",
  "🎯 Did you know? I'm a resurrection of the classic Office Assistant!",
  "✨ Fun fact: The original Clippy debuted in 1997!",
  "🚀 I'm here 24/7 to make your computing life easier!"
];

let tipIndex = 0;

function showRandomTip() {
  const tip = tips[tipIndex];
  updateSpeechBubble(tip);
  tipIndex = (tipIndex + 1) % tips.length;
}

function updateSpeechBubble(text, addToHistory = true) {
  console.log('updateSpeechBubble called with:', text);
  
  if (!bubbleContent) {
    console.error('bubbleContent element not found!');
    return;
  }
  
  // Escape HTML and convert line breaks to <br> tags
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
  
  bubbleContent.innerHTML = escapedText;
  speechBubble.classList.add('show');
  console.log('Speech bubble should now be visible');
  
  if (addToHistory) {
    messageHistory.push({
      text: text,
      timestamp: Date.now()
    });
  }
  
  // Clear any existing timeout
  if (window.bubbleTimeout) {
    clearTimeout(window.bubbleTimeout);
  }
  
  // Auto-hide after 60 seconds (or keep visible longer)
  window.bubbleTimeout = setTimeout(() => {
    speechBubble.classList.remove('show');
    console.log('Speech bubble hidden');
  }, 60000);
}

function getResponse(input) {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.match(/hello|hi|hey|greetings/)) {
    return responses.greetings[Math.floor(Math.random() * responses.greetings.length)];
  } else if (lowerInput.match(/help|what can you do|assist/)) {
    return responses.help[Math.floor(Math.random() * responses.help.length)];
  } else if (lowerInput.match(/joke|funny|laugh/)) {
    return responses.jokes[Math.floor(Math.random() * responses.jokes.length)];
  } else if (lowerInput.match(/thank|thanks|thx/)) {
    return responses.thanks[Math.floor(Math.random() * responses.thanks.length)];
  } else if (lowerInput.match(/who are you|what are you/)) {
    return "I'm Clippy 2.0! A reimagined version of Microsoft's classic assistant, now with modern tech! 📎✨";
  } else if (lowerInput.match(/time|date/)) {
    const now = new Date();
    return `It's ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}! ⏰`;
  } else {
    return responses.default[Math.floor(Math.random() * responses.default.length)];
  }
}

async function handleUserInput() {
  const input = userInput.value.trim();
  console.log('handleUserInput called, input:', input, 'currentImage:', currentImage);
  
  if (input || currentImage) {
    try {
      updateSpeechBubble('Thinking... 🤔');
      console.log('Sending to AI...');
      
      const response = await ipcRenderer.invoke('get-ai-response', {
        text: input,
        image: currentImage,
        file: currentFile
      });
      
      console.log('Received response:', response);
      console.log('Response type:', typeof response);
      console.log('Response length:', response?.length);
      
      if (!response) {
        updateSpeechBubble('Error: No response received from AI');
        return;
      }
      
      // Check if response contains folder open command
      if (response.startsWith('[OPEN_FOLDER:')) {
        const folderPath = response.match(/\[OPEN_FOLDER:(.+)\]/)[1];
        updateSpeechBubble(`Opening ${folderPath}... 📂`);
        
        const result = await ipcRenderer.invoke('open-folder', folderPath);
        if (result.success) {
          updateSpeechBubble(`✓ Opened File Explorer to:\n${result.path}`);
        } else {
          updateSpeechBubble(`❌ Could not open folder:\n${result.error}`);
        }
        return;
      }
      
      updateSpeechBubble(response);
      console.log('Speech bubble updated');
      
      // Reset image and file state
      if (currentImage) {
        currentImage = null;
        screenshotBtn.textContent = '📸';
        screenshotBtn.style.background = '';
      }
      if (currentFile) {
        currentFile = null;
      }
      fileBtn.textContent = '📎';
      fileBtn.style.background = '';
      fileInput.value = '';
      userInput.placeholder = 'Ask me anything...';
      speechBubble.style.cursor = 'default';
      speechBubble.onclick = null;
    } catch (error) {
      console.error('Error in handleUserInput:', error);
      updateSpeechBubble('Error: ' + error.message + '\n\nCheck console for details (Ctrl+Shift+I)');
    }
    
    userInput.value = '';
  } else {
    console.log('No input or image to send');
    updateSpeechBubble('Please type a message or attach an image first!');
  }
}

// Input is always visible now, no chat button needed

if (userInput) {
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      console.log('Enter key pressed, sending message...');
      handleUserInput();
    }
  });
  console.log('Enter key listener added to input');
} else {
  console.error('User input element not found!');
}

if (minimizeBtn) {
  minimizeBtn.addEventListener('click', () => {
    console.log('Minimize button clicked!');
    updateSpeechBubble("I'll be back in 30 seconds! 👋");
    setTimeout(() => {
      ipcRenderer.send('minimize-clippy');
    }, 1000);
  });
} else {
  console.error('Minimize button not found!');
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    console.log('Close button clicked!');
    updateSpeechBubble("Goodbye! See you next time! 👋");
    setTimeout(() => {
      ipcRenderer.send('close-clippy');
    }, 1000);
  });
} else {
  console.error('Close button not found!');
}

if (toggleBubbleBtn) {
  toggleBubbleBtn.addEventListener('click', () => {
    console.log('Toggle bubble button clicked!');
    speechBubble.classList.toggle('show');
  });
} else {
  console.error('Toggle bubble button not found!');
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    console.log('Settings button clicked!');
    ipcRenderer.send('open-settings');
  });
} else {
  console.error('Settings button not found!');
}

// Clear button removed from new design

// Test function - remove after debugging
window.testBubble = () => {
  console.log('Testing bubble...');
  updateSpeechBubble('Test message! If you see this, the bubble works! 🎉');
};

if (screenshotBtn) {
  screenshotBtn.addEventListener('click', async () => {
    console.log('Screenshot button clicked!');
    try {
      updateSpeechBubble('Taking screenshot... 📸', false);
      screenshotBtn.disabled = true;
    
    const screenshot = await ipcRenderer.invoke('take-screenshot');
    
    if (screenshot) {
      currentImage = {
        data: screenshot.data,
        mimeType: 'image/png',
        name: 'screenshot.png'
      };
      screenshotBtn.textContent = '✓';
      screenshotBtn.style.background = '#4CAF50';
      updateSpeechBubble('Screenshot captured! What would you like to know about it?', false);
      userInput.placeholder = 'Ask about the screenshot...';
      userInput.focus();
    }
  } catch (error) {
    console.error('Screenshot error:', error);
    updateSpeechBubble('Sorry, failed to take screenshot: ' + error.message, false);
  } finally {
      screenshotBtn.disabled = false;
    }
  });
} else {
  console.error('Screenshot button not found!');
}

if (fileBtn) {
  fileBtn.addEventListener('click', () => {
    console.log('File button clicked!');
    fileInput.click();
  });
} else {
  console.error('File button not found!');
}

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    try {
      const filePath = file.path; // Electron provides the full path
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        // Handle as image
        const reader = new FileReader();
        reader.onload = (event) => {
          currentImage = {
            data: event.target.result,
            mimeType: file.type,
            name: file.name,
            path: filePath
          };
          fileBtn.textContent = '✓';
          fileBtn.style.background = '#4CAF50';
          
          const message = `Image "${file.name}" attached! 📸\n\nLocation: ${filePath}\n\n[Click here to open in File Explorer]`;
          updateSpeechBubble(message, false);
          
          // Make the bubble clickable to open file location
          speechBubble.style.cursor = 'pointer';
          speechBubble.onclick = () => {
            ipcRenderer.send('open-file-location', filePath);
            speechBubble.style.cursor = 'default';
            speechBubble.onclick = null;
          };
          
          userInput.placeholder = 'Ask about the image...';
          userInput.focus();
        };
        reader.readAsDataURL(file);
      } else {
        // Handle as text file
        const reader = new FileReader();
        reader.onload = (event) => {
          currentFile = {
            content: event.target.result,
            name: file.name,
            type: file.type,
            size: file.size,
            path: filePath
          };
          fileBtn.textContent = '✓';
          fileBtn.style.background = '#4CAF50';
          
          const message = `File "${file.name}" loaded! 📄\n\nLocation: ${filePath}\n\n[Click here to open in File Explorer]`;
          updateSpeechBubble(message, false);
          
          // Make the bubble clickable to open file location
          speechBubble.style.cursor = 'pointer';
          speechBubble.onclick = () => {
            ipcRenderer.send('open-file-location', filePath);
            speechBubble.style.cursor = 'default';
            speechBubble.onclick = null;
          };
          
          userInput.placeholder = 'Ask about the file...';
          userInput.focus();
        };
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('File read error:', error);
      updateSpeechBubble('Sorry, failed to read file: ' + error.message, false);
    }
  }
});

// Listen for config updates
ipcRenderer.on('config-update', (event, config) => {
  currentConfig = config;
  applyConfig(config);
});

// Listen for context updates
ipcRenderer.on('context-update', (event, context) => {
  currentContext = context;
  // Don't automatically show suggestions - messages stay until user clears them
  console.log('Context updated:', context?.type);
});

// Listen for proactive suggestions
ipcRenderer.on('show-suggestion', (event, suggestion) => {
  // Only show if there's no current message or user explicitly wants suggestions
  if (bubbleContent.textContent.includes('Ask me anything') || 
      bubbleContent.textContent.includes('Message cleared')) {
    updateSpeechBubble(suggestion.text + '\n\n[Click to dismiss]');
    speechBubble.onclick = () => {
      ipcRenderer.send('dismiss-suggestion', suggestion.id);
      speechBubble.onclick = null;
    };
  }
});

// Listen for focus input command
ipcRenderer.on('focus-input', () => {
  inputContainer.style.display = 'flex';
  userInput.focus();
});

// Listen for BOO message when reappearing
ipcRenderer.on('show-boo-message', () => {
  updateSpeechBubble('👻 BOO! I\'m back! 👻\n\nDid you miss me? 😊');
});

function applyConfig(config) {
  // Apply appearance settings
  const clippyChar = document.getElementById('clippy');
  if (config.appearance === 'none') {
    clippyChar.style.display = 'none';
  } else {
    clippyChar.style.display = 'block';
  }
  
  // Apply animation settings
  if (!config.enableAnimations) {
    clippyChar.style.animation = 'none';
    document.querySelectorAll('.eye, .mouth').forEach(el => {
      el.style.animation = 'none';
    });
  }
  
  // Apply high contrast
  if (config.highContrast) {
    document.body.classList.add('high-contrast');
  } else {
    document.body.classList.remove('high-contrast');
  }
}

function showContextualTip(text) {
  updateSpeechBubble('💡 ' + text);
}

// Show tips periodically only if not in off mode - DISABLED
// Tips will only show on initial load, not automatically
function startTipRotation() {
  // Automatic tips disabled - messages stay until user clears them
}

// Initial greeting after a short delay - only once
setTimeout(async () => {
  const context = await ipcRenderer.invoke('get-current-context');
  if (context && context.type !== 'general') {
    updateSpeechBubble(`Hi! I see you're working on ${context.type.replace('-', ' ')}. Need any help? 👋`);
  } else {
    updateSpeechBubble('Hi! I\'m Clippy 2.0! 👋\nHow can I help you today?');
  }
  // No automatic rotation - messages stay until cleared
}, 2000);


// Speech bubble is non-interactive now

// Toggle controls when clicking ghost
if (ghostContainer && controls) {
  ghostContainer.addEventListener('click', () => {
    console.log('Ghost clicked!');
    controls.classList.toggle('show');
  });
  console.log('Ghost click listener added');
} else {
  console.error('Ghost container or controls not found!');
}

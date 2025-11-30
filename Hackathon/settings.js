const { ipcRenderer } = require('electron');

// Load current settings
async function loadSettings() {
  const config = await ipcRenderer.invoke('get-config');
  
  document.getElementById('intrusionLevel').value = config.intrusionLevel;
  document.getElementById('appearance').value = config.appearance;
  document.getElementById('personality').value = config.personality;
  document.getElementById('enableAnimations').checked = config.enableAnimations;
  document.getElementById('contextAwareness').checked = config.contextAwareness;
  document.getElementById('taskSuggestions').checked = config.taskSuggestions;
  document.getElementById('learningEnabled').checked = config.learningEnabled;
  document.getElementById('rememberStyle').checked = config.rememberStyle;
  document.getElementById('voiceEnabled').checked = config.voiceEnabled;
  document.getElementById('hotkey').value = config.hotkey;
  document.getElementById('highContrast').checked = config.highContrast;
  document.getElementById('geminiApiKey').value = config.geminiApiKey || '';
}

// Save settings
document.getElementById('saveBtn').addEventListener('click', () => {
  const settings = {
    intrusionLevel: document.getElementById('intrusionLevel').value,
    appearance: document.getElementById('appearance').value,
    personality: document.getElementById('personality').value,
    enableAnimations: document.getElementById('enableAnimations').checked,
    contextAwareness: document.getElementById('contextAwareness').checked,
    taskSuggestions: document.getElementById('taskSuggestions').checked,
    learningEnabled: document.getElementById('learningEnabled').checked,
    rememberStyle: document.getElementById('rememberStyle').checked,
    voiceEnabled: document.getElementById('voiceEnabled').checked,
    hotkey: document.getElementById('hotkey').value,
    highContrast: document.getElementById('highContrast').checked,
    geminiApiKey: document.getElementById('geminiApiKey').value
  };

  Object.entries(settings).forEach(([key, value]) => {
    ipcRenderer.send('update-config', key, value);
  });

  alert('Settings saved! Clippy is now powered by Gemini 2.0 Flash.');
});

// Reset to defaults
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset all settings to defaults?')) {
    ipcRenderer.send('reset-config');
    setTimeout(loadSettings, 100);
  }
});

// Clear history
document.getElementById('clearHistory').addEventListener('click', () => {
  if (confirm('Clear all conversation history and learning data?')) {
    ipcRenderer.send('clear-history');
    alert('History cleared!');
  }
});

// Load settings on startup
loadSettings();

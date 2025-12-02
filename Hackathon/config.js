// User preferences and configuration
const Store = require('electron-store');

const schema = {
  intrusionLevel: {
    type: 'string',
    enum: ['off', 'passive', 'proactive'],
    default: 'passive'
  },
  appearance: {
    type: 'string',
    enum: ['clippy', 'dot', 'orb', 'none'],
    default: 'clippy'
  },
  personality: {
    type: 'string',
    enum: ['formal', 'friendly', 'concise', 'verbose'],
    default: 'friendly'
  },
  enableAnimations: {
    type: 'boolean',
    default: true
  },
  learningEnabled: {
    type: 'boolean',
    default: true
  },
  rememberStyle: {
    type: 'boolean',
    default: true
  },
  voiceEnabled: {
    type: 'boolean',
    default: false
  },
  hotkey: {
    type: 'string',
    default: 'CommandOrControl+Shift+C'
  },
  contextAwareness: {
    type: 'boolean',
    default: true
  },
  taskSuggestions: {
    type: 'boolean',
    default: true
  },
  highContrast: {
    type: 'boolean',
    default: false
  },
  dismissedSuggestions: {
    type: 'array',
    default: []
  },
  userHistory: {
    type: 'array',
    default: []
  },
  geminiApiKey: {
    type: 'string',
    default: ''
  }
};

class ConfigManager {
  constructor() {
    this.store = new Store({ schema });
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  getAll() {
    return this.store.store;
  }

  reset() {
    this.store.clear();
  }

  addToHistory(entry) {
    const history = this.get('userHistory');
    history.push({
      ...entry,
      timestamp: Date.now()
    });
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    this.set('userHistory', history);
  }

  dismissSuggestion(suggestionId) {
    const dismissed = this.get('dismissedSuggestions');
    dismissed.push(suggestionId);
    this.set('dismissedSuggestions', dismissed);
  }

  isSuggestionDismissed(suggestionId) {
    return this.get('dismissedSuggestions').includes(suggestionId);
  }
}

module.exports = new ConfigManager();

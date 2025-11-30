// Context-aware analysis engine
const fs = require('fs').promises;
const path = require('path');

// Try to load active-win, but handle if it fails
let activeWin = null;
try {
  activeWin = require('active-win');
} catch (error) {
  console.log('active-win not available, context awareness will be limited');
}

class ContextAnalyzer {
  constructor() {
    this.currentContext = null;
    this.lastAnalysis = null;
  }

  async analyzeCurrentContext() {
    try {
      // If active-win is not available, return a basic context
      if (!activeWin) {
        return this.getBasicContext();
      }

      const window = await activeWin();
      if (!window) return this.getBasicContext();

      const context = {
        app: window.owner.name,
        title: window.title,
        timestamp: Date.now(),
        type: this.detectTaskType(window),
        suggestions: []
      };

      context.suggestions = await this.generateSuggestions(context);
      this.currentContext = context;
      this.lastAnalysis = Date.now();

      return context;
    } catch (error) {
      console.error('Context analysis error:', error);
      return this.getBasicContext();
    }
  }

  getBasicContext() {
    const context = {
      app: 'Unknown',
      title: 'Unknown',
      timestamp: Date.now(),
      type: 'general',
      suggestions: []
    };
    context.suggestions = this.getGeneralSuggestions();
    this.currentContext = context;
    return context;
  }

  getGeneralSuggestions() {
    return [
      {
        id: 'general-help',
        priority: 'low',
        text: 'I\'m here to help! Ask me anything about coding, productivity, or just chat.',
        action: 'general',
        confidence: 0.5
      }
    ];
  }

  detectTaskType(window) {
    const app = window.owner.name.toLowerCase();
    const title = window.title.toLowerCase();

    // Code editors
    if (app.includes('code') || app.includes('visual studio') || 
        app.includes('sublime') || app.includes('atom')) {
      if (title.includes('.js') || title.includes('.ts')) return 'coding-javascript';
      if (title.includes('.py')) return 'coding-python';
      if (title.includes('.java')) return 'coding-java';
      if (title.includes('.html') || title.includes('.css')) return 'coding-web';
      return 'coding-general';
    }

    // Office apps
    if (app.includes('word') || title.includes('.docx')) return 'writing-document';
    if (app.includes('excel') || title.includes('.xlsx')) return 'spreadsheet';
    if (app.includes('powerpoint') || title.includes('.pptx')) return 'presentation';

    // Browsers
    if (app.includes('chrome') || app.includes('firefox') || 
        app.includes('edge') || app.includes('safari')) {
      if (title.includes('gmail') || title.includes('outlook')) return 'email';
      if (title.includes('calendar')) return 'scheduling';
      if (title.includes('github') || title.includes('gitlab')) return 'version-control';
      if (title.includes('stackoverflow')) return 'research-coding';
      return 'browsing';
    }

    // Communication
    if (app.includes('slack') || app.includes('teams') || 
        app.includes('discord')) return 'communication';

    return 'general';
  }

  async generateSuggestions(context) {
    const suggestions = [];

    switch (context.type) {
      case 'coding-javascript':
        suggestions.push({
          id: 'js-console-log',
          priority: 'medium',
          text: 'Need to debug? I can help add console.log statements or suggest debugging tools.',
          action: 'debug-assist',
          confidence: 0.7
        });
        suggestions.push({
          id: 'js-best-practices',
          priority: 'low',
          text: 'Want me to review your code for common JavaScript patterns?',
          action: 'code-review',
          confidence: 0.6
        });
        break;

      case 'spreadsheet':
        suggestions.push({
          id: 'excel-formula',
          priority: 'high',
          text: 'Working with data? I can suggest formulas, create charts, or help with pivot tables.',
          action: 'spreadsheet-assist',
          confidence: 0.8
        });
        break;

      case 'writing-document':
        suggestions.push({
          id: 'doc-grammar',
          priority: 'medium',
          text: 'I can help with grammar, formatting, or suggest document structure improvements.',
          action: 'writing-assist',
          confidence: 0.75
        });
        break;

      case 'email':
        suggestions.push({
          id: 'email-draft',
          priority: 'medium',
          text: 'Need help drafting a professional email or scheduling a follow-up?',
          action: 'email-assist',
          confidence: 0.7
        });
        break;

      case 'research-coding':
        suggestions.push({
          id: 'research-summarize',
          priority: 'low',
          text: 'I can summarize Stack Overflow answers or save code snippets for later.',
          action: 'research-assist',
          confidence: 0.65
        });
        break;

      default:
        suggestions.push({
          id: 'general-help',
          priority: 'low',
          text: 'I\'m here if you need anything! Just click to chat.',
          action: 'general',
          confidence: 0.5
        });
    }

    return suggestions;
  }

  getHighConfidenceSuggestion() {
    if (!this.currentContext || !this.currentContext.suggestions) return null;
    
    const highConfidence = this.currentContext.suggestions.find(
      s => s.confidence >= 0.75 && s.priority === 'high'
    );
    
    return highConfidence;
  }

  getCurrentContext() {
    return this.currentContext;
  }
}

module.exports = new ContextAnalyzer();

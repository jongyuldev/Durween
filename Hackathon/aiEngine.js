// AI Engine for intelligent responses with Gemini 2.0 Flash
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIEngine {
  constructor() {
    this.apiKey = null;
    this.genAI = null;
    this.model = null;
    this.conversationHistory = [];
    this.chat = null;
  }

  setApiKey(key) {
    this.apiKey = key;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
      // Use Gemini 2.5 Flash
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      this.initializeChat();
    }
  }

  initializeChat() {
    const personality = require('./config').get('personality');
    const systemPrompt = this.getSystemPrompt(personality);
    
    this.chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        },
        {
          role: 'model',
          parts: [{ text: 'Understood! I\'m Clippy 2.0, your helpful AI assistant. I\'ll adapt my responses based on your preferences and the context of what you\'re working on. How can I help you today?' }]
        }
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });
  }

  getSystemPrompt(personality) {
    const basePrompt = `You are Clippy 2.0, a modern reimagining of Microsoft's classic Office Assistant. You're helpful, friendly, and context-aware. 

Key traits:
- You understand what users are working on and provide relevant assistance
- You can be proactive but never annoying
- You have a touch of the original Clippy's charm and occasional humor
- You're knowledgeable about productivity, coding, writing, and general computer tasks
- You keep responses concise but informative

SPECIAL CAPABILITIES:
When users ask you to open a folder or navigate to a location, respond with ONLY this format:
[OPEN_FOLDER:path]

Examples:
- "open downloads" → [OPEN_FOLDER:downloads]
- "show me my documents" → [OPEN_FOLDER:documents]
- "open C:\\Users\\John\\Projects" → [OPEN_FOLDER:C:\\Users\\John\\Projects]

Supported shortcuts: downloads, documents, desktop, pictures
You can also use full Windows paths like C:\\, D:\\, etc.`;

    const personalityAddons = {
      formal: '\n- Use professional, formal language. Avoid emojis and casual expressions.',
      friendly: '\n- Be warm and conversational. Use emojis occasionally to add personality.',
      concise: '\n- Keep responses brief and to the point. One or two sentences maximum.',
      verbose: '\n- Provide detailed explanations with examples and context.'
    };

    return basePrompt + (personalityAddons[personality] || personalityAddons.friendly);
  }

  async generateResponse(userInput, context = null, image = null, file = null) {
    const config = require('./config');
    
    // Check if API key is configured
    if (!this.apiKey) {
      const apiKey = config.get('geminiApiKey');
      if (apiKey) {
        this.setApiKey(apiKey);
      } else {
        return this.getFallbackResponse(userInput, context);
      }
    }

    try {
      // Add context to the prompt if available
      let enhancedPrompt = userInput;
      if (context && context.type !== 'general') {
        enhancedPrompt = `[Context: User is currently working on ${context.type.replace('-', ' ')}]\n\n${userInput}`;
      }
      
      // Add file content to prompt if available
      if (file) {
        enhancedPrompt += `\n\n[File: ${file.name}]\n${file.content}`;
      }

      let result;
      
      // Handle image input - use generateContent instead of chat for images
      if (image) {
        const imagePart = {
          inlineData: {
            data: image.data.split(',')[1], // Remove data:image/xxx;base64, prefix
            mimeType: image.mimeType
          }
        };
        
        // Use model.generateContent for image analysis
        result = await this.model.generateContent([enhancedPrompt, imagePart]);
      } else {
        // Use chat for text-only
        if (!this.chat) {
          this.initializeChat();
        }
        result = await this.chat.sendMessage(enhancedPrompt);
      }
      
      const response = result.response.text();
      
      if (!response || response.trim() === '') {
        return 'Sorry, I received an empty response. Please try again.';
      }
      
      this.conversationHistory.push({
        user: userInput,
        assistant: response,
        context: context?.type,
        hasImage: !!image,
        hasFile: !!file,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Gemini API error:', error.message);
      console.error('Full error:', error);
      
      // Check if it's a rate limit error
      if (error.status === 429) {
        return '⏱️ Oops! I\'m getting too many requests right now. Please wait a moment and try again. In the meantime, I can still help with basic responses!';
      }
      
      // For other errors, use fallback
      return this.getFallbackResponse(userInput, context);
    }
  }

  getFallbackResponse(userInput, context) {
    const personality = require('./config').get('personality');
    const response = this.getEnhancedResponse(userInput, context, personality);
    
    this.conversationHistory.push({
      user: userInput,
      assistant: response,
      context: context,
      timestamp: Date.now()
    });

    return response;
  }

  getEnhancedResponse(input, context, personality) {
    const lowerInput = input.toLowerCase();
    
    // Folder open intent
    if (this.detectFolderOpenIntent(input)) {
      const folderPath = this.extractFolderPath(input);
      if (folderPath) {
        return `[OPEN_FOLDER:${folderPath}]`;
      }
    }
    
    // Context-aware responses
    if (context) {
      if (context.type === 'coding-javascript' && lowerInput.includes('help')) {
        return this.formatByPersonality(
          'I see you\'re working with JavaScript. I can help with debugging, suggest best practices, or explain concepts. What specifically do you need?',
          personality
        );
      }
      if (context.type === 'spreadsheet' && lowerInput.includes('formula')) {
        return this.formatByPersonality(
          'For spreadsheet formulas, I can help with SUM, VLOOKUP, IF statements, or more complex calculations. What are you trying to calculate?',
          personality
        );
      }
    }

    // Task extraction
    if (this.detectTaskIntent(lowerInput)) {
      const task = this.extractTask(input);
      return this.formatByPersonality(
        `I noticed you mentioned: "${task.description}". Would you like me to create a reminder for ${task.deadline || 'later'}?`,
        personality
      );
    }

    // Standard responses with personality
    if (lowerInput.match(/hello|hi|hey/)) {
      return this.formatByPersonality('Hello! How can I assist you today?', personality);
    }

    return this.formatByPersonality(
      'I\'m here to help! Could you provide more details about what you need?',
      personality
    );
  }

  formatByPersonality(text, personality) {
    switch (personality) {
      case 'formal':
        return text.replace(/!|😊|👋/g, '.').replace(/I\'m/g, 'I am');
      case 'concise':
        return text.split('.')[0] + '.';
      case 'verbose':
        return text + ' Feel free to ask follow-up questions or request clarification on any point.';
      case 'friendly':
      default:
        return text;
    }
  }

  detectTaskIntent(input) {
    const taskKeywords = ['need to', 'have to', 'must', 'should', 'remind me', 'by monday', 'by friday', 'tomorrow', 'next week'];
    return taskKeywords.some(keyword => input.includes(keyword));
  }

  detectFolderOpenIntent(input) {
    const lowerInput = input.toLowerCase();
    const openKeywords = ['open', 'show', 'navigate to', 'go to', 'browse'];
    const folderKeywords = ['folder', 'directory', 'downloads', 'documents', 'desktop', 'pictures'];
    
    return openKeywords.some(k => lowerInput.includes(k)) && 
           (folderKeywords.some(k => lowerInput.includes(k)) || lowerInput.includes(':\\'));
  }

  extractFolderPath(input) {
    const lowerInput = input.toLowerCase();
    
    // Check for common folder names
    if (lowerInput.includes('downloads')) return 'downloads';
    if (lowerInput.includes('documents')) return 'documents';
    if (lowerInput.includes('desktop')) return 'desktop';
    if (lowerInput.includes('pictures')) return 'pictures';
    
    // Check for explicit paths (C:\, D:\, etc.)
    const pathMatch = input.match(/[A-Za-z]:\\[^\s"]+/);
    if (pathMatch) return pathMatch[0];
    
    // Check for quoted paths
    const quotedMatch = input.match(/"([^"]+)"/);
    if (quotedMatch) return quotedMatch[1];
    
    return null;
  }

  extractTask(input) {
    // Simple task extraction - in production, use NLP
    const deadlineMatch = input.match(/by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|next week)/i);
    const deadline = deadlineMatch ? deadlineMatch[1] : null;
    
    return {
      description: input,
      deadline: deadline,
      priority: 'medium'
    };
  }

  clearHistory() {
    this.conversationHistory = [];
    if (this.chat) {
      this.initializeChat(); // Restart chat with fresh history
    }
  }

  getHistory() {
    return this.conversationHistory;
  }

  resetPersonality() {
    if (this.apiKey) {
      this.initializeChat(); // Reinitialize with new personality
    }
  }
}

module.exports = new AIEngine();

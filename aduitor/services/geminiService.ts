import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { AIModelMode, ImageGenConfig, Task, ServiceResponse, StreakState, StreakSettings } from "../types";

// Ensure API Key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Tool Definition for Adding Tasks
const addTaskTool: FunctionDeclaration = {
  name: "addTask",
  description: "Add a new task to the user's todo list. Use this when the user explicitly asks to add a task or remind them of something.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The content of the task."
      },
      category: {
        type: Type.STRING,
        description: "The category of the task. Infer this from the content.",
        enum: ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Learning', 'Other']
      },
      dueDate: {
        type: Type.STRING,
        description: "The due date of the task in YYYY-MM-DD format. If the user says 'tomorrow' or 'next monday', calculate the date based on the current date.",
      },
      reminderTime: {
        type: Type.STRING,
        description: "The specific reminder time in ISO 8601 format (YYYY-MM-DDTHH:mm). If the user says 'remind me at 5pm', calculate the full datetime string."
      },
      priority: {
        type: Type.STRING,
        description: "The priority of the task. 'high' for urgent/important/ASAP, 'medium' for standard, 'low' for minor. Default is 'medium'.",
        enum: ["low", "medium", "high"]
      },
      status: {
        type: Type.STRING,
        description: "The initial status of the task. Default is 'todo'.",
        enum: ["todo", "in-progress", "blocked", "done"]
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of tags or categories associated with the task (e.g., 'urgent', 'groceries', 'project-x'). Extract these from context if possible."
      }
    },
    required: ["title"]
  }
};

// 1. General Chat (Standard or Thinking)
export const generateChatResponse = async (
  prompt: string,
  mode: AIModelMode,
  contextFiles?: { data: string; mimeType: string }[]
): Promise<ServiceResponse> => {
  let model = 'gemini-2.5-flash';

  // Inject Current Date and Time for relative date calculations
  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  let config: any = {
    systemInstruction: `You are Aduitor, a helpful, witty, and slightly retro desktop assistant. You love helping with tasks. Today is ${currentDate} and the time is ${currentTime}. Keep answers concise unless asked for detail.`,
  };

  const tools: any[] = [];

  if (mode === AIModelMode.Fast) {
    model = 'gemini-2.5-flash';
  } else if (mode === AIModelMode.Thinking) {
    model = 'gemini-2.5-flash';
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else if (mode === AIModelMode.Analysis) {
    model = 'gemini-2.5-flash';
  }

  // Enable Task Tool for Chat and Fast modes (and Analysis)
  if (mode === AIModelMode.Chat || mode === AIModelMode.Fast || mode === AIModelMode.Analysis) {
    tools.push({ functionDeclarations: [addTaskTool] });
  }

  if (tools.length > 0) {
    config.tools = tools;
  }

  // Add files if present (Vision/Video Analysis)
  const parts: any[] = [];
  if (contextFiles) {
    contextFiles.forEach(file => {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType
        }
      });
    });
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    // Extract Tool Calls
    const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => ({
      id: 'call_' + Math.random().toString(36).substr(2, 9), // Simple ID generation
      name: p.functionCall!.name,
      args: p.functionCall!.args
    })) || [];

    // Extract Text (Gemini might return text AND function call, or just function call)
    let text = response.text || "";

    // If only function call and no text, provide a default confirmation text if needed, 
    // but usually we rely on the client to handle the UI feedback for the action.
    // However, for chat flow, having some text is nice.
    if (!text && toolCalls.length > 0) {
      text = ""; // We'll let the UI synthesize a message or just show the action
    }

    return {
      text: text,
      grounding: null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };

  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

// 2. Grounded Chat (Search or Maps)
export const generateGroundedResponse = async (
  prompt: string,
  mode: AIModelMode.Search | AIModelMode.Maps,
  location?: { lat: number; lng: number }
): Promise<ServiceResponse> => {
  const model = 'gemini-2.5-flash'; // 2.5 Flash required for grounding tools per instructions
  const tools: any[] = [];
  const toolConfig: any = {};

  if (mode === AIModelMode.Search) {
    tools.push({ googleSearch: {} });
  } else if (mode === AIModelMode.Maps) {
    tools.push({ googleMaps: {} });
    if (location) {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude: location.lat,
          longitude: location.lng,
        }
      };
    }
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools,
        toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Map SDK chunks to local type to fix type mismatch.
    // The SDK types allow undefined for uri/title, but our local type requires strings.
    const mappedChunks = groundingChunks.map((chunk: any) => ({
      web: chunk.web ? { uri: chunk.web.uri || '', title: chunk.web.title || '' } : undefined,
      maps: chunk.maps ? { uri: chunk.maps.googleMapsUri || chunk.maps.uri || '', title: chunk.maps.title || '' } : undefined,
    }));

    return {
      text: response.text || "I couldn't find anything.",
      grounding: mappedChunks
    };
  } catch (error) {
    console.error("Grounding Error:", error);
    throw error;
  }
};

// 3. Audio Transcription
export const transcribeAudio = async (base64Audio: string) => {
  const model = 'gemini-2.5-flash';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/wav', // Assuming WAV from browser recorder
              data: base64Audio
            }
          },
          { text: "Transcribe this audio exactly as spoken." }
        ]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};

// 4. Image Generation
export const generateImage = async (prompt: string, config: ImageGenConfig) => {
  const model = 'gemini-3-pro-image-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio || "1:1",
          imageSize: config.size || "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

// 5. Proactive Suggestions
export const generateProactiveSuggestion = async (
  tasks: Task[],
  streakState?: StreakState,
  streakSettings?: StreakSettings
) => {
  const model = 'gemini-2.5-flash';
  const completedCount = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD

  const overdueTasks = pendingTasks.filter(t => t.dueDate && t.dueDate < todayStr);
  const upcomingTasks = pendingTasks.filter(t => t.dueDate && t.dueDate >= todayStr);
  const noDateTasks = pendingTasks.filter(t => !t.dueDate);

  let streakContext = "";
  if (streakState && streakSettings) {
    const remaining = Math.max(0, streakSettings.target - streakState.currentPeriodProgress);
    if (remaining > 0 && remaining <= 2) {
      streakContext = `User is close to their ${streakSettings.period} goal! They need ${remaining} more task(s) to maintain their streak. Encourage them!`;
    } else if (remaining === 0) {
      streakContext = `User has hit their ${streakSettings.period} goal! Congratulate them on maintaining their streak.`;
    }
  }

  const prompt = `
    You are Aduitor, a witty and helpful desktop assistant.
    User Stats:
    - Completed Tasks: ${completedCount}
    - Overdue Tasks: ${overdueTasks.map(t => `${t.title} (Due: ${t.dueDate})`).join(', ')}
    - Upcoming Tasks: ${upcomingTasks.map(t => `${t.title} (Due: ${t.dueDate})`).join(', ')}
    - Other Pending Tasks: ${noDateTasks.map(t => t.title).join(', ')}
    ${streakContext ? `- Streak Info: ${streakContext}` : ''}
    
    Guidance:
    1. If there are overdue tasks, you MUST prioritize suggesting the user tackle one of them.
    2. If the user is close to their streak goal, encourage them to finish it.
    3. If the user has completed many tasks recently, suggest a break to prevent burnout.
    4. Otherwise, pick a random pending task to nudge, or suggest adding a new one.
    
    Keep the suggestion strictly under 15 words. Be charming and retro.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
    });
    return response.text;
  } catch (error) {
    console.error("Proactive Gen Error:", error);
    return null;
  }
};

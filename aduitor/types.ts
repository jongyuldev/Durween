import { type Type } from "@google/genai";

export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  Audio = 'audio',
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string };
}

export interface ToolCall {
    id: string;
    name: string;
    args: any;
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  type: MessageType;
  imageUrl?: string;
  audioData?: string;
  grounding?: GroundingChunk[];
  isThinking?: boolean;
}

export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';

export type TaskCategory = 'Work' | 'Personal' | 'Shopping' | 'Health' | 'Finance' | 'Learning' | 'Other';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  category?: TaskCategory;
  createdAt: number;
  dueDate?: string; // ISO Date string YYYY-MM-DD
  reminderTime?: string; // ISO Date string YYYY-MM-DDTHH:mm
  reminded?: boolean;
  tags?: string[];
}

export enum AduitorState {
  Idle = 'idle',
  Thinking = 'thinking',
  Writing = 'writing',
  Surprised = 'surprised',
  Listening = 'listening',
}

export enum AIModelMode {
  Chat = 'chat', // Gemini 3 Pro (Complex)
  Fast = 'fast', // Gemini 2.5 Flash Lite
  Search = 'search', // Gemini 2.5 Flash + Search
  Maps = 'maps', // Gemini 2.5 Flash + Maps
  ImageGen = 'image_gen', // Gemini 3 Pro Image
  Analysis = 'analysis', // Gemini 3 Pro Vision
  Thinking = 'thinking', // Gemini 3 Pro + Thinking Config
}

export interface ImageGenConfig {
  size: '1K' | '2K' | '4K';
  aspectRatio: '1:1' | '16:9' | '3:4';
}

export interface ServiceResponse {
    text: string;
    grounding?: GroundingChunk[] | null;
    toolCalls?: ToolCall[];
}

export interface StreakSettings {
  target: number;
  period: 'daily' | 'weekly';
}

export interface StreakState {
  count: number;
  lastSatisfiedPeriod: string | null; // Key of the last period the goal was met (e.g. "2023-10-27" or "2023-W43")
  currentPeriodProgress: number; // Tasks completed in the current period
  currentPeriodKey: string; // The identifier for the current period (to detect changes)
}
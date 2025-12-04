import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, Image as ImageIcon, MapPin, Globe, Zap, Brain, X, Plus, Check, Loader2, Video as VideoIcon, BarChart2, Calendar, ArrowUpDown, Edit2, Bell, AlarmClock, Moon, Sun, Tag, Trash2, AlertTriangle, Flame, Clock, Ban, Settings, Briefcase, User, ShoppingCart, Heart, DollarSign, BookOpen, Layers, Filter, Pause, Play, Square, GripHorizontal } from 'lucide-react';
import GhostCharacter from './components/GhostCharacter';
import StatsBoard from './components/StatsBoard';
import { AduitorState, Message, MessageType, Sender, AIModelMode, Task, ImageGenConfig, TaskStatus, StreakSettings, StreakState, TaskCategory } from './types';
import { generateChatResponse, generateGroundedResponse, transcribeAudio, generateImage, generateProactiveSuggestion } from './services/geminiService';
import * as d3 from 'd3';

// Particle Component for Task Completion
const ParticleExplosion = () => {
    const particles = Array.from({ length: 12 });
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            {particles.map((_, i) => {
                const angle = (i / particles.length) * 360;
                const velocity = 20 + Math.random() * 30; // Distance
                const tx = Math.cos((angle * Math.PI) / 180) * velocity;
                const ty = Math.sin((angle * Math.PI) / 180) * velocity;
                const color = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)];

                return (
                    <div
                        key={i}
                        className="particle"
                        style={{
                            '--tx': `${tx}px`,
                            '--ty': `${ty}px`,
                            backgroundColor: color,
                            animationDelay: `${Math.random() * 0.1}s`
                        } as React.CSSProperties}
                    />
                );
            })}
        </div>
    );
};

// --- Date Helpers for Streak ---
const getDailyKey = (date: Date = new Date()) => {
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
};

const getWeeklyKey = (date: Date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const year = d.getUTCFullYear();
    const weekNo = Math.ceil((((d.getTime() - new Date(Date.UTC(year, 0, 1)).getTime()) / 86400000) + 1) / 7);
    return `${year}-W${weekNo}`;
};

// --- Category Config ---
const CATEGORY_CONFIG: Record<TaskCategory, { icon: React.ReactNode, color: string }> = {
    Work: { icon: <Briefcase size={10} />, color: 'text-blue-500' },
    Personal: { icon: <User size={10} />, color: 'text-purple-500' },
    Shopping: { icon: <ShoppingCart size={10} />, color: 'text-green-500' },
    Health: { icon: <Heart size={10} />, color: 'text-red-500' },
    Finance: { icon: <DollarSign size={10} />, color: 'text-yellow-600' },
    Learning: { icon: <BookOpen size={10} />, color: 'text-indigo-500' },
    Other: { icon: <Layers size={10} />, color: 'text-gray-500' },
};

export default function App() {
    // State
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: "Hi! I'm Aduitor. I'm here to help. You can drag me around!",
            sender: Sender.Bot,
            timestamp: Date.now(),
            type: MessageType.Text
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [aduitorState, setAduitorState] = useState<AduitorState>(AduitorState.Idle);
    const [isOpen, setIsOpen] = useState(true);
    const [selectedMode, setSelectedMode] = useState<AIModelMode>(AIModelMode.Chat);
    const [attachedFile, setAttachedFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [sortBy, setSortBy] = useState<'created' | 'due' | 'priority'>('created');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<TaskCategory | 'All'>('All');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Dragging State
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Initialized in useEffect
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const isDragGesture = useRef(false);

    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [audioVisuals, setAudioVisuals] = useState<number[]>(new Array(10).fill(5)); // Visualizer data

    // Refs for Audio
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isCancelledRef = useRef(false);

    // Streak State & Settings
    const [streakSettings, setStreakSettings] = useState<StreakSettings>(() => {
        try {
            const saved = localStorage.getItem('aduitor_streak_settings');
            return saved ? JSON.parse(saved) : { target: 1, period: 'daily' };
        } catch { return { target: 1, period: 'daily' }; }
    });

    const [streak, setStreak] = useState<StreakState>(() => {
        try {
            const saved = localStorage.getItem('aduitor_streak_v2');
            if (saved) return JSON.parse(saved);

            // Migration for old streak format
            const old = localStorage.getItem('aduitor_streak');
            if (old) {
                const parsedOld = JSON.parse(old);
                return {
                    count: parsedOld.count || 0,
                    lastSatisfiedPeriod: parsedOld.lastDate,
                    currentPeriodProgress: 0,
                    currentPeriodKey: getDailyKey()
                };
            }
            return { count: 0, lastSatisfiedPeriod: null, currentPeriodProgress: 0, currentPeriodKey: getDailyKey() };
        } catch {
            return { count: 0, lastSatisfiedPeriod: null, currentPeriodProgress: 0, currentPeriodKey: getDailyKey() };
        }
    });

    const [showStreakSettings, setShowStreakSettings] = useState(false);

    // Animation State
    const [bursts, setBursts] = useState<Set<string>>(new Set());

    // Notification State
    const [activeNotifications, setActiveNotifications] = useState<Task[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Image Gen Settings
    const [imgConfig, setImgConfig] = useState<ImageGenConfig>({ size: '1K', aspectRatio: '1:1' });
    const [showImgSettings, setShowImgSettings] = useState(false);

    // Manual Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [creationValues, setCreationValues] = useState<{
        title: string,
        dueDate: string,
        priority: 'low' | 'medium' | 'high',
        category: TaskCategory
    }>({
        title: '', dueDate: '', priority: 'medium', category: 'Other'
    });

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{
        title: string,
        dueDate: string,
        reminderTime: string,
        priority: 'low' | 'medium' | 'high',
        status: TaskStatus,
        tags: string,
        category: TaskCategory
    }>({
        title: '', dueDate: '', reminderTime: '', priority: 'medium', status: 'todo', tags: '', category: 'Other'
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const modeSelectorRef = useRef<HTMLDivElement>(null);
    const lastProactiveTime = useRef<number>(Date.now());
    const prevCompletedCount = useRef(0);

    // Drag scroll state for mode selector
    const [isScrollDragging, setIsScrollDragging] = useState(false);
    const scrollStartX = useRef(0);
    const scrollLeft = useRef(0);

    // Initialize Position - not needed for Electron window movement
    // The window position is managed by Electron

    // Drag Logic - moves the Electron window itself
    const lastMousePos = useRef({ x: 0, y: 0 });
    const accumulatedDelta = useRef({ x: 0, y: 0 });
    const rafId = useRef<number | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Allow drag only on left click
        if (e.button !== 0) return;

        // Don't drag if interacting with inputs or buttons within the draggable area
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) {
            return;
        }

        setIsDragging(true);
        isDragGesture.current = false;
        lastMousePos.current = { x: e.screenX, y: e.screenY };
        accumulatedDelta.current = { x: 0, y: 0 };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                isDragGesture.current = true;

                // Accumulate delta
                const deltaX = e.screenX - lastMousePos.current.x;
                const deltaY = e.screenY - lastMousePos.current.y;
                lastMousePos.current = { x: e.screenX, y: e.screenY };

                accumulatedDelta.current.x += deltaX;
                accumulatedDelta.current.y += deltaY;

                // Use requestAnimationFrame to throttle IPC calls
                if (!rafId.current) {
                    rafId.current = requestAnimationFrame(() => {
                        if (typeof window !== 'undefined' && (window as any).require) {
                            const { ipcRenderer } = (window as any).require('electron');
                            // Send accumulated delta
                            if (accumulatedDelta.current.x !== 0 || accumulatedDelta.current.y !== 0) {
                                ipcRenderer.send('move-window', {
                                    deltaX: accumulatedDelta.current.x,
                                    deltaY: accumulatedDelta.current.y
                                });
                                // Reset accumulated delta
                                accumulatedDelta.current = { x: 0, y: 0 };
                            }
                        }
                        rafId.current = null;
                    });
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
    }, [isDragging]);

    // Drag scroll handlers for mode selector
    const handleScrollMouseDown = (e: React.MouseEvent) => {
        if (!modeSelectorRef.current) return;
        setIsScrollDragging(true);
        scrollStartX.current = e.pageX - modeSelectorRef.current.offsetLeft;
        scrollLeft.current = modeSelectorRef.current.scrollLeft;
    };

    const handleScrollMouseMove = (e: React.MouseEvent) => {
        if (!isScrollDragging || !modeSelectorRef.current) return;
        e.preventDefault();
        const x = e.pageX - modeSelectorRef.current.offsetLeft;
        const walk = (x - scrollStartX.current) * 1.5; // Scroll speed multiplier
        modeSelectorRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const handleScrollMouseUp = () => {
        setIsScrollDragging(false);
    };

    const handleScrollMouseLeave = () => {
        setIsScrollDragging(false);
    };

    // Auto-scroll chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Persist Streak Logic
    useEffect(() => {
        localStorage.setItem('aduitor_streak_v2', JSON.stringify(streak));
    }, [streak]);

    useEffect(() => {
        localStorage.setItem('aduitor_streak_settings', JSON.stringify(streakSettings));
    }, [streakSettings]);

    // Proactive Logic
    useEffect(() => {
        const checkProactive = async () => {
            // Don't interrupt if already busy
            if (aduitorState !== AduitorState.Idle) return;

            const completedCount = tasks.filter(t => t.completed).length;
            const justCompletedTask = completedCount > prevCompletedCount.current;
            prevCompletedCount.current = completedCount;

            const timeSince = Date.now() - lastProactiveTime.current;

            // Logic: Trigger if user just completed a task AND it's been at least 30s since last help
            // OR trigger purely on timer if it's been 5 minutes
            const shouldTrigger = (justCompletedTask && timeSince > 30000) || (timeSince > 300000 && tasks.length > 0);

            if (shouldTrigger) {
                const suggestion = await generateProactiveSuggestion(tasks, streak, streakSettings);
                if (suggestion) {
                    setAduitorState(AduitorState.Writing);
                    setTimeout(() => {
                        addMessage(suggestion, Sender.Bot);
                        setAduitorState(AduitorState.Idle);
                        if (!isOpen) {
                            setAduitorState(AduitorState.Surprised);
                            setTimeout(() => setAduitorState(AduitorState.Idle), 2000);
                        }
                    }, 1000);
                    lastProactiveTime.current = Date.now();
                }
            }
        };

        const timer = setInterval(checkProactive, 5000); // Check every 5s for the condition
        return () => clearInterval(timer);
    }, [tasks, aduitorState, isOpen, streak, streakSettings]);

    // Reminder Checker Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setTasks(prevTasks => {
                const now = new Date();
                const firedTasks: Task[] = [];
                let updated = false;

                const newTasks = prevTasks.map(t => {
                    if (t.reminderTime && !t.reminded) {
                        const remTime = new Date(t.reminderTime);
                        if (remTime <= now) {
                            firedTasks.push(t);
                            updated = true;
                            return { ...t, reminded: true };
                        }
                    }
                    return t;
                });

                if (firedTasks.length > 0) {
                    setTimeout(() => {
                        setActiveNotifications(prev => {
                            // Prevent duplicates if interval fires rapidly
                            const existingIds = new Set(prev.map(p => p.id));
                            const uniqueNew = firedTasks.filter(f => !existingIds.has(f.id));
                            return [...prev, ...uniqueNew];
                        });
                    }, 0);
                }

                return updated ? newTasks : prevTasks;
            });
        }, 5000); // Check every 5s
        return () => clearInterval(interval);
    }, []);

    // --- Audio Recording Logic ---

    const startVisualizer = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const update = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // Sample a few frequencies for the 10 bars
            const visuals: number[] = [];
            const step = Math.floor(dataArray.length / 10);
            for (let i = 0; i < 10; i++) {
                // Normalize 0-255 to roughly 5-100 for height percent
                const val = dataArray[i * step];
                visuals.push(Math.max(10, (val / 255) * 100));
            }
            setAudioVisuals(visuals);
            rafIdRef.current = requestAnimationFrame(update);
        };
        update();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Setup Audio Context for Visualizer
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Low res for retro bars
            analyserRef.current = analyser;
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            startVisualizer();

            // Setup Media Recorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            isCancelledRef.current = false;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                // Cleanup Audio Context
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }
                if (rafIdRef.current) {
                    cancelAnimationFrame(rafIdRef.current);
                    rafIdRef.current = null;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                setIsRecording(false);
                setIsPaused(false);
                setAudioVisuals(new Array(10).fill(5)); // Reset visuals

                if (isCancelledRef.current) {
                    setAduitorState(AduitorState.Idle);
                    audioChunksRef.current = [];
                    return;
                }

                // Enter Transcribing State
                setIsTranscribing(true);
                setAduitorState(AduitorState.Thinking);

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    try {
                        const transcription = await transcribeAudio(base64Audio);
                        setInputText(prev => (prev ? prev + " " : "") + transcription);
                    } catch (e) {
                        console.error(e);
                        addMessage("Sorry, I couldn't hear that clearly.", Sender.Bot);
                    } finally {
                        setAduitorState(AduitorState.Idle);
                        setIsTranscribing(false);
                    }
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);
            setAduitorState(AduitorState.Listening);

        } catch (err) {
            console.error("Mic Error:", err);
            alert("Microphone access denied or error.");
            setIsRecording(false);
            setAduitorState(AduitorState.Idle);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const cancelRecording = () => {
        isCancelledRef.current = true;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        } else {
            setIsRecording(false); // Fallback
        }
    };

    const togglePause = () => {
        if (!mediaRecorderRef.current) return;

        if (isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            startVisualizer();
        } else {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (audioContextRef.current?.state === 'running') {
                audioContextRef.current.suspend();
            }
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
        }
    };


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setAttachedFile({
                    data: base64String,
                    mimeType: file.type,
                    name: file.name
                });

                // Auto-switch mode if video
                if (file.type.startsWith('video/')) {
                    setSelectedMode(AIModelMode.Analysis);
                } else if (file.type.startsWith('image/') && selectedMode !== AIModelMode.Analysis) {
                    // Assume analysis if uploading image in default mode
                    setSelectedMode(AIModelMode.Analysis);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const addMessage = (text: string, sender: Sender, type: MessageType = MessageType.Text, extra?: Partial<Message>) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            sender,
            timestamp: Date.now(),
            type,
            ...extra
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !attachedFile)) return;

        const userText = inputText;
        const currentFile = attachedFile;

        // Clear input
        setInputText('');
        setAttachedFile(null);
        setShowImgSettings(false);

        // Add User Message
        addMessage(userText || (currentFile ? `[Sent ${currentFile.name}]` : ''), Sender.User);

        setAduitorState(selectedMode === AIModelMode.ImageGen ? AduitorState.Writing : AduitorState.Thinking);

        try {
            let responseText = "";
            let groundingData = undefined;
            let generatedImageUrl = undefined;
            let toolCalls = undefined;

            // Routing Logic
            switch (selectedMode) {
                case AIModelMode.Fast:
                case AIModelMode.Chat:
                case AIModelMode.Thinking:
                case AIModelMode.Analysis:
                    // Video or Image analysis falls here if mode is selected
                    const contextFiles = currentFile ? [currentFile] : undefined;
                    const result = await generateChatResponse(userText, selectedMode, contextFiles);
                    responseText = result.text;
                    toolCalls = result.toolCalls;
                    break;

                case AIModelMode.Search:
                    const searchRes = await generateGroundedResponse(userText, AIModelMode.Search);
                    responseText = searchRes.text;
                    groundingData = searchRes.grounding;
                    break;

                case AIModelMode.Maps:
                    // Get location
                    let loc = { lat: 37.7749, lng: -122.4194 }; // Default SF
                    try {
                        await new Promise<void>((resolve) => {
                            navigator.geolocation.getCurrentPosition((pos) => {
                                loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                                resolve();
                            }, () => resolve()); // Fallback on error
                        });
                    } catch (e) { }

                    const mapsRes = await generateGroundedResponse(userText, AIModelMode.Maps, loc);
                    responseText = mapsRes.text;
                    groundingData = mapsRes.grounding;
                    break;

                case AIModelMode.ImageGen:
                    responseText = `Here is your ${imgConfig.size} image based on: "${userText}"`;
                    generatedImageUrl = await generateImage(userText, imgConfig);
                    break;
            }

            // Handle Tool Calls (e.g., adding task)
            if (toolCalls && toolCalls.length > 0) {
                for (const call of toolCalls) {
                    if (call.name === 'addTask') {
                        const title = call.args.title;
                        const dueDate = call.args.dueDate;
                        const reminderTime = call.args.reminderTime;
                        const priority = (call.args.priority as 'low' | 'medium' | 'high') || 'medium';
                        const status = (call.args.status as TaskStatus) || 'todo';
                        const tags = call.args.tags;
                        const category = (call.args.category as TaskCategory) || 'Other';
                        addTask(title, dueDate, reminderTime, priority, status, tags, category);
                        if (!responseText) {
                            responseText = `I've added "${title}" to your list${dueDate ? ` (Due: ${dueDate})` : ''}${reminderTime ? ` with a reminder` : ''}.`;
                        }
                    }
                }
            }

            // Fallback simple parsing if tool wasn't called but it sounds like a task (for models that might miss the tool call in some cases, or for non-tool modes)
            if (!toolCalls && (responseText.toLowerCase().includes("added to your list") || userText.toLowerCase().startsWith("add task"))) {
                if (userText.toLowerCase().startsWith("add task")) {
                    addTask(userText.replace(/add task|remind me to/i, '').trim());
                }
            }

            // Add Bot Message
            addMessage(responseText, Sender.Bot, generatedImageUrl ? MessageType.Image : MessageType.Text, {
                grounding: groundingData,
                imageUrl: generatedImageUrl
            });

        } catch (error) {
            console.error(error);
            setAduitorState(AduitorState.Surprised);
            addMessage("Whoops! My circuits got tangled. Try again?", Sender.Bot);
            setTimeout(() => setAduitorState(AduitorState.Idle), 2000);
            return;
        }

        setAduitorState(AduitorState.Idle);
    };

    // Task Management
    const addTask = (
        title: string,
        dueDate?: string,
        reminderTime?: string,
        priority: 'low' | 'medium' | 'high' = 'medium',
        status: TaskStatus = 'todo',
        tags: string[] = [],
        category: TaskCategory = 'Other'
    ) => {
        if (!title) return;
        const newTask: Task = {
            id: Date.now().toString(),
            title,
            completed: status === 'done',
            status: status,
            priority,
            createdAt: Date.now(),
            dueDate: dueDate,
            reminderTime: reminderTime,
            reminded: false,
            tags: tags,
            category: category
        };
        setTasks(prev => [...prev, newTask]);
    };

    const handleCreateTask = () => {
        if (!creationValues.title.trim()) return;
        addTask(
            creationValues.title,
            creationValues.dueDate || undefined,
            undefined, // no reminder for quick add
            creationValues.priority,
            'todo',
            [],
            creationValues.category
        );
        setCreationValues({ title: '', dueDate: '', priority: 'medium', category: 'Other' });
        setIsCreating(false);
    };

    const toggleTask = (id: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                const newCompleted = !t.completed;
                const newStatus: TaskStatus = newCompleted ? 'done' : 'todo';

                // --- Streak Logic Update ---
                setStreak(currentStreak => {
                    const now = new Date();
                    const currentPeriodKey = streakSettings.period === 'daily' ? getDailyKey(now) : getWeeklyKey(now);

                    let nextStreak = { ...currentStreak };

                    // 1. Check if we need to reset progress for a new period
                    if (nextStreak.currentPeriodKey !== currentPeriodKey) {
                        nextStreak.currentPeriodKey = currentPeriodKey;
                        nextStreak.currentPeriodProgress = 0;
                    }

                    // 2. Update progress based on check/uncheck
                    if (newCompleted) {
                        nextStreak.currentPeriodProgress += 1;
                    } else {
                        nextStreak.currentPeriodProgress = Math.max(0, nextStreak.currentPeriodProgress - 1);
                    }

                    // 3. Check if target met
                    const goalMet = nextStreak.currentPeriodProgress >= streakSettings.target;

                    if (goalMet) {
                        // Only increment streak count if we haven't already marked this period as satisfied
                        if (nextStreak.lastSatisfiedPeriod !== currentPeriodKey) {
                            // Check continuity
                            let isConsecutive = false;
                            if (streakSettings.period === 'daily') {
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                isConsecutive = nextStreak.lastSatisfiedPeriod === getDailyKey(yesterday);
                            } else {
                                // Simplified weekly consecutive check: 
                                // Parse Week number (YYYY-Www), subtract 1.
                                // For robustness, we'll just check if lastSatisfied was "recent enough". 
                                // Given scope, simple string compare isn't enough for roll-over years.
                                // We'll trust basic increment logic for now or reset if null.
                                // Logic: If there was a lastSatisfiedPeriod, we assume user is keeping up. 
                                // A strict consecutive check for weeks needs a helper.
                                isConsecutive = !!nextStreak.lastSatisfiedPeriod; // Simplification for demo
                            }

                            if (isConsecutive || !nextStreak.lastSatisfiedPeriod) {
                                nextStreak.count += 1;
                            } else {
                                nextStreak.count = 1; // Restart streak
                            }
                            nextStreak.lastSatisfiedPeriod = currentPeriodKey;
                        }
                    }
                    // Note: We don't decrement streak count if user unchecks a task that satisfied the goal.
                    // Once a streak day is locked in, it stays for simplicity, unless we want strict rollback.

                    return nextStreak;
                });

                if (newCompleted) {
                    // Trigger Burst
                    setBursts(prev => {
                        const next = new Set(prev);
                        next.add(id);
                        return next;
                    });
                    setTimeout(() => {
                        setBursts(prev => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                    }, 800);
                }
                return { ...t, completed: newCompleted, status: newStatus };
            }
            return t;
        }));
    };

    const deleteTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const clearCompletedTasks = () => {
        setTasks(prev => prev.filter(t => !t.completed));
        setShowClearConfirm(false);
    };

    const cyclePriority = (id: string) => {
        const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                const idx = levels.indexOf(t.priority);
                const next = levels[(idx + 1) % levels.length];
                return { ...t, priority: next };
            }
            return t;
        }));
    };

    const cycleStatus = (id: string) => {
        setTasks(prev => prev.map(t => {
            if (t.id === id) {
                const statusMap: Record<TaskStatus, TaskStatus> = {
                    'todo': 'in-progress',
                    'in-progress': 'blocked',
                    'blocked': 'todo',
                    'done': 'todo'
                };
                const next = statusMap[t.status] || 'todo';
                return { ...t, status: next, completed: next === 'done' };
            }
            return t;
        }));
    };

    // Editing logic
    const startEdit = (task: Task) => {
        setEditingId(task.id);
        setEditValues({
            title: task.title,
            dueDate: task.dueDate || '',
            reminderTime: task.reminderTime || '',
            priority: task.priority,
            status: task.status,
            tags: task.tags ? task.tags.join(', ') : '',
            category: task.category || 'Other'
        });
    };

    const saveEdit = () => {
        if (!editingId || !editValues.title.trim()) return;

        const newTags = editValues.tags.split(',').map(t => t.trim()).filter(Boolean);

        setTasks(prev => prev.map(t =>
            t.id === editingId
                ? {
                    ...t,
                    title: editValues.title,
                    dueDate: editValues.dueDate || undefined,
                    reminderTime: editValues.reminderTime || undefined,
                    reminded: editValues.reminderTime !== t.reminderTime ? false : t.reminded, // Reset reminded if time changed
                    priority: editValues.priority,
                    status: editValues.status,
                    completed: editValues.status === 'done',
                    tags: newTags,
                    category: editValues.category
                }
                : t
        ));
        setEditingId(null);
    };

    // --- Filtering & Sorting ---
    const uniqueTags = Array.from(new Set(tasks.flatMap(t => t.tags || []))).sort();

    const filteredTasks = tasks.filter(t => {
        if (filterCategory !== 'All' && (t.category || 'Other') !== filterCategory) return false;
        if (selectedTag && (!t.tags || !t.tags.includes(selectedTag))) return false;
        return true;
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortBy === 'due') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        }
        if (sortBy === 'priority') {
            const pMap = { high: 3, medium: 2, low: 1 };
            return pMap[b.priority] - pMap[a.priority];
        }
        return b.createdAt - a.createdAt; // Default: newest first
    });

    // --- Dynamic Styles for Dark/Light Mode ---
    const windowClass = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-[#ffffe0] border-[#f0e68c]';
    const chatAreaClass = isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800';
    const headerClass = isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-[#000080] text-white';
    const taskHeaderClass = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200';
    const inputAreaClass = isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300';
    const inputFieldClass = isDarkMode ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500';

    // Message Bubbles
    const userBubbleClass = isDarkMode ? 'bg-blue-900/50 border-blue-800 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900';
    const botBubbleClass = isDarkMode ? 'bg-slate-800 border-slate-700 text-gray-200' : 'bg-yellow-50 border-yellow-200 text-gray-800';
    const groundingChipClass = isDarkMode ? 'bg-slate-800 border-slate-600 text-blue-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-blue-600 hover:bg-gray-50';

    const getStatusColor = (status: TaskStatus) => {
        if (status === 'todo') return isDarkMode ? 'text-gray-400 bg-slate-700 border-slate-600' : 'text-gray-500 bg-gray-100 border-gray-200';
        if (status === 'in-progress') return isDarkMode ? 'text-blue-300 bg-blue-900/50 border-blue-800' : 'text-blue-600 bg-blue-50 border-blue-200';
        if (status === 'blocked') return isDarkMode ? 'text-amber-300 bg-amber-900/50 border-amber-800' : 'text-amber-600 bg-amber-50 border-amber-200';
        if (status === 'done') return isDarkMode ? 'text-green-300 bg-green-900/50 border-green-800' : 'text-green-600 bg-green-50 border-green-200';
        return '';
    };

    const getStatusIcon = (status: TaskStatus) => {
        switch (status) {
            case 'in-progress': return <Loader2 size={8} className="animate-spin" />;
            case 'blocked': return <Ban size={8} />;
            case 'done': return <Check size={8} />;
            default: return <Clock size={8} />;
        }
    };

    const isGoalMet = streak.currentPeriodProgress >= streakSettings.target;

    return (
        <div className="relative w-screen h-screen font-sans">

            {/* Background Decor (Taskbar placeholder) - Removed for Desktop App */}

            {/* Stats Board Overlay */}
            {showStats && <StatsBoard tasks={tasks} onClose={() => setShowStats(false)} isDarkMode={isDarkMode} />}

            {/* Streak Settings Modal */}
            {showStreakSettings && (
                <div className="absolute top-20 right-1/2 translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'} border rounded-lg shadow-xl p-4 w-64`}>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Streak Settings</h3>
                            <button onClick={() => setShowStreakSettings(false)} className="hover:text-red-500"><X size={14} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Goal Period</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStreakSettings({ ...streakSettings, period: 'daily' })}
                                        className={`flex-1 py-1 text-xs rounded border ${streakSettings.period === 'daily' ? 'bg-blue-500 text-white border-blue-600' : (isDarkMode ? 'bg-slate-700 border-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600')}`}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        onClick={() => setStreakSettings({ ...streakSettings, period: 'weekly' })}
                                        className={`flex-1 py-1 text-xs rounded border ${streakSettings.period === 'weekly' ? 'bg-blue-500 text-white border-blue-600' : (isDarkMode ? 'bg-slate-700 border-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600')}`}
                                    >
                                        Weekly
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Target Tasks ({streakSettings.period})</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={streakSettings.target}
                                    onChange={(e) => setStreakSettings({ ...streakSettings, target: parseInt(e.target.value) || 1 })}
                                    className={`w-full text-xs p-1.5 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {activeNotifications.length > 0 && (
                <div className="absolute top-4 right-4 z-50 animate-bounce-gentle">
                    <div className={`${isDarkMode ? 'bg-yellow-900/90 border-yellow-600 text-yellow-100' : 'bg-yellow-100 border-yellow-400 text-yellow-900'} border-2 rounded-lg shadow-xl p-4 w-72 flex flex-col gap-2`}>
                        <div className="flex items-center justify-between font-bold">
                            <div className="flex items-center gap-2">
                                <AlarmClock className="animate-pulse text-yellow-500" />
                                <span>{activeNotifications.length} Reminder{activeNotifications.length > 1 ? 's' : ''}!</span>
                            </div>
                            {activeNotifications.length > 1 && (
                                <button onClick={() => setActiveNotifications([])} className="text-xs underline hover:text-yellow-500/80">
                                    Dismiss All
                                </button>
                            )}
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {activeNotifications.map(n => (
                                <div key={n.id} className={`text-sm border-b pb-1 last:border-0 relative group flex justify-between items-start ${isDarkMode ? 'border-yellow-700' : 'border-yellow-200'}`}>
                                    <div>
                                        <p>{n.title}</p>
                                        <div className="text-[10px] opacity-75">{new Date(n.reminderTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <button
                                        onClick={() => setActiveNotifications(prev => prev.filter(p => p.id !== n.id))}
                                        className="text-yellow-600 hover:text-red-500 p-0.5"
                                        title="Dismiss"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                onClick={() => setActiveNotifications([])}
                                className={`text-xs px-2 py-1 rounded border flex-1 font-bold ${isDarkMode ? 'bg-yellow-800 border-yellow-700 hover:bg-yellow-700' : 'bg-yellow-200 border-yellow-300 hover:bg-yellow-300'}`}
                            >
                                Dismiss All
                            </button>
                            <button
                                onClick={() => setActiveNotifications([])}
                                className={`text-xs px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div
                className="flex flex-col items-center justify-end h-full w-full pb-16 gap-4"
            >

                {/* Chat/Task Window */}
                {isOpen && (
                    <div className={`pointer-events-auto w-96 border-2 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-bounce-gentle transition-colors duration-300 relative ${windowClass}`} style={{ boxShadow: '10px 10px 0px rgba(0,0,0,0.2)' }}>

                        {/* Header - Drag Handle */}
                        <div
                            className={`p-2 font-bold flex justify-between items-center select-none transition-colors duration-300 cursor-grab active:cursor-grabbing ${headerClass}`}
                            onMouseDown={handleMouseDown}
                        >
                            <span className="flex items-center gap-2 text-sm">
                                <Brain size={16} /> Aduitor Assistant
                            </span>
                            <div className="flex space-x-1 items-center" onMouseDown={(e) => e.stopPropagation()} style={{ cursor: 'default' }}>
                                {/* Streak Display - Clickable */}
                                <button
                                    onClick={() => setShowStreakSettings(!showStreakSettings)}
                                    className={`flex items-center gap-1 mr-2 px-2 py-0.5 rounded border transition-colors ${isDarkMode ? 'bg-orange-900/30 border-orange-800 text-orange-300 hover:bg-orange-900/50' : 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100'}`}
                                    title={`Goal: ${streakSettings.target} tasks ${streakSettings.period}`}
                                >
                                    <Flame size={12} className={`${streak.count > 0 ? 'fill-current' : ''} ${streak.count >= 3 ? 'animate-pulse' : ''}`} />
                                    <span className="text-xs font-bold">{streak.count}</span>
                                    {!isGoalMet && (
                                        <span className="text-[9px] opacity-70 ml-1 border-l pl-1 border-current">
                                            {streak.currentPeriodProgress}/{streakSettings.target}
                                        </span>
                                    )}
                                </button>

                                <button onClick={() => setIsDarkMode(!isDarkMode)} className="hover:bg-white/20 p-1 rounded" title="Toggle Dark Mode">
                                    {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                                </button>
                                <button onClick={() => setShowStats(!showStats)} className="hover:bg-white/20 p-1 rounded" title="Productivity Stats"><BarChart2 size={14} /></button>
                                <button onClick={() => setIsOpen(false)} className="hover:bg-red-500 p-1 rounded"><X size={14} /></button>
                            </div>
                        </div>

                        {/* Mode Selector - Drag to scroll */}
                        <div
                            ref={modeSelectorRef}
                            className={`p-2 border-b flex overflow-x-auto gap-2 transition-colors duration-300 select-none ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-300'} ${isScrollDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                            onMouseDown={handleScrollMouseDown}
                            onMouseMove={handleScrollMouseMove}
                            onMouseUp={handleScrollMouseUp}
                            onMouseLeave={handleScrollMouseLeave}
                        >
                            {[
                                { mode: AIModelMode.Chat, icon: <Brain size={14} />, label: 'Chat' },
                                { mode: AIModelMode.Fast, icon: <Zap size={14} />, label: 'Fast' },
                                { mode: AIModelMode.Thinking, icon: <Loader2 size={14} />, label: 'Think' },
                                { mode: AIModelMode.Search, icon: <Globe size={14} />, label: 'Web' },
                                { mode: AIModelMode.Maps, icon: <MapPin size={14} />, label: 'Maps' },
                                { mode: AIModelMode.ImageGen, icon: <ImageIcon size={14} />, label: 'Draw' },
                                { mode: AIModelMode.Analysis, icon: <VideoIcon size={14} />, label: 'Vision' },
                            ].map((m) => (
                                <button
                                    key={m.mode}
                                    onClick={() => {
                                        // Restrict modes that aren't supported by gemini-2.5-flash or are under development
                                        if (m.mode === AIModelMode.Thinking || m.mode === AIModelMode.ImageGen) {
                                            setMessages(prev => [...prev, {
                                                id: Date.now().toString(),
                                                text: `The '${m.label}' feature is currently under development and will be added in the future!`,
                                                sender: Sender.Bot,
                                                timestamp: Date.now(),
                                                type: MessageType.Text
                                            }]);
                                            return;
                                        }

                                        setSelectedMode(m.mode);
                                        if (m.mode === AIModelMode.ImageGen) setShowImgSettings(true);
                                        else setShowImgSettings(false);
                                    }}
                                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors border ${selectedMode === m.mode
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                                        : isDarkMode
                                            ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {m.icon} {m.label}
                                </button>
                            ))}
                        </div>

                        {/* Image Gen Settings Panel */}
                        {selectedMode === AIModelMode.ImageGen && showImgSettings && (
                            <div className={`p-2 text-xs flex gap-2 items-center border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
                                <span className={isDarkMode ? 'text-blue-400' : 'text-blue-800'}>Size:</span>
                                {(['1K', '2K', '4K'] as const).map(s => (
                                    <button key={s} onClick={() => setImgConfig({ ...imgConfig, size: s })} className={`px-2 py-0.5 rounded ${imgConfig.size === s ? 'bg-blue-500 text-white' : isDarkMode ? 'bg-slate-700 text-blue-300' : 'bg-white text-blue-800'}`}>{s}</button>
                                ))}
                            </div>
                        )}

                        {/* Chat Area */}
                        <div className={`flex-1 overflow-y-auto p-4 space-y-4 max-h-60 transition-colors duration-300 ${chatAreaClass}`}>
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === Sender.User ? 'items-end' : 'items-start'}`}>
                                    <div
                                        className={`max-w-[85%] p-3 rounded-lg text-sm shadow-sm border ${msg.sender === Sender.User
                                            ? userBubbleClass + ' rounded-br-none'
                                            : botBubbleClass + ' rounded-bl-none'
                                            }`}
                                    >
                                        {msg.type === MessageType.Image && msg.imageUrl && (
                                            <div className="mb-2">
                                                <img src={msg.imageUrl} alt="Generated" className="rounded border border-gray-300/50 w-full h-auto" />
                                            </div>
                                        )}

                                        <p className="whitespace-pre-wrap">{msg.text}</p>

                                        {/* Grounding Chips */}
                                        {msg.grounding && msg.grounding.length > 0 && (
                                            <div className={`mt-2 pt-2 border-t flex flex-wrap gap-1 ${isDarkMode ? 'border-slate-600' : 'border-gray-200/50'}`}>
                                                {msg.grounding.map((g, i) => (
                                                    g.web ? (
                                                        <a key={i} href={g.web.uri} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded truncate max-w-full ${groundingChipClass}`}>
                                                            <Globe size={10} /> {g.web.title}
                                                        </a>
                                                    ) : g.maps ? (
                                                        <a key={i} href={g.maps.uri} target="_blank" rel="noreferrer" className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded truncate max-w-full ${groundingChipClass} ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                                                            <MapPin size={10} /> {g.maps.title}
                                                        </a>
                                                    ) : null
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Task List (Mini) */}
                        <div className={`border-t p-2 max-h-48 overflow-y-auto transition-colors duration-300 ${taskHeaderClass}`}>
                            <div className="flex flex-col gap-2 mb-2">
                                <div className="flex justify-between items-center">
                                    <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tasks</h4>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsCreating(!isCreating)}
                                            className={`p-1 rounded transition-colors ${isCreating ? (isDarkMode ? 'bg-slate-700 text-blue-400' : 'bg-gray-200 text-blue-600') : (isDarkMode ? 'text-gray-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-200')}`}
                                            title="Quick Add Task"
                                        >
                                            <Plus size={12} />
                                        </button>

                                        {tasks.some(t => t.completed) && (
                                            <button
                                                onClick={() => setShowClearConfirm(true)}
                                                className={`p-1 rounded transition-colors ${isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-500 hover:bg-red-50'}`}
                                                title="Clear Completed Tasks"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}

                                        {/* Category Filter Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-purple-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-purple-600 hover:bg-purple-50'}`}
                                            >
                                                <Filter size={10} />
                                                <span className="truncate max-w-[60px]">{filterCategory === 'All' ? 'All' : filterCategory}</span>
                                            </button>

                                            {/* Backdrop to close menu */}
                                            {showFilterMenu && (
                                                <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                                            )}

                                            {/* Dropdown Menu */}
                                            {showFilterMenu && (
                                                <div className="absolute right-0 top-full mt-1 z-50 w-32 shadow-xl rounded-lg border bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                    <div className="p-1">
                                                        <button
                                                            onClick={() => { setFilterCategory('All'); setShowFilterMenu(false); }}
                                                            className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-[10px] rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${filterCategory === 'All' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                                                        >
                                                            <Layers size={12} /> All Categories
                                                        </button>
                                                        <div className="h-px bg-gray-100 dark:bg-slate-700 my-1" />
                                                        {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => (
                                                            <button
                                                                key={cat}
                                                                onClick={() => { setFilterCategory(cat as TaskCategory); setShowFilterMenu(false); }}
                                                                className={`flex items-center gap-2 w-full text-left px-2 py-1.5 text-[10px] rounded hover:bg-gray-100 dark:hover:bg-slate-700 ${filterCategory === cat ? 'bg-blue-50 dark:bg-blue-900/20 font-medium' : ''} ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                                                            >
                                                                <span className={config.color}>{config.icon}</span>
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => {
                                                const modes: ('created' | 'due' | 'priority')[] = ['created', 'due', 'priority'];
                                                const idx = modes.indexOf(sortBy);
                                                setSortBy(modes[(idx + 1) % modes.length]);
                                            }}
                                            className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors ${isDarkMode ? 'text-blue-300 hover:bg-slate-700' : 'text-blue-600 hover:bg-blue-50'}`}
                                        >
                                            <ArrowUpDown size={10} />
                                            {sortBy === 'created' ? 'Recent' : sortBy === 'due' ? 'Due Date' : 'Priority'}
                                        </button>
                                    </div>
                                </div>

                                {/* Tag Filters */}
                                {uniqueTags.length > 0 && (
                                    <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
                                        <button
                                            onClick={() => setSelectedTag(null)}
                                            className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${selectedTag === null
                                                ? (isDarkMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-500 text-white border-blue-600')
                                                : (isDarkMode ? 'bg-slate-700 text-gray-400 border-slate-600 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200')
                                                }`}
                                        >
                                            All Tags
                                        </button>
                                        {uniqueTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                                className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${selectedTag === tag
                                                    ? (isDarkMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-500 text-white border-blue-600')
                                                    : (isDarkMode ? 'bg-slate-700 text-gray-400 border-slate-600 hover:bg-slate-600' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200')
                                                    }`}
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Manual Creation Form */}
                            {isCreating && (
                                <div className={`flex flex-col gap-2 p-2 mb-2 rounded animate-in fade-in slide-in-from-top-2 duration-200 border ${isDarkMode ? 'bg-slate-800 border-blue-500' : 'bg-blue-50 border-blue-300'}`}>
                                    <input
                                        autoFocus
                                        value={creationValues.title}
                                        onChange={e => setCreationValues({ ...creationValues, title: e.target.value })}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleCreateTask();
                                            if (e.key === 'Escape') setIsCreating(false);
                                        }}
                                        className={`w-full text-sm p-1 border rounded focus:outline-none focus:border-blue-400 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-blue-200'}`}
                                        placeholder="New task title..."
                                    />
                                    <div className="flex gap-1 items-center">
                                        <input
                                            type="date"
                                            value={creationValues.dueDate}
                                            onChange={e => setCreationValues({ ...creationValues, dueDate: e.target.value })}
                                            className={`flex-1 text-[10px] p-1 border rounded ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                            title="Due Date"
                                        />
                                        <select
                                            value={creationValues.category}
                                            onChange={e => setCreationValues({ ...creationValues, category: e.target.value as TaskCategory })}
                                            className={`flex-1 text-[10px] p-1 border rounded ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                        >
                                            {Object.keys(CATEGORY_CONFIG).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button onClick={handleCreateTask} className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"><Check size={12} /></button>
                                        <button onClick={() => setIsCreating(false)} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"><X size={12} /></button>
                                    </div>
                                </div>
                            )}

                            {tasks.length === 0 && !isCreating ? (
                                <div className={`text-xs text-center py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No tasks. Ask me to add one!</div>
                            ) : (
                                <ul className="space-y-1">
                                    {sortedTasks.map(t => (
                                        editingId === t.id ? (
                                            <li key={t.id} className={`flex flex-col gap-2 p-2 rounded animate-in fade-in duration-200 border ${isDarkMode ? 'bg-slate-800 border-blue-900' : 'bg-blue-50 border-blue-200'}`}>
                                                <input
                                                    autoFocus
                                                    value={editValues.title}
                                                    onChange={e => setEditValues({ ...editValues, title: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') saveEdit();
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    className={`w-full text-sm p-1 border rounded focus:outline-none focus:border-blue-400 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-blue-200'}`}
                                                    placeholder="Task title..."
                                                />

                                                {/* Tag Input */}
                                                <div className="flex items-center gap-1">
                                                    <Tag size={10} className="text-gray-400" />
                                                    <input
                                                        value={editValues.tags}
                                                        onChange={e => setEditValues({ ...editValues, tags: e.target.value })}
                                                        className={`flex-1 text-[10px] p-1 border rounded ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                                        placeholder="Tags (comma separated)..."
                                                    />
                                                </div>

                                                {/* Category Selector */}
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] text-gray-400 w-12">Category:</span>
                                                    <select
                                                        value={editValues.category}
                                                        onChange={e => setEditValues({ ...editValues, category: e.target.value as TaskCategory })}
                                                        className={`flex-1 text-[10px] p-1 border rounded ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                                    >
                                                        {Object.keys(CATEGORY_CONFIG).map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-gray-400 w-12">Due:</span>
                                                        <input
                                                            type="date"
                                                            value={editValues.dueDate}
                                                            onChange={e => setEditValues({ ...editValues, dueDate: e.target.value })}
                                                            className={`flex-1 text-[10px] p-1 border rounded ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] text-gray-400 w-12">Remind:</span>
                                                        <input
                                                            type="datetime-local"
                                                            value={editValues.reminderTime}
                                                            onChange={e => setEditValues({ ...editValues, reminderTime: e.target.value })}
                                                            className={`flex-1 text-[10px] p-1 border rounded ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <select
                                                            value={editValues.status}
                                                            onChange={e => setEditValues({ ...editValues, status: e.target.value as TaskStatus })}
                                                            className={`flex-1 text-[10px] p-1 border rounded uppercase font-bold ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                                        >
                                                            <option value="todo">Todo</option>
                                                            <option value="in-progress">In Progress</option>
                                                            <option value="blocked">Blocked</option>
                                                            <option value="done">Done</option>
                                                        </select>

                                                        <select
                                                            value={editValues.priority}
                                                            onChange={e => setEditValues({ ...editValues, priority: e.target.value as any })}
                                                            className={`w-16 text-[10px] p-1 border rounded uppercase font-bold ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300 text-gray-600'}`}
                                                        >
                                                            <option value="low">Low</option>
                                                            <option value="medium">Med</option>
                                                            <option value="high">High</option>
                                                        </select>
                                                        <button onClick={saveEdit} className="p-1 bg-green-600 text-white rounded hover:bg-green-700"><Check size={12} /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1 bg-gray-500 text-white rounded hover:bg-gray-600"><X size={12} /></button>
                                                    </div>
                                                </div>
                                            </li>
                                        ) : (
                                            <li key={t.id} className={`flex flex-col p-1 rounded border transition-all duration-300 ease-in-out group ${t.completed
                                                ? (isDarkMode ? 'bg-green-900/20 border-green-800/30 opacity-70 scale-[0.99]' : 'bg-green-50/50 border-green-200 opacity-80 scale-[0.99]')
                                                : (isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-500' : 'bg-white border-gray-100 hover:shadow-sm')
                                                }`}>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => toggleTask(t.id)}
                                                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 relative z-10 ${t.completed
                                                                ? 'bg-green-500 border-green-600'
                                                                : (isDarkMode ? 'border-slate-500 hover:border-blue-400' : 'border-gray-300 hover:border-blue-400')
                                                                }`}
                                                        >
                                                            <Check size={10} className={`text-white transform transition-all duration-300 ${t.completed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
                                                        </button>
                                                        {bursts.has(t.id) && <ParticleExplosion />}
                                                    </div>

                                                    <span className={`flex-1 truncate transition-all duration-300 ${t.completed
                                                        ? 'line-through text-gray-400 decoration-green-500/50'
                                                        : (isDarkMode ? 'text-gray-300' : 'text-gray-700')
                                                        }`}>{t.title}</span>

                                                    {/* Category Icon */}
                                                    <div className={`p-1 rounded-full ${t.category ? CATEGORY_CONFIG[t.category].color : 'text-gray-400'} bg-opacity-10`} title={t.category}>
                                                        {t.category ? CATEGORY_CONFIG[t.category].icon : <Layers size={10} />}
                                                    </div>

                                                    {/* Status Badge - Click to Cycle */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); cycleStatus(t.id); }}
                                                        className={`flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border transition-colors ${getStatusColor(t.status)}`}
                                                        title="Cycle Status"
                                                    >
                                                        {getStatusIcon(t.status)}
                                                        <span>{t.status === 'in-progress' ? 'Prog' : t.status}</span>
                                                    </button>

                                                    {/* Priority Indicator / Toggle */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); cyclePriority(t.id); }}
                                                        className={`text-[9px] uppercase font-bold px-1 py-0.5 rounded border transition-colors ${t.priority === 'high'
                                                            ? (isDarkMode ? 'bg-red-900/50 text-red-300 border-red-800' : 'bg-red-50 text-red-600 border-red-200') :
                                                            t.priority === 'low'
                                                                ? (isDarkMode ? 'bg-slate-700 text-gray-400 border-slate-600' : 'bg-gray-100 text-gray-500 border-gray-200') :
                                                                (isDarkMode ? 'bg-orange-900/50 text-orange-300 border-orange-800' : 'bg-orange-50 text-orange-600 border-orange-200')
                                                            }`}
                                                        title="Toggle Priority"
                                                    >
                                                        {t.priority}
                                                    </button>

                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startEdit(t); }}
                                                        className="text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                                                        title="Edit Task"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>

                                                    {/* Delete Button */}
                                                    <button onClick={() => deleteTask(t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"><X size={12} /></button>
                                                </div>

                                                {/* Metadata Row */}
                                                <div className="ml-8 flex flex-wrap gap-2 mt-0.5 items-center">
                                                    {t.dueDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                                            <Calendar size={8} />
                                                            <span>{t.dueDate}</span>
                                                        </div>
                                                    )}
                                                    {t.reminderTime && (
                                                        <div className={`flex items-center gap-1 text-[10px] ${new Date(t.reminderTime) < new Date() ? 'text-gray-500' : 'text-blue-500'}`} title={`Reminder: ${new Date(t.reminderTime).toLocaleString()}`}>
                                                            <Bell size={8} className="fill-current" />
                                                            <span>{new Date(t.reminderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    )}
                                                    {/* Tags Display */}
                                                    {t.tags && t.tags.length > 0 && t.tags.map((tag, idx) => (
                                                        <span key={idx} className={`text-[9px] px-1.5 rounded-full border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </li>
                                        )
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className={`p-2 border-t transition-colors duration-300 ${inputAreaClass}`}>
                            {/* File Preview */}
                            {attachedFile && (
                                <div className={`flex items-center justify-between p-1 mb-1 text-xs rounded border ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-100 border-gray-200'}`}>
                                    <span className="truncate max-w-[150px]">{attachedFile.name}</span>
                                    <button onClick={() => setAttachedFile(null)} className="hover:text-red-500"><X size={12} /></button>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept="image/*,video/*"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                                    title="Attach Image/Video"
                                >
                                    <ImageIcon size={18} />
                                </button>

                                <div className="flex-1 relative">
                                    <textarea
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                        placeholder={isRecording ? "Listening..." : "Type a message..."}
                                        className={`w-full max-h-24 py-2 px-3 pr-10 rounded-2xl resize-none text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${inputFieldClass}`}
                                        rows={1}
                                    />
                                </div>

                                {inputText.trim() || attachedFile ? (
                                    <button
                                        onClick={handleSend}
                                        className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-transform active:scale-95"
                                    >
                                        <Send size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onMouseDown={startRecording}
                                        onMouseUp={stopRecording}
                                        onMouseLeave={stopRecording}
                                        className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : (isDarkMode ? 'bg-slate-700 text-gray-400 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')}`}
                                    >
                                        {isRecording ? <div className="w-4 h-4 bg-white rounded-sm" /> : <Mic size={18} />}
                                    </button>
                                )}
                            </div>

                            {/* Visualizer for Audio */}
                            {isRecording && (
                                <div className="flex justify-center items-end gap-0.5 h-8 mt-2">
                                    {audioVisuals.map((h, i) => (
                                        <div key={i} className="w-1 bg-red-500 rounded-t" style={{ height: `${h}%`, transition: 'height 0.1s' }}></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Ghost Character - Draggable */}
                <div
                    className="pointer-events-none px-16 pt-16 pb-32"
                >
                    <div
                        className="pointer-events-auto cursor-grab active:cursor-grabbing inline-block"
                        onMouseDown={handleMouseDown}
                        onClick={() => {
                            // Only trigger click if it wasn't a drag gesture
                            if (!isDragGesture.current) {
                                setIsOpen(prev => !prev);
                                setAduitorState(AduitorState.Surprised);
                                setTimeout(() => setAduitorState(AduitorState.Idle), 1000);
                            }
                        }}
                    >
                        <GhostCharacter
                            state={aduitorState}
                            onClick={() => { }} // Handled by parent
                            isDarkMode={isDarkMode}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}

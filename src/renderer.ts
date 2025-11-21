// Simple renderer script
import * as fs from 'fs';
import * as path from 'path';
import { ipcRenderer } from 'electron';
import { MCPClient } from './mcp';
import { checkSlackForContext, getGitHubPRFeedback } from './hooks';

const clippyBody = document.getElementById('clippy-body');
const speechBubble = document.getElementById('speech-bubble');
const bubbleContent = document.getElementById('bubble-content');
const bubbleActions = document.getElementById('bubble-actions');
const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const settingsPanel = document.getElementById('settings-panel');

const toggleRage = document.getElementById('toggle-rage') as HTMLInputElement;
const toggleSound = document.getElementById('toggle-sound') as HTMLInputElement;
const toggleDrift = document.getElementById('toggle-drift') as HTMLInputElement;

let isBubbleVisible = false;
let mouseDownTime = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

// Settings State
let rageEnabled = true;
let soundEnabled = true;
let driftEnabled = true;

if (toggleRage) toggleRage.addEventListener('change', (e) => rageEnabled = (e.target as HTMLInputElement).checked);
if (toggleSound) toggleSound.addEventListener('change', (e) => soundEnabled = (e.target as HTMLInputElement).checked);
if (toggleDrift) toggleDrift.addEventListener('change', (e) => driftEnabled = (e.target as HTMLInputElement).checked);

// Initialize MCP Client (Mock connection for demo)
const mcp = new MCPClient("python", ["server.py"]); // Dummy command
mcp.connect();

// TTS Helper
function speak(text: string) {
    if (!soundEnabled) return; // Check sound setting

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        // Try to find a "Microsoft David" or similar voice if available, otherwise default
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("David") || v.name.includes("English"));
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.pitch = 1.5; // Higher pitch for Clippy
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    }
}

// Path to the "user's" project (currently this project)
// We assume the app is running from dist/, so project root is one level up
const projectRoot = path.resolve(__dirname, '../');
const specsPath = path.join(projectRoot, 'project.specs');
const steeringPath = path.join(projectRoot, 'steering.yaml');

function readSpecs(): string[] {
    try {
        if (fs.existsSync(specsPath)) {
            const content = fs.readFileSync(specsPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim().startsWith('- [ ]'));
            return lines.map(line => line.replace('- [ ]', '').trim());
        }
    } catch (err) {
        console.error("Error reading specs:", err);
    }
    return [];
}

function readSteering(): string {
    try {
        if (fs.existsSync(steeringPath)) {
            const content = fs.readFileSync(steeringPath, 'utf-8');
            // Simple check for "Humble" in the vibe section
            if (content.includes("Humble") || content.includes("Apologetic")) {
                return "Humble";
            }
            // Fallback to old markdown check just in case
            const match = content.match(/Tone:\s*(.*)/);
            return match ? match[1] : "Helpful";
        }
    } catch (err) {
        console.error("Error reading steering:", err);
    }
    return "Helpful";
}

let clickTimeout: NodeJS.Timeout | null = null;

if (clippyBody && speechBubble) {
    // Dragging Logic
    clippyBody.addEventListener('pointerdown', (e) => {
        if (e.isPrimary && e.button === 0) { // Primary pointer, left button
            isDragging = false;
            startX = e.screenX;
            startY = e.screenY;
            clippyBody.setPointerCapture(e.pointerId);
        }
    });

    clippyBody.addEventListener('pointermove', (e) => {
        if (e.isPrimary && !isDragging && clippyBody.hasPointerCapture(e.pointerId)) {
             const dx = Math.abs(e.screenX - startX);
             const dy = Math.abs(e.screenY - startY);
             if (dx > 5 || dy > 5) {
                 isDragging = true;
                 ipcRenderer.send('start-drag');
             }
        }
    });

    clippyBody.addEventListener('pointerup', (e) => {
        clippyBody.releasePointerCapture(e.pointerId);
        if (isDragging) {
            ipcRenderer.send('stop-drag');
            // Keep isDragging true for a moment so the click handler knows
            setTimeout(() => isDragging = false, 50);
        }
    });

    // Double Click for Settings
    clippyBody.addEventListener('dblclick', (e) => {
        e.stopPropagation(); // Try to prevent other handlers
        
        // Clear any pending single click action
        if (clickTimeout) {
            clearTimeout(clickTimeout);
            clickTimeout = null;
        }
        
        // Hide speech bubble if open
        isBubbleVisible = false;
        speechBubble.style.display = 'none';

        // Toggle Settings Panel
        if (settingsPanel) {
            const isVisible = settingsPanel.style.display !== 'none';
            settingsPanel.style.display = isVisible ? 'none' : 'block';
        }
    });

    clippyBody.addEventListener('click', (e) => {
        // If it was a drag, ignore click
        if (isDragging) {
            e.stopPropagation();
            return;
        }

        // Reset Rage Mode on click
        document.body.classList.remove('rage');

        // If settings panel is open, close it and don't show bubble
        if (settingsPanel && settingsPanel.style.display !== 'none') {
            settingsPanel.style.display = 'none';
            return;
        }

        // Delay single click to check for double click
        if (clickTimeout) clearTimeout(clickTimeout);

        clickTimeout = setTimeout(async () => {
            isBubbleVisible = !isBubbleVisible;
            speechBubble.style.display = isBubbleVisible ? 'block' : 'none';
            
            if (isBubbleVisible) {
                const pendingTasks = readSpecs();
                const tone = readSteering();
                
                let message = "";
                
                // Reset UI
                if (bubbleActions) bubbleActions.style.display = 'none';

                if (pendingTasks.length > 0) {
                    const task = pendingTasks[0];
                    
                    // Fetch extra context from MCP
                    if (bubbleContent) bubbleContent.innerText = "Thinking... (Querying MCP)";
                    const mcpContext = await mcp.getContext(task);

                    if (tone === "Humble") {
                        message = `I see you're writing a "${task}"... I *think* I have a suggestion. May I share it?`;
                        if (bubbleContent) bubbleContent.innerText = message;
                        
                        if (bubbleActions) bubbleActions.style.display = 'flex';
                        
                        if (btnYes) {
                            btnYes.onclick = async () => {
                                if (bubbleContent) bubbleContent.innerText = "Checking Slack and GitHub...";
                                
                                // Use the task name to search Slack, and hardcode 'main' branch for now
                                const slackMsg = await checkSlackForContext(task); 
                                const githubMsg = await getGitHubPRFeedback("main");

                                let finalMsg = message + `\n\n${mcpContext}`;
                                if (slackMsg) finalMsg += `\n\n[Slack]: ${slackMsg}`;
                                if (githubMsg) finalMsg += `\n\n[GitHub]: ${githubMsg}`;

                                if (bubbleContent) bubbleContent.innerText = finalMsg;
                                if (bubbleActions) bubbleActions.style.display = 'none';
                                speak("Here is what I found from your team.");
                            };
                        }
                        if (btnNo) {
                            btnNo.onclick = () => {
                                if (bubbleContent) bubbleContent.innerText = "Okay, sorry to bother you.";
                                if (bubbleActions) bubbleActions.style.display = 'none';
                            };
                        }
                        speak(message);

                    } else if (tone.toLowerCase().includes("passive-aggressive")) {
                        message = `I see you still haven't finished: "${task}". Maybe less coffee, more coding?`;
                        if (bubbleContent) bubbleContent.innerText = message + `\n\n${mcpContext}`;
                        speak(message);
                    } else {
                        message = `It looks like you're working on: "${task}". You can do it!`;
                        if (bubbleContent) bubbleContent.innerText = message + `\n\n${mcpContext}`;
                        speak(message);
                    }

                } else {
                    message = "Wow, no pending tasks! You're either done or you forgot to write specs.";
                    if (bubbleContent) bubbleContent.innerText = message;
                    speak(message);
                }
            } else {
                window.speechSynthesis.cancel(); // Stop talking if closed
            }
        }, 250); // 250ms delay
    });
}

// Mock "Context Guardian" check
setInterval(() => {
    if (!driftEnabled) return; // Check drift setting

    // In a real app, this would check file changes via IPC
    const randomCheck = Math.random();
    if (randomCheck > 0.80 && speechBubble) { // Increased frequency for demo (20% chance every 10s)
        const warningMsg = "Warning: Context Drift detected! You are deviating from the specs.";
        
        if (bubbleContent) bubbleContent.innerText = warningMsg;
        speechBubble.style.display = 'block';
        isBubbleVisible = true;
        
        if (rageEnabled) {
            // ENTER RAGE MODE
            document.body.classList.add('rage');
            
            // Shake the actual window
            ipcRenderer.send('shake-window');
            
            // Speak angrily
            speak("Warning! Context Drift detected! Fix your code now!");
        } else {
            // Gentle warning
            speak("Warning. Context Drift detected.");
        }
    }
}, 10000); // Check every 10 seconds

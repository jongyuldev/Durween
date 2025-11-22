import React, { useState, useEffect } from 'react';
import Clippy from './components/Clippy/Clippy';
import TaskManager from './components/TaskManager/TaskManager';
import ChatBubble from './components/ChatBubble/ChatBubble';

const App: React.FC = () => {
    const [hash, setHash] = useState(window.location.hash);
    const [clippyMessage, setClippyMessage] = useState<string | null>(null);

    useEffect(() => {
        const handleHashChange = () => {
            setHash(window.location.hash);
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            
            // Listen for messages from main process or other windows
            ipcRenderer.on('task-action-reply', (_event: any, action: string, data: any) => {
                console.log('Received task action:', action, data);
                if (action === 'add') {
                    setClippyMessage("You added a task! Great job!");
                } else if (action === 'complete') {
                    setClippyMessage("Task completed! You're on fire!");
                }
                
                // Clear message after a few seconds
                setTimeout(() => setClippyMessage(null), 3000);
            });

            return () => {
                ipcRenderer.removeAllListeners('task-action-reply');
            };
        }
    }, []);

    const handleClippyClick = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('toggle-task-window');
        } else {
            console.warn('Electron IPC not available');
        }
    };

    const handleTaskAdd = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('task-action', 'add', {});
        }
    };

    const handleTaskComplete = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('task-action', 'complete', {});
        }
    };

    let content;
    if (hash === '#clippy' || hash === '') {
        content = (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Clippy onClick={handleClippyClick} />
                {clippyMessage && (
                    <div style={{ position: 'absolute', top: 0, left: 100 }}>
                        <ChatBubble message={clippyMessage} />
                    </div>
                )}
            </div>
        );
    } else if (hash === '#tasks') {
        content = <TaskManager onTaskAdd={handleTaskAdd} onTaskComplete={handleTaskComplete} />;
    } else {
        content = <div>Page not found: {hash}</div>;
    }

    return (
        <div className="app-container">
            {content}
        </div>
    );
};

export default App;

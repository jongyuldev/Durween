import React, { useState, useEffect } from 'react';
import './ChatBubble.css';

interface ChatBubbleProps {
    message: string;
    onClose?: () => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onClose }) => {
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        let index = 0;
        setDisplayedText('');
        const interval = setInterval(() => {
            setDisplayedText((prev) => prev + message.charAt(index));
            index++;
            if (index >= message.length) {
                clearInterval(interval);
            }
        }, 30); // Typing speed

        return () => clearInterval(interval);
    }, [message]);

    return (
        <div className="chat-bubble retro-window">
            <div className="chat-content">
                {displayedText}
            </div>
            <div className="chat-actions">
                {/* Optional buttons can go here */}
            </div>
            <div className="chat-arrow"></div>
        </div>
    );
};

export default ChatBubble;

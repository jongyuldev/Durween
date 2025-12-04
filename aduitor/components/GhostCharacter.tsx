import React, { useEffect, useState } from 'react';
import { AduitorState } from '../types';
import './GhostCharacter.css';

interface GhostProps {
  state: AduitorState;
  onClick: () => void;
  className?: string;
  isDarkMode?: boolean;
  message?: string; // Optional message to show in a speech bubble
}

const GhostCharacter: React.FC<GhostProps> = ({ state, onClick, className, isDarkMode, message }) => {
  // The ghost animation is largely handled by CSS (float, blink)
  // We can add some state-based reactions here if needed

  return (
    <div 
      className={`ghost-container ${className || ''}`} 
      onClick={onClick}
      title="Click to toggle assistant"
    >
      {/* Speech Bubble - Only show if there is a message */}
      {message && (
        <div className="speech-bubble show">
          <div className="bubble-content" dangerouslySetInnerHTML={{ __html: message }} />
          <div className="bubble-tail"></div>
        </div>
      )}

      <svg className="ghost-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ghostBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#FFFFFF', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#E8E4F3', stopOpacity: 1 }} />
          </linearGradient>
          <filter id="ghostGlow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Ghost body */}
        <path d="M 60 20 
                 C 35 20, 20 35, 20 60
                 L 20 110
                 Q 20 115, 25 118
                 Q 30 115, 35 118
                 Q 40 115, 45 118
                 Q 50 115, 55 118
                 Q 60 115, 65 118
                 Q 70 115, 75 118
                 Q 80 115, 85 118
                 Q 90 115, 95 118
                 Q 100 115, 100 110
                 L 100 60
                 C 100 35, 85 20, 60 20 Z" 
              fill="url(#ghostBody)" 
              filter="url(#ghostGlow)"
              className="ghost-body"/>
        
        {/* Eyes Group for easy manipulation if needed */}
        <g className="ghost-eyes">
            {/* Left eye */}
            <ellipse cx="45" cy="60" rx="8" ry="12" fill="#2D3748" className="ghost-eye"/>
            
            {/* Right eye */}
            <ellipse cx="75" cy="60" rx="8" ry="12" fill="#2D3748" className="ghost-eye"/>
        </g>
        
        {/* Blush */}
        <ellipse cx="30" cy="75" rx="8" ry="6" fill="#FFB6C1" opacity="0.6"/>
        <ellipse cx="90" cy="75" rx="8" ry="6" fill="#FFB6C1" opacity="0.6"/>
        
        {/* Smile - Change based on state? */}
        {state === AduitorState.Surprised ? (
             <circle cx="60" cy="85" r="5" stroke="#2D3748" strokeWidth="2" fill="none" />
        ) : state === AduitorState.Thinking ? (
             <path d="M 50 85 Q 60 80 70 85" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
        ) : (
             <path d="M 45 85 Q 60 90 75 85" stroke="#2D3748" strokeWidth="2" fill="none" strokeLinecap="round"/>
        )}

        {/* State Indicator Icon (Optional, maybe floating above) */}
        {state !== AduitorState.Idle && (
            <g transform="translate(80, 20)">
                <circle r="15" fill="#FFF" stroke="#2D3748" strokeWidth="2" />
                <text x="0" y="5" textAnchor="middle" fontSize="16">
                    {state === AduitorState.Thinking && "🤔"}
                    {state === AduitorState.Writing && "✍️"}
                    {state === AduitorState.Surprised && "!"}
                    {state === AduitorState.Listening && "👂"}
                </text>
            </g>
        )}
      </svg>
    </div>
  );
};

export default GhostCharacter;

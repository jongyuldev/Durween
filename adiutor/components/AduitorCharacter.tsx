import React, { useEffect, useState } from 'react';
import { AduitorState } from '../types';

interface AduitorProps {
  state: AduitorState;
  onClick: () => void;
  className?: string;
  isDarkMode?: boolean;
}

const AduitorCharacter: React.FC<AduitorProps> = ({ state, onClick, className, isDarkMode = false }) => {
  const [eyesOpen, setEyesOpen] = useState(true);

  // Blinking logic
  useEffect(() => {
    const interval = setInterval(() => {
      setEyesOpen(false);
      setTimeout(() => setEyesOpen(true), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Simple eyebrow expression based on state
  const getEyebrowY = () => {
    switch (state) {
      case AduitorState.Thinking: return -2;
      case AduitorState.Surprised: return -5;
      case AduitorState.Writing: return 2;
      default: return 0;
    }
  };

  const strokeColor = isDarkMode ? "#F0F0F0" : "#C0C0C0";
  const eyeFill = isDarkMode ? "#FFFFFF" : "#FFFFFF";
  const pupilFill = isDarkMode ? "#000000" : "#000000"; // Keep pupil black for contrast against white eye
  const featureStroke = isDarkMode ? "#000000" : "#000000"; // Eyes/Brows usually need to be dark on the white sclera

  return (
    <div 
      className={`relative cursor-pointer transition-transform duration-300 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        className={`filter drop-shadow-xl ${state === AduitorState.Writing ? 'animate-bounce' : 'animate-bounce-gentle'}`}
      >
        {/* Wire Body */}
        <path
          d="M 35 80 
             L 35 40 
             A 15 15 0 0 1 65 40 
             L 65 85 
             A 25 25 0 0 1 15 85 
             L 15 25 
             A 35 35 0 0 1 85 25 
             L 85 60"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          className="drop-shadow-sm transition-colors duration-300"
        />
        
        {/* Eyes Container - Placed on the upper loop */}
        <g transform="translate(35, 30)">
            {/* Left Eye */}
            <circle cx="5" cy="0" r="8" fill={eyeFill} stroke="#555" strokeWidth="1"/>
            <circle cx="5" cy="0" r="3" fill={pupilFill} transform={eyesOpen ? '' : 'scale(1, 0.1)'} className="transition-transform duration-100" />
            
            {/* Right Eye */}
            <circle cx="25" cy="0" r="8" fill={eyeFill} stroke="#555" strokeWidth="1"/>
            <circle cx="25" cy="0" r="3" fill={pupilFill} transform={eyesOpen ? '' : 'scale(1, 0.1)'} className="transition-transform duration-100" />
            
            {/* Eyebrows */}
            <path d="M -2 -8 Q 5 -12 12 -8" fill="none" stroke={featureStroke} strokeWidth="2" transform={`translate(0, ${getEyebrowY()})`} />
            <path d="M 18 -8 Q 25 -12 32 -8" fill="none" stroke={featureStroke} strokeWidth="2" transform={`translate(0, ${getEyebrowY()})`} />
        </g>
      </svg>
      
      {/* State Indicator Icon (Bubble) */}
      {state !== AduitorState.Idle && (
        <div className="absolute -top-2 -right-2 bg-yellow-100 border-2 border-yellow-400 rounded-full p-1 text-xs font-bold animate-pulse text-black">
          {state === AduitorState.Thinking && "🤔"}
          {state === AduitorState.Writing && "✍️"}
          {state === AduitorState.Surprised && "!"}
          {state === AduitorState.Listening && "👂"}
        </div>
      )}
    </div>
  );
};

export default AduitorCharacter;

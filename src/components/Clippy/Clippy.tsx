import React, { useState, useEffect } from 'react';
import './Clippy.css';

interface ClippyProps {
    animationState?: 'idle' | 'writing' | 'waving' | 'looking';
    onClick?: () => void;
}

const Clippy: React.FC<ClippyProps> = ({ animationState = 'idle', onClick }) => {
    const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth) * 10 - 5;
            const y = (e.clientY / window.innerHeight) * 10 - 5;
            setEyePosition({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className={`clippy-container ${animationState}`} onClick={onClick}>
            <svg viewBox="0 0 100 100" className="clippy-svg">
                {/* Paper Clip Body */}
                <path
                    d="M 30 60 L 30 30 A 10 10 0 1 1 50 30 L 50 70 A 20 20 0 1 1 10 70 L 10 30"
                    fill="none"
                    stroke="#C0C0C0" /* Silver/Metal color */
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="clippy-body-shadow"
                    transform="translate(2, 2)"
                />
                <path
                    d="M 30 60 L 30 30 A 10 10 0 1 1 50 30 L 50 70 A 20 20 0 1 1 10 70 L 10 30"
                    fill="none"
                    stroke="#E0E0E0" /* Lighter Silver */
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="clippy-body"
                />

                {/* Eyes */}
                <g className="clippy-eyes" transform={`translate(${eyePosition.x}, ${eyePosition.y})`}>
                    <circle cx="25" cy="35" r="8" fill="white" stroke="black" strokeWidth="1" />
                    <circle cx="25" cy="35" r="3" fill="black" />

                    <circle cx="45" cy="35" r="8" fill="white" stroke="black" strokeWidth="1" />
                    <circle cx="45" cy="35" r="3" fill="black" />
                </g>

                {/* Eyebrows */}
                <g className="clippy-eyebrows" transform={`translate(${eyePosition.x}, ${eyePosition.y - 2})`}>
                    <path d="M 18 25 Q 25 20 32 25" stroke="black" strokeWidth="2" fill="none" />
                    <path d="M 38 25 Q 45 20 52 25" stroke="black" strokeWidth="2" fill="none" />
                </g>
            </svg>
        </div>
    );
};

export default Clippy;

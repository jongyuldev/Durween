import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Task } from '../types';

interface StatsBoardProps {
  tasks: Task[];
  onClose: () => void;
  isDarkMode?: boolean;
}

const StatsBoard: React.FC<StatsBoardProps> = ({ tasks, onClose, isDarkMode = false }) => {
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.length - completed;

  const data = [
    { name: 'Completed', value: completed },
    { name: 'Pending', value: pending },
  ];

  const COLORS = ['#4ade80', '#f87171'];
  
  // Dynamic styles based on theme
  const bgClass = isDarkMode ? 'bg-gray-800/95 border-gray-600' : 'bg-white/95 border-gray-200';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-700';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const closeClass = isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500';

  return (
    <div className={`absolute top-20 left-1/2 -translate-x-1/2 w-80 backdrop-blur-md rounded-lg shadow-2xl border z-50 p-4 transition-colors duration-300 ${bgClass}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-bold ${textClass}`}>Daily Productivity</h3>
        <button onClick={onClose} className={closeClass}>✕</button>
      </div>

      <div className="h-64 w-full">
        {tasks.length === 0 ? (
          <div className={`flex items-center justify-center h-full italic ${subTextClass}`}>
            No tasks yet!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                stroke={isDarkMode ? '#1f2937' : '#fff'}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                    backgroundColor: isDarkMode ? '#374151' : '#fff',
                    borderColor: isDarkMode ? '#4b5563' : '#ccc',
                    color: isDarkMode ? '#fff' : '#000'
                }} 
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className={`text-center text-sm mt-2 ${subTextClass}`}>
        You're doing great! Keep it up.
      </div>
    </div>
  );
};

export default StatsBoard;

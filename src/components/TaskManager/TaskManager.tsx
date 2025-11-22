import React, { useState } from 'react';
import './TaskManager.css';

interface Task {
    id: number;
    text: string;
    completed: boolean;
}

interface TaskManagerProps {
    onTaskAdd: () => void;
    onTaskComplete: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ onTaskAdd, onTaskComplete }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [inputValue, setInputValue] = useState('');

    const addTask = () => {
        if (inputValue.trim()) {
            setTasks([...tasks, { id: Date.now(), text: inputValue, completed: false }]);
            setInputValue('');
            onTaskAdd();
        }
    };

    const toggleTask = (id: number) => {
        setTasks(tasks.map(task => {
            if (task.id === id) {
                if (!task.completed) onTaskComplete();
                return { ...task, completed: !task.completed };
            }
            return task;
        }));
    };

    const deleteTask = (id: number) => {
        setTasks(tasks.filter(task => task.id !== id));
    };

    return (
        <div className="task-manager retro-window">
            <div className="retro-title-bar">
                <span>My Tasks</span>
                <div className="window-controls">
                    <button className="retro-button">_</button>
                    <button className="retro-button">X</button>
                </div>
            </div>
            <div className="task-content">
                <div className="task-input-area">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        placeholder="What needs doing?"
                        className="retro-input"
                    />
                    <button onClick={addTask} className="retro-button">Add</button>
                </div>
                <ul className="task-list">
                    {tasks.map(task => (
                        <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleTask(task.id)}
                            />
                            <span className="task-text">{task.text}</span>
                            <button onClick={() => deleteTask(task.id)} className="retro-button small">x</button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default TaskManager;

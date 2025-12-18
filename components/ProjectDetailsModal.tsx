import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, FileText, Calendar, Clock, CheckCircle2, Circle, Plus, Trash2, Mic, MicOff, ListTodo, StickyNote } from 'lucide-react';
import { TrackItem, TodoItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: TrackItem | null;
  onSaveNotes: (id: string, notes: string) => void;
  onSaveTodos: (id: string, todos: TodoItem[]) => void;
}

export const ProjectDetailsModal: React.FC<Props> = ({ isOpen, onClose, item, onSaveNotes, onSaveTodos }) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'todos'>('notes');
  const [notes, setNotes] = useState('');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (item) {
      setNotes(item.notes || '');
      setTodos(item.todos || []);
    }
  }, [item]);

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    const newList = [...todos, { id: crypto.randomUUID(), text: newTodo.trim(), completed: false }];
    setTodos(newList);
    setNewTodo('');
    if (item) onSaveTodos(item.id, newList);
  };

  const toggleTodo = (id: string) => {
    const newList = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(newList);
    if (item) onSaveTodos(item.id, newList);
  };

  const deleteTodo = (id: string) => {
    const newList = todos.filter(t => t.id !== id);
    setTodos(newList);
    if (item) onSaveTodos(item.id, newList);
  };

  const startDictation = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (activeTab === 'notes') {
        setNotes(prev => prev + (prev ? ' ' : '') + transcript);
      } else {
        setNewTodo(transcript);
      }
    };
    recognition.start();
  }, [activeTab]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-cyber-dark border border-cyber-gray w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-start p-6 border-b border-cyber-gray bg-black/40">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <FileText className="text-cyber-accent" size={24} />
                <h2 className="text-2xl font-mono font-bold text-white truncate max-w-md">
                    {item.name}
                </h2>
            </div>
            <p className="text-gray-400 font-mono text-xs">{item.description}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex bg-black/20 border-b border-cyber-gray px-6">
            <button 
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-4 font-mono text-sm flex items-center gap-2 transition-all border-b-2 ${activeTab === 'notes' ? 'border-cyber-accent text-white' : 'border-transparent text-gray-500'}`}
            >
                <StickyNote size={16} /> Notes
            </button>
            <button 
                onClick={() => setActiveTab('todos')}
                className={`px-6 py-4 font-mono text-sm flex items-center gap-2 transition-all border-b-2 ${activeTab === 'todos' ? 'border-cyber-red text-white' : 'border-transparent text-gray-500'}`}
            >
                <ListTodo size={16} /> Tasks
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'notes' ? (
                <div className="h-full flex flex-col space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2">Project Documentation</h3>
                        <div className="flex gap-2">
                             <button 
                                onClick={startDictation}
                                className={`p-2 rounded-lg transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                            >
                                <Mic size={18} />
                            </button>
                            <button 
                                onClick={() => onSaveNotes(item.id, notes)}
                                className="px-4 py-2 bg-cyber-accent text-black font-bold rounded-lg hover:bg-cyan-300 text-sm"
                            >
                                Save Docs
                            </button>
                        </div>
                    </div>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Project scratchpad..."
                        className="w-full flex-1 bg-black/40 border border-cyber-gray rounded-xl p-4 text-gray-200 font-mono outline-none resize-none"
                    />
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-4">
                    <div className="flex gap-2">
                        <input 
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                            placeholder="Add task..."
                            className="flex-1 bg-white/5 border border-cyber-gray rounded-xl p-3 text-white outline-none focus:border-cyber-red"
                        />
                        <button onClick={handleAddTodo} className="bg-cyber-red text-white px-6 rounded-xl font-bold">Add</button>
                    </div>
                    <div className="space-y-2">
                        {todos.map(todo => (
                            <div key={todo.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group">
                                <button onClick={() => toggleTodo(todo.id)}>
                                    {todo.completed ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-gray-600" />}
                                </button>
                                <span className={`flex-1 ${todo.completed ? 'line-through text-gray-600' : 'text-gray-200'}`}>{todo.text}</span>
                                <button onClick={() => deleteTodo(todo.id)} className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

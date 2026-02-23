import React, { useState, useEffect } from 'react';
import { getTodos, updateTodo } from '../../lib/todoService';
import { CheckSquare, Clock, ArrowRight, Circle, CheckCircle2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TodoReminder() {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTodayTodos();
    }, []);

    const fetchTodayTodos = async () => {
        setLoading(true);
        try {
            const { data } = await getTodos();
            if (data) {
                const today = new Date().toISOString().split('T')[0];
                const todayTodos = data.filter(t =>
                    !t.is_completed &&
                    (t.due_date && t.due_date.startsWith(today))
                );
                setTodos(todayTodos);
            }
        } catch (error) {
            console.error('Error fetching today todos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async (todo) => {
        const { data } = await updateTodo(todo.id, { is_completed: true });
        if (data) {
            setTodos(todos.filter(t => t.id !== todo.id));
        }
    };

    if (loading) return null;
    if (todos.length === 0) return null;

    return (
        <div className="glass-panel" style={{ borderTop: '4px solid var(--accent)', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <CheckSquare size={24} color="var(--accent)" />
                <h3 className="form-section-title" style={{ margin: 0, padding: 0, border: 'none', color: '#1e293b' }}>Tasks Due Today</h3>
                <span style={{ background: '#e0e7ff', color: 'var(--accent)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                    {todos.length} Tasks
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todos.map(todo => (
                    <div key={todo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button
                                onClick={() => handleToggleComplete(todo)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-color)', display: 'flex' }}
                            >
                                <Circle size={20} />
                            </button>
                            <div>
                                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>{todo.title}</h4>
                                {todo.priority === 'high' && (
                                    <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>High Priority</span>
                                )}
                            </div>
                        </div>
                        <Link to="/todo" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                            View All <ArrowRight size={14} />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

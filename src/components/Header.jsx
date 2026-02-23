import React, { useState, useEffect } from 'react';
import { LogOut, Bell, Search, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTodos } from '../lib/todoService';

export default function Header() {
    const { profile, signOut } = useAuth();
    const [todoCount, setTodoCount] = useState(0);

    useEffect(() => {
        if (profile) {
            fetchTodoCount();
        }
    }, [profile]);

    const fetchTodoCount = async () => {
        try {
            const { data } = await getTodos();
            if (data) {
                const today = new Date().toISOString().split('T')[0];
                const todayCount = data.filter(t => !t.is_completed && t.due_date && t.due_date.startsWith(today)).length;
                setTodoCount(todayCount);
            }
        } catch (err) {
            console.error("Error fetching todo count:", err);
        }
    };

    if (!profile) return null;

    return (
        <header className="top-header">
            <div className="header-left">
                {/* Optional: Add search bar here if needed globally */}
            </div>

            <div className="header-right">
                {todoCount > 0 && (
                    <div className="header-icon-badge" title={`${todoCount} tasks due today`}>
                        <Bell size={20} color="var(--accent)" />
                        <span className="badge-dot"></span>
                    </div>
                )}

                <div className="user-profile-top">
                    <div className="user-info">
                        <p className="user-email">{profile.email}</p>
                        <p className="user-role">{profile.role}</p>
                    </div>
                    <div className="user-avatar">
                        <User size={20} color="#6366f1" />
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="logout-btn"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}

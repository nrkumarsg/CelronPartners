import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Ship, MapPin, Building2, Package, ShieldCheck, Search, Tags, Hexagon, CheckSquare, StickyNote, CalendarDays, Database, Folder, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTodos } from '../lib/todoService';

export default function Sidebar() {
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

    const hasAccess = (moduleName) => {
        if (!profile) return false;
        if (profile.role === 'superadmin') return true;
        return profile.accessible_modules?.includes(moduleName);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <img
                    src="https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif"
                    alt="Cel-Ron Logo"
                    className="sidebar-logo"
                />
                <h1 style={{ fontSize: '1.8rem', letterSpacing: '0.05em' }}>HUB</h1>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
                    <LayoutDashboard size={20} />
                    <span className="nav-text">Dashboard</span>
                </NavLink>

                {/* NEW MODULES - MOVED TO TOP FOR VISIBILITY */}
                <NavLink to="/todo" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <CheckSquare size={20} color="#10b981" />
                    <span className="nav-text" style={{ fontWeight: 600 }}>To-Do List {todoCount > 0 ? `(${todoCount})` : ''}</span>
                </NavLink>

                <NavLink to="/notes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <StickyNote size={20} color="#f59e0b" />
                    <span className="nav-text" style={{ fontWeight: 600 }}>Notes</span>
                </NavLink>

                <NavLink to="/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <CalendarDays size={20} color="#6366f1" />
                    <span className="nav-text" style={{ fontWeight: 600 }}>Calendar</span>
                </NavLink>

                <NavLink to="/tools" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Wrench size={20} color="#ec4899" />
                    <span className="nav-text" style={{ fontWeight: 600 }}>Tools</span>
                </NavLink>

                <NavLink to="/messaging" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Hexagon size={20} color="#8b5cf6" />
                    <span className="nav-text" style={{ fontWeight: 600 }}>Messaging Hub</span>
                </NavLink>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

                {hasAccess('partners') && (
                    <>
                        <NavLink to="/partners" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <Building2 size={20} />
                            <span className="nav-text">Partners</span>
                        </NavLink>
                        <NavLink to="/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <Tags size={20} />
                            <span className="nav-text">Categories</span>
                        </NavLink>
                        <NavLink to="/brands" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            <Hexagon size={20} />
                            <span className="nav-text">Brands</span>
                        </NavLink>
                    </>
                )}

                {hasAccess('contacts') && (
                    <NavLink to="/contacts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Users size={20} />
                        <span className="nav-text">Contacts</span>
                    </NavLink>
                )}

                {hasAccess('vessels') && (
                    <NavLink to="/vessels" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Ship size={20} />
                        <span className="nav-text">Vessels</span>
                    </NavLink>
                )}

                {hasAccess('work-locations') && (
                    <NavLink to="/work-locations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <MapPin size={20} />
                        <span className="nav-text">Work Locations</span>
                    </NavLink>
                )}

                {hasAccess('catalog') && (
                    <NavLink to="/catalog" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Package size={20} />
                        <span className="nav-text">Catalog</span>
                    </NavLink>
                )}

                <NavLink to="/workflows" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <FileText size={20} />
                    <span className="nav-text">Workflows</span>
                </NavLink>

                <NavLink to="/workflows/finder" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Search size={20} />
                    <span className="nav-text">Universal Finder</span>
                </NavLink>

                <NavLink to="/storage" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Folder size={20} color="#3b82f6" />
                    <span className="nav-text" style={{ fontWeight: 600 }}>Storage Directory</span>
                </NavLink>

                {hasAccess('reports') && (
                    <NavLink to="/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <FileText size={20} />
                        <span className="nav-text">Reports</span>
                    </NavLink>
                )}

                {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
                    <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <ShieldCheck size={20} color="#60a5fa" />
                        <span className="nav-text" style={{ color: '#93c5fd' }}>User Control</span>
                    </NavLink>
                )}

                <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Settings size={20} />
                    <span className="nav-text">Setting</span>
                </NavLink>
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="integration-status" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                        <span className="nav-text">Integration Status: </span><span style={{ color: '#4ade80', fontWeight: 'bold' }}>•</span>
                    </p>
                </div>

                <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
                    <p className="nav-text" style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.7)', margin: 0, letterSpacing: '0.02em' }}>
                        &copy; 2026 Cel-Ron Enterprises.<br />Global Maritime Excellence.
                    </p>
                </div>
            </div>
        </aside>
    );
}

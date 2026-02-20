import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Ship, MapPin } from 'lucide-react';

export default function Sidebar() {
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

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end
                >
                    <LayoutDashboard size={20} />
                    <span className="nav-text">Dashboard</span>
                </NavLink>

                <NavLink
                    to="/partners"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <Users size={20} />
                    <span className="nav-text">Partners</span>
                </NavLink>

                <NavLink
                    to="/contacts"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <FileText size={20} />
                    <span className="nav-text">Contacts</span>
                </NavLink>

                <NavLink
                    to="/vessels"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <Ship size={20} />
                    <span className="nav-text">Vessels</span>
                </NavLink>

                <NavLink
                    to="/work-locations"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <MapPin size={20} />
                    <span className="nav-text">Work Locations</span>
                </NavLink>

                <NavLink
                    to="/reports"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <FileText size={20} />
                    <span className="nav-text">Reports</span>
                </NavLink>

                <NavLink
                    to="/settings"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <Settings size={20} />
                    <span className="nav-text">Module Settings</span>
                </NavLink>
            </nav>

            <div className="integration-status" style={{ marginTop: 'auto', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span className="nav-text">Integration Status: </span><span style={{ color: '#4ade80', fontWeight: 'bold' }}>•</span>
                </p>
            </div>
        </aside>
    );
}

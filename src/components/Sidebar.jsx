import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Settings, Ship, MapPin, Building2, Package, LogOut, ShieldCheck, Search, Tags, Hexagon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
    const { profile, signOut } = useAuth();

    // Check if user has access to a specific module
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

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    end
                >
                    <LayoutDashboard size={20} />
                    <span className="nav-text">Dashboard</span>
                </NavLink>

                {hasAccess('partners') && (
                    <>
                        <NavLink
                            to="/partners"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Building2 size={20} />
                            <span className="nav-text">Partners</span>
                        </NavLink>
                        <NavLink
                            to="/categories"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Tags size={20} />
                            <span className="nav-text">Categories</span>
                        </NavLink>
                        <NavLink
                            to="/brands"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Hexagon size={20} />
                            <span className="nav-text">Brands</span>
                        </NavLink>
                    </>
                )}

                {hasAccess('contacts') && (
                    <NavLink
                        to="/contacts"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Users size={20} />
                        <span className="nav-text">Contacts</span>
                    </NavLink>
                )}

                {hasAccess('vessels') && (
                    <NavLink
                        to="/vessels"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Ship size={20} />
                        <span className="nav-text">Vessels</span>
                    </NavLink>
                )}

                {hasAccess('work-locations') && (
                    <NavLink
                        to="/work-locations"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <MapPin size={20} />
                        <span className="nav-text">Work Locations</span>
                    </NavLink>
                )}

                {hasAccess('catalog') && (
                    <NavLink
                        to="/catalog"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <Package size={20} />
                        <span className="nav-text">Catalog</span>
                    </NavLink>
                )}

                <NavLink
                    to="/workflows"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <FileText size={20} />
                    <span className="nav-text">Workflows</span>
                </NavLink>

                <NavLink
                    to="/workflows/finder"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                    <Search size={20} />
                    <span className="nav-text">Universal Finder</span>
                </NavLink>

                {hasAccess('reports') && (
                    <NavLink
                        to="/reports"
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        <FileText size={20} />
                        <span className="nav-text">Reports</span>
                    </NavLink>
                )}

                {/* Always explicitly check if they are an admin or superadmin to show settings/user management */}
                {(profile?.role === 'superadmin' || profile?.role === 'admin') && (
                    <>
                        <NavLink
                            to="/admin/users"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <ShieldCheck size={20} color="#60a5fa" />
                            <span className="nav-text" style={{ color: '#93c5fd' }}>User Control</span>
                        </NavLink>

                        <NavLink
                            to="/settings"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Settings size={20} />
                            <span className="nav-text">Module Settings</span>
                        </NavLink>
                    </>
                )}
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {profile && (
                    <div className="user-profile-badge" style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '0.85rem', color: '#fff', margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {profile.email}
                            </p>
                            <span style={{ fontSize: '0.7rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 600 }}>
                                {profile.role}
                            </span>
                        </div>
                        <button
                            onClick={() => signOut()}
                            title="Sign Out"
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                )}

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

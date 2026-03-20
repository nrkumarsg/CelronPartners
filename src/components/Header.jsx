import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogOut, Bell, Building2, User, ChevronDown, Search, X, Folder, FileText, Briefcase, LayoutDashboard, StickyNote, MessageSquare, Loader2, Package } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getTodos } from '../lib/todoService';
import { searchInternal, searchDrive } from '../lib/searchService';
import { useNavigate } from 'react-router-dom';

export default function Header() {
    const { profile, signOut, companies, activeCompanyId, activeCompany, switchCompany } = useAuth();
    const navigate = useNavigate();
    const [todoCount, setTodoCount] = useState(0);
    const [showCompanyMenu, setShowCompanyMenu] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);
    const inputRef = useRef(null);

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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        const handleKeyDown = (e) => {
            // '/' shortcut to focus search
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                inputRef.current?.focus();
            }
            // 'Esc' to close results
            if (e.key === 'Escape') {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const performSearch = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const [internal, drive] = await Promise.all([
                searchInternal(query, activeCompanyId),
                searchDrive(query, localStorage.getItem('google_access_token'))
            ]);
            setSearchResults([...(internal.results || []), ...drive]);
            setShowResults(true);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setIsSearching(false);
        }
    }, [activeCompanyId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) performSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    if (!profile) return null;


    return (
        <header className="top-header">
            <div className="header-left">
                {/* Company Switcher */}
                {companies.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'rgba(99, 102, 241, 0.05)',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: 600,
                                color: '#1e293b',
                                fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                        >
                            <div style={{
                                width: '28px',
                                height: '28px',
                                background: activeCompany.logo_url ? '#fff' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                overflow: 'hidden',
                                border: activeCompany.logo_url ? '1px solid rgba(0,0,0,0.05)' : 'none'
                            }}>
                                {activeCompany.logo_url ? (
                                    <img src={activeCompany.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                    <Building2 size={16} />
                                )}
                            </div>
                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeCompany.name}
                            </span>
                            <ChevronDown size={16} />
                        </button>

                        {showCompanyMenu && (
                            <>
                                <div
                                    style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                    onClick={() => setShowCompanyMenu(false)}
                                />
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: 0,
                                    width: '280px',
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid #e2e8f0',
                                    zIndex: 999,
                                    overflow: 'hidden',
                                    padding: '8px',
                                    animation: 'fadeInUp 0.2s ease-out'
                                }}>
                                    <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Switch Company
                                    </div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {companies.map(comp => (
                                            <button
                                                key={comp.id}
                                                onClick={() => {
                                                    switchCompany(comp.id);
                                                    setShowCompanyMenu(false);
                                                    window.location.reload(); // Refresh to clear data buffers
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: activeCompanyId === comp.id ? '#f1f5f9' : 'transparent',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = activeCompanyId === comp.id ? '#f1f5f9' : '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = activeCompanyId === comp.id ? '#f1f5f9' : 'transparent'}
                                            >
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    background: comp.logo_url ? '#fff' : '#f1f5f9',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#64748b',
                                                    overflow: 'hidden',
                                                    border: comp.logo_url ? '1px solid #e2e8f0' : 'none'
                                                }}>
                                                    {comp.logo_url ? (
                                                        <img src={comp.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <Building2 size={16} />
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                                    <span style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: activeCompanyId === comp.id ? 700 : 500,
                                                        color: activeCompanyId === comp.id ? '#1e293b' : '#64748b',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {comp.name}
                                                    </span>
                                                    {activeCompanyId === comp.id && (
                                                        <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 600 }}>Active Workspace</span>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Universal Search Bar */}
            <div className="header-center" ref={searchRef} style={{ flex: 1, maxWidth: '600px', margin: '0 40px', position: 'relative' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                        {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search jobs, enquiries, files or notes... (Press '/' to focus)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                        style={{
                            width: '100%',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '12px 16px 12px 48px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            outline: 'none',
                            transition: 'all 0.2s',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Search Results Overlay */}
                {showResults && searchResults.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e2e8f0',
                        zIndex: 1000,
                        maxHeight: '480px',
                        overflowY: 'auto',
                        padding: '12px 0'
                    }}>
                        {/* Group Results by Type */}
                        {['Job', 'Enquiry', 'Partner', 'Catalog', 'Note', 'Wall Activity', 'File'].map(type => {
                            const groupResults = searchResults.filter(r => r.type === type);
                            if (groupResults.length === 0) return null;
                            
                            return (
                                <div key={type} style={{ marginBottom: '8px' }}>
                                    <div style={{ padding: '0 16px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        {type === 'File' ? 'Cloud Files' : type}
                                    </div>
                                    {groupResults.slice(0, 5).map(result => (
                                        <div
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => {
                                                if (result.isExternal) window.open(result.link, '_blank');
                                                else navigate(result.link);
                                                setShowResults(false);
                                                setSearchQuery('');
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                background: 'transparent'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ color: '#6366f1' }}>
                                                {result.type === 'Job' && <Briefcase size={18} />}
                                                {result.type === 'Enquiry' && <LayoutDashboard size={18} />}
                                                {result.type === 'Partner' && <Building2 size={18} />}
                                                {result.type === 'Catalog' && <Package size={18} />}
                                                {result.type === 'Note' && <StickyNote size={18} />}
                                                {result.type === 'Wall Activity' && <MessageSquare size={18} />}
                                                {result.type === 'File' && <Folder size={18} />}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {result.label}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {result.sublabel}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {/* Pagination Trigger */}
                        <div 
                            onClick={() => {
                                navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                                setShowResults(false);
                            }}
                            style={{ 
                                padding: '12px 16px', 
                                textAlign: 'center', 
                                fontSize: '0.85rem', 
                                fontWeight: 700, 
                                color: '#6366f1', 
                                borderTop: '1px solid #f1f5f9', 
                                marginTop: '8px', 
                                cursor: 'pointer' 
                            }}
                        >
                            See All Results in Dashboard
                        </div>
                    </div>
                )}
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

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </header>
    );
}

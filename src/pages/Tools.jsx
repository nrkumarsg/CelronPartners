import React, { useState, useEffect } from 'react';
import { Search, Globe, Plus, ExternalLink, Bookmark, Shield, User, Filter, LayoutGrid, List } from 'lucide-react';
import { getUserTools } from '../lib/toolService';
import { useNavigate } from 'react-router-dom';

export default function Tools() {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const navigate = useNavigate();

    useEffect(() => {
        fetchTools();
    }, []);

    const fetchTools = async () => {
        setLoading(true);
        const { data } = await getUserTools();
        if (data) setTools(data);
        setLoading(false);
    };

    const groups = ['All', ...new Set(tools.map(t => t.group_name || 'General'))];

    const filteredTools = tools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (tool.group_name && tool.group_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (tool.notes && tool.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesGroup = selectedGroup === 'All' || (tool.group_name || 'General') === selectedGroup;
        return matchesSearch && matchesGroup;
    });

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100%', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Tools & Resources
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Quick access to your frequently visited maritime and business portals.</p>
                </div>
                <button
                    onClick={() => navigate('/settings')}
                    className="btn btn-primary"
                    style={{ background: '#ec4899', borderColor: '#db2777' }}
                >
                    <Plus size={18} /> Manage My Tools
                </button>
            </header>

            {/* Controls Bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search tools, links or credentials..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.95rem' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Filter size={16} color="#64748b" />
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        style={{ border: 'none', outline: 'none', background: 'transparent', color: '#64748b', fontWeight: 500, fontSize: '0.9rem' }}
                    >
                        {groups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{ padding: '8px', borderRadius: '8px', border: 'none', background: viewMode === 'grid' ? '#fff' : 'transparent', color: viewMode === 'grid' ? '#6366f1' : '#94a3b8', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '8px', borderRadius: '8px', border: 'none', background: viewMode === 'list' ? '#fff' : 'transparent', color: viewMode === 'list' ? '#6366f1' : '#94a3b8', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading tools...</div>
            ) : filteredTools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', background: '#fff', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                    <Globe size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No tools found</h3>
                    <p style={{ margin: 0, color: '#64748b' }}>Try adjusting your search or add a new portal in your settings.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {filteredTools.map(tool => (
                        <div key={tool.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', border: tool.is_pinned ? '2px solid #ec4899' : '1px solid #e2e8f0' }}>
                            {tool.is_pinned && (
                                <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#ec4899', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Pinned
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {tool.logo_url ? <img src={tool.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Globe size={24} color="#94a3b8" />}
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>{tool.name}</h4>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{tool.group_name || 'General'}</span>
                                </div>
                            </div>

                            {tool.notes && (
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '0.8rem', color: '#475569', whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid #f1f5f9' }}>
                                    {tool.notes}
                                </div>
                            )}

                            <a
                                href={tool.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    marginTop: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    background: '#6366f1',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Open Portal <ExternalLink size={14} />
                            </a>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '0' }}>
                    <div className="table-container" style={{ maxHeight: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Portal</th>
                                    <th>Group</th>
                                    <th>Link</th>
                                    <th>Credentials / Notes</th>
                                    <th style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTools.map(tool => (
                                    <tr key={tool.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', background: '#f8fafc', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {tool.logo_url ? <img src={tool.logo_url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Globe size={16} color="#94a3b8" />}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{tool.name}</span>
                                                {tool.is_pinned && <Bookmark size={14} fill="#ec4899" color="#ec4899" />}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{tool.group_name || 'General'}</span>
                                        </td>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <a href={tool.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#6366f1' }}>{tool.url}</a>
                                        </td>
                                        <td>
                                            <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{tool.notes || '-'}</code>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <a href={tool.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                                <ExternalLink size={14} /> Open Tool
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

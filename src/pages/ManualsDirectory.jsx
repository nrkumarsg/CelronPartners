import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Book, FileText, Globe, Trash2, ExternalLink, Filter, Grid, List, Edit, Sparkles } from 'lucide-react';
import { getManuals, deleteManual } from '../lib/manualsService';

export default function ManualsDirectory() {
    const [manuals, setManuals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [manualFolderId, setManualFolderId] = useState(localStorage.getItem('manual_drive_folder_id') || '');

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const navigate = useNavigate();

    useEffect(() => {
        fetchManuals();
        tryDetectFolder();
    }, []);

    const tryDetectFolder = async () => {
        const token = sessionStorage.getItem('google_contacts_token');
        if (token && !manualFolderId) {
            try {
                const { getOrCreateFolder } = await import('../lib/driveService');
                const id = await getOrCreateFolder(token, 'Manual');
                if (id) {
                    setManualFolderId(id);
                    localStorage.setItem('manual_drive_folder_id', id);
                }
            } catch (err) {
                console.error("Error detecting folder:", err);
            }
        }
    };

    const handleOpenDrive = () => {
        const url = manualFolderId
            ? `https://drive.google.com/drive/folders/${manualFolderId}`
            : 'https://drive.google.com';
        window.open(url, '_blank');
    };

    const fetchManuals = async () => {
        setLoading(true);
        const { data } = await getManuals();
        if (data) setManuals(data);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Remove this manual from library?')) {
            await deleteManual(id);
            fetchManuals();
        }
    };

    const filteredManuals = manuals.filter(m =>
        m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.author_company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', maxWidth: '100%', margin: '0', background: '#f8fafc', minHeight: '100vh' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        Manuals & Ref. Books
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Technical library & Google Drive Cloud Storage</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleOpenDrive}
                        style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <Globe size={18} color="#4285F4" /> Open Manual Folder
                    </button>
                    <button
                        onClick={() => navigate('/manuals/new')}
                        className="btn btn-secondary"
                        style={{ padding: '10px 20px', borderRadius: '10px' }}
                    >
                        <Plus size={18} /> Add New Manual
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}><Search size={20} /></div>
                    <input
                        type="text"
                        placeholder="Search by title, group, or author..."
                        style={{ flex: 1, border: 'none', outline: 'none', padding: '12px', fontSize: '1rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '4px' }}>
                    <button onClick={() => setViewMode('grid')} style={{ padding: '8px', background: viewMode === 'grid' ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'grid' ? '#6366f1' : '#64748b' }}>
                        <Grid size={20} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{ padding: '8px', background: viewMode === 'list' ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'list' ? '#6366f1' : '#64748b' }}>
                        <List size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
                    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                    <p>Loading your technical library...</p>
                </div>
            ) : filteredManuals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', background: '#fff', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                    <Book size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: '#475569', margin: '0 0 8px 0' }}>No manuals found</h3>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Start by uploading your first technical reference.</p>
                </div>
            ) : (
                <div style={{
                    display: viewMode === 'grid' ? 'grid' : 'block',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px'
                }}>
                    {filteredManuals.map(manual => (
                        <div key={manual.id} className="glass-panel" style={{ padding: '20px', marginBottom: viewMode === 'list' ? '12px' : '0', display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: viewMode === 'list' ? '48px' : '100%', height: viewMode === 'list' ? '48px' : '160px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: viewMode === 'grid' ? '16px' : '0' }}>
                                <FileText size={viewMode === 'list' ? 24 : 48} color="#94a3b8" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b' }}>{manual.title}</h3>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>{manual.group_name}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{manual.author_company}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => navigate('/workflows/ai-assistant')}
                                        className="btn btn-primary"
                                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#a855f7' }}
                                    >
                                        <Sparkles size={14} /> AI Chat
                                    </button>
                                    <a
                                        href={manual.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary"
                                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <ExternalLink size={14} /> View
                                    </a>
                                    <button
                                        onClick={() => navigate(`/manuals/${manual.id}`)}
                                        style={{ padding: '8px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer' }}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(manual.id)} style={{ padding: '8px', background: 'none', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

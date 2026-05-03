import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Globe, Trash2, ExternalLink, Grid, List, Edit, FileCheck, Loader2, FolderOpen } from 'lucide-react';
import { getDocumentSettings } from '../lib/store';
import { listFolderContent, getOrCreateFolder, uploadFileToDrive } from '../lib/driveService';
import { useAuth } from '../contexts/AuthContext';

export default function FormsDirectory() {
    const { profile } = useAuth();
    const [stationeryItems, setStationeryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stationeryFolderId, setStationeryFolderId] = useState(null);
    const [settings, setSettings] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const navigate = useNavigate();

    useEffect(() => {
        if (profile?.company_id) {
            initStationery();
        }
    }, [profile]);

    const initStationery = async () => {
        setLoading(true);
        try {
            const settingsData = await getDocumentSettings(profile.company_id);
            setSettings(settingsData);

            const accessToken = localStorage.getItem('google_access_token');
            if (!accessToken) throw new Error("Google Drive not connected");

            // 1. Determine the Stationery Folder ID
            let folderId = settingsData?.gdrive_stationery_id;

            if (!folderId && settingsData?.gdrive_04_id) {
                // If not saved in DB, try to find "01. Company_Stationery" under Vault (04)
                folderId = await getOrCreateFolder(accessToken, '01. Company_Stationery', settingsData.gdrive_04_id);
            }

            if (folderId) {
                setStationeryFolderId(folderId);
                const items = await listFolderContent(accessToken, folderId);
                setStationeryItems(items);
            }
        } catch (err) {
            console.error("Stationery error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDrive = () => {
        const url = stationeryFolderId
            ? `https://drive.google.com/drive/folders/${stationeryFolderId}`
            : 'https://drive.google.com';
        window.open(url, '_blank');
    };

    const filteredItems = stationeryItems.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getFileIcon = (mimeType) => {
        if (mimeType.includes('folder')) return <FolderOpen size={32} color="#3b82f6" />;
        if (mimeType.includes('pdf')) return <FileText size={32} color="#ef4444" />;
        if (mimeType.includes('image')) return <FileText size={32} color="#ec4899" />;
        return <FileText size={32} color="#6366f1" />;
    };

    return (
        <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', color: '#334155' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        Stationery Directory
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                        <Globe size={14} color="#4285F4" />
                        <span style={{ fontSize: '0.9rem' }}>Synced with Google Drive: <b>01. Company_Stationery</b></span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleOpenDrive}
                        style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <ExternalLink size={18} /> Open in Drive
                    </button>
                    <button
                        onClick={() => navigate('/storage?tab=explorer&folder=vault')}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' }}
                    >
                        <FolderOpen size={18} /> Manage Vault
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}><Search size={20} /></div>
                    <input
                        type="text"
                        placeholder="Search stationery documents..."
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
                    <Loader2 className="animate-spin" size={40} color="#6366f1" style={{ margin: '0 auto 20px' }} />
                    <p style={{ fontWeight: 500 }}>Syncing with Company Stationery...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', background: '#fff', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                    <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: '#475569', margin: '0 0 8px 0' }}>No stationery found</h3>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Add documents to your <b>01. Company_Stationery</b> folder in Drive to see them here.</p>
                </div>
            ) : (
                <div style={{
                    display: viewMode === 'grid' ? 'grid' : 'block',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px'
                }}>
                    {filteredItems.map(item => (
                        <div 
                            key={item.id} 
                            onClick={() => window.open(item.webViewLink, '_blank')}
                            style={{ 
                                padding: '24px', 
                                background: '#fff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: viewMode === 'list' ? 'flex' : 'block',
                                alignItems: 'center',
                                gap: '20px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = '#6366f1';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            <div style={{ 
                                width: viewMode === 'list' ? '48px' : '100%', 
                                height: viewMode === 'list' ? '48px' : '120px', 
                                background: '#f8fafc', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                marginBottom: viewMode === 'grid' ? '16px' : '0' 
                            }}>
                                {getFileIcon(item.mimeType)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Updated {new Date(item.createdTime).toLocaleDateString()}</span>
                                    <ExternalLink size={14} color="#94a3b8" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

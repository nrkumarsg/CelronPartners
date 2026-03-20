import React, { useState, useEffect } from 'react';
import { 
    Folder, File, ChevronRight, Search, X, 
    ArrowLeft, Loader2, CheckCircle2, MoreVertical, 
    Plus, HardDrive, Clock, Calendar, Briefcase, 
    Shield, Smartphone, Move
} from 'lucide-react';
import { listFolderContent, createFolderStructure, moveFile } from '../../lib/driveService';
import { initializeVault } from '../../lib/vaultService';
import { useAuth } from '../../contexts/AuthContext';

/**
 * DriveFileMover - A modal to organize files from the Scan Inbox into the Tiered Hierarchy.
 */
export default function DriveFileMover({ file, isOpen, onClose, onMoveComplete }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [moving, setMoving] = useState(false);
    const [path, setPath] = useState([]); // Array of { id, name }
    const [items, setItems] = useState([]);
    const [tierRoots, setTierRoots] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(false);

    useEffect(() => {
        if (isOpen && profile) {
            setupRoots();
        }
    }, [isOpen, profile]);

    const setupRoots = async () => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const roots = await initializeVault(accessToken, profile.company_id);
            setTierRoots(roots);
            
            // Start at CELRON root or show categories
            setItems([
                { id: roots.timeBasedId, name: '01. TIME_BASED', type: 'folder', icon: <Clock size={16} color="#3b82f6" /> },
                { id: roots.permanentId, name: '02. PERMANENT_RECORDS', type: 'folder', icon: <Shield size={16} color="#10b981" /> },
                { id: roots.shortTermId, name: '03. SHORT_TERM_PROJECTS', type: 'folder', icon: <Calendar size={16} color="#f59e0b" /> },
                { id: roots.corpVaultId, name: '04. CORPORATE_VAULT', type: 'folder', icon: <Briefcase size={16} color="#8b5cf6" /> }
            ]);
            setPath([{ id: roots.celronRootId, name: 'CELRON' }]);
        } catch (error) {
            console.error('Error setting up mover:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = async (folderId, folderName) => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const files = await listFolderContent(accessToken, folderId);
            setItems(files.map(f => ({
                id: f.id,
                name: f.name,
                type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file'
            })));
            setPath(prev => [...prev, { id: folderId, name: folderName }]);
        } catch (error) {
            console.error('Navigation error:', error);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        if (path.length <= 1) return;
        const newPath = path.slice(0, -1);
        const parent = newPath[newPath.length - 1];
        setPath(newPath);
        fetchItems(parent.id);
    };

    const fetchItems = async (id) => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const files = await listFolderContent(accessToken, id);
            setItems(files.map(f => ({
                id: f.id,
                name: f.name,
                type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file'
            })));
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const currentFolder = path[path.length - 1];
            await createFolderStructure(accessToken, newFolderName, currentFolder.id);
            setNewFolderName('');
            setShowNewFolder(false);
            fetchItems(currentFolder.id);
        } catch (error) {
            alert('Failed to create folder');
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        setMoving(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const destination = path[path.length - 1];
            await moveFile(accessToken, file.id, destination.id);
            onMoveComplete(file.id, destination.name);
            onClose();
        } catch (error) {
            alert('Move failed: ' + error.message);
        } finally {
            setMoving(false);
        }
    };

    if (!isOpen) return null;

    const currentFolder = path[path.length - 1];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
            <div style={{
                width: '100%', maxWidth: '500px', background: '#fff', 
                borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '80vh'
            }}>
                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Organize Scan</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '40px', height: '40px', background: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                            <File size={20} color="#64748b" />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file?.name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Moving to: {currentFolder?.name}</p>
                        </div>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
                    {path.length > 1 && (
                        <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}>
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    {path.map((p, idx) => (
                        <React.Fragment key={p.id}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: idx === path.length - 1 ? '#6366f1' : '#94a3b8', whiteSpace: 'nowrap' }}>{p.name}</span>
                            {idx < path.length - 1 && <ChevronRight size={14} color="#cbd5e1" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* File List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: '#94a3b8' }}>
                            <Loader2 className="animate-spin" size={32} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {items.filter(i => i.type === 'folder').map(item => (
                                <button 
                                    key={item.id}
                                    onClick={() => navigateTo(item.id, item.name)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                        background: 'none', border: 'none', width: '100%', textAlign: 'left',
                                        borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                        color: '#475569', hover: { background: '#f1f5f9' }
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <div style={{ minWidth: '24px' }}>{item.icon || <Folder size={18} color="#3b82f6" />}</div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1 }}>{item.name}</span>
                                    <ChevronRight size={16} color="#cbd5e1" />
                                </button>
                            ))}
                            
                            {showNewFolder ? (
                                <div style={{ display: 'flex', gap: '8px', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '10px', marginTop: '8px' }}>
                                    <input 
                                        autoFocus
                                        value={newFolderName}
                                        onChange={e => setNewFolderName(e.target.value)}
                                        placeholder="Folder name..."
                                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.9rem' }}
                                        onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                                    />
                                    <button onClick={handleCreateFolder} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: 600 }}>Create</button>
                                    <button onClick={() => setShowNewFolder(false)} style={{ color: '#64748b', background: 'none', border: 'none', fontSize: '0.8rem' }}>Cancel</button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setShowNewFolder(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'none', border: '1px dashed #e2e8f0', borderRadius: '10px', cursor: 'pointer', color: '#64748b', marginTop: '12px' }}
                                >
                                    <Plus size={18} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Create New Sub-directory</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>Cancel</button>
                    <button 
                        disabled={moving || loading || path.length < 2}
                        onClick={handleMove}
                        style={{ 
                            flex: 2, padding: '12px', borderRadius: '12px', border: 'none', 
                            background: moving ? '#cbd5e1' : '#6366f1', color: '#fff', 
                            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', gap: '8px' 
                        }}
                    >
                        {moving ? <Loader2 size={18} className="animate-spin" /> : <><Move size={18} /> Move to {currentFolder?.name.length > 15 ? 'this folder' : currentFolder?.name}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

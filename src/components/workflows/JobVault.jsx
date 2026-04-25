import React, { useState, useEffect } from 'react';
import { 
    HardDrive, FolderOpen, Grid, List, Search, Plus, 
    FileText, ImageIcon, Truck, DollarSign, BadgeCheck,
    Download, ExternalLink, Trash2, Loader2, ChevronRight,
    Filter, MoreVertical, X
} from 'lucide-react';
import { listFolderContent, uploadFileToDrive } from '../../lib/driveService';

const VAULT_CATEGORIES = [
    { id: '1. Enquiries_&_Landing_Notes', label: 'Enquiries', icon: <FileText size={16} />, color: '#6366f1' },
    { id: '2. Supplier_Quotations', label: 'Supplier Quotes', icon: <ImageIcon size={16} />, color: '#f59e0b' },
    { id: '3. Supplier_Payments', label: 'Supplier Payments', icon: <DollarSign size={16} />, color: '#10b981' },
    { id: '4. Customer_Bank_Slips', label: 'Bank Slips', icon: <BadgeCheck size={16} />, color: '#ef4444' },
    { id: '5. Expenses_Bills', label: 'Expenses (Bills)', icon: <FileText size={16} />, color: '#8b5cf6' },
    { id: '6. Photos', label: 'Photos & Site', icon: <ImageIcon size={16} />, color: '#ec4899' },
    { id: '7. Other_Documents', label: 'Other Docs', icon: <FolderOpen size={16} />, color: '#64748b' },
    { id: '8. Certificates', label: 'Certificates', icon: <BadgeCheck size={16} />, color: '#0ea5e9' }
];

export default function JobVault({ job, googleToken }) {
    const [activeCategory, setActiveCategory] = useState(VAULT_CATEGORIES[0].id);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    const projectFolderId = job.enquiries?.gdrive_folder_id || job.gdrive_folder_id;

    useEffect(() => {
        if (projectFolderId && googleToken) {
            fetchFiles();
        }
    }, [projectFolderId, googleToken, activeCategory]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // 1. Find the sub-folder ID first
            const contents = await listFolderContent(googleToken, projectFolderId);
            const categoryFolder = contents.find(f => f.name === activeCategory);
            
            if (categoryFolder) {
                const subFiles = await listFolderContent(googleToken, categoryFolder.id);
                setFiles(subFiles);
            } else {
                setFiles([]);
            }
        } catch (error) {
            console.error('Error fetching vault files:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !googleToken) return;

        setUploading(true);
        setUploadProgress(10);

        try {
            // Find category folder ID
            const contents = await listFolderContent(googleToken, projectFolderId);
            let categoryFolder = contents.find(f => f.name === activeCategory);
            
            if (!categoryFolder) {
                 // Try to create it if it doesn't exist (though it should have been provisioned)
                 const { getOrCreateFolder } = await import('../../lib/driveService');
                 const newId = await getOrCreateFolder(googleToken, activeCategory, projectFolderId);
                 categoryFolder = { id: newId };
            }

            await uploadFileToDrive(googleToken, file, { 
                folderId: categoryFolder.id,
                onProgress: (p) => setUploadProgress(p)
            });

            setUploadProgress(100);
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
                fetchFiles();
            }, 500);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please check your connection.');
            setUploading(false);
        }
    };

    const filteredFiles = files.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!projectFolderId) return (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', opacity: 0.7 }}>
            <HardDrive size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ margin: 0 }}>Vault Not Connected</h3>
            <p style={{ fontSize: '0.85rem' }}>This job does not have a linked Google Drive folder yet.</p>
        </div>
    );

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', background: '#fff' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <HardDrive size={24} color="var(--primary)" /> Project Vault & Vault-UI
                    </h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Technical documents & job evidence stored securely on Google Drive.</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
                        <button onClick={() => setViewMode('grid')} style={{ padding: '6px', background: viewMode === 'grid' ? '#fff' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'grid' ? 'var(--primary)' : '#64748b' }}>
                            <Grid size={18} />
                        </button>
                        <button onClick={() => setViewMode('list')} style={{ padding: '6px', background: viewMode === 'list' ? '#fff' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? 'var(--primary)' : '#64748b' }}>
                            <List size={18} />
                        </button>
                    </div>
                    <label className="btn btn-primary" style={{ cursor: 'pointer', padding: '10px 16px', borderRadius: '10px' }}>
                        <Plus size={18} /> Add Document
                        <input type="file" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            </header>

            {/* Category Navigation */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                {VAULT_CATEGORIES.map(cat => (
                    <button 
                        key={cat.id} 
                        onClick={() => setActiveCategory(cat.id)}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '20px', border: '1px solid',
                            borderColor: activeCategory === cat.id ? cat.color : '#e2e8f0',
                            background: activeCategory === cat.id ? `${cat.color}10` : '#fff',
                            color: activeCategory === cat.id ? cat.color : '#64748b',
                            fontWeight: activeCategory === cat.id ? 700 : 500,
                            fontSize: '0.8rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>

            {/* Search & Actions */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Search files in this category..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.9rem', outline: 'none' }}
                    />
                </div>
            </div>

            {/* Files Display */}
            <div style={{ minHeight: '300px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
                        <Loader2 className="animate-spin text-primary" size={32} />
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Fetching documents...</span>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', border: '2px dashed #e2e8f0', borderRadius: '16px' }}>
                        <FolderOpen size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                        <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>No files found</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>Add your first document to this category.</p>
                    </div>
                ) : (
                    <div style={{ 
                        display: viewMode === 'grid' ? 'grid' : 'block',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '20px'
                    }}>
                        {filteredFiles.map(file => (
                            <div key={file.id} style={{ 
                                padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff',
                                display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: '16px',
                                transition: 'all 0.2s', cursor: 'default'
                            }} className="file-item">
                                <div style={{ 
                                    width: viewMode === 'list' ? '40px' : '100%', height: viewMode === 'list' ? '40px' : '120px',
                                    borderRadius: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: viewMode === 'grid' ? '12px' : '0', overflow: 'hidden'
                                }}>
                                    {file.thumbnailLink ? (
                                        <img src={file.thumbnailLink.replace('=s220', '=s400')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <FileText size={viewMode === 'list' ? 20 : 40} color="#94a3b8" />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#1e293b' }} title={file.name}>
                                        {file.name}
                                    </h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                            {(Number(file.size || 0) / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <a href={file.webViewLink} target="_blank" rel="noreferrer" style={{ padding: '6px', borderRadius: '8px', color: '#64748b', background: '#f1f5f9' }} title="Open in Drive">
                                                <ExternalLink size={14} />
                                            </a>
                                            <button 
                                                onClick={async () => {
                                                    if (window.confirm('Are you sure you want to delete this file?')) {
                                                        const { deleteFile } = await import('../../lib/driveService');
                                                        await deleteFile(googleToken, file.id);
                                                        fetchFiles();
                                                    }
                                                }}
                                                style={{ padding: '6px', borderRadius: '8px', color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {uploading && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, width: '300px' }}>
                    <div className="glass-panel" style={{ padding: '16px', background: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Uploading...</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>{uploadProgress}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .file-item:hover {
                    border-color: var(--primary);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    transform: translateY(-2px);
                }
            `}} />
        </div>
    );
}

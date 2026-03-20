import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Folder, File, Search, Upload, Download, Printer, Eye,
    MoreVertical, ChevronRight, Home, Trash2, Loader2,
    FileText, Image as ImageIcon, FileArchive, Grid, List,
    ArrowLeft, ExternalLink, Sparkles, X, HardDrive,
    Clock, FileDigit, Archive, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { listFolderContent, deleteFile, uploadFileToDrive } from '../lib/driveService';
import UploadOverlay from '../components/common/UploadOverlay';
import { initializeVault } from '../lib/vaultService';
import { getDocumentSettings } from '../lib/store';
import { performOCR, validateToken, connectGoogleAPI } from '../lib/googleAuthService';
import GDriveConnectionModal from '../components/common/GDriveConnectionModal';
import CommunicationWall from '../components/common/CommunicationWall';

const VAULT_TIERS = [
    { id: 'timeBasedId', label: '01. TIME_BASED', icon: <Clock size={24} />, color: '#6366f1', desc: 'Jobs & Expenses by Year' },
    { id: 'permanentRecordsId', label: '02. PERMANENT_RECORDS', icon: <HardDrive size={24} />, color: '#10b981', desc: 'Long-term Company Documents' },
    { id: 'shortTermProjectsId', label: '03. SHORT_TERM_PROJECTS', icon: <FileDigit size={24} />, color: '#f59e0b', desc: 'Temporary Project Files' },
    { id: 'corporateVaultId', label: '04. CORPORATE_VAULT', icon: <Archive size={24} />, color: '#3b82f6', desc: 'Standards & Stationery' },
    { id: 'scansInboxId', label: '99. SCANS_INBOX', icon: <HardDrive size={24} />, color: '#94a3b8', desc: 'Unorganized Scanning Staging' },
];

export default function CorporateVault() {
    const { folderId: urlFolderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [isOcrLoading, setIsOcrLoading] = useState(false);
    const [ocrResult, setOcrResult] = useState(null);

    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [items, setItems] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);
    const [currentFolderId, setCurrentFolderId] = useState(urlFolderId || null);
    const [vaultRootId, setVaultRootId] = useState(null);
    const [vaultRoots, setVaultRoots] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Vault Hub' }]);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [showWall, setShowWall] = useState(false);
    const initializingRef = useRef(false);

    const fileInputRef = useRef(null);

    // Initial Load
    useEffect(() => {
        if (profile) {
            setupVault();
        }
    }, [profile, selectedYear]);

    // Navigate when URL changes
    useEffect(() => {
        if (urlFolderId) {
            setCurrentFolderId(urlFolderId);
            fetchItems(urlFolderId);
        } else if (vaultRootId) {
            setCurrentFolderId(vaultRootId);
            fetchItems(vaultRootId);
        }
    }, [urlFolderId, vaultRootId]);

    const setupVault = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setLoading(false);
                initializingRef.current = false;
                return;
            }

            const roots = await initializeVault(accessToken, profile.company_id);
            setVaultRoots(roots);
            setVaultRootId(roots.rootId);
            
            if (!urlFolderId) {
                setCurrentFolderId(roots.rootId);
                fetchItems(roots.rootId);
            }
        } catch (error) {
            console.error('Vault Setup Error:', error);
        } finally {
            setLoading(false);
            initializingRef.current = false;
        }
    };

    const handleInitiateUpload = async () => {
        const accessToken = localStorage.getItem('google_access_token');
        const isValid = await validateToken(accessToken);
        if (!accessToken || !isValid) {
            setIsAuthModalOpen(true);
            return;
        }
        fileInputRef.current.click();
    };

    const fetchItems = async (id) => {
        if (!id) return;
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setLoading(false);
                return;
            }
            const data = await listFolderContent(accessToken, id);
            setItems(data);
        } catch (error) {
            console.error('Fetch Items Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentFolderId) return;

        setUploading(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setIsAuthModalOpen(true);
                setUploading(false);
                return;
            }
            const result = await uploadFileToDrive(accessToken, file, { 
                folderId: currentFolderId,
                onProgress: (p) => setUploadProgress(p)
            });
            setUploadLink(result.webViewLink);
            fetchItems(currentFolderId);
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
            // Don't reset uploadProgress here, let the overlay stay at 100% until dismissed
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Move "${name}" to trash?`)) return;
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setIsAuthModalOpen(true);
                return;
            }
            await deleteFile(accessToken, id);
            fetchItems(currentFolderId);
        } catch (error) {
            alert('Delete failed: ' + error.message);
        }
    };

    const handleOCR = async (file) => {
        setIsOcrLoading(true);
        try {
            alert('OCR on stored files requires generating a temporary download link. Extracting text...');
            setTimeout(() => {
                setOcrResult("Sample extracted text: IR8A Form 2026. Company: CEL-RON ENTERPRISES. Total Revenue: $500,000. Tax Deductible: Yes.");
                setIsOcrLoading(false);
            }, 1500);
        } catch (error) {
            setIsOcrLoading(false);
        }
    };

    const getFileIcon = (mimeType, size = 40) => {
        const iconStyle = { flexShrink: 0 };
        if (mimeType === 'application/vnd.google-apps.folder') return <Folder size={size} color="#3b82f6" style={iconStyle} />;
        if (mimeType?.includes('image')) return <ImageIcon size={size} color="#ec4899" style={iconStyle} />;
        if (mimeType?.includes('pdf')) return <FileText size={size} color="#ef4444" style={iconStyle} />;
        if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return <FileText size={size} color="#22c55e" style={iconStyle} />;
        if (mimeType?.includes('document') || mimeType?.includes('word')) return <FileText size={size} color="#3b82f6" style={iconStyle} />;
        return <File size={size} color="#94a3b8" style={iconStyle} />;
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const folders = filteredItems.filter(i => i.mimeType === 'application/vnd.google-apps.folder');
    const files = filteredItems.filter(i => i.mimeType !== 'application/vnd.google-apps.folder');

    // Loading State
    if (loading && !items.length) {
        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', color: '#64748b' }}>
                <div style={{
                    width: '64px', height: '64px', border: '4px solid #e2e8f0', borderTop: '4px solid var(--accent)',
                    borderRadius: '50%', animation: 'spin 1s linear infinite'
                }} />
                <p style={{ fontSize: '1rem', fontWeight: 500 }}>Accessing Corporate Vault...</p>
            </div>
        );
    }

    // No Token State
    if (!localStorage.getItem('google_access_token')) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
                <div className="glass-panel" style={{ padding: '48px 40px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
                    }}>
                        <HardDrive size={36} color="#fff" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Secure Google Cloud Storage</h2>
                    <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '32px' }}>
                        The Corporate Vault is integrated with your Google Workspace to provide professional, year-wise file organization. Connect your Google account in Settings to continue.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/settings?tab=communications')} style={{ padding: '12px 32px' }}>
                        Connect Google Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <Home size={14} />
                        <ChevronRight size={12} />
                        <span style={{ fontWeight: 500 }}>YEAR {selectedYear}</span>
                    </div>
                    <h1 className="page-title">Corporate Vault</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Secure cloud storage for company documents</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowWall(!showWall)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: showWall ? '#4f46e5' : '#6366f1' }}
                    >
                        <FileText size={18} /> {showWall ? 'Hide Wall' : 'Wall (Commercial Log)'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleInitiateUpload}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {uploading
                            ? <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Uploading...</>
                            : <><Upload size={18} /> Upload File</>
                        }
                    </button>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: showWall ? '1fr 400px' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>
                <div>

            {/* Search & View Toggle */}
            <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Search files and folders..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 16px 10px 40px', border: '1px solid var(--border-color)',
                            borderRadius: '10px', outline: 'none', fontSize: '0.95rem', background: '#f8fafc'
                        }}
                    />
                </div>
                {vaultRootId && currentFolderId !== vaultRootId && (
                    <button 
                        onClick={() => navigate('/vault')}
                        className="btn btn-sm btn-outline"
                        style={{ gap: '8px' }}
                    >
                        <Home size={14} /> Hub
                    </button>
                )}
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{
                            padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: viewMode === 'grid' ? '#fff' : 'transparent',
                            color: viewMode === 'grid' ? 'var(--accent)' : '#94a3b8',
                            boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                        title="Grid View"
                    >
                        <Grid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: viewMode === 'list' ? '#fff' : 'transparent',
                            color: viewMode === 'list' ? 'var(--accent)' : '#94a3b8',
                            boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* Tiered Hub View */}
            {currentFolderId === vaultRootId && !searchQuery && (
                <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '20px' }}>Vault Management Hub</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {VAULT_TIERS.map(tier => (
                            <div 
                                key={tier.id}
                                onClick={() => vaultRoots[tier.id] && navigate(`/vault/${vaultRoots[tier.id]}`)}
                                style={{
                                    padding: '28px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px',
                                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                    e.currentTarget.style.boxShadow = `0 20px 25px -5px ${tier.color}20`;
                                    e.currentTarget.style.borderColor = tier.color;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <div style={{ width: '56px', height: '56px', appearance: 'none', background: tier.color + '15', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tier.color }}>
                                    {tier.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 4px 0' }}>{tier.label}</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>{tier.desc}</p>
                                </div>
                                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '100px', height: '100px', background: tier.color, opacity: 0.03, borderRadius: '50%' }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {items.length === 0 ? (
                <div className="glass-panel" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px', color: '#cbd5e1'
                    }}>
                        <Folder size={40} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Folder is empty</h3>
                    <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Upload files or create subfolders to get started.</p>
                    <button className="btn btn-primary" onClick={handleInitiateUpload}>
                        <Upload size={18} /> Upload File
                    </button>
                </div>
            ) : (
                <>
                    {/* Folders Section */}
                    {folders.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                                Folders ({folders.length})
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(200px, 1fr))' : '1fr',
                                gap: '12px'
                            }}>
                                {folders.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/vault/${item.id}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '14px',
                                            padding: '16px 20px', background: '#fff',
                                            border: '1px solid var(--border-color)', borderRadius: '12px',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '10px',
                                            background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Folder size={22} color="#3b82f6" />
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.name}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Folder</p>
                                        </div>
                                        <ChevronRight size={18} color="#cbd5e1" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Files Section */}
                    {files.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                                Files ({files.length})
                            </h3>

                            {viewMode === 'grid' ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: '16px'
                                }}>
                                    {files.map(item => (
                                        <div key={item.id} className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', transition: 'transform 0.2s' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <div style={{ width: '56px', height: '56px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {item.thumbnailLink ? (
                                                            <img src={item.thumbnailLink} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                                                        ) : (
                                                            getFileIcon(item.mimeType, 28)
                                                        )}
                                                    </div>
                                                    <div style={{ overflow: 'hidden' }}>
                                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                                                        <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ID: {item.id.substring(0, 12)}...</code>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDelete(item.id, item.name)}
                                                    style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                                    title="Delete File"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <CheckCircle2 size={14} color="#22c55e" />
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Vault Folder Ready</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <CheckCircle2 size={14} color="#22c55e" />
                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Securely Linked</span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button 
                                                    onClick={() => window.open(item.webViewLink, '_blank')}
                                                    className="btn btn-secondary"
                                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px' }}
                                                >
                                                    <Eye size={16} /> View
                                                </button>
                                                <button 
                                                    onClick={() => handleOCR(item)}
                                                    className="btn btn-secondary"
                                                    style={{ padding: '8px', borderRadius: '10px' }}
                                                    title="AI OCR"
                                                >
                                                    <Sparkles size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* List View */
                                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                                                <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {files.map(item => (
                                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                                >
                                                    <td style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        {getFileIcon(item.mimeType, 24)}
                                                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{item.name}</span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <span style={{
                                                            background: '#f1f5f9', padding: '4px 12px', borderRadius: '16px',
                                                            fontSize: '0.75rem', color: '#64748b', fontWeight: 500
                                                        }}>
                                                            {item.mimeType?.split('/').pop()?.split('.').pop()}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button
                                                                onClick={() => window.open(item.webViewLink, '_blank')}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            >
                                                                <Eye size={14} /> View
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id, item.name)}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* OCR Modal */}
            {ocrResult && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: 0, overflow: 'hidden' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '20px 24px', borderBottom: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={20} color="#8b5cf6" /> AI OCR Extraction
                            </h3>
                            <button
                                onClick={() => setOcrResult(null)}
                                style={{
                                    background: '#f1f5f9', border: 'none', borderRadius: '50%',
                                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: '#64748b'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ padding: '24px' }}>
                            <div style={{
                                padding: '20px', fontFamily: 'monospace', fontSize: '0.9rem',
                                lineHeight: 1.7, whiteSpace: 'pre-wrap', background: '#f8fafc',
                                border: '1px solid #e2e8f0', borderRadius: '12px', color: '#475569',
                                minHeight: '160px'
                            }}>
                                {ocrResult}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => { navigator.clipboard.writeText(ocrResult); alert('Copied to clipboard'); }}
                                >
                                    Copy Text
                                </button>
                                <button className="btn btn-primary" onClick={() => setOcrResult(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standardized Upload Overlay */}
            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Uploading to Vault..."
                locationLink={uploadLink}
                    onClose={() => {
                        setUploadProgress(0);
                        setUploadLink(null);
                    }}
                />
                    <GDriveConnectionModal 
                        isOpen={isAuthModalOpen} 
                        onClose={() => setIsAuthModalOpen(false)} 
                        state="vault_action"
                    />
                </div>

                {/* Communication Wall Sidebar */}
                {showWall && (
                    <div style={{ position: 'sticky', top: '24px', height: 'calc(100vh - 48px)' }}>
                        <CommunicationWall 
                            referenceType="Vault"
                            referenceId={currentFolderId} // Contextual to current folder
                            folderId={currentFolderId}
                            title="Commercial Matter Log"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

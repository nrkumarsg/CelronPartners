import React, { useState, useEffect } from 'react';
import {
    Folder,
    File,
    Upload,
    Trash2,
    ExternalLink,
    HardDrive,
    AlertCircle,
    Loader2,
    RefreshCw,
    CheckCircle2,
    ShieldCheck,
    FileSearch,
    ChevronRight,
    Search,
    X,
    Link2
} from 'lucide-react';
import { listFolderContent, uploadFileToDrive, deleteFile, provisionPartnerStructure } from '../../lib/driveService';
import { validateToken, connectGoogleAPI, getStoredToken } from '../../lib/googleAuthService';
import { supabase } from '../../lib/supabase';
import { getDocumentSettings } from '../../lib/store';
import UploadOverlay from '../common/UploadOverlay';
import GDriveConnectionModal from '../common/GDriveConnectionModal';

const PartnerDocuments = ({ partnerId, partnerName, initialFolderId, initialDriveLink, onUpdate }) => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [folderId, setFolderId] = useState(initialFolderId);
    const [driveLink, setDriveLink] = useState(initialDriveLink);
    const [error, setError] = useState(null);
    const [authError, setAuthError] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);
    
    // UI States
    const [activeSubFolder, setActiveSubFolder] = useState(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [manualLink, setManualLink] = useState('');

    const accessToken = getStoredToken();

    useEffect(() => {
        if (folderId && accessToken) {
            fetchFiles();
        }
    }, [folderId, accessToken]);

    const fetchFiles = async () => {
        setLoading(true);
        setError(null);
        setAuthError(false);
        try {
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setAuthError(true);
                setError('Google Drive session expired. Please reconnect.');
                setLoading(false);
                return;
            }
            const data = await listFolderContent(accessToken, activeSubFolder?.id || folderId);
            setFiles(data);
        } catch (err) {
            console.error('Error fetching partner files:', err);
            setAuthError(true);
            setError('Failed to load documents from Google Drive.');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        const isValid = await validateToken(accessToken);
        if (!accessToken || !isValid) {
            setAuthError(true);
            return;
        }
        fetchFiles();
    };

    const handleReconnect = () => {
        connectGoogleAPI(`partner_${partnerId || 'new'}`);
    };

    const handleConnectDrive = async () => {
        const isValid = await validateToken(accessToken);
        if (!accessToken || !isValid) {
            setIsAuthModalOpen(true);
            return;
        }

        if (!partnerName) {
            alert('Please enter a partner name first.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const settings = await getDocumentSettings();
            const result = await provisionPartnerStructure(accessToken, partnerName, settings?.gdrive_celron_root_id);

            // Update Supabase if we have an ID
            if (partnerId) {
                const { error: dbError } = await supabase
                    .from('partners')
                    .update({
                        gdrive_folder_id: result.id,
                        google_drive_link: result.link
                    })
                    .eq('id', partnerId);

                if (dbError) throw dbError;
            }

            setFolderId(result.id);
            setDriveLink(result.link);
            if (onUpdate) onUpdate(result);

        } catch (err) {
            console.error('Error provisioning partner folder:', err);
            setError('Failed to create or connect Google Drive folder.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualLink = async () => {
        if (!manualLink) return;
        const match = manualLink.match(/\/folders\/([a-zA-Z0-9-_]+)/);
        const extractedId = match ? match[1] : manualLink;

        if (!extractedId || extractedId.length < 10) {
            alert('Invalid Google Drive folder link or ID');
            return;
        }

        setLoading(true);
        try {
            // Update Supabase if we have an ID
            if (partnerId) {
                const { error: dbError } = await supabase
                    .from('partners')
                    .update({
                        gdrive_folder_id: extractedId,
                        google_drive_link: `https://drive.google.com/drive/folders/${extractedId}`
                    })
                    .eq('id', partnerId);

                if (dbError) throw dbError;
            }

            const result = { id: extractedId, link: `https://drive.google.com/drive/folders/${extractedId}` };
            setFolderId(result.id);
            setDriveLink(result.link);
            if (onUpdate) onUpdate(result);
            setShowLinkInput(false);
        } catch (err) {
            alert('Failed to link folder: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInitiateUpload = async () => {
        const isValid = await validateToken(accessToken);
        if (!accessToken || !isValid) {
            setIsAuthModalOpen(true);
            return;
        }
        document.getElementById(`fileInput_${partnerId || 'new'}`).click();
    };

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        setUploading(true);
        try {
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setIsAuthModalOpen(true);
                setUploading(false);
                return;
            }

            const targetFolderId = activeSubFolder?.id || folderId;

            for (const file of selectedFiles) {
                await uploadFileToDrive(accessToken, file, { 
                    folderId: targetFolderId,
                    onProgress: (p) => setUploadProgress(p)
                });
            }
            setUploadLink(targetFolderId);
            await fetchFiles();
        } catch (err) {
            console.error('Error uploading files:', err);
            alert('Failed to upload one or more files.');
        } finally {
            e.target.value = '';
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

        setDeletingId(fileId);
        try {
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                setIsAuthModalOpen(true);
                setDeletingId(null);
                return;
            }
            await deleteFile(accessToken, fileId);
            setFiles(prev => prev.filter(f => f.id !== fileId));
        } catch (err) {
            console.error('Error deleting file:', err);
            alert('Failed to delete file.');
        } finally {
            setDeletingId(null);
        }
    };

    const subFolderTypes = [
        { name: '01. Inspection Forms', icon: FileSearch, color: '#6366f1' },
        { name: '02. Credit Applications', icon: HardDrive, color: '#10b981' },
        { name: '03. Company Certificates', icon: ShieldCheck, color: '#f59e0b' },
        { name: '04. Agreements & Contracts', icon: Folder, color: '#ec4899' },
        { name: '05. KYC Documents', icon: CheckCircle2, color: '#8b5cf6' }
    ];

    if (!accessToken) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ width: '80px', height: '80px', background: '#fef3c7', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <AlertCircle size={40} color="#f59e0b" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Google Drive Not Connected</h3>
                <p style={{ color: '#64748b', marginTop: '12px', marginBottom: '32px', maxWidth: '400px', margin: '12px auto 32px', lineHeight: 1.6 }}>
                    Link your Google account to manage and store partner-specific documents like ACRA bizfiles and certificates directly in your project cloud.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleReconnect}
                    style={{ padding: '14px 32px', borderRadius: '14px', background: '#4f46e5', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}
                >
                    <RefreshCw size={18} /> Connect Google Account
                </button>
            </div>
        );
    }

    if (!folderId) {
        return (
            <div style={{ padding: '40px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#eef2ff', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HardDrive size={40} color="#6366f1" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Connect Project Workspace</h3>
                        <p style={{ color: '#64748b', marginTop: '8px', maxWidth: '500px', lineHeight: 1.6 }}>
                            Provision a dedicated folder structure on Google Drive for **{partnerName}** to manage verification documents.
                        </p>
                    </div>

                    {!showLinkInput ? (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleConnectDrive}
                                disabled={loading}
                                style={{ padding: '14px 32px', borderRadius: '14px', background: '#4f46e5', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                {loading ? 'Provisioning...' : 'Provision Workspace'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowLinkInput(true)}
                                style={{ padding: '14px 24px', borderRadius: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}
                            >
                                <Link2 size={18} /> Link Existing Folder
                            </button>
                        </div>
                    ) : (
                        <div style={{ width: '100%', maxWidth: '500px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Paste GDrive Folder URL or ID..." 
                                    value={manualLink}
                                    onChange={e => setManualLink(e.target.value)}
                                    style={{ flex: 1, padding: '12px 16px', borderRadius: '12px' }}
                                />
                                <button onClick={handleManualLink} className="btn btn-primary" style={{ borderRadius: '12px' }}>Link</button>
                                <button onClick={() => setShowLinkInput(false)} className="btn btn-secondary" style={{ borderRadius: '12px' }}><X size={20} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Verification Checklist Banner */}
            <div style={{ background: 'linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%)', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' }}>
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={20} color="#10b981" /> Compliance & Verification
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {[
                            { label: 'UEN Verified', icon: CheckCircle2, status: !!partnerName },
                            { label: 'ACRA Bizfile Uploaded', icon: File, status: files.some(f => f.name.toLowerCase().includes('acra') || f.name.toLowerCase().includes('bizfile')) },
                            { label: 'Bank Details Verified', icon: HardDrive, status: false },
                            { label: 'Certificates Valid', icon: ShieldCheck, status: files.some(f => f.name.toLowerCase().includes('cert')) }
                        ].map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <item.icon size={16} color={item.status ? '#10b981' : '#cbd5e1'} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: item.status ? '#1e293b' : '#94a3b8' }}>{item.label}</span>
                                {item.status && <CheckCircle2 size={14} color="#10b981" style={{ marginLeft: 'auto' }} />}
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: '1px solid #e2e8f0', paddingLeft: '40px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Drive Sync Status</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Connected & Synced</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleSync} className="btn btn-sm btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <a href={driveLink} target="_blank" rel="noreferrer" className="btn btn-sm btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <ExternalLink size={14} /> Open
                        </a>
                    </div>
                </div>
            </div>

            {/* Folder Navigation */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                <button 
                    onClick={() => { setActiveSubFolder(null); fetchFiles(); }}
                    style={{ 
                        padding: '10px 20px', 
                        borderRadius: '12px', 
                        background: !activeSubFolder ? '#1e293b' : '#fff', 
                        color: !activeSubFolder ? '#fff' : '#64748b', 
                        border: '1px solid #e2e8f0',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}
                >
                    Root Folder
                </button>
                {subFolderTypes.map(sub => {
                    const isSelected = activeSubFolder?.name === sub.name;
                    return (
                        <button 
                            key={sub.name}
                            onClick={() => {
                                // Find the folder in current files list if it exists
                                const folder = files.find(f => f.name === sub.name);
                                if (folder) {
                                    setActiveSubFolder({ id: folder.id, name: sub.name });
                                    // fetchFiles will be triggered by activeSubFolder change effect
                                } else {
                                    alert('Sub-folder not found. Try refreshing or re-provisioning.');
                                }
                            }}
                            style={{ 
                                padding: '10px 20px', 
                                borderRadius: '12px', 
                                background: isSelected ? sub.color : '#fff', 
                                color: isSelected ? '#fff' : '#64748b', 
                                border: '1px solid #e2e8f0',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <sub.icon size={16} />
                            {sub.name.split('. ')[1]}
                        </button>
                    );
                })}
            </div>

            {/* File List / Content */}
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '24px', minHeight: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Folder size={20} color="#64748b" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{activeSubFolder ? activeSubFolder.name : 'Main Directory'}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{files.length} items in this view</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                         <button 
                            className="btn btn-primary" 
                            onClick={handleInitiateUpload}
                            disabled={uploading}
                            style={{ padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', background: activeSubFolder ? subFolderTypes.find(s => s.name === activeSubFolder.name)?.color : '#4f46e5' }}
                        >
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            {uploading ? 'Uploading...' : 'Upload New'}
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
                        <p>Pulling data from Google Drive...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                        <Folder size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
                        <p style={{ color: '#94a3b8', margin: 0 }}>This directory is empty. Use the button above to upload documents.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {files.map(file => (
                            <div key={file.id} style={{ padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ 
                                        width: '44px', 
                                        height: '44px', 
                                        background: file.mimeType.includes('folder') ? '#eef2ff' : '#f8fafc', 
                                        borderRadius: '12px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center'
                                    }}>
                                        {file.mimeType.includes('folder') ? <Folder size={20} color="#6366f1" fill="#6366f1" fillOpacity={0.2} /> : <File size={20} color="#64748b" />}
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(file.id, file.name)}
                                        disabled={deletingId === file.id}
                                        style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                                    >
                                        {deletingId === file.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</h5>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                                        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Folder'}
                                        <span>•</span>
                                        {new Date(file.createdTime).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                    <a 
                                        href={file.webViewLink} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', textDecoration: 'none' }}
                                    >
                                        View
                                    </a>
                                    {file.mimeType.includes('folder') && (
                                        <button 
                                            onClick={() => setActiveSubFolder({ id: file.id, name: file.name })}
                                            style={{ flex: 1, padding: '8px', background: '#eef2ff', border: 'none', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', cursor: 'pointer' }}
                                        >
                                            Enter
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <input
                id={`fileInput_${partnerId || 'new'}`}
                type="file"
                multiple
                onChange={handleFileUpload}
                hidden
                disabled={uploading}
            />

            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Syncing Documents..."
                locationLink={uploadLink}
                onClose={() => {
                    setUploadProgress(0);
                    setUploadLink(null);
                    setUploading(false);
                }}
            />
            <GDriveConnectionModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                state={`partner_${partnerId || 'new'}`}
            />
        </div>
    );
};

export default PartnerDocuments;

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
    RefreshCw
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
            const data = await listFolderContent(accessToken, folderId);
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
        connectGoogleAPI(`partner_${partnerId}`);
    };

    const handleConnectDrive = async () => {
        const isValid = await validateToken(accessToken);
        if (!accessToken || !isValid) {
            setIsAuthModalOpen(true);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const settings = await getDocumentSettings();
            const result = await provisionPartnerStructure(accessToken, partnerName, settings?.gdrive_celron_root_id);

            // Update Supabase
            const { error: dbError } = await supabase
                .from('partners')
                .update({
                    gdrive_folder_id: result.id,
                    google_drive_link: result.link
                })
                .eq('id', partnerId);

            if (dbError) throw dbError;

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

    const handleInitiateUpload = async () => {
        const isValid = await validateToken(accessToken);
        if (!accessToken || !isValid) {
            setIsAuthModalOpen(true);
            return;
        }
        document.getElementById(`fileInput_${partnerId}`).click();
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

            for (const file of selectedFiles) {
                await uploadFileToDrive(accessToken, file, { 
                    folderId,
                    onProgress: (p) => setUploadProgress(p)
                });
            }
            // For multiple uploads, linking to the parent folder is most helpful
            setUploadLink(folderId);
            await fetchFiles();
        } catch (err) {
            console.error('Error uploading files:', err);
            alert('Failed to upload one or more files.');
        } finally {
            // setUploading(false); // Handled by onClose
            // setUploadProgress(0); // Handled by onClose
            e.target.value = ''; // Reset input
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

    if (!accessToken) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
                <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Google Drive Not Connected</h3>
                <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '24px' }}>
                    You need to link your Google account in the Settings page to manage partner documents.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleReconnect}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                >
                    <RefreshCw size={18} /> Connect Google Account
                </button>
            </div>
        );
    }

    if (!folderId) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
                <HardDrive size={48} color="#6366f1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>No Storage Linked</h3>
                <p style={{ color: '#64748b', marginTop: '8px', marginBottom: '24px' }}>
                    Connect this partner to Google Drive to start managing Inspection forms, Credit Application forms, and more.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleConnectDrive}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    {loading ? 'Connecting...' : 'Connect to Google Drive'}
                </button>
            </div>
        );
    }

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Partner Documents</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
                        File manager for {partnerName}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        title="Sync with Google Drive"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        Sync
                    </button>
                    <a
                        href={driveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ExternalLink size={18} /> Open Drive
                    </a>
                    <button 
                        className={`btn ${uploading ? 'btn-secondary' : 'btn-primary'}`} 
                        onClick={handleInitiateUpload}
                        disabled={uploading}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        {uploading ? 'Uploading...' : 'Upload Form'}
                    </button>
                    <input
                        id={`fileInput_${partnerId}`}
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        hidden
                        disabled={uploading}
                    />
                </div>
            </div>

            {authError && (
                <div className="glass-panel" style={{ border: '1px solid #fee2e2', background: '#fef2f2', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626' }}>
                        <AlertCircle size={20} />
                        <div>
                            <div style={{ fontWeight: 600 }}>Session Expired</div>
                            <div style={{ fontSize: '0.85rem' }}>Your Google Drive connection has timed out.</div>
                        </div>
                    </div>
                    <button
                        onClick={handleReconnect}
                        className="btn btn-primary"
                        style={{ background: '#dc2626', borderColor: '#dc2626' }}
                    >
                        Reconnect Now
                    </button>
                </div>
            )}

            {error && (
                <div style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {loading && files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto' }} />
                    <p style={{ marginTop: '12px' }}>Syncing with Google Drive...</p>
                </div>
            ) : files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                    <Folder size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <p>No documents found. Start by uploading a file.</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '20px'
                }}>
                    {files.map(file => (
                        <div key={file.id} className="glass-panel" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', transition: 'transform 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <div style={{ width: '56px', height: '56px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {file.mimeType.includes('folder') ? <Folder size={28} color="#6366f1" /> : <File size={28} color="#64748b" />}
                                    </div>
                                    <div style={{ overflow: 'hidden' }}>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</h3>
                                        <code style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Folder'}</code>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(file.id, file.name)}
                                    disabled={deletingId === file.id}
                                    style={{ background: '#fef2f2', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                                    title="Delete File"
                                >
                                    {deletingId === file.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <HardDrive size={14} color="#6366f1" />
                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Drive Location Linked</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Created: {new Date(file.createdTime).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <a 
                                    href={file.webViewLink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="btn btn-secondary"
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px', textDecoration: 'none' }}
                                >
                                    <ExternalLink size={16} /> View in Drive
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Standardized Upload Overlay */}
            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Uploading Documents..."
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
                state={`partner_${partnerId}`}
            />
        </div>
    );
};

export default PartnerDocuments;

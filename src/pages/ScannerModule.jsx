import React, { useState, useEffect } from 'react';
import { Search, Globe, Grid, List, Download, FileText, Smartphone, ArrowRight, ExternalLink, RefreshCw, Move, Shield } from 'lucide-react';
import { isTokenValid, connectGoogleAPI } from '../lib/googleAuthService';
import { useAuth } from '../contexts/AuthContext';
import DriveFileMover from '../components/common/DriveFileMover';

export default function ScannerModule() {
    const { profile } = useAuth();
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanFolderId, setScanFolderId] = useState(localStorage.getItem('celron_scans_folder_id') || '');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [driveConnected, setDriveConnected] = useState(isTokenValid());
    
    // For Mover
    const [selectedScan, setSelectedScan] = useState(null);
    const [moverOpen, setMoverOpen] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    const [settings, setSettings] = useState(null);

    const fetchScans = async () => {
        setLoading(true);
        const token = localStorage.getItem('google_access_token');
        if (!token) {
            console.error("ScannerModule: No google_access_token found in localStorage");
            setLoading(false);
            return;
        }

        try {
            const { listFolderContent } = await import('../lib/driveService');
            const { initializeVault } = await import('../lib/vaultService');
            const { getDocumentSettings } = await import('../lib/store');
            
            // Get raw settings for diagnostic
            const s = await getDocumentSettings(profile.company_id);
            setSettings(s);

            // Use initializeVault to get the consolidated 99. SCANS_INBOX
            const vaultRoots = await initializeVault(token, profile.company_id);
            const folderId = vaultRoots.scansInboxId;

            if (folderId) {
                console.log("ScannerModule: Using Scans Inbox Folder ID:", folderId);
                setScanFolderId(folderId);
                localStorage.setItem('celron_scans_folder_id', folderId);
                
                const files = await listFolderContent(token, folderId);
                console.log(`ScannerModule: Found ${files.length} items in Google Drive`);
                
                const onlyFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
                
                let allFiles = [...onlyFiles];
                const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
                for(const f of folders) {
                    const subFiles = await listFolderContent(token, f.id);
                    allFiles = [...allFiles, ...subFiles.filter(sf => sf.mimeType !== 'application/vnd.google-apps.folder')];
                }
                setScans(allFiles);
            } else {
                console.warn("ScannerModule: No scansInboxId returned from initializeVault");
            }
        } catch (err) {
            console.error("Error fetching scans:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalSearch = async () => {
        setLoading(true);
        const token = localStorage.getItem('google_access_token');
        try {
            // Search for ANY folder named 99. SCANS_INBOX in the entire Drive
            const query = "name = '99. SCANS_INBOX' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const { files } = await response.json();
            
            if (files && files.length > 0) {
                // Try to fetch from the first one found
                const { listFolderContent } = await import('../lib/driveService');
                const foundFiles = await listFolderContent(token, files[0].id);
                setScans(foundFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder'));
                setScanFolderId(files[0].id);
                alert(`Found ${files.length} Inbox folders. Loading from: ${files[0].id}`);
            } else {
                alert("No folder named '99. SCANS_INBOX' found in your entire Google Drive.");
            }
        } catch (err) {
            alert("Global search failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (driveConnected) {
            fetchScans();
        } else {
            setLoading(false);
        }
    }, [driveConnected]);


    const handleOpenDrive = () => {
        const url = scanFolderId
            ? `https://drive.google.com/drive/folders/${scanFolderId}`
            : 'https://drive.google.com';
        window.open(url, '_blank');
    };

    const handleReconnect = () => {
        connectGoogleAPI('scanner_module');
    };

    const handleDownloadApk = async () => {
        const { downloadApkByIdentifier } = await import('../lib/driveService');
        downloadApkByIdentifier('scanner');
    };

    const filteredScans = scans.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', maxWidth: '100%', margin: '0', background: '#f8fafc', minHeight: '100vh' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        Celron Scanner
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Mobile App Integration & Scanned Documents</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}
                        title="Diagnostics"
                    >
                        <Shield size={18} />
                    </button>
                    <button
                        onClick={handleOpenDrive}
                        style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <Globe size={18} color="#4285F4" /> Open Scans Folder
                    </button>
                    <button
                        onClick={fetchScans}
                        className="btn btn-secondary"
                        style={{ padding: '10px 20px', borderRadius: '10px' }}
                    >
                        Sync Drive
                    </button>
                </div>
            </header>

            {showDiagnostics && (
                <div style={{ background: '#1e293b', color: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 800, color: '#94a3b8' }}>SYSTEM DIAGNOSTICS</span>
                        <button onClick={() => setShowDiagnostics(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Close</button>
                    </div>
                    <p style={{ margin: '4px 0' }}>User ID: {profile?.id}</p>
                    <p style={{ margin: '4px 0' }}>Company ID: {profile?.company_id}</p>
                    <p style={{ margin: '4px 0' }}>Configured Root: {settings?.google_drive_folder_id || 'NOT SET'}</p>
                    <p style={{ margin: '4px 0' }}>Celron Root ID: {settings?.gdrive_celron_root_id || 'NOT RESOLVED'}</p>
                    <p style={{ margin: '4px 0' }}>Scans Inbox ID: {scanFolderId || 'NOT RESOLVED'}</p>
                    <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p style={{ margin: '0 0 8px 0', color: '#3b82f6' }}>Is your Scan Inbox empty? Try a global search across all folders:</p>
                        <button 
                            onClick={handleGlobalSearch}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Run Global Folder Search
                        </button>
                    </div>
                </div>
            )}

            {/* Instruction Banner for Mobile App */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '16px', padding: '32px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '24px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', zIndex: 1 }}>
                    <Smartphone size={48} color="#fff" />
                </div>
                <div style={{ flex: 1, zIndex: 1 }}>
                    <h2 style={{ fontSize: '1.5rem', margin: '0 0 8px 0', fontWeight: 800, letterSpacing: '-0.01em' }}>Get the Celron Scanner App</h2>
                    <p style={{ margin: '0 0 16px 0', opacity: 0.9, fontSize: '0.95rem', maxWidth: '600px', lineHeight: 1.6 }}>
                        Download the official Android APK to your phone to start scanning documents directly. Features include multi-page scanning, auto-crop, JPG/PDF output, and automatic upload to Google Drive.
                    </p>
                    <button
                        onClick={handleDownloadApk}
                        style={{ background: '#fff', color: '#4f46e5', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        <Download size={18} /> Download APK to Phone
                    </button>
                </div>
            </div>

            {/* How it Works Section */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <RefreshCw size={20} color="#6366f1" /> How the Sync Flow Works
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {[
                        { step: '01', title: 'Scan on Phone', desc: 'Use the Celron Mobile App to capture crystal-clear document scans.', icon: <Smartphone size={24} color="#6366f1" /> },
                        { step: '02', title: 'Auto-Save to Cloud', desc: 'Scans are instantly uploaded to your secure Celron_Scans Drive folder.', icon: <Globe size={24} color="#10b981" /> },
                        { step: '03', title: 'Link to Hub', desc: 'Attach these scans directly to jobs, expenses, or partners in one click.', icon: <FileText size={24} color="#f59e0b" /> }
                    ].map((item, idx) => (
                        <div key={idx} className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {item.icon}
                                </div>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e2e8f0' }}>{item.step}</span>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>{item.title}</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {!driveConnected ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '64px', height: '64px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Globe size={32} color="#d97706" />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', color: '#1e293b', margin: '0 0 8px 0' }}>Google Drive Disconnected</h3>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px' }}>Please connect your Google Drive account to view and manage scanned documents.</p>
                    <button
                        onClick={handleReconnect}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                    >
                        <RefreshCw size={18} /> Connect Google Drive
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
                        <div style={{ flex: 1, display: 'flex', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}><Search size={20} /></div>
                            <input
                                type="text"
                                placeholder="Search scanned documents by name..."
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
                            <p>Loading scanned documents from Google Drive...</p>
                        </div>
                    ) : filteredScans.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 0', background: '#fff', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                            <FileText size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                            <h3 style={{ color: '#475569', margin: '0 0 8px 0' }}>No scanned documents found</h3>
                            <p style={{ color: '#94a3b8', margin: 0 }}>Documents scanned via the mobile app will automatically appear here.</p>
                        </div>
                    ) : (
                        <div style={{
                            display: viewMode === 'grid' ? 'grid' : 'block',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '24px'
                        }}>
                            {filteredScans.map(scan => (
                                <div key={scan.id} className="glass-panel" style={{ padding: '20px', marginBottom: viewMode === 'list' ? '12px' : '0', display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: '20px', transition: 'all 0.2s', border: '1px solid #e2e8f0' }}>
                                    <div style={{ width: viewMode === 'list' ? '48px' : '100%', height: viewMode === 'list' ? '48px' : '180px', background: '#f8fafc', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: viewMode === 'grid' ? '16px' : '0', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                        {scan.thumbnailLink ? (
                                            <img src={scan.thumbnailLink} alt={scan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <FileText size={viewMode === 'list' ? 24 : 48} color="#94a3b8" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={scan.name}>{scan.name}</h3>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#f1f5f9', color: '#64748b', borderRadius: '4px', fontWeight: 600 }}>{new Date(scan.createdTime).toLocaleDateString()}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {scan.mimeType.includes('pdf') ? 'PDF' : 'Image'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a
                                                href={scan.webViewLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-secondary"
                                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <ExternalLink size={14} /> View
                                            </a>
                                            <button
                                                onClick={() => {
                                                    setSelectedScan(scan);
                                                    setMoverOpen(true);
                                                }}
                                                style={{ flex: 1, padding: '8px', fontSize: '0.85rem', border: 'none', background: '#6366f1', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <Move size={14} /> Organize
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <DriveFileMover 
                isOpen={moverOpen}
                file={selectedScan}
                onClose={() => setMoverOpen(false)}
                onMoveComplete={(fileId, destinationName) => {
                    setScans(prev => prev.filter(s => s.id !== fileId));
                    alert(`Moved successfully to ${destinationName}`);
                }}
            />
        </div>
    );
}

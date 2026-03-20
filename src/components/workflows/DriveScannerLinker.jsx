import React, { useState } from 'react';
import { Archive, ExternalLink, Trash2, FileText, Upload } from 'lucide-react';
import { listFolderContent, getOrCreateFolder } from '../../lib/driveService';
import { isTokenValid } from '../../lib/googleAuthService';
import GDriveConnectionModal from '../common/GDriveConnectionModal';

export default function DriveScannerLinker({ selectedLink, onLinkSelected, onClear, label = "Supplier Bill Attachment" }) {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    
    const handlePickFromDrive = async () => {
        const token = sessionStorage.getItem('google_contacts_token') || localStorage.getItem('google_access_token');
        if (!token || !isTokenValid()) {
            setIsAuthModalOpen(true);
            return;
        }
        try {
            const folderId = await getOrCreateFolder(token, 'Celron_Scans');
            if(folderId) {
                const files = await listFolderContent(token, folderId);
                const onlyFiles = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
                
                if(onlyFiles.length === 0) {
                    alert("No scanned bills found in Celron_Scans folder.");
                    return;
                }
                
                const fileNames = onlyFiles.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
                const selection = window.prompt(`Enter the NUMBER of the scanned document to attach:\n\n${fileNames}`);
                
                if(selection && !isNaN(selection)) {
                    const idx = parseInt(selection) - 1;
                    if(onlyFiles[idx]) {
                        onLinkSelected(onlyFiles[idx].webViewLink, onlyFiles[idx].name, null);
                        alert(`Linked: ${onlyFiles[idx].name}`);
                    }
                }
            }
        } catch(err) {
            alert("Failed to load scans: " + err.message);
        }
    };

    return (
        <>
            <div className="form-group" style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Archive size={14} /> {label}
                </label>
                
                {selectedLink ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e0f2fe', padding: '8px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ExternalLink size={12} /> Linked to Scanned Document
                        </span>
                        <button type="button" onClick={onClear} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                            type="button" 
                            onClick={handlePickFromDrive}
                            className="btn btn-sm btn-outline" 
                            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                        >
                            <FileText size={14} /> Link from Celron Scanner
                        </button>
                        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>- OR -</div>
                        <input
                            type="file"
                            onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                    onLinkSelected(null, e.target.files[0].name, e.target.files[0]);
                                }
                            }}
                            style={{ fontSize: '0.8rem', width: '100%' }}
                        />
                    </div>
                )}
            </div>

            <GDriveConnectionModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                state="scanner_module"
            />
        </>
    );
}

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Crop as CropIcon, Copy, Sparkles, Loader2, Image as ImageIcon, History, Trash2, FileText, CheckCircle2, Plus, HardDrive, Download, Eye } from 'lucide-react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Tesseract from 'tesseract.js';
import { getOrCreateFolder, uploadFileToDrive, getFileContent, listFolderContent, deleteFile } from '../../lib/driveService';
import { connectGoogleAPI } from '../../lib/googleAuthService';
import UploadOverlay from '../../components/common/UploadOverlay';

// Styles moved to constant to avoid build-time layout issues
const ocrStyles = `
    .glass-panel {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 20px;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.07);
    }
    .btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
        font-size: 0.9rem;
    }
    .btn-primary { color: white; background: #6366f1; }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); }
    .btn-secondary { background: #fff; border: 1px solid #e2e8f0; color: #64748b; }
    .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; }
    .history-card:hover { border-color: #6366f1 !important; background: #fdfeff !important; box-shadow: 0 4px 12px -2px rgba(99, 102, 241, 0.1); transform: translateY(-2px); }
    .history-action-btn { padding: 6px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .history-action-btn:hover { background: #6366f1; color: #fff; border-color: #6366f1; }
    .delete-btn:hover { background: #ef4444 !important; border-color: #ef4444 !important; color: #fff !important; }
`;

import { useAuth } from '../../contexts/AuthContext';

export default function SmartOCR() {
    const { profile } = useAuth();
    const [image, setImage] = useState(null);

    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem('ocr_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [copied, setCopied] = useState(false);
    const [isSavingDrive, setIsSavingDrive] = useState(false);
    const [driveError, setDriveError] = useState(null);
    const [driveSuccess, setDriveSuccess] = useState(false);
    const [driveFileUrl, setDriveFileUrl] = useState(null);
    const [historyTab, setHistoryTab] = useState('local');
    const [cloudHistory, setCloudHistory] = useState([]);
    const [isLoadingCloud, setIsLoadingCloud] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);
    const imgRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('ocr_history', JSON.stringify(history));
    }, [history]);

    useEffect(() => {
        if (historyTab === 'cloud') fetchCloudHistory();
    }, [historyTab]);

    const fetchCloudHistory = async () => {
        const accessToken = localStorage.getItem('google_access_token');
        if (!accessToken) return;
        setIsLoadingCloud(true);
        try {
            const folderId = await getOrCreateFolder(accessToken, 'OCR Extractions');
            const files = await listFolderContent(accessToken, folderId);
            setCloudHistory(files);
        } catch (err) {
            console.error('Cloud history error:', err);
        } finally {
            setIsLoadingCloud(false);
        }
    };

    const handleExtract = async () => {
        if (!completedCrop || !imgRef.current) return;
        setIsExtracting(true);
        try {
            const canvas = document.createElement('canvas');
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            canvas.width = completedCrop.width * scaleX;
            canvas.height = completedCrop.height * scaleY;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width * scaleX, completedCrop.height * scaleY);
            const base64Image = canvas.toDataURL('image/jpeg');
            const result = await Tesseract.recognize(base64Image, 'eng');
            const newText = result.data.text.trim();
            setExtractedText(newText);
            if (newText) {
                const historyItem = { id: Date.now(), text: newText, timestamp: new Date().toLocaleString(), preview: base64Image };
                setHistory(prev => [historyItem, ...prev].slice(0, 20));
            }
        } catch (err) {
            console.error('OCR Error:', err);
            alert('Failed to extract text.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSaveToDrive = async () => {
        if (!extractedText.trim()) return;
        const accessToken = localStorage.getItem('google_access_token');
        if (!accessToken) { setDriveError("Google account not connected."); return; }
        setIsSavingDrive(true);
        setDriveError(null);
        setDriveSuccess(false);
        try {
            const folderId = await getOrCreateFolder(accessToken, 'OCR Extractions');
            const fileName = `OCR_${extractedText.slice(0, 15).replace(/[^a-z0-9]/gi, '_')}_${new Date().getTime()}.txt`;
            const blob = new Blob([extractedText], { type: 'text/plain' });
            const result = await uploadFileToDrive(accessToken, new File([blob], fileName), { 
                title: fileName, 
                folderId: folderId,
                company_id: profile.company_id,
                onProgress: (p) => setUploadProgress(p)
            });
            setUploadLink(result.webViewLink);
            setDriveFileUrl(result.webViewLink);
            setDriveSuccess(true);
            if (historyTab === 'cloud') fetchCloudHistory();
            setTimeout(() => setDriveSuccess(false), 5000);
        } catch (err) {
            console.error('Drive Error:', err);
            setDriveError("Failed to save to Drive.");
        } finally {
            setIsSavingDrive(false);
            // setUploadProgress(0); // Handled by onClose
        }
    };

    const handleLoadFromDrive = async (fileId) => {
        const accessToken = localStorage.getItem('google_access_token');
        if (!accessToken) return;
        setIsExtracting(true);
        try {
            const content = await getFileContent(accessToken, fileId);
            setExtractedText(content);
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100%', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', borderRadius: '12px', color: '#fff' }}><Sparkles size={24} /></div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Smart OCR Assistant</h1>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }}>
                <div className="glass-panel" style={{ padding: '32px', minHeight: '700px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {!image ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', borderRadius: '24px', background: '#fff' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#6366f1' }}><Upload size={32} /></div>
                            <h3>Upload Document</h3>
                            <label className="btn btn-primary" style={{ cursor: 'pointer' }}><Plus size={18} /> Select File<input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) { const r = new FileReader(); r.onload = () => setImage(r.result); r.readAsDataURL(e.target.files[0]); } }} style={{ display: 'none' }} /></label>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleExtract} disabled={isExtracting} className="btn btn-primary">{isExtracting ? <Loader2 size={18} className="animate-spin" /> : <CropIcon size={18} />}{isExtracting ? 'Extracting...' : 'Extract Text'}</button>
                                <button onClick={() => setImage(null)} className="btn btn-secondary"><X size={18} /> Clear</button>
                            </div>
                            <div style={{ background: '#1e293b', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'center' }}>
                                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                                    <img ref={imgRef} src={image} onLoad={e => { const { width: w, height: h } = e.currentTarget; setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, w, h), w, h)); }} style={{ maxWidth: '100%', maxHeight: '60vh' }} alt="OCR" />
                                </ReactCrop>
                            </div>
                        </div>
                    )}

                    <div className="glass-panel" style={{ padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} color="#6366f1" /> Extracted Result</h3>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => { navigator.clipboard.writeText(extractedText); setCopied(true); setTimeout(() => setCopied(false), 2000); }} disabled={!extractedText} className="btn btn-secondary" style={{ background: copied ? '#10b981' : '#fff', color: copied ? '#fff' : '#64748b' }}>{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button>
                                <button onClick={driveSuccess && driveFileUrl ? () => window.open(driveFileUrl, '_blank') : handleSaveToDrive} disabled={isSavingDrive || !extractedText} className="btn btn-primary" style={{ background: driveSuccess ? '#10b981' : '#6366f1', opacity: extractedText ? 1 : 0.7 }}>{isSavingDrive ? <Loader2 size={14} className="animate-spin" /> : (driveSuccess ? <CheckCircle2 size={14} /> : <HardDrive size={14} />)}{driveSuccess ? 'Saved!' : (driveError || 'To Drive')}</button>
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '150px', maxHeight: '250px', overflowY: 'auto', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            {extractedText || "No text extracted yet."}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <button onClick={() => setHistoryTab('local')} style={{ flex: 1, padding: '14px', border: 'none', background: historyTab === 'local' ? '#fff' : 'transparent', borderBottom: historyTab === 'local' ? '2px solid #6366f1' : 'none', color: historyTab === 'local' ? '#6366f1' : '#64748b', fontWeight: 700, cursor: 'pointer' }}>Local</button>
                            <button onClick={() => setHistoryTab('cloud')} style={{ flex: 1, padding: '14px', border: 'none', background: historyTab === 'cloud' ? '#fff' : 'transparent', borderBottom: historyTab === 'cloud' ? '2px solid #6366f1' : 'none', color: historyTab === 'cloud' ? '#6366f1' : '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cloud</button>
                        </div>
                        <div style={{ padding: '24px', maxHeight: '600px', overflowY: 'auto' }}>
                            {historyTab === 'local' ? (
                                history.map(item => (
                                    <div key={item.id} className="history-card" style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExtractedText(item.text)}>
                                        <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}><img src={item.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="P" /></div>
                                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text.slice(0, 30)}...</div></div>
                                        <button onClick={(e) => { e.stopPropagation(); setHistory(h => h.filter(i => i.id !== item.id)); }} className="delete-btn" style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                ))
                            ) : (
                                cloudHistory.map(item => (
                                    <div key={item.id} className="history-card" style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '8px', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleLoadFromDrive(item.id)}>
                                        <FileText size={18} color="#8b5cf6" />
                                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div></div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteFile(localStorage.getItem('google_access_token'), item.id).then(() => fetchCloudHistory()); }} className="delete-btn" style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <style>{ocrStyles}</style>

            {/* Standardized Upload Overlay */}
            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Saving to Drive..."
                locationLink={uploadLink}
                onClose={() => {
                    setUploadProgress(0);
                    setUploadLink(null);
                }}
            />
        </div>
    );
}

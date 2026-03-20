import React, { useState } from 'react';
import { Camera, X, UploadCloud, User, CreditCard } from 'lucide-react';
import { uploadFile } from '../../lib/store';
import { performOCR } from '../../lib/googleAuthService';

export default function BusinessCardUpload({ frontValue, backValue, onFrontChange, onBackChange, onOCR, label = "Business Card" }) {
    const [uploadingFront, setUploadingFront] = useState(false);
    const [uploadingBack, setUploadingBack] = useState(false);
    const [scanning, setScanning] = useState(false);

    const handleUpload = async (e, side) => {
        const file = e.target.files[0];
        if (!file) return;

        if (side === 'front') setUploadingFront(true);
        else setUploadingBack(true);

        try {
            const url = await uploadFile('company_assets', 'business_cards', file, {
                maxWidth: 1000,
                maxHeight: 1000
            });
            if (side === 'front') onFrontChange(url);
            else onBackChange(url);

            // Trigger OCR
            if (onOCR) {
                setScanning(true);
                const text = await performOCR(file);
                if (text) onOCR(text);
                setScanning(false);
            }
        } catch (err) {
            console.error(err);
            alert(`Failed to upload business card ${side} side`);
        } finally {
            if (side === 'front') setUploadingFront(false);
            else setUploadingBack(false);
            setScanning(false);
        }
    };

    const remove = (side) => {
        if (window.confirm(`Remove business card ${side} side?`)) {
            if (side === 'front') onFrontChange(null);
            else onBackChange(null);
        }
    };

    return (
        <div className="bc-upload-container">
            <label className="form-label">{label}</label>

            <div className="bc-stack">
                {/* Front Side */}
                <div className="bc-side-item">
                    <div className="bc-side-header">
                        <span className="bc-side-label">Front Side</span>
                        {frontValue && <span className="bc-status-badge">Uploaded</span>}
                    </div>
                    {frontValue ? (
                        <div className="bc-preview">
                            <img src={frontValue} alt="Business Card Front" />
                            <button className="remove-bc" onClick={() => remove('front')}>
                                <X size={14} />
                            </button>
                            <div className="bc-overlay" onClick={() => window.open(frontValue, '_blank')}>
                                <span>View Full</span>
                            </div>
                        </div>
                    ) : (
                        <label className="bc-placeholder">
                            <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'front')} hidden />
                            {uploadingFront ? (
                                <div className="spinner-small"></div>
                            ) : (
                                <>
                                    <UploadCloud size={20} />
                                    <span>Upload Front Side</span>
                                </>
                            )}
                        </label>
                    )}
                </div>

                {/* Back Side */}
                <div className="bc-side-item">
                    <div className="bc-side-header">
                        <span className="bc-side-label">Back Side</span>
                        {backValue && <span className="bc-status-badge">Uploaded</span>}
                    </div>
                    {backValue ? (
                        <div className="bc-preview">
                            <img src={backValue} alt="Business Card Back" />
                            <button className="remove-bc" onClick={() => remove('back')}>
                                <X size={14} />
                            </button>
                            <div className="bc-overlay" onClick={() => window.open(backValue, '_blank')}>
                                <span>View Full</span>
                            </div>
                        </div>
                    ) : (
                        <label className="bc-placeholder">
                            <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'back')} hidden />
                            {uploadingBack ? (
                                <div className="spinner-small"></div>
                            ) : (
                                <>
                                    <UploadCloud size={20} />
                                    <span>Upload Back Side</span>
                                </>
                            )}
                        </label>
                    )}
                </div>
            </div>

            {(frontValue || backValue) && onOCR && (
                <button
                    onClick={async () => {
                        setScanning(true);
                        try {
                            let combinedText = '';
                            if (frontValue && backValue) {
                                // Extract from both
                                const frontFile = await fetch(frontValue).then(r => r.blob());
                                const backFile = await fetch(backValue).then(r => r.blob());
                                const [frontText, backText] = await Promise.all([
                                    performOCR(frontFile),
                                    performOCR(backFile)
                                ]);
                                combinedText = `[FRONT SIDE]\n${frontText}\n\n[BACK SIDE]\n${backText}`;
                            } else {
                                // Extract from whichever is available
                                const url = frontValue || backValue;
                                const file = await fetch(url).then(r => r.blob());
                                combinedText = await performOCR(file);
                            }
                            if (combinedText) onOCR(combinedText);
                        } catch (err) {
                            console.error('Manual OCR failed', err);
                        } finally {
                            setScanning(false);
                        }
                    }}
                    disabled={scanning}
                    style={{
                        marginTop: '16px',
                        width: '100%',
                        padding: '12px',
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'none'}
                >
                    {scanning ? <div className="spinner-small" style={{ width: '16px', height: '16px', borderTopColor: '#fff' }}></div> : <Camera size={18} />}
                    {scanning ? 'EXTRACTING INFO...' : 'EXTRACT & SYNC INFO'}
                </button>
            )}

            {scanning && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#e0e7ff', color: '#6366f1', fontSize: '0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="spinner-small" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
                    <span>Scanning card for information...</span>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .bc-upload-container {
                    margin-bottom: 24px;
                }
                .bc-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .bc-side-item {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .bc-side-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .bc-side-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .bc-status-badge {
                    font-size: 0.65rem;
                    font-weight: 600;
                    color: #10b981;
                    background: #ecfdf5;
                    padding: 2px 8px;
                    border-radius: 10px;
                }
                .bc-preview {
                    position: relative;
                    width: 100%;
                    height: 160px;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .bc-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .bc-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    height: 140px;
                    border: 2px dashed #e2e8f0;
                    border-radius: 12px;
                    background: #f8fafc;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                    font-size: 0.85rem;
                }
                .bc-placeholder:hover {
                    border-color: #6366f1;
                    background: #f5f3ff;
                    color: #6366f1;
                }
                .remove-bc {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: #ef4444;
                    color: #fff;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .bc-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: 0.2s;
                    cursor: pointer;
                    backdrop-filter: blur(2px);
                }
                .bc-preview:hover .bc-overlay {
                    opacity: 1;
                }
                .bc-overlay span {
                    color: #fff;
                    font-weight: 600;
                    font-size: 0.8rem;
                    background: #6366f1;
                    padding: 4px 12px;
                    border-radius: 20px;
                }
                .spinner-small {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #e2e8f0;
                    border-top: 3px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}

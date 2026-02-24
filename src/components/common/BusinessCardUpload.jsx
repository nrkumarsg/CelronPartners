import React, { useState } from 'react';
import { Camera, X, UploadCloud, User, CreditCard } from 'lucide-react';
import { uploadFile } from '../../lib/store';

export default function BusinessCardUpload({ value, onChange, label = "Business Card" }) {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadFile('business-cards', 'originals', file, {
                maxWidth: 1000,
                maxHeight: 1000
            });
            onChange(url);
        } catch (err) {
            console.error(err);
            alert('Failed to upload business card');
        } finally {
            setUploading(false);
        }
    };

    const remove = () => {
        if (window.confirm('Remove business card?')) {
            onChange(null);
        }
    };

    return (
        <div className="bc-upload-container">
            <label className="form-label">{label}</label>

            {value ? (
                <div className="bc-preview">
                    <img src={value} alt="Business Card" />
                    <button className="remove-bc" onClick={remove}>
                        <X size={16} />
                    </button>
                    <div className="bc-overlay" onClick={() => window.open(value, '_blank')}>
                        <span>Click to View Full</span>
                    </div>
                </div>
            ) : (
                <label className="bc-placeholder">
                    <input type="file" accept="image/*" onChange={handleUpload} hidden />
                    {uploading ? (
                        <div className="spinner-small"></div>
                    ) : (
                        <>
                            <UploadCloud size={32} />
                            <span>Upload Business Card</span>
                            <small>Max 1MB, resized automatically</small>
                        </>
                    )}
                </label>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .bc-upload-container {
                    margin-bottom: 20px;
                }
                .bc-preview {
                    position: relative;
                    width: 100%;
                    height: 160px;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 2px solid #e2e8f0;
                    background: #f8fafc;
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
                    height: 160px;
                    border: 2px dashed #cbd5e1;
                    border-radius: 12px;
                    background: rgba(248, 250, 252, 0.5);
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                }
                .bc-placeholder:hover {
                    border-color: var(--accent);
                    background: rgba(99, 102, 241, 0.05);
                    color: var(--accent);
                }
                .remove-bc {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: #ef4444;
                    color: #fff;
                    border: none;
                    border-radius: 50%;
                    padding: 4px;
                    cursor: pointer;
                    z-index: 10;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }
                .bc-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: 0.2s;
                    cursor: pointer;
                }
                .bc-preview:hover .bc-overlay {
                    opacity: 1;
                }
                .bc-overlay span {
                    color: #fff;
                    font-weight: 600;
                    font-size: 0.85rem;
                    background: rgba(0,0,0,0.5);
                    padding: 4px 12px;
                    border-radius: 20px;
                }
                .spinner-small {
                    width: 24px;
                    height: 24px;
                    border: 3px solid #e2e8f0;
                    border-top: 3px solid var(--accent);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}

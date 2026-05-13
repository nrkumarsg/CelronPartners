import React, { useState, useRef } from 'react';
import { X, Sparkles, Loader2, Image as ImageIcon, Copy, Check, Crop as CropIcon } from 'lucide-react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { performOCR } from '../../lib/googleAuthService';
import { parseOCRBusinessCard } from '../../lib/geminiService';

export default function SmartOCRModal({ isOpen, onClose, onApply, title = "Smart OCR Assistant" }) {
    const [ocrFile, setOcrFile] = useState(null);
    const [ocrPreviewUrl, setOcrPreviewUrl] = useState(null);
    const [crop, setCrop] = useState({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
    const [completedCrop, setCompletedCrop] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedText, setExtractedText] = useState('');
    const [aiResult, setAiResult] = useState(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const imgRef = useRef(null);

    if (!isOpen) return null;

    const handleOcrFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setOcrFile(file);
            const url = URL.createObjectURL(file);
            setOcrPreviewUrl(url);
            setExtractedText('');
            setAiResult(null);
        }
    };

    const onImageLoad = (e) => {
        imgRef.current = e.currentTarget;
    };

    const extractText = async () => {
        if (!completedCrop || !imgRef.current) return;
        setIsExtracting(true);
        try {
            const canvas = document.createElement('canvas');
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            
            // Handle both percentage and pixel crops from react-image-crop
            const isPercent = completedCrop.unit === '%';
            const cropX = isPercent ? (completedCrop.x * imgRef.current.width) / 100 : completedCrop.x;
            const cropY = isPercent ? (completedCrop.y * imgRef.current.height) / 100 : completedCrop.y;
            const cropW = isPercent ? (completedCrop.width * imgRef.current.width) / 100 : completedCrop.width;
            const cropH = isPercent ? (completedCrop.height * imgRef.current.height) / 100 : completedCrop.height;

            canvas.width = cropW * scaleX;
            canvas.height = cropH * scaleY;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                imgRef.current,
                cropX * scaleX,
                cropY * scaleY,
                cropW * scaleX,
                cropH * scaleY,
                0,
                0,
                canvas.width,
                canvas.height
            );

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            const file = new File([blob], 'crop.jpg', { type: 'image/jpeg' });
            
            const text = await performOCR(file);
            setExtractedText(text);

            if (text) {
                setIsAiProcessing(true);
                try {
                    const result = await parseOCRBusinessCard(text);
                    setAiResult(result);
                } catch (aiErr) {
                    console.warn('AI Parsing failed, using raw text', aiErr);
                } finally {
                    setIsAiProcessing(false);
                }
            }
        } catch (err) {
            console.error('Extraction failed', err);
            alert('Failed to extract text from image. Please try again or check your connection.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleApply = () => {
        if (onApply) {
            onApply({
                rawText: extractedText,
                structured: aiResult
            });
        }
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
            padding: '20px'
        }}>
            <div style={{
                width: '100%', maxWidth: '900px', height: '90vh', maxHeight: '800px',
                backgroundColor: '#ffffff', borderRadius: '24px', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Sparkles size={20} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left: Cropper */}
                    <div style={{ flex: 1.5, background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px' }}>
                        {!ocrFile ? (
                            <label style={{
                                flex: 1, border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#fff', gap: '12px'
                            }}>
                                <ImageIcon size={48} color="#94a3b8" />
                                <span style={{ fontWeight: 600, color: '#64748b' }}>Click to upload image for OCR</span>
                                <input type="file" accept="image/*" hidden onChange={handleOcrFileChange} />
                            </label>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Adjust crop to select text</span>
                                    <button onClick={() => setOcrFile(null)} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change Image</button>
                                </div>
                                <div style={{ flex: 1, background: '#1e293b', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                                    <ReactCrop
                                        crop={crop}
                                        onChange={c => setCrop(c)}
                                        onComplete={c => setCompletedCrop(c)}
                                    >
                                        <img
                                            src={ocrPreviewUrl}
                                            onLoad={onImageLoad}
                                            alt="OCR Source"
                                            style={{ maxWidth: '100%', maxHeight: '500px' }}
                                        />
                                    </ReactCrop>
                                </div>
                                <button
                                    onClick={extractText}
                                    disabled={isExtracting || !completedCrop}
                                    style={{
                                        marginTop: '20px', width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    {isExtracting ? <Loader2 size={20} className="animate-spin" /> : <CropIcon size={20} />}
                                    {isExtracting ? 'Extracting Text...' : 'Extract Selected Text'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Results */}
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', marginBottom: '12px' }}>Extraction Results</h3>
                            
                            {isExtracting ? (
                                <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#94a3b8' }}>
                                    <Loader2 size={32} className="animate-spin" />
                                    <span>Scanning image...</span>
                                </div>
                            ) : extractedText ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Raw Text</div>
                                        <div style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace' }}>
                                            {extractedText}
                                        </div>
                                    </div>

                                    {isAiProcessing ? (
                                        <div style={{ padding: '12px', background: '#f5f3ff', borderRadius: '12px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Sparkles size={16} color="#8b5cf6" className="animate-pulse" />
                                            <span style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600 }}>AI is structuring data...</span>
                                        </div>
                                    ) : aiResult ? (
                                        <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#15803d', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Check size={12} /> AI Structured Data
                                            </div>
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                {Object.entries(aiResult).map(([key, value]) => value && (
                                                    <div key={key} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>{key.replace('_', ' ')}:</span>
                                                        <span style={{ color: '#1e293b', fontWeight: 700, textAlign: 'right' }}>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#cbd5e1', border: '1px dashed #e2e8f0', borderRadius: '12px' }}>
                                    <ImageIcon size={32} />
                                    <span style={{ fontSize: '0.85rem' }}>No data extracted yet</span>
                                </div>
                            )}
                        </div>

                        {extractedText && (
                            <button
                                onClick={handleApply}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}
                            >
                                <Check size={20} />
                                Apply to Form
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

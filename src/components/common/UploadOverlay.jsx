import React from 'react';
import { CheckCircle2, ExternalLink, X, Smartphone } from 'lucide-react';

/**
 * A beautiful, standardized upload overlay with a realistic SVG progress ring.
 * @param {Object} props
 * @param {number} props.progress - 0 to 100 percentage
 * @param {string} props.title - Title of the upload task (e.g., "Uploading Certificate")
 * @param {string} props.message - Subtext message (optional)
 * @param {boolean} props.isVisible - Whether the overlay is shown
 * @param {string} props.locationLink - Optional link to open the file in Drive after success
 * @param {function} props.onClose - Function to close the overlay after completion
 */
export default function UploadOverlay({ 
    progress, 
    title = "Uploading file...", 
    message = "Please keep this window open during upload", 
    isVisible,
    locationLink,
    onClose
}) {
    if (!isVisible || (progress === 0 && !locationLink)) return null;

    const isComplete = progress === 100;
    const hasLink = !!locationLink;

    // SVG parameters
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (Math.min(100, progress) / 100) * circumference;

    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.8)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.3s ease'
        }}>
            <div style={{ 
                padding: '40px', 
                background: '#fff', 
                borderRadius: '24px', 
                width: '90%', 
                maxWidth: '420px', 
                textAlign: 'center', 
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative'
            }}>
                {isComplete && onClose && (
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748b',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={18} />
                    </button>
                )}

                <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, margin: '0 auto 24px' }}>
                    {isComplete ? (
                        <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            background: '#ecfdf5', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}>
                            <CheckCircle2 size={64} color="#10b981" />
                        </div>
                    ) : (
                        <>
                            {/* SVG Progress Ring */}
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                                <circle 
                                    cx={size/2} cy={size/2} r={radius} 
                                    fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} 
                                />
                                <circle 
                                    cx={size/2} cy={size/2} r={radius} 
                                    fill="none" stroke="#6366f1" strokeWidth={strokeWidth} 
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{progress}%</span>
                            </div>
                        </>
                    )}
                </div>

                <h2 style={{ fontSize: '1.6rem', marginBottom: '8px', color: '#1e293b', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    {isComplete ? 'Upload Successful!' : progress >= 95 ? 'Finalizing...' : title}
                </h2>
                
                <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '1.05rem', lineHeight: 1.5 }}>
                    {isComplete 
                        ? 'Your file has been securely saved to Google Drive.' 
                        : progress >= 95 ? 'Almost there! Securing your file...' : message}
                </p>

                {isComplete ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {hasLink && (
                            <a 
                                href={locationLink} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '10px',
                                    background: '#6366f1',
                                    color: '#fff',
                                    padding: '14px 24px',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                                onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                            >
                                <ExternalLink size={20} /> Open at Location
                            </a>
                        )}
                        <button 
                            onClick={onClose}
                            style={{ 
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                padding: '14px 24px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                ) : (
                    <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #6366f1, #a855f7)', 
                            transition: 'width 0.4s ease' 
                        }}></div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}

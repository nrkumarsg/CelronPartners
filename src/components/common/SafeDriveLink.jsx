import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { checkFileExists } from '../../lib/driveService';

export default function SafeDriveLink({ url, label, className, style, showStatus = true }) {
    const [exists, setExists] = useState(null); // null: checking, true: exists, false: missing
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!url) {
            setExists(false);
            return;
        }

        const accessToken = localStorage.getItem('google_access_token');
        if (!accessToken) {
            setExists(true); // Assume it's fine if we can't check
            return;
        }

        const verify = async () => {
            setLoading(true);
            const ok = await checkFileExists(accessToken, url);
            setExists(ok);
            setLoading(false);
        };

        verify();
    }, [url]);

    if (!url) return null;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...style }} className={className}>
            <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: exists === false ? '#94a3b8' : '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 600,
                    pointerEvents: exists === false ? 'none' : 'auto',
                    opacity: exists === false ? 0.6 : 1
                }}
            >
                <ExternalLink size={14} />
                {label || 'Open in Cloud'}
            </a>
            
            {showStatus && (
                <div style={{ fontSize: '0.7rem' }}>
                    {loading && <Loader2 size={12} className="animate-spin" color="#94a3b8" />}
                    {exists === false && (
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertCircle size={12} /> Missing / Trashed
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

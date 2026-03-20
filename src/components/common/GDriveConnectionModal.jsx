import React from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { connectGoogleAPI } from '../../lib/googleAuthService';

export default function GDriveConnectionModal({ isOpen, onClose, state = 'sync', title = 'Google Drive Connection Required' }) {
    if (!isOpen) return null;

    const handleConnect = () => {
        connectGoogleAPI(state);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            padding: '24px'
        }}>
            <div className="glass-panel" style={{ 
                width: '100%', 
                maxWidth: '450px', 
                padding: '32px', 
                background: '#fff', 
                borderRadius: '20px', 
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                textAlign: 'center'
            }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-10px' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '8px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'inline-flex', padding: '16px', background: '#fffbeb', borderRadius: '50%', marginBottom: '24px' }}>
                    <AlertCircle size={40} color="#f59e0b" />
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>{title}</h2>
                
                <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px' }}>
                    Your Google Drive session is missing or has expired. Please connect your account to proceed with this action.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={handleConnect}
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px' }}
                    >
                        <RefreshCw size={18} /> Connect Now
                    </button>
                    <button
                        onClick={onClose}
                        className="btn btn-ghost"
                        style={{ width: '100%', padding: '12px', color: '#94a3b8' }}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}

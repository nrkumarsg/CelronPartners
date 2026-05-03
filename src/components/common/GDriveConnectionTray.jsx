import React, { useState, useEffect } from 'react';
import { HardDrive, CheckCircle2, AlertCircle, RefreshCw, LogOut, Link2 } from 'lucide-react';
import { validateToken, connectGoogleAPI, getStoredToken } from '../../lib/googleAuthService';

const GDriveConnectionTray = () => {
    const [status, setStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'
    const [userInfo, setUserInfo] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const checkConnection = async () => {
        const token = getStoredToken();
        if (!token) {
            setStatus('disconnected');
            setUserInfo(null);
            return;
        }

        try {
            const isValid = await validateToken(token);
            if (isValid) {
                // Fetch user info
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUserInfo(data);
                    setStatus('connected');
                } else {
                    setStatus('disconnected');
                }
            } else {
                setStatus('disconnected');
            }
        } catch (error) {
            console.error('GDrive connection check failed:', error);
            setStatus('disconnected');
        }
    };

    useEffect(() => {
        checkConnection();
        // Check every 5 minutes
        const interval = setInterval(checkConnection, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = () => {
        sessionStorage.setItem('google_auth_return_url', window.location.pathname + window.location.search);
        connectGoogleAPI('drive_status_tray');
    };

    const handleDisconnect = () => {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expiry');
        setStatus('disconnected');
        setUserInfo(null);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await checkConnection();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px'
        }}>
            <div className="glass-panel animate-fade-in" style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                minWidth: '240px'
            }}>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: status === 'connected' ? 'rgba(16, 185, 129, 0.1)' : (status === 'checking' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                    color: status === 'connected' ? '#10b981' : (status === 'checking' ? '#6366f1' : '#ef4444'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <HardDrive size={20} />
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Google Drive
                        </span>
                        {status === 'connected' ? (
                            <CheckCircle2 size={12} color="#10b981" />
                        ) : (
                            status === 'disconnected' ? <AlertCircle size={12} color="#ef4444" /> : null
                        )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {status === 'connected' ? (
                            <>
                                {userInfo?.name && <div style={{ fontWeight: 500 }}>{userInfo.name}</div>}
                                <div>{userInfo?.email || 'Connected'}</div>
                            </>
                        ) : (status === 'checking' ? 'Checking status...' : 'Not Connected')}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                        onClick={handleRefresh}
                        style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '6px' }}
                        title="Refresh Status"
                        className="hover-bg"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                    {status === 'connected' ? (
                        <button 
                            onClick={handleDisconnect}
                            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#ef4444', borderRadius: '6px' }}
                            title="Disconnect"
                            className="hover-bg"
                        >
                            <LogOut size={14} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleConnect}
                            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#6366f1', borderRadius: '6px' }}
                            title="Connect Google Drive"
                            className="hover-bg"
                        >
                            <Link2 size={14} />
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                .hover-bg:hover { background: rgba(0,0,0,0.05); }
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default GDriveConnectionTray;

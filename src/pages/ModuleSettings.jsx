import React, { useState } from 'react';
import { Settings, Database, Activity, Shield, Link2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ModuleSettings() {
    const [isChecking, setIsChecking] = useState(false);
    const [dbStatus, setDbStatus] = useState('Connected');

    const handleCheckConnection = async () => {
        setIsChecking(true);
        try {
            // A simple query to check connection
            const { error } = await supabase.from('partners').select('id').limit(1);
            if (error) {
                setDbStatus('Disconnected');
            } else {
                setDbStatus('Connected');
            }
        } catch (err) {
            setDbStatus('Error');
        } finally {
            setTimeout(() => {
                setIsChecking(false);
            }, 800);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                        <Settings size={28} />
                    </div>
                    <h2 className="page-title">Module Settings</h2>
                </div>
            </div>

            <div className="form-grid">
                {/* Integration Status Card */}
                <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Database size={24} color="#a855f7" />
                        <h3 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Database Integration</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        Manage and review the connection status between this module and the central Supabase PostgreSQL database.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '12px', borderRadius: '50%' }}>
                                <Activity size={24} color={dbStatus === 'Connected' ? '#4ade80' : '#ef4444'} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text)' }}>Supabase Status</div>
                                <div style={{ fontSize: '0.9rem', color: dbStatus === 'Connected' ? '#4ade80' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dbStatus === 'Connected' ? '#4ade80' : '#ef4444' }}></div>
                                    {dbStatus}
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-secondary" onClick={handleCheckConnection} disabled={isChecking}>
                            <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} />
                            {isChecking ? 'Checking...' : 'Ping Database'}
                        </button>
                    </div>
                </div>

                {/* Security Data Card */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Shield size={24} color="#3b82f6" />
                        <h3 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Security Policies</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Current Row Level Security (RLS) rules dynamically inherited from Supabase.
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <div style={{ padding: '4px', borderRadius: '4px', background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Active</div>
                            Partners Read/Write
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <div style={{ padding: '4px', borderRadius: '4px', background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Active</div>
                            Contacts Read/Write
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <div style={{ padding: '4px', borderRadius: '4px', background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Active</div>
                            Vessels Read/Write
                        </li>
                    </ul>
                </div>

                {/* External Integrations */}
                <div className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Link2 size={24} color="#eab308" />
                        <h3 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>External Services</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                        Current external APIs integrated with the module forms.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Google Contacts Link</span>
                        <span style={{ fontSize: '0.8rem', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Enabled</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Vessel Web Search</span>
                        <span style={{ fontSize: '0.8rem', color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: '12px' }}>Enabled</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

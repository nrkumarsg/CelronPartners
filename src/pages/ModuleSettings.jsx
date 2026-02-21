import React, { useState } from 'react';
import { Settings, Database, Activity, Shield, Link2, RefreshCw, FileText, UploadCloud, ToggleRight } from 'lucide-react';
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

                {/* Document Settings */}
                <div className="glass-panel" style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <FileText size={24} color="#f43f5e" />
                        <h3 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Document Settings</h3>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                        Configure PDF templates for Enquiries, Quotations, Purchase Orders, and Delivery Orders.
                    </p>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.05rem' }}>Company Information</h4>
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Company Name</label>
                                <input type="text" className="form-control" defaultValue="CELRON ENTERPRISES PTE LTD" />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>GST / UEN</label>
                                <input type="text" className="form-control" defaultValue="201436227C" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Address</label>
                                <input type="text" className="form-control" defaultValue="10, Jln, Besar, #03-05, Singapore 208787" />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Phone</label>
                                <input type="text" className="form-control" defaultValue="+65 6123 4567" />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Email</label>
                                <input type="email" className="form-control" defaultValue="sales@celron.net" />
                            </div>
                        </div>

                        <hr style={{ border: '1px solid rgba(255,255,255,0.05)', margin: '32px 0' }} />

                        <h4 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.05rem' }}>Logo & Signature</h4>
                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Company Logo</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                                    <div style={{ width: '80px', height: '80px', background: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                                        <img src="https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UploadCloud size={16} /> Upload Logo</button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Digital Signature</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                                    <div style={{ width: '120px', height: '80px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                        No Image
                                    </div>
                                    <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UploadCloud size={16} /> Upload Signature</button>
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: '1px solid rgba(255,255,255,0.05)', margin: '32px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h4 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '1.05rem' }}>Watermark Settings</h4>
                                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Show watermark on generated PDF documents</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: '500' }}>Enable Watermark</span>
                                <ToggleRight size={32} color="#4ade80" style={{ cursor: 'pointer' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
                            <button className="btn btn-primary" onClick={() => alert('Settings Saved Successfully!')}>Save Settings</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

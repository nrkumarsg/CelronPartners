import React, { useState } from 'react';
import { Settings, UploadCloud, ToggleRight, ToggleLeft, Save } from 'lucide-react';

export default function ModuleSettings() {
    const [watermark, setWatermark] = useState(false);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Document Settings</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Configure PDF templates for Enquiries and Quotations</p>
            </header>

            <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Company Information Block */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Company Information</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Company Name</label>
                            <input type="text" defaultValue="CELRON ENTERPRISES PTE LTD" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>GST / UEN</label>
                            <input type="text" defaultValue="201436227C" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Address</label>
                            <input type="text" defaultValue="10, Jln, Besar, #03-05, Singapore 208787" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Phone</label>
                            <input type="text" defaultValue="+65 6123 4567" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Email</label>
                            <input type="email" defaultValue="sales@celron.net" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>
                    </div>
                </div>

                {/* Logo & Signature Block */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Logo & Signature</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b', display: 'block', marginBottom: '12px' }}>Company Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '80px', height: '80px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                                    <img src="https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                </div>
                                <button style={{ background: '#fff', color: '#64748b', border: '1px dashed #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <UploadCloud size={16} /> Upload Logo
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b', display: 'block', marginBottom: '12px' }}>Digital Signature</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '120px', height: '80px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Mocking a signature scribble */}
                                    <svg viewBox="0 0 100 40" width="80" height="30" stroke="#6366f1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10,25 Q20,10 30,25 T50,15 T70,30 T90,10" />
                                        <path d="M40,20 Q45,25 55,20 T75,25" opacity="0.5" />
                                    </svg>
                                </div>
                                <button style={{ background: '#fff', color: '#64748b', border: '1px dashed #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <UploadCloud size={16} /> Upload Signature
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Watermark Block */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Watermark Settings</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>Enable Watermark</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Show watermark on PDF documents</div>
                        </div>
                        <div onClick={() => setWatermark(!watermark)} style={{ cursor: 'pointer', color: watermark ? '#10b981' : '#cbd5e1' }}>
                            {watermark ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => alert('Settings Saved!')}>
                        <Save size={18} /> Save Settings
                    </button>
                </div>

            </div>
        </div>
    );
}

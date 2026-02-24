import React, { useState, useEffect, useRef } from 'react';
import { Settings, UploadCloud, ToggleRight, ToggleLeft, Save } from 'lucide-react';
import { getDocumentSettings, saveDocumentSettings, uploadFile } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';

export default function ModuleSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        company_name: 'CELRON ENTERPRISES PTE LTD',
        gst_uen: '201436227C',
        address: '10, Jln, Besar, #03-05, Singapore 208787',
        phone: '+65 6123 4567',
        email: 'sales@celron.net',
        logo_url: 'https://celron.net/wp-content/uploads/2023/12/celronlogowithtranslogorotating.gif',
        signature_url: '',
        watermark: false,
        allow_signup: true,
        google_drive_folder_id: '',
        google_calendar_id: ''
    });

    const { profile } = useAuth();
    const logoInputRef = useRef(null);
    const signatureInputRef = useRef(null);

    useEffect(() => {
        if (profile) {
            loadSettings();
        }
    }, [profile]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await getDocumentSettings(profile?.company_id);
            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!profile?.company_id) {
            return alert('Critical Profile Error: Missing Company ID. Please refresh or relog.');
        }

        setSaving(true);
        try {
            const payload = { ...settings };
            if (!payload.company_id) payload.company_id = profile.company_id;

            await saveDocumentSettings(payload);
            alert('Settings Saved Successfully!');
        } catch (error) {
            console.error(error);
            alert('Failed to save settings. Make sure you ran the latest Supabase schema updates.');
        }
        setSaving(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        try {
            // Uploads to a bucket named "company_assets" in a folder "settings"
            const url = await uploadFile('company_assets', 'settings', file, { maxWidth: 800 });
            setSettings(prev => ({ ...prev, [fieldName]: url }));
        } catch (error) {
            console.error('Upload Error:', error);
            alert('Failed to upload. Did you create the "company_assets" bucket in Supabase Storage with Public access enabled?');
        }
        setSaving(false);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading settings...</div>;
    }

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Setting</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Configure PDF templates for Enquiries and Quotations</p>
            </header>

            <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Company Information Block */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Company Information</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Company Name</label>
                            <input type="text" name="company_name" value={settings.company_name || ''} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>GST / UEN</label>
                            <input type="text" name="gst_uen" value={settings.gst_uen || ''} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Address</label>
                            <input type="text" name="address" value={settings.address || ''} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Phone</label>
                            <input type="text" name="phone" value={settings.phone || ''} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Email</label>
                            <input type="email" name="email" value={settings.email || ''} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }} />
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
                                <div style={{ width: '80px', height: '80px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: '#f8fafc' }}>
                                    {settings.logo_url ? (
                                        <img src={settings.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    ) : (
                                        <div style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>No Logo</div>
                                    )}
                                </div>
                                <input type="file" accept="image/*" ref={logoInputRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'logo_url')} />
                                <button onClick={() => logoInputRef.current?.click()} style={{ background: '#fff', color: '#64748b', border: '1px dashed #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <UploadCloud size={16} /> Upload Logo
                                </button>
                            </div>

                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b', display: 'block', marginBottom: '12px' }}>Digital Signature</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '120px', height: '80px', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '4px' }}>
                                    {settings.signature_url ? (
                                        <img src={settings.signature_url} alt="Signature Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                    ) : (
                                        <svg viewBox="0 0 100 40" width="80" height="30" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10,25 Q20,10 30,25 T50,15 T70,30 T90,10" />
                                        </svg>
                                    )}
                                </div>
                                <input type="file" accept="image/*" ref={signatureInputRef} style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'signature_url')} />
                                <button onClick={() => signatureInputRef.current?.click()} style={{ background: '#fff', color: '#64748b', border: '1px dashed #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        <div onClick={() => setSettings(prev => ({ ...prev, watermark: !prev.watermark }))} style={{ cursor: 'pointer', color: settings.watermark ? '#10b981' : '#cbd5e1', transition: 'all 0.2s' }}>
                            {settings.watermark ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                        </div>
                    </div>
                </div>

                {/* Authentication Block */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Authentication Settings</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>Allow Public Signup</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>If disabled, the "Sign Up" link will be hidden from the login page.</div>
                        </div>
                        <div onClick={() => setSettings(prev => ({ ...prev, allow_signup: !prev.allow_signup }))} style={{ cursor: 'pointer', color: settings.allow_signup ? '#10b981' : '#cbd5e1', transition: 'all 0.2s' }}>
                            {settings.allow_signup ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
                        </div>
                    </div>
                </div>

                {/* Google Integration Block */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', padding: '32px' }}>
                    <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>Google Integration</h3>
                    <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.85rem' }}>Personalize storage and schedule for your company. Find these IDs in your Google Drive folder and Calendar settings.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Google Drive Root Folder ID</label>
                            <input
                                type="text"
                                name="google_drive_folder_id"
                                placeholder="e.g. 1aBC...xyZ"
                                value={settings.google_drive_folder_id || ''}
                                onChange={handleChange}
                                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID of the `CELRON2026` folder in your drive.</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>Google Calendar ID</label>
                            <input
                                type="text"
                                name="google_calendar_id"
                                placeholder="e.g. company@gmail.com"
                                value={settings.google_calendar_id || ''}
                                onChange={handleChange}
                                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#475569', fontSize: '0.95rem' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Usually your email address or a shared calendar ID.</span>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button disabled={saving} onClick={handleSave} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                        <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>

            </div>
        </div>
    );
}

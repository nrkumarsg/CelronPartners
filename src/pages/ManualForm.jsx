import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Cloud, FileText, Book, User, Info, Building } from 'lucide-react';
import { saveManual, getManuals } from '../lib/manualsService';
import { uploadFileToDrive, getOrCreateFolder } from '../lib/driveService';
import { connectGoogleAPI } from '../lib/googleAuthService';
import { useAuth } from '../contexts/AuthContext';

export default function ManualForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        title: '',
        group_name: '',
        author_company: '',
        file_url: '',
        file_id: '',
        info: ''
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        // Restore pending data from before redirect
        const pendingData = sessionStorage.getItem('pending_manual_data');
        if (pendingData) {
            setFormData(JSON.parse(pendingData));
            sessionStorage.removeItem('pending_manual_data');
        }

        if (!isNew) {
            loadManual();
        }
    }, [id]);

    const loadManual = async () => {
        const { data } = await getManuals();
        const existing = data.find(m => m.id === id);
        if (existing) setFormData(existing);
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalData = { ...formData };

            // If it's a new upload and we have a file
            if (file) {
                const token = sessionStorage.getItem('google_contacts_token'); // Re-using the token storage
                const expires = sessionStorage.getItem('google_contacts_expires');

                if (!token || new Date(expires) < new Date()) {
                    // Need to re-auth
                    if (window.confirm('Google Drive access is required for upload. Redirect to login?')) {
                        sessionStorage.setItem('pending_manual_data', JSON.stringify(formData));
                        connectGoogleAPI('manual_upload');
                        return;
                    }
                    throw new Error('Google authentication required');
                }

                setUploading(true);
                // 1. Get or create a specific folder named 'Manual' in the user's root
                const folderId = await getOrCreateFolder(token, 'Manual');

                // 2. Upload with folder context
                const driveFile = await uploadFileToDrive(token, file, {
                    title: formData.title || file.name,
                    folderId: folderId
                });

                finalData.file_id = driveFile.id;
                finalData.file_url = driveFile.webViewLink;
                setUploading(false);
            }

            const { error } = await saveManual({
                ...finalData,
                user_id: profile?.id // Explicitly bind to current user
            });
            if (error) throw error;

            alert('Manual saved successfully!');
            navigate('/manuals');
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/manuals')}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    {isNew ? 'Add New Manual' : 'Edit Manual Content'}
                </h1>
            </div>

            <form onSubmit={handleSave} className="glass-panel" style={{ padding: '40px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Manual Title *</label>
                        <div style={{ position: 'relative' }}>
                            <Book size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="e.g. Caterpillar C32 Service Manual"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Group / Category</label>
                        <div style={{ position: 'relative' }}>
                            <Info size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="e.g. Propulsion"
                                value={formData.group_name}
                                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Company / Author</label>
                        <div style={{ position: 'relative' }}>
                            <Building size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="e.g. Caterpillar Inc."
                                value={formData.author_company}
                                onChange={(e) => setFormData({ ...formData, author_company: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                    <label className="form-label" style={{ marginBottom: '12px' }}>{formData.file_url ? 'Update Manual File' : 'Upload PDF Manual'}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Cloud size={48} color={file ? '#6366f1' : '#cbd5e1'} />
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            style={{ fontSize: '0.9rem' }}
                        />
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Supported formats: PDF. Will be uploaded to Google Drive.</p>
                        {formData.file_url && !file && (
                            <a href={formData.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={14} /> Current File in Drive
                            </a>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '14px', borderRadius: '10px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                                {uploading ? 'Uploading to Drive...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                <Save size={20} /> Save Manual
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/manuals')}
                        style={{ padding: '14px 24px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

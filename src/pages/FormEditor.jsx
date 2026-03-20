import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Cloud, FileText, User, Info, Building } from 'lucide-react';
import { saveForm, getForms } from '../lib/formsService';
import { uploadFileToDrive, getOrCreateFolder } from '../lib/driveService';
import { connectGoogleAPI } from '../lib/googleAuthService';
import { useAuth } from '../contexts/AuthContext';
import UploadOverlay from '../components/common/UploadOverlay';

export default function FormEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isNew = id === 'new';

    const [formData, setFormData] = useState({
        title: '',
        form_type: '',
        author_company: '',
        file_url: '',
        file_id: '',
        info: ''
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);

    useEffect(() => {
        // Restore pending data from before redirect
        const pendingData = sessionStorage.getItem('pending_form_data');
        if (pendingData) {
            setFormData(JSON.parse(pendingData));
            sessionStorage.removeItem('pending_form_data');
        }

        if (!isNew) {
            loadForm();
        }
    }, [id]);

    const loadForm = async () => {
        const { data } = await getForms();
        const existing = data.find(f => f.id === id);
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
                const token = sessionStorage.getItem('google_contacts_token');
                const expires = sessionStorage.getItem('google_contacts_expires');

                if (!token || new Date(expires) < new Date()) {
                    if (window.confirm('Google Drive access is required for upload. Redirect to login?')) {
                        sessionStorage.setItem('pending_form_data', JSON.stringify(formData));
                        connectGoogleAPI('form_upload');
                        return;
                    }
                    throw new Error('Google authentication required');
                }

                setUploading(true);
                const folderId = await getOrCreateFolder(token, 'Forms');

                const driveFile = await uploadFileToDrive(token, file, {
                    title: formData.title || file.name,
                    folderId: folderId,
                    onProgress: (p) => setUploadProgress(p)
                });

                finalData.file_id = driveFile.id;
                finalData.file_url = driveFile.webViewLink;
                setUploadLink(driveFile.webViewLink);
                // setUploading(false); // keep it true to show success in overlay until onClose
            }

            const { error } = await saveForm({
                ...finalData,
                user_id: profile?.id
            });
            if (error) throw error;

            alert('Form saved successfully!');
            navigate('/forms');
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
            // setUploading(false); // Handled by onClose
            // setUploadProgress(0); // Handled by onClose
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <button
                    onClick={() => navigate('/forms')}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    {isNew ? 'Add New Form' : 'Edit Form Details'}
                </h1>
            </div>

            <form onSubmit={handleSave} className="glass-panel" style={{ padding: '40px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Form Title *</label>
                        <div style={{ position: 'relative' }}>
                            <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="e.g. Employee Leave Application Form"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Form Type / Category</label>
                        <div style={{ position: 'relative' }}>
                            <Info size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="e.g. HR / Logistics"
                                value={formData.form_type}
                                onChange={(e) => setFormData({ ...formData, form_type: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Department / Issuer</label>
                        <div style={{ position: 'relative' }}>
                            <Building size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '40px' }}
                                placeholder="e.g. Accounts Dept"
                                value={formData.author_company}
                                onChange={(e) => setFormData({ ...formData, author_company: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                    <label className="form-label" style={{ marginBottom: '12px' }}>{formData.file_url ? 'Update Form File' : 'Upload PDF/Doc Form'}</label>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <Cloud size={48} color={file ? '#6366f1' : '#cbd5e1'} />
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            style={{ fontSize: '0.9rem' }}
                        />
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Supported formats: PDF, DOC, DOCX. Will be uploaded to Google Drive.</p>
                        {formData.file_url && !file && (
                            <a href={formData.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={14} /> Current File in Drive
                            </a>
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Description / Instructions</label>
                    <textarea
                        className="form-textarea"
                        rows={4}
                        placeholder="Add any instructions for completing this form..."
                        value={formData.info}
                        onChange={(e) => setFormData({ ...formData, info: e.target.value })}
                    />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                                {uploading ? 'Uploading to Drive...' : 'Saving...'}
                            </>
                        ) : (
                            <>
                                <Save size={20} /> Save Form
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/forms')}
                        style={{ padding: '14px 24px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </form>
            {/* Standardized Upload Overlay */}
            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Uploading Template..."
                locationLink={uploadLink}
                onClose={() => {
                    setUploadProgress(0);
                    setUploadLink(null);
                    setUploading(false);
                    // If it was newly saved, maybe we navigate now?
                    // But usually user wants to see the success.
                    // If they click 'Link', the alert was already shown in previous logic? 
                    // No, the navigate is in handleSave.
                    // I'll move navigate to onClose if it was successful.
                    if (formData.id || !isNew) navigate('/forms');
                }}
            />
        </div>
    );
}

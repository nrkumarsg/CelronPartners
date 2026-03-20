import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Globe, Trash2, ExternalLink, Grid, List, Edit, FileCheck } from 'lucide-react';
import { getForms, deleteForm } from '../lib/formsService';

export default function FormsDirectory() {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formsFolderId, setFormsFolderId] = useState(localStorage.getItem('forms_drive_folder_id') || '');

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const navigate = useNavigate();

    useEffect(() => {
        fetchForms();
        tryDetectFolder();
    }, []);

    const tryDetectFolder = async () => {
        const token = sessionStorage.getItem('google_contacts_token');
        if (token && !formsFolderId) {
            try {
                const { getOrCreateFolder } = await import('../lib/driveService');
                const id = await getOrCreateFolder(token, 'Forms');
                if (id) {
                    setFormsFolderId(id);
                    localStorage.setItem('forms_drive_folder_id', id);
                }
            } catch (err) {
                console.error("Error detecting folder:", err);
            }
        }
    };

    const handleOpenDrive = () => {
        const url = formsFolderId
            ? `https://drive.google.com/drive/folders/${formsFolderId}`
            : 'https://drive.google.com';
        window.open(url, '_blank');
    };

    const fetchForms = async () => {
        setLoading(true);
        const { data } = await getForms();
        if (data) setForms(data);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Remove this form from library?')) {
            await deleteForm(id);
            fetchForms();
        }
    };

    const filteredForms = forms.filter(f =>
        f.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.form_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.author_company?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ padding: '24px', maxWidth: '100%', margin: '0', background: '#f8fafc', minHeight: '100vh' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
                        Forms Directory
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Frequently used documents & Google Drive Cloud Storage</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/forms/calibration-lab')}
                        style={{ background: '#fff', color: '#10b981', border: '1px solid #10b981', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <FileCheck size={18} /> Calibration Lab
                    </button>
                    <button
                        onClick={handleOpenDrive}
                        style={{ background: '#fff', color: '#475569', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                        <Globe size={18} color="#4285F4" /> Open Forms Folder
                    </button>
                    <button
                        onClick={() => navigate('/forms/new')}
                        className="btn btn-primary"
                        style={{ padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} /> Add New Form
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center' }}>
                <div style={{ flex: 1, display: 'flex', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}><Search size={20} /></div>
                    <input
                        type="text"
                        placeholder="Search by title, type, or author..."
                        style={{ flex: 1, border: 'none', outline: 'none', padding: '12px', fontSize: '1rem' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '4px' }}>
                    <button onClick={() => setViewMode('grid')} style={{ padding: '8px', background: viewMode === 'grid' ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'grid' ? '#6366f1' : '#64748b' }}>
                        <Grid size={20} />
                    </button>
                    <button onClick={() => setViewMode('list')} style={{ padding: '8px', background: viewMode === 'list' ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: viewMode === 'list' ? '#6366f1' : '#64748b' }}>
                        <List size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
                    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #6366f1', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                    <p>Loading your forms library...</p>
                </div>
            ) : filteredForms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '100px 0', background: '#fff', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                    <FileCheck size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: '#475569', margin: '0 0 8px 0' }}>No forms found</h3>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Start by uploading your first company form.</p>
                </div>
            ) : (
                <div style={{
                    display: viewMode === 'grid' ? 'grid' : 'block',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '24px'
                }}>
                    {filteredForms.map(form => (
                        <div key={form.id} className="glass-panel" style={{ padding: '20px', marginBottom: viewMode === 'list' ? '12px' : '0', display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: '20px' }}>
                            <div style={{ width: viewMode === 'list' ? '48px' : '100%', height: viewMode === 'list' ? '48px' : '160px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: viewMode === 'grid' ? '16px' : '0' }}>
                                <FileText size={viewMode === 'list' ? 24 : 48} color="#6366f1" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b' }}>{form.title}</h3>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontWeight: 600 }}>{form.form_type}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{form.author_company}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <a
                                        href={form.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-secondary"
                                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        <ExternalLink size={14} /> View Form
                                    </a>
                                    <button
                                        onClick={() => navigate(`/forms/${form.id}`)}
                                        style={{ padding: '8px', background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', cursor: 'pointer' }}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(form.id)} style={{ padding: '8px', background: 'none', border: '1px solid #fee2e2', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

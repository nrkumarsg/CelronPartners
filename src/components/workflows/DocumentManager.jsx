import React, { useState, useEffect } from 'react';
import { getDocuments, addDocumentLink, deleteDocument } from '../../lib/workflowService';
import { useAuth } from '../../contexts/AuthContext';
import { Link2, ExternalLink, Plus, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import DriveScannerLinker from './DriveScannerLinker';


export default function DocumentManager({ referenceType, referenceId }) {
    const { profile } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newDocName, setNewDocName] = useState('');
    const [newDocUrl, setNewDocUrl] = useState('');

    useEffect(() => {
        if (profile) {
            if (profile.company_id && referenceId) {
                fetchDocs();
            } else {
                setLoading(false);
            }
        }
    }, [profile, referenceId]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const { data } = await getDocuments(profile.company_id, referenceType, referenceId);
            if (data) setDocuments(data);
        } catch (error) {
            console.error('Error fetching docs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDocument = async (e) => {
        e.preventDefault();
        if (!newDocUrl.trim()) return;

        try {
            await addDocumentLink({
                company_id: profile.company_id,
                reference_type: referenceType,
                reference_id: referenceId,
                name: newDocName || 'Untitled Document',
                url: newDocUrl
            });
            setNewDocName('');
            setNewDocUrl('');
            setShowAddForm(false);
            fetchDocs();
        } catch (error) {
            console.error('Failed to add document link', error);
            alert('Failed to add connection');
        }
    };

    const handleDelete = async (docId) => {
        if (!window.confirm("Remove this document link?")) return;
        try {
            await deleteDocument(docId);
            fetchDocs();
        } catch (error) {
            alert('Failed to delete document');
        }
    };


    return (
        <div style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginTop: '24px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '10px' }}>
                        <MessageSquare size={20} color="#10b981" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 600 }}>Cloud Documents Wall</h3>
                </div>

                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <Plus size={16} /> Link Drive File
                </button>

            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
                Link files hosted on Google Drive or OneDrive here. They will appear like a WhatsApp chat wall.
            </p>

            {showAddForm && (
                <form
                    onSubmit={handleAddDocument}
                    style={{
                        background: '#f8fafc',
                        padding: '20px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Document Name (Optional)</label>
                        <input
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                            placeholder="e.g. Supplier Quote PDF"
                            value={newDocName}
                            onChange={(e) => setNewDocName(e.target.value)}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <DriveScannerLinker 
                            label="Document URL (Link from Drive or Paste URL)"
                            selectedLink={newDocUrl}
                            onClear={() => setNewDocUrl('')}
                            onLinkSelected={(link, name) => {
                                setNewDocUrl(link);
                                if(!newDocName) setNewDocName(name.split('.')[0]);
                            }}
                        />
                        {!newDocUrl && (
                            <div style={{ marginTop: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>Or paste URL manually:</label>
                                <input
                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                                    placeholder="https://..."
                                    value={newDocUrl}
                                    onChange={(e) => setNewDocUrl(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={() => setShowAddForm(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                        <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)' }}>Save Link</button>
                    </div>
                </form>
            )}


            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        <Loader2 className="animate-spin" style={{ margin: '0 auto' }} />
                    </div>
                ) : documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8' }}>
                        No files linked yet.
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} className="document-wall-item" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            background: '#f8fafc',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}>
                            <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '50%' }}>
                                <Link2 size={18} color="#10b981" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</h4>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 500 }}>
                                    <ExternalLink size={12} /> Open in Cloud
                                </a>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(doc.created_at).toLocaleDateString()}</span>
                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
                                    className="hover-red"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}

            </div>
        </div>
    );
}

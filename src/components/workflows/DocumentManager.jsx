import React, { useState, useEffect } from 'react';
import { getDocuments, addDocumentLink } from '../../lib/workflowService';
import { useAuth } from '../../contexts/AuthContext';
import { Link2, ExternalLink, Plus, MessageSquare } from 'lucide-react';

export default function DocumentManager({ referenceType, referenceId }) {
    const { profile } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newDocName, setNewDocName] = useState('');
    const [newDocUrl, setNewDocUrl] = useState('');

    useEffect(() => {
        if (profile?.company_id && referenceId) {
            fetchDocs();
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

    return (
        <div className="glass-panel" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={20} color="#10b981" />
                    <h3 className="form-section-title" style={{ margin: 0, padding: 0, border: 'none' }}>Cloud Documents Wall</h3>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus size={16} /> Link Drive File
                </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
                Link files hosted on Google Drive or OneDrive here. They will appear like a WhatsApp chat wall.
            </p>

            {showAddForm && (
                <form onSubmit={handleAddDocument} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="form-group">
                        <label>Document Name (Optional)</label>
                        <input className="form-control" placeholder="e.g. Supplier Quote PDF" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label>URL (Google Drive / OneDrive Link)</label>
                        <input className="form-control" required placeholder="https://drive.google.com/..." value={newDocUrl} onChange={(e) => setNewDocUrl(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowAddForm(false)}>Cancel</button>
                        <button type="submit" className="btn btn-sm btn-primary">Save Link</button>
                    </div>
                </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Loading documents...</div>
                ) : documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: '#64748b' }}>
                        No files linked yet.
                    </div>
                ) : (
                    documents.map((doc) => (
                        <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '50%' }}>
                                <Link2 size={18} color="#10b981" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</h4>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <ExternalLink size={12} /> Open in Cloud
                                </a>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

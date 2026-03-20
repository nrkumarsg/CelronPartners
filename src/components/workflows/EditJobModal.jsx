import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, User, DollarSign, Tag, Info, Upload, ExternalLink } from 'lucide-react';
import { updateJob } from '../../lib/workflowService';
import { getContactsByPartner } from '../../lib/store';
import { uploadFileToDrive, checkFileExists } from '../../lib/driveService';
import { validateToken } from '../../lib/googleAuthService';
import GDriveConnectionModal from '../common/GDriveConnectionModal';

const PAYMENT_STATUSES = [
    'Unpaid',
    'Paid',
    'Hold',
    'Cancelled',
    'Discrepancy',
    'Others'
];

export default function EditJobModal({ job, onClose, onSave }) {
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [poFile, setPoFile] = useState(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [poFileExists, setPoFileExists] = useState(true);
    const [formData, setFormData] = useState({
        status: job.status || 'Active',
        type: job.type || 'Supply',
        po_ref: job.po_ref || '',
        po_date: job.po_date || '',
        po_amount: job.po_amount || '',
        po_by_contact_id: job.po_by_contact_id || '',
        payment_status: job.payment_status || 'Unpaid',
        payment_details: job.payment_details || ''
    });

    useEffect(() => {
        if (job?.enquiries?.customer_id) {
            fetchContacts();
        }
        if (job?.po_attachment_url) {
            checkPoExistence();
        }
    }, [job]);

    const checkPoExistence = async () => {
        if (job.po_attachment_url.includes('drive.google.com')) {
            const accessToken = localStorage.getItem('google_access_token');
            if (!accessToken) return;
            const match = job.po_attachment_url.match(/\/d\/([^/]+)/);
            const fileId = match ? match[1] : null;
            if (fileId) {
                const exists = await checkFileExists(accessToken, fileId);
                setPoFileExists(exists);
            }
        }
    };

    const fetchContacts = async () => {
        try {
            const data = await getContactsByPartner(job.enquiries.customer_id);
            if (data) setContacts(data);
        } catch (err) {
            console.error('Error fetching contacts:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let po_attachment_url = job.po_attachment_url;

            // Handle File Upload if new file selected
            if (poFile) {
                const accessToken = localStorage.getItem('google_access_token');
                const isValid = await validateToken(accessToken);
                if (!accessToken || !isValid) {
                    setIsAuthModalOpen(true);
                    setLoading(false);
                    return;
                }

                const uploadRes = await uploadFileToDrive(accessToken, poFile, {
                    dynamicPath: `Corporate Vault / PO Copies / ${new Date().getFullYear()}`,
                    company_id: job.company_id
                });
                po_attachment_url = uploadRes.webViewLink;
            }

            // Ensure numeric fields are numbers
            const payload = {
                ...formData,
                po_amount: formData.po_amount === '' ? null : parseFloat(formData.po_amount),
                po_attachment_url
            };
            const { data, error } = await updateJob(job.id, payload);
            if (error) throw error;
            onSave(data);
        } catch (error) {
            console.error('Error updating job:', error);
            alert('Failed to update job details');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            padding: '24px'
        }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', background: '#fff', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Update Order Details</h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Job: {job.job_no}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '8px', borderRadius: '50%' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* General Info Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Job Status</label>
                            <select name="status" className="form-select" value={formData.status} onChange={handleChange}>
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Order Type</label>
                            <select name="type" className="form-select" value={formData.type} onChange={handleChange}>
                                <option value="Supply">Supply</option>
                                <option value="Service">Service</option>
                                <option value="Installation">Installation</option>
                                <option value="Repair">Repair</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px solid #f1f5f9' }} />

                    {/* PO Details Section */}
                    <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Tag size={16} color="#3b82f6" /> Customer PO Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">PO Reference</label>
                                <input type="text" name="po_ref" className="form-input" placeholder="e.g. PO-8879" value={formData.po_ref} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PO Date</label>
                                <input type="date" name="po_date" className="form-input" value={formData.po_date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PO Amount ($)</label>
                                <input type="number" step="0.01" name="po_amount" className="form-input" placeholder="0.00" value={formData.po_amount} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">PO Issued By</label>
                                <select name="po_by_contact_id" className="form-select" value={formData.po_by_contact_id} onChange={handleChange}>
                                    <option value="">Select Contact...</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="form-label">PO Attachment Copy</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
                                        <Upload size={14} style={{ marginRight: '8px' }} />
                                        {poFile ? poFile.name : (job.po_attachment_url ? 'Change PO Copy' : 'Upload PO Copy')}
                                        <input type="file" style={{ display: 'none' }} onChange={(e) => setPoFile(e.target.files[0])} accept="image/*,application/pdf" />
                                    </label>
                                    {job.po_attachment_url && !poFile && (
                                        <a 
                                            href={job.po_attachment_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="btn btn-sm btn-ghost" 
                                            title={poFileExists ? "View Current PO" : "File Missing on Drive"}
                                            style={{ color: poFileExists ? 'inherit' : '#ef4444' }}
                                        >
                                            {poFileExists ? <ExternalLink size={14} /> : <AlertCircle size={14} />}
                                        </a>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>Syncs to Corporate Vault automatically.</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ borderBottom: '1px solid #f1f5f9' }} />

                    {/* Payment Status Section */}
                    <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign size={16} color="#10b981" /> Payment Tracking
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Paid Status</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {PAYMENT_STATUSES.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, payment_status: s }))}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                border: '1px solid',
                                                borderColor: formData.payment_status === s ? '#10b981' : '#e2e8f0',
                                                backgroundColor: formData.payment_status === s ? '#ecfdf5' : '#fff',
                                                color: formData.payment_status === s ? '#10b981' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Detail / Note</label>
                                <textarea
                                    name="payment_details"
                                    className="form-input"
                                    placeholder="Enter payment reference info, bank detail etc..."
                                    style={{ minHeight: '80px', paddingTop: '10px' }}
                                    value={formData.payment_details}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 24px' }}>Cancel</button>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 32px' }}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            Sync Changes
                        </button>
                    </div>
                </form>
            </div >
            <GDriveConnectionModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                state="manual_upload"
            />
        </div >
    );
}

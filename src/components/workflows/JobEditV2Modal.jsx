import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Upload, Calendar, User, Tag, DollarSign, FileText } from 'lucide-react';
import { saveWorkflowDocument, uploadJobAttachment } from '../../lib/workflowV2Service';
import { supabase } from '../../lib/supabase';

export default function JobEditV2Modal({ job, onClose, onSave }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    
    const [formData, setFormData] = useState({
        customer_po_no: job.customer_po_no || '',
        customer_po_date: job.customer_po_date || '',
        customer_po_by_id: job.customer_po_by_id || '',
        po_description: job.delivery_verification?.po_description || '',
        po_value: job.delivery_verification?.po_value || job.total_amount || 0,
        customer_po_attachment_url: job.customer_po_attachment_url || ''
    });

    useEffect(() => {
        if (job.partner_id) {
            fetchContacts(job.partner_id);
        }
    }, [job.partner_id]);

    const fetchContacts = async (partnerId) => {
        const { data, error } = await supabase
            .from('contacts')
            .select('id, first_name, last_name')
            .eq('partner_id', partnerId);
        
        if (data) {
            setContacts(data.map(c => ({
                id: c.id,
                name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unnamed Contact'
            })));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let attachmentUrl = formData.customer_po_attachment_url;

            if (selectedFile) {
                setUploading(true);
                attachmentUrl = await uploadJobAttachment(selectedFile, job.company_id);
                setUploading(false);
            }

            const updatedDoc = {
                ...job,
                customer_po_no: formData.customer_po_no,
                customer_po_date: formData.customer_po_date,
                customer_po_by_id: formData.customer_po_by_id || null,
                customer_po_attachment_url: attachmentUrl,
                delivery_verification: {
                    ...(job.delivery_verification || {}),
                    po_description: formData.po_description,
                    po_value: parseFloat(formData.po_value) || 0
                }
            };

            // Remove nested objects that shouldn't be sent back to Supabase
            delete updatedDoc.partners;
            delete updatedDoc.contacts;
            delete updatedDoc.vessels;
            delete updatedDoc.work_locations;
            delete updatedDoc.items;

            const { data, error } = await saveWorkflowDocument(updatedDoc);
            if (error) throw error;
            
            onSave(data);
            onClose();
        } catch (error) {
            console.error("Failed to save job:", error);
            alert("Error saving job details: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Tag size={24} color="var(--accent)" /> Update Job PO Details
                    </h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        <div className="form-item">
                            <label className="form-label">Customer PO No</label>
                            <input 
                                type="text" 
                                name="customer_po_no" 
                                className="form-input" 
                                value={formData.customer_po_no} 
                                onChange={handleChange} 
                                placeholder="PO-12345"
                            />
                        </div>
                        <div className="form-item">
                            <label className="form-label">PO Date</label>
                            <input 
                                type="date" 
                                name="customer_po_date" 
                                className="form-input" 
                                value={formData.customer_po_date} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div className="form-item">
                            <label className="form-label">PO Value (SGD)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                name="po_value" 
                                className="form-input" 
                                value={formData.po_value} 
                                onChange={handleChange} 
                            />
                        </div>
                        <div className="form-item">
                            <label className="form-label">PO Issued By</label>
                            <select 
                                name="customer_po_by_id" 
                                className="form-input" 
                                value={formData.customer_po_by_id} 
                                onChange={handleChange}
                            >
                                <option value="">Select Contact...</option>
                                {contacts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-item" style={{ marginBottom: '20px' }}>
                        <label className="form-label">PO Description / Project Scope</label>
                        <textarea 
                            name="po_description" 
                            className="form-input" 
                            rows="3" 
                            value={formData.po_description} 
                            onChange={handleChange}
                            placeholder="Briefly describe the PO scope..."
                        ></textarea>
                    </div>

                    <div className="form-item" style={{ marginBottom: '24px' }}>
                        <label className="form-label">PO Attachment</label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Upload size={18} />
                                {selectedFile ? selectedFile.name : (formData.customer_po_attachment_url ? 'Change Attachment' : 'Upload PO Copy')}
                                <input type="file" style={{ display: 'none' }} onChange={handleFileChange} accept=".pdf,image/*" />
                            </label>
                            {formData.customer_po_attachment_url && !selectedFile && (
                                <a href={formData.customer_po_attachment_url} target="_blank" rel="noreferrer" className="btn btn-icon" title="View Current Attachment">
                                    <FileText size={18} />
                                </a>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {uploading ? 'Uploading...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Loader2, X, FileText } from 'lucide-react';
import { getStatementData, saveWorkflowDocument, generateDocNumber } from '../../lib/workflowV2Service';
import RichTextEditor from '../common/RichTextEditor';

export default function ReceivePaymentModal({ prefill, onClose, onSuccess, partners, company_id }) {
    const [formData, setFormData] = useState({
        id: prefill?.id || null,
        partner_id: prefill?.partner_id || '',
        issue_date: prefill?.issue_date || new Date().toISOString().split('T')[0],
        total_amount: prefill?.amount || 0,
        payment_method: prefill?.payment_method || 'Bank Transfer',
        payment_ref: prefill?.payment_ref || '',
        related_document_id: prefill?.related_document_id || prefill?.id || '',
        invoice_no: prefill?.document_no || '',
        subject: prefill?.subject || (prefill?.document_no ? `Payment for Invoice ${prefill.document_no}` : 'General Payment Received'),
        notes: prefill?.notes || ''
    });
    const [saving, setSaving] = useState(false);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!formData.partner_id) {
                setOutstandingInvoices([]);
                return;
            }
            setLoadingInvoices(true);
            try {
                const { data } = await getStatementData(company_id, formData.partner_id, '2000-01-01', '2099-12-31');
                if (data) {
                    const invoices = [];
                    const payments = new Map();
                    data.forEach(doc => {
                        if ((doc.document_type || '').includes('Invoice')) {
                            invoices.push(doc);
                        } else if (doc.document_type === 'Payment Received' && doc.internal_notes) {
                            try {
                                const notes = JSON.parse(doc.internal_notes);
                                if (notes.related_document_id) {
                                    payments.set(notes.related_document_id, (payments.get(notes.related_document_id) || 0) + parseFloat(doc.total_amount || 0));
                                }
                            } catch {}
                        }
                    });
                    const outstanding = invoices.map(inv => {
                        const paid = payments.get(inv.id) || 0;
                        return { ...inv, outstanding: (parseFloat(inv.total_amount || 0) - paid) };
                    }).filter(inv => inv.outstanding > 0.01);
                    setOutstandingInvoices(outstanding);
                }
            } catch (err) {
                console.error('Error fetching invoices', err);
            } finally {
                setLoadingInvoices(false);
            }
        };
        fetchInvoices();
    }, [formData.partner_id, company_id]);

    const handleSave = async () => {
        if (!formData.partner_id || !formData.total_amount) {
            alert('Partner and Amount are required.');
            return;
        }
        setSaving(true);
        try {
            // If it's a new payment, generate a number. If editing, keep existing.
            const docNo = formData.id ? prefill?.document_no : await generateDocNumber(company_id || partners.find(p => p.id === formData.partner_id)?.company_id, 'Payment Received');
            
            const payload = {
                id: formData.id,
                partner_id: formData.partner_id,
                issue_date: formData.issue_date,
                total_amount: formData.total_amount,
                subject: formData.invoice_no ? `Payment for ${formData.invoice_no}` : formData.subject,
                notes: formData.notes,
                document_type: 'Payment Received',
                document_no: docNo || `PAY-${new Date().getTime()}`,
                company_id: company_id || partners.find(p => p.id === formData.partner_id)?.company_id,
                status: 'Confirmed',
                internal_notes: JSON.stringify({
                    payment_method: formData.payment_method,
                    payment_ref: formData.payment_ref,
                    related_document_id: formData.related_document_id === 'other_custom' ? null : formData.related_document_id
                })
            };

            const { error } = await saveWorkflowDocument(payload, []);
            if (error) throw error;
            onSuccess();
        } catch (err) {
            console.error('Save Payment Error:', err);
            alert(`Failed to record payment: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '24px', backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '1000px', background: '#fff', borderRadius: '20px', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Record Customer Payment</h3>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>Instantly log payment and update SOA balance.</p>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-item" style={{ margin: 0 }}>
                        <label>Customer</label>
                        <select className="form-input" value={formData.partner_id} onChange={e => setFormData({ ...formData, partner_id: e.target.value })} disabled={!!prefill?.partner_id}>
                            <option value="">-- Select Customer --</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid-2">
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Payment Date</label>
                            <input type="date" className="form-input" value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} />
                        </div>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Amount Received (SGD)</label>
                            <input type="number" className="form-input" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Payment Method</label>
                            <select className="form-input" value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="PayNow">PayNow</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Transaction Ref</label>
                            <input type="text" className="form-input" value={formData.payment_ref} onChange={e => setFormData({ ...formData, payment_ref: e.target.value })} placeholder="e.g. TXN-12345" />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>
                                Invoice No / Job No Reference 
                                {loadingInvoices && <Loader2 size={12} className="animate-spin" style={{ display: 'inline-block', marginLeft: '6px' }} />}
                            </label>
                            {formData.related_document_id === 'other_custom' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ flex: 1 }}
                                        value={formData.invoice_no} 
                                        onChange={e => setFormData({ ...formData, invoice_no: e.target.value })} 
                                        placeholder="Enter manual reference..." 
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0 12px' }} 
                                        onClick={() => setFormData({ ...formData, related_document_id: '' })}
                                    >
                                        Back
                                    </button>
                                </div>
                            ) : (
                                <select 
                                    className="form-input" 
                                    value={formData.related_document_id} 
                                    onChange={e => {
                                        const selectedId = e.target.value;
                                        if (selectedId === 'other_custom') {
                                            setFormData({ ...formData, related_document_id: 'other_custom', invoice_no: '' });
                                        } else {
                                            const selectedInv = outstandingInvoices.find(i => i.id === selectedId);
                                            if (selectedInv) {
                                                setFormData({ 
                                                    ...formData, 
                                                    related_document_id: selectedId, 
                                                    invoice_no: selectedInv.document_no,
                                                    total_amount: selectedInv.outstanding > 0 ? selectedInv.outstanding : formData.total_amount
                                                });
                                            } else {
                                                setFormData({ ...formData, related_document_id: '', invoice_no: '' });
                                            }
                                        }
                                    }}
                                >
                                    <option value="">-- Select Outstanding Invoice --</option>
                                    {outstandingInvoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.document_no} {inv.assigned_job_no ? `(Job: ${inv.assigned_job_no})` : ''} - Bal: SGD {inv.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </option>
                                    ))}
                                    <option value="other_custom">Custom Reference...</option>
                                </select>
                            )}
                        </div>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Description / Allocation</label>
                            <input type="text" className="form-input" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-item" style={{ margin: 0 }}>
                        <label>NOTES WITH RICH TEXT (TABLES & IMAGES SUPPORTED):-</label>
                        <RichTextEditor 
                            value={formData.notes} 
                            onChange={val => setFormData({ ...formData, notes: val })} 
                            placeholder="Add internal notes, insert tables or upload images for reconciliation..."
                            height="250px"
                        />
                    </div>
                </div>
                <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Record Payment Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}

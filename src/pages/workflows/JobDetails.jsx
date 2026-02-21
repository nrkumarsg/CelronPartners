import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getJobById, updateJob, getPurchaseOrders, createPurchaseOrder } from '../../lib/workflowService';
import { generateDocumentPDF } from '../../lib/pdfGenerator';
import DocumentManager from '../../components/workflows/DocumentManager';
import { ArrowLeft, FileText, CheckCircle, ShieldCheck, DollarSign, Plus, Printer, Truck } from 'lucide-react';

export default function JobDetails() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [job, setJob] = useState(null);
    const [pos, setPos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [poType, setPoType] = useState('Customer');
    const [amountStr, setAmountStr] = useState('');
    const [partnerStr, setPartnerStr] = useState('');

    useEffect(() => {
        if (profile?.company_id && id) {
            fetchJob();
        }
    }, [id, profile]);

    const fetchJob = async () => {
        setLoading(true);
        try {
            const { data, error } = await getJobById(profile.company_id, id);
            if (error) throw error;
            if (data) {
                setJob(data);
                fetchPOs(data.id);
            }
        } catch (error) {
            console.error('Error fetching job details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPOs = async (jobId) => {
        const { data } = await getPurchaseOrders(profile.company_id, jobId);
        if (data) setPos(data);
    };

    const handleAddTracking = async (e) => {
        e.preventDefault();
        const amt = parseFloat(amountStr) || 0;
        if (amt <= 0) return alert('Enter a valid amount');

        try {
            const isCust = poType === 'Customer';
            const payload = {
                job_id: job.id,
                company_id: profile.company_id,
                type: isCust ? `Customer PO (${partnerStr})` : `Supplier Expense (${partnerStr})`,
                total_amount: isCust ? amt : null,
                expenses: isCust ? null : amt,
                status: 'Confirmed'
            };

            await createPurchaseOrder(payload);
            setAmountStr('');
            setPartnerStr('');
            fetchPOs(job.id);
        } catch (error) {
            console.error('Error adding:', error);
            alert('Failed to save record.');
        }
    };

    const handleGenerateDoc = async (docType) => {
        setLoading(true);
        try {
            await generateDocumentPDF(job, docType);
        } catch (error) {
            console.error("PDF generation failed:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteJob = async () => {
        if (!window.confirm("Mark Job as Completed? (Payment Received)")) return;
        await updateJob(job.id, { status: 'Completed' });
        fetchJob();
    };

    if (loading) return <div className="loading-state">Loading Job Details...</div>;
    if (!job) return <div className="page-container"><h2>Job Not Found</h2></div>;

    // Financial calculations
    const customerValue = pos.reduce((sum, po) => sum + (Number(po.total_amount) || 0), 0);
    const totalExpenses = pos.reduce((sum, po) => sum + (Number(po.expenses) || 0), 0);
    const profit = customerValue - totalExpenses;
    const isProfitable = profit >= 0;

    return (
        <div className="page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Link to="/workflows" className="btn btn-sm btn-outline" style={{ display: 'inline-flex', marginBottom: '16px', gap: '8px' }}>
                        <ArrowLeft size={16} /> Back to Board
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: job.status === 'Completed' ? '#10b981' : '#34d399', color: 'white', padding: '12px', borderRadius: '12px' }}>
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ color: '#34d399', margin: 0 }}>{job.job_no}</h1>
                            <p className="page-description" style={{ margin: 0, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{job.type} Job</span>
                                • From: {job.enquiries?.enquiry_no} • Status: <span style={{ color: job.status === 'Completed' ? '#10b981' : '#f59e0b' }}>{job.status}</span>
                            </p>
                        </div>
                    </div>
                </div>
                {job.status !== 'Completed' && (
                    <button className="btn btn-primary" onClick={handleCompleteJob} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981' }}>
                        <CheckCircle size={18} /> Mark Payment Received (Close)
                    </button>
                )}
            </header>

            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Finance Tracking Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Profit Margin Calculator */}
                    <div className="card" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                            <DollarSign size={20} color="#eab308" /> Financial Tracker
                        </h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                            <span style={{ color: '#94a3b8' }}>Total PO Value:</span>
                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>${customerValue.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                            <span style={{ color: '#94a3b8' }}>Total Expenses:</span>
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>-${totalExpenses.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Net Profit</span>
                            <span style={{ color: isProfitable ? '#4ade80' : '#ef4444', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                ${profit.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Expense Entry Form */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: '16px' }}>Add Transaction</h3>
                        <form onSubmit={handleAddTracking} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label>Record Type</label>
                                <select className="form-control" value={poType} onChange={e => setPoType(e.target.value)}>
                                    <option value="Customer">Customer PO Value (Incoming)</option>
                                    <option value="Supplier">Supplier Invoice / Expense (Outgoing)</option>
                                </select>
                            </div>
                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div className="form-group">
                                    <label>Amount ($)</label>
                                    <input type="number" step="0.01" className="form-control" value={amountStr} onChange={e => setAmountStr(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Partner / Note</label>
                                    <input className="form-control" placeholder="e.g. FedEx / Supplier Name" value={partnerStr} onChange={e => setPartnerStr(e.target.value)} required />
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} /> Save Record
                            </button>
                        </form>

                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {pos.map(po => (
                                <div key={po.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${po.total_amount ? '#3b82f6' : '#ef4444'}` }}>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: '0.9rem', color: '#e2e8f0' }}>{po.type}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(po.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ fontWeight: 600, color: po.total_amount ? '#3b82f6' : '#ef4444' }}>
                                        {po.total_amount ? `+ $${po.total_amount}` : `- $${po.expenses}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Logistics & Documents Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Document Generators */}
                    <div className="glass-panel text-center">
                        <h3 className="form-section-title" style={{ margin: '0 0 16px', border: 'none', padding: 0 }}>Document Generation</h3>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '24px' }}>
                            Automatically generate PDF documentation mapping from your active Catalog items on this Job.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button className="btn btn-outline" onClick={() => handleGenerateDoc('Delivery Order')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px' }}>
                                <Truck size={18} color="#60a5fa" /> Generate Delivery Order / Packing List
                            </button>
                            <button className="btn btn-outline" onClick={() => handleGenerateDoc('Proforma/Tax Invoice')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px' }}>
                                <Printer size={18} color="#f43f5e" /> Generate Tax Invoice
                            </button>
                        </div>
                    </div>

                    <div className="glass-panel">
                        <h3 className="form-section-title" style={{ border: 'none', padding: 0, margin: '0 0 8px 0', fontSize: '1.05rem', color: '#fff' }}>Deliver To</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>{job.enquiries?.partners?.name || 'No Partner'}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>{job.enquiries?.partners?.address || 'Address missing'}</p>

                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#e2e8f0' }}>Job Supply List</h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                {(job.enquiries?.catalog_items || []).map((item, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{item.name} ({item.specification || 'N/A'})</li>
                                ))}
                                {(!job.enquiries?.catalog_items || job.enquiries?.catalog_items.length === 0) && <li>No items mapped.</li>}
                            </ul>
                        </div>
                    </div>

                    {/* WhatsApp Wall / Document Manager imported as component */}
                    <DocumentManager referenceType="Job" referenceId={id} />

                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnquiries, getJobs, createEnquiry, generateEnquiryNo, createJob, generateJobNo } from '../../lib/workflowService';
import { FileText, Plus, ArrowRight, ShieldCheck, Ship, Search, Link } from 'lucide-react';
import { getPartners } from '../../lib/store';

export default function WorkflowBoard() {
    const { profile } = useAuth();
    const [enquiries, setEnquiries] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEnquiryModal, setShowEnquiryModal] = useState(false);

    // New Enquiry Form State
    const [newEnquiry, setNewEnquiry] = useState({ type: 'Supply', source: '', partner_id: '' });

    useEffect(() => {
        if (profile?.company_id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [enqRes, jobsRes, partnersData] = await Promise.all([
                getEnquiries(profile.company_id),
                getJobs(profile.company_id),
                getPartners() // Fetch partners for selection
            ]);
            if (enqRes.data) setEnquiries(enqRes.data);
            if (jobsRes.data) setJobs(jobsRes.data);
            if (partnersData) setPartners(partnersData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEnquiry = async (e) => {
        e.preventDefault();
        try {
            const enquiry_no = await generateEnquiryNo(profile.company_id);
            const { error } = await createEnquiry({
                ...newEnquiry,
                enquiry_no,
                company_id: profile.company_id
            });
            if (error) throw error;
            setShowEnquiryModal(false);
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Failed to create enquiry:', error);
            alert('Failed to create enquiry');
        }
    };

    const convertToJob = async (enquiry) => {
        if (!window.confirm(`Convert ${enquiry.enquiry_no} to an Active Job/PO?`)) return;
        try {
            const job_no = await generateJobNo(profile.company_id, 'CEL');
            const { error } = await createJob({
                job_no,
                enquiry_id: enquiry.id,
                type: enquiry.type,
                company_id: profile.company_id
            });
            if (error) throw error;
            fetchData(); // Refresh
        } catch (error) {
            console.error('Error converting job:', error);
            alert('Failed to convert to job');
        }
    };

    if (loading) return <div className="loading-state">Loading Workflow Board...</div>;

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-content">
                    <h1 className="page-title">
                        <FileText className="title-icon" /> Workflows
                    </h1>
                    <p className="page-description">Manage your pending Enquiries and active Jobs</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-primary" onClick={() => setShowEnquiryModal(true)}>
                        <Plus size={18} /> New Enquiry
                    </button>
                </div>
            </header>

            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="stat-card">
                    <div className="stat-header">
                        <h3>Pending Enquiries</h3>
                        <Ship size={20} color="#60a5fa" />
                    </div>
                    {enquiries.filter(e => e.status !== 'Converted').map(e => (
                        <div key={e.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <Link to={`/workflows/enquiry/${e.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                    <h4 style={{ margin: 0, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {e.enquiry_no} <ArrowRight size={14} />
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>Type: {e.type} | Partner: {e.partners?.name || 'Unknown'}</p>
                                </Link>
                            </div>
                            <button className="btn btn-sm btn-outline" onClick={() => convertToJob(e)} title="Convert to Job (Received PO)">
                                Convert to Job <ArrowRight size={14} />
                            </button>
                        </div>
                    ))}
                    {enquiries.filter(e => e.status !== 'Converted').length === 0 && (
                        <p style={{ color: '#64748b' }}>No pending enquiries.</p>
                    )}
                </div>

                <div className="stat-card">
                    <div className="stat-header">
                        <h3>Active Jobs (Awarded POs)</h3>
                        <ShieldCheck size={20} color="#34d399" />
                    </div>
                    {jobs.map(j => (
                        <div key={j.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #34d399' }}>
                            <Link to={`/workflows/job/${j.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                <h4 style={{ margin: 0, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {j.job_no} <ArrowRight size={14} />
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                                    From: {j.enquiries?.enquiry_no} | Type: {j.type} | {j.enquiries?.partners?.name}
                                </p>
                            </Link>
                        </div>
                    ))}
                    {jobs.length === 0 && <p style={{ color: '#64748b' }}>No active jobs.</p>}
                </div>
            </div>

            {/* Simple Modal for New Enquiry Demo */}
            {showEnquiryModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Create Enquiry</h3>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreateEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select className="form-control" value={newEnquiry.type} onChange={e => setNewEnquiry({ ...newEnquiry, type: e.target.value })}>
                                        <option value="Supply">Supply Order</option>
                                        <option value="Service">Service Order</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Source (Email, Phone, WhatsApp)</label>
                                    <input className="form-control" value={newEnquiry.source} onChange={e => setNewEnquiry({ ...newEnquiry, source: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Customer (Partner)</label>
                                    <select className="form-control" value={newEnquiry.partner_id} onChange={e => setNewEnquiry({ ...newEnquiry, partner_id: e.target.value })}>
                                        <option value="">-- Select Partner --</option>
                                        {partners.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                    <button type="button" className="btn btn-outline" onClick={() => setShowEnquiryModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Create Enquiry</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

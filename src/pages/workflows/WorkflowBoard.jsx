import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnquiries, getJobs, createEnquiry, generateEnquiryNo, createJob, generateJobNo } from '../../lib/workflowService';
import { getPartners } from '../../lib/store';
import { FileText, Plus, Search, Filter, ChevronDown, Eye, ShieldCheck, ArrowRightLeft, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkflowBoard() {
    const { profile } = useAuth();
    const [enquiries, setEnquiries] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEnquiryModal, setShowEnquiryModal] = useState(false);

    // Tab state: 'enquiries' | 'jobs'
    const [activeTab, setActiveTab] = useState('enquiries');

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
                getPartners()
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
            fetchData();
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
            fetchData();
        } catch (error) {
            console.error('Error converting job:', error);
            alert('Failed to convert to job');
        }
    };

    // Helper to format date
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Helper for status badge colors
    const getStatusStyle = (status) => {
        if (status === 'Converted' || status === 'Completed') return { bg: '#dcfce7', color: '#166534' };
        if (status === 'Draft' || status === 'Pending') return { bg: '#fef3c7', color: '#b45309' };
        return { bg: '#e0e7ff', color: '#4338ca' }; // default active/submitted
    };

    if (loading) return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#64748b' }}>Loading Workflows...</p>
        </div>
    );

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            {/* Header section matching BASE44 */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Workflows</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage your incoming enquiries and active jobs globally</p>
                </div>
                <button onClick={() => setShowEnquiryModal(true)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                    <Plus size={18} /> New Enquiry
                </button>
            </header>

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('enquiries')}
                    style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === 'enquiries' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'enquiries' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'enquiries' ? 600 : 500, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} /> Pending Enquiries
                </button>
                <button
                    onClick={() => setActiveTab('jobs')}
                    style={{ background: 'transparent', border: 'none', padding: '12px 0', borderBottom: activeTab === 'jobs' ? '2px solid #6366f1' : '2px solid transparent', color: activeTab === 'jobs' ? '#6366f1' : '#64748b', fontWeight: activeTab === 'jobs' ? 600 : 500, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} /> Active Jobs (POs)
                </button>
            </div>

            {/* Main Table Container */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Search Bar / Filters */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', minWidth: '400px' }}>
                        <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                        <input type="text" placeholder={`Search by reference, customer, or type...`} style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: '#334155' }} />
                    </div>
                    <div>
                        <button style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                            <Filter size={16} color="#94a3b8" /> All Status <ChevronDown size={14} />
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Reference</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Customer / Partner</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'enquiries' ? (
                            enquiries.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No enquiries found.</td></tr>
                            ) : (
                                enquiries.map((enq) => {
                                    const stStyle = getStatusStyle(enq.status);
                                    return (
                                        <tr key={enq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px 24px', fontWeight: 600, color: '#1e293b' }}>{enq.enquiry_no}</td>
                                            <td style={{ padding: '16px 24px', color: '#475569' }}>
                                                <div>{enq.partners?.name || 'Walk-in / Unknown'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Source: {enq.source}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', color: '#64748b' }}>{enq.type}</td>
                                            <td style={{ padding: '16px 24px', color: '#64748b' }}>{formatDate(enq.created_at)}</td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{ background: stStyle.bg, color: stStyle.color, padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500 }}>
                                                    {enq.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <Link to={`/workflows/enquiry/${enq.id}`} style={{ textDecoration: 'none' }}>
                                                        <button style={{ background: 'transparent', color: '#6366f1', border: '1px solid #e0e7ff', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                            <Eye size={14} /> View Details
                                                        </button>
                                                    </Link>
                                                    {enq.status !== 'Converted' && (
                                                        <button onClick={() => convertToJob(enq)} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }} title="Convert to Job">
                                                            <ArrowRightLeft size={14} /> Convert
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        ) : (
                            jobs.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No active jobs found.</td></tr>
                            ) : (
                                jobs.map((job) => {
                                    const stStyle = getStatusStyle(job.status);
                                    return (
                                        <tr key={job.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px 24px', fontWeight: 600, color: '#10b981' }}>{job.job_no}</td>
                                            <td style={{ padding: '16px 24px', color: '#475569' }}>
                                                <div>{job.enquiries?.partners?.name || 'Customer'}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>From: {job.enquiries?.enquiry_no}</div>
                                            </td>
                                            <td style={{ padding: '16px 24px', color: '#64748b' }}>{job.type} Job</td>
                                            <td style={{ padding: '16px 24px', color: '#64748b' }}>{formatDate(job.created_at)}</td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{ background: stStyle.bg, color: stStyle.color, padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500 }}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <Link to={`/workflows/job/${job.id}`} style={{ textDecoration: 'none' }}>
                                                    <button style={{ background: 'transparent', color: '#10b981', border: '1px solid #d1fae5', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                        <ShieldCheck size={14} /> Process Job
                                                    </button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal mapped to BASE44 styling slightly */}
            {showEnquiryModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '500px', borderRadius: '12px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: '#1e293b' }}>Add New Enquiry</h2>

                        <form onSubmit={handleCreateEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>Customer / Partner *</label>
                                <select
                                    value={newEnquiry.partner_id}
                                    onChange={e => setNewEnquiry({ ...newEnquiry, partner_id: e.target.value })}
                                    style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
                                    required
                                >
                                    <option value="">-- Select Partner --</option>
                                    {partners.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>Transaction Type *</label>
                                    <select
                                        value={newEnquiry.type}
                                        onChange={e => setNewEnquiry({ ...newEnquiry, type: e.target.value })}
                                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
                                    >
                                        <option value="Supply">Supply</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>Source Channel *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Email, WhatsApp"
                                        value={newEnquiry.source}
                                        onChange={e => setNewEnquiry({ ...newEnquiry, source: e.target.value })}
                                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', color: '#334155' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button type="button" onClick={() => setShowEnquiryModal(false)} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 500, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 20px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>
                                    Add Enquiry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


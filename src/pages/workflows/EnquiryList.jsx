import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnquiries, getJobs, createJob, generateJobNo } from '../../lib/workflowService';
import {
    FileText, Plus, Search, Filter,
    Eye, ShieldCheck, ArrowRightLeft,
    ChevronDown, LayoutDashboard,
    Clock, CheckCircle2, AlertCircle,
    Building2, User, Hash, Calendar,
    ExternalLink, Trash2, Printer,
    MoreVertical, Edit, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { validateToken, connectGoogleAPI } from '../../lib/googleAuthService';
import CustomerEnquiryForm from '../../components/CustomerEnquiryForm';
import EditJobModal from '../../components/workflows/EditJobModal';

export default function EnquiryList() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialTab = queryParams.get('tab') || 'enquiries';

    const [enquiries, setEnquiries] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [showEnquiryForm, setShowEnquiryForm] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [editingEnquiry, setEditingEnquiry] = useState(null);
    const [editingJob, setEditingJob] = useState(null);

    useEffect(() => {
        const tab = queryParams.get('tab') || 'enquiries';
        if (tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    useEffect(() => {
        if (profile?.company_id) {
            fetchData();
        }
    }, [profile, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'enquiries') {
                const { data } = await getEnquiries(profile.company_id);
                if (data) setEnquiries(data);
            } else if (activeTab === 'jobs') {
                const { data } = await getJobs(profile.company_id);
                if (data) setJobs(data);
            } else if (activeTab === 'rfqs') {
                const { getWorkflowDocuments } = await import('../../lib/workflowV2Service');
                const { data } = await getWorkflowDocuments(profile.company_id, 'Enquiry');
                if (data) setRfqs(data);
            }
        } catch (error) {
            console.error('Error fetching list data:', error);
        } finally {
            fetchDataCounts();
            setLoading(false);
        }
    };

    const fetchDataCounts = async () => {
        // Just keeping summaries synced
        try {
            if (activeTab !== 'enquiries') {
                 const { data: enqs } = await getEnquiries(profile.company_id);
                 if (enqs) setEnquiries(enqs);
            }
            if (activeTab !== 'jobs') {
                const { data: jbs } = await getJobs(profile.company_id);
                if (jbs) setJobs(jbs);
            }
        } catch(e) {}
    };

    const handleEnquirySaved = () => {
        setShowEnquiryForm(false);
        setEditingEnquiry(null);
        fetchData();
    };

    const handleJobSaved = () => {
        setEditingJob(null);
        fetchData();
    };

    const handleDeleteEnquiry = async (id, no) => {
        if (!window.confirm(`Are you sure you want to delete Enquiry ${no}?`)) return;
        try {
            const { deleteEnquiry } = await import('../../lib/workflowService');
            const { error } = await deleteEnquiry(id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting enquiry:', error);
            alert('Failed to delete enquiry');
        }
    };

    const handleDeleteJob = async (id, no) => {
        if (!window.confirm(`Are you sure you want to delete Job ${no}?`)) return;
        try {
            const { deleteJob } = await import('../../lib/workflowService');
            const { error } = await deleteJob(id);
            if (error) throw error;
            fetchData();
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        }
    };

    const convertToJob = async (enquiry) => {
        if (!window.confirm(`Convert ${enquiry.enquiry_no} to an Active Job?`)) return;
        try {
            const job_no = await generateJobNo(profile.company_id, 'CEL');

            // Create GDrive folder structure for the new job (Non-blocking)
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (accessToken && isValid) {
                try {
                    const { provisionFullProjectStructure } = await import('../../lib/driveService');
                    await provisionFullProjectStructure(accessToken, job_no);
                } catch (driveErr) {
                    console.error('GDrive folder creation failed:', driveErr);
                    // Non-blocking warning: Job still gets created in DB
                    alert("Job record created, but Google Drive folders couldn't be provisioned. Please check your Drive connection in Settings.");
                }
            }

            const { error } = await createJob({
                job_no,
                enquiry_id: enquiry.id,
                type: enquiry.type || 'Supply',
                company_id: profile.company_id,
                status: 'Active'
            });
            if (error) throw error;
            fetchData();
            alert(`Enquiry ${enquiry.enquiry_no} successfully converted to Job ${job_no}`);
        } catch (error) {
            console.error('Error converting job:', error);
            alert('Failed to convert to job: ' + (error.message || 'Unknown error'));
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Converted':
            case 'Completed':
            case 'Paid':
                return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <CheckCircle2 size={12} /> };
            case 'Draft':
            case 'Pending':
                return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', icon: <Clock size={12} /> };
            case 'Cancelled':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: <AlertCircle size={12} /> };
            default:
                return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', icon: <LayoutDashboard size={12} /> };
        }
    };

    const rawData = activeTab === 'enquiries' ? (enquiries || []) : (activeTab === 'jobs' ? (jobs || []) : (rfqs || []));
    const filteredData = rawData.filter(item => {
        if (!item) return false;
        const query = searchQuery.toLowerCase();
        
        let docNo = '';
        let partnerName = '';
        let ref = '';

        if (activeTab === 'enquiries') {
            docNo = item.enquiry_no || '';
            partnerName = item.customer?.name || 'Unknown';
            ref = item.customer_ref || '';
        } else if (activeTab === 'jobs') {
            docNo = item.job_no || '';
            partnerName = item.enquiries?.customer?.name || 'Unknown';
            ref = '';
        } else if (activeTab === 'rfqs') {
            docNo = item.document_no || '';
            partnerName = item.partners?.name || 'Supplier Not Set';
            ref = item.subject || '';
        }

        const matchesSearch = docNo.toLowerCase().includes(query) ||
            partnerName.toLowerCase().includes(query) ||
            ref.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <header className="page-header" style={{ marginBottom: '32px', alignItems: 'flex-start' }}>
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn btn-sm btn-outline"
                        style={{ display: 'inline-flex', marginBottom: '16px', gap: '8px' }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="page-title">Enquiry & RFQ Hub</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Manage customer enquiries and follow-up jobs/orders in one system.
                    </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/workflows')}
                            className="btn btn-sm btn-outline"
                            style={{ display: 'inline-flex', gap: '8px' }}
                        >
                            Quick Workflow <ExternalLink size={16} />
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setShowEnquiryForm(true)}
                        >
                            <Plus size={18} /> New Enquiry
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '12px', borderRadius: '12px' }}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Enquiries</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{enquiries.length}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '12px' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Jobs</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{jobs.filter(j => j.status === 'Active').length}</div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px', borderRadius: '12px' }}>
                        <Clock size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Follow-up</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{enquiries.filter(e => e.status !== 'Converted').length}</div>
                    </div>
                </div>
            </div>

            {/* Custom Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'var(--bg-secondary)',
                padding: '6px',
                borderRadius: '12px',
                width: 'fit-content',
                marginBottom: '24px',
                border: '1px solid var(--border-color)'
            }}>
                <button
                    onClick={() => navigate('/enquiries?tab=enquiries')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'enquiries' ? 'var(--bg-primary)' : 'transparent',
                        color: activeTab === 'enquiries' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: activeTab === 'enquiries' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <FileText size={18} /> Pending Enquiries
                </button>
                <button
                    onClick={() => navigate('/enquiries?tab=rfqs')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'rfqs' ? 'var(--bg-primary)' : 'transparent',
                        color: activeTab === 'rfqs' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: activeTab === 'rfqs' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowRightLeft size={18} /> RFQ Depository
                </button>
                <button
                    onClick={() => navigate('/enquiries?tab=jobs')}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'jobs' ? 'var(--bg-primary)' : 'transparent',
                        color: activeTab === 'jobs' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: activeTab === 'jobs' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <ShieldCheck size={18} /> Active Orders (Jobs)
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 16px', flex: 1, minWidth: '300px' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ marginRight: '10px' }} />
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'enquiries' ? "Search enquiry no, customer, reference..." : 
                                activeTab === 'rfqs' ? "Search RFQ no, supplier, subject..." :
                                "Search job no, customer..."
                            }
                            style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: 'var(--text-primary)', fontSize: '0.95rem' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select
                            className="form-select"
                            style={{ width: '160px', margin: 0 }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            {activeTab === 'enquiries' ? (
                                <>
                                    <option value="Draft">Draft</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Converted">Converted</option>
                                </>
                            ) : (
                                <>
                                    <option value="Active">Active</option>
                                    <option value="Completed">Completed</option>
                                </>
                            )}
                        </select>
                    </div>
                </div>

                <div className="table-container" style={{ margin: 0 }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ background: 'var(--bg-secondary)' }}>
                            <tr>
                                <th style={{ padding: '16px 24px' }}>
                                    {activeTab === 'enquiries' ? 'Enquiry Ref' : 
                                     activeTab === 'rfqs' ? 'RFQ Number' :
                                     'Job Number'}
                                </th>
                                <th style={{ padding: '16px 24px' }}>
                                    {activeTab === 'rfqs' ? 'Supplier (RFQ Recipient)' : 'Customer / Contact'}
                                </th>
                                {activeTab === 'enquiries' && <th style={{ padding: '16px 24px' }}>Customer Ref</th>}
                                {activeTab === 'rfqs' && <th style={{ padding: '16px 24px' }}>RFQ Subject</th>}
                                {(activeTab === 'enquiries' || activeTab === 'rfqs') && <th style={{ padding: '16px 24px' }}>Due Date</th>}
                                {activeTab === 'jobs' && <th style={{ padding: '16px 24px', textAlign: 'right' }}>Revenue</th>}
                                {activeTab === 'jobs' && <th style={{ padding: '16px 24px', textAlign: 'right' }}>Cost</th>}
                                {activeTab === 'jobs' && <th style={{ padding: '16px 24px', textAlign: 'right' }}>Profit</th>}
                                {activeTab === 'jobs' && <th style={{ padding: '16px 24px', textAlign: 'center' }}>Payment</th>}
                                <th style={{ padding: '16px 24px' }}>Date Sent</th>
                                <th style={{ padding: '16px 24px' }}>Status</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-20">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '24px', height: '24px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>Syncing with system...</span>
                                    </div>
                                </td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-20">
                                        <div style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
                                            <div style={{ marginBottom: '16px' }}>
                                                {activeTab === 'enquiries' ? <FileText size={48} style={{ margin: '0 auto' }} /> : <ShieldCheck size={48} style={{ margin: '0 auto' }} />}
                                            </div>
                                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>No record found matching criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => {
                                    const st = getStatusStyle(item.status);
                                    const partner = activeTab === 'enquiries' ? item.customer : item.enquiries?.customer;
                                    const contact = activeTab === 'enquiries' ? item.contact : null;

                                    return (
                                        <tr key={item.id} className="table-row">
                                            <td style={{ padding: '16px 24px' }}>
                                                <div
                                                    onClick={() => {
                                                        if (activeTab === 'enquiries') navigate(`/workflows/enquiry/${item.id}`);
                                                        else if (activeTab === 'jobs') navigate(`/workflows/job/${item.id}`);
                                                        else navigate(`/workflows/editor/Enquiry/${item.id}`);
                                                    }}
                                                    style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline' }}
                                                >
                                                    {activeTab === 'enquiries' ? item.enquiry_no : 
                                                     activeTab === 'rfqs' ? item.document_no :
                                                     item.job_no}
                                                </div>
                                                {activeTab === 'jobs' && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                        From: {item.enquiries?.enquiry_no}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    <Building2 size={14} color="var(--text-secondary)" />
                                                    {activeTab === 'rfqs' ? (item.partners?.name || 'Supplier Not Set') : (partner?.name || 'Walk-in')}
                                                </div>
                                                {contact && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <User size={12} /> {contact.name}
                                                    </div>
                                                )}
                                            </td>
                                            {activeTab === 'enquiries' && (
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.customer_ref || '-'}</div>
                                                </td>
                                            )}
                                            {activeTab === 'rfqs' && (
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{item.subject || '-'}</div>
                                                </td>
                                            )}
                                            {(activeTab === 'enquiries' || activeTab === 'rfqs') && (
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>
                                                        {formatDate(activeTab === 'enquiries' ? item.due_date : item.expiry_date)}
                                                    </div>
                                                </td>
                                            )}
                                            {activeTab === 'jobs' && (() => {
                                                const revenue = Number(item.po_amount || 0);
                                                const cost = item.job_expenses?.reduce((sum, exp) => sum + Number(exp.amount || 0), 0) || 0;
                                                const profit = revenue - cost;
                                                return (
                                                    <>
                                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600 }}>
                                                            {revenue > 0 ? `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </td>
                                                        <td style={{ padding: '16px 24px', textAlign: 'right', color: cost > 0 ? '#ef4444' : 'inherit' }}>
                                                            {cost > 0 ? `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </td>
                                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: profit > 0 ? '#10b981' : (profit < 0 ? '#ef4444' : 'inherit') }}>
                                                            {(revenue > 0 || cost > 0) ? `$${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                        </td>
                                                        <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                            {item.payment_status ? (
                                                                <span style={{
                                                                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600,
                                                                    background: item.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                                    color: item.payment_status === 'Paid' ? '#10b981' : '#f59e0b',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {item.payment_status}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    </>
                                                );
                                            })()}
                                            <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                {formatDate(item.created_at)}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: st.bg,
                                                    color: st.color
                                                }}>
                                                    {st.icon}
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    {(activeTab === 'enquiries' || activeTab === 'rfqs') && (
                                                        <button
                                                            onClick={() => {
                                                                if (activeTab === 'enquiries') setEditingEnquiry(item);
                                                                else navigate(`/workflows/editor/Enquiry/${item.id}`);
                                                            }}
                                                            className="btn btn-sm btn-secondary"
                                                            style={{ padding: '6px', minWidth: 'auto' }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            if (activeTab === 'enquiries') navigate(`/workflows/enquiry/${item.id}`);
                                                            else if (activeTab === 'jobs') navigate(`/workflows/job/${item.id}`);
                                                            else navigate(`/workflows/editor/Enquiry/${item.id}`);
                                                        }}
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ gap: '6px' }}
                                                        title="Process"
                                                    >
                                                        <Eye size={14} /> Process
                                                    </button>
                                                    {activeTab === 'enquiries' && item.status !== 'Converted' && (
                                                        <button
                                                            onClick={() => convertToJob(item)}
                                                            className="btn btn-sm"
                                                            style={{
                                                                background: 'rgba(16, 185, 129, 0.1)',
                                                                color: '#10b981',
                                                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                                                gap: '6px',
                                                                fontSize: '0.75rem',
                                                                padding: '6px 12px'
                                                            }}
                                                        >
                                                            <ArrowRightLeft size={14} /> Convert
                                                        </button>
                                                    )}
                                                    {activeTab === 'rfqs' && (
                                                        <button
                                                            onClick={() => navigate(`/workflows/print/${item.id}`)}
                                                            className="btn btn-sm btn-outline"
                                                            style={{ padding: '6px', minWidth: 'auto' }}
                                                            title="Print Preview"
                                                        >
                                                            <Printer size={14} />
                                                        </button>
                                                    )}
                                                    {activeTab === 'jobs' && (
                                                        <button
                                                            onClick={() => setEditingJob(item)}
                                                            className="btn btn-sm btn-secondary"
                                                            style={{ padding: '6px', minWidth: 'auto' }}
                                                            title="Edit Job"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (activeTab === 'enquiries') handleDeleteEnquiry(item.id, item.enquiry_no);
                                                            else if (activeTab === 'jobs') handleDeleteJob(item.id, item.job_no);
                                                            else {
                                                                if (window.confirm('Delete this RFQ?')) {
                                                                    const { deleteWorkflowDocument } = await import('../../lib/workflowV2Service');
                                                                    await deleteWorkflowDocument(item.id);
                                                                    fetchData();
                                                                }
                                                            }
                                                        }}
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ padding: '6px', minWidth: 'auto', color: '#ef4444' }}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {(showEnquiryForm || editingEnquiry) && (
                <CustomerEnquiryForm
                    editingEnquiry={editingEnquiry}
                    onClose={() => {
                        setShowEnquiryForm(false);
                        setEditingEnquiry(null);
                    }}
                    onSave={handleEnquirySaved}
                />
            )}

            {editingJob && (
                <EditJobModal
                    job={editingJob}
                    onClose={() => setEditingJob(null)}
                    onSave={handleJobSaved}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .table-row:hover { background: rgba(0,0,0,0.02) !important; }
                .table-row td { border-bottom: 1px solid var(--border-color); }
                .table-row:last-child td { border-bottom: none; }
            ` }} />
        </div>
    );
}

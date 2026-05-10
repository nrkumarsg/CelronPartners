import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
    getGlobalExpenses, 
    updateExpenseStatus, 
    deleteJobExpense 
} from '../../lib/jobExpenseService';
import { getPartners, uploadFile } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { 
    Receipt, 
    Plus, 
    Search, 
    Filter, 
    Download, 
    ExternalLink, 
    Trash2, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Loader2, 
    FileText, 
    LayoutDashboard,
    ArrowRight,
    TrendingUp,
    Briefcase
} from 'lucide-react';
import { Modal, QuickExpenseAdd } from '../../components/workflow/QuickAddForms';
import { useNavigate } from 'react-router-dom';

export default function BillsPortal() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [bills, setBills] = useState([]);
    const [partners, setPartners] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'unpaid', 'paid'
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (profile?.company_id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [billsRes, partnersRes, jobsRes] = await Promise.all([
                getGlobalExpenses(profile.company_id),
                getPartners(profile.company_id),
                supabase
                    .from('workflow_documents')
                    .select('id, document_no')
                    .eq('company_id', profile.company_id)
                    .eq('document_type', 'Job')
            ]);

            if (billsRes.data) setBills(billsRes.data);
            if (partnersRes) setPartners(partnersRes);
            if (jobsRes.data) setJobs(jobsRes.data);
        } catch (err) {
            console.error('Portal Data Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = async (bill) => {
        const newStatus = bill.status === 'Paid' ? 'Unpaid' : 'Paid';
        const { data, error } = await updateExpenseStatus(bill.id, newStatus);
        if (data) {
            setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: newStatus } : b));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this bill record permanently?')) return;
        const { error } = await deleteJobExpense(id);
        if (!error) {
            setBills(prev => prev.filter(b => b.id !== id));
        }
    };

    const handleUploadBill = async (file) => {
        return await uploadFile('company_assets', 'vouchers', file);
    };

    const filteredBills = bills.filter(b => {
        const matchesSearch = 
            (b.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.partner?.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (b.description?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (activeTab === 'unpaid') return matchesSearch && b.status !== 'Paid';
        if (activeTab === 'paid') return matchesSearch && b.status === 'Paid';
        return matchesSearch;
    });

    const unpaidTotal = bills
        .filter(b => b.status !== 'Paid')
        .reduce((sum, b) => sum + (b.grand_total || 0), 0);

    const monthlyTotal = bills
        .filter(b => {
            const date = new Date(b.invoice_date);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((sum, b) => sum + (b.grand_total || 0), 0);

    return (
        <div className="animate-fade-in" style={{ padding: '24px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Accounts Payable</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Supplier Bills & GST Verification Portal</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/gst-reporting')}>
                        <TrendingUp size={18} /> GST Summary
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', border: 'none' }}>
                        <Plus size={18} /> Upload New Bill
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                <div className="glass-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Total Unpaid</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>SGD {unpaidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>{bills.filter(b => b.status !== 'Paid').length} pending bills</p>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '14px' }}>
                            <Clock size={28} color="#ef4444" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>Expenses (Current Month)</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>SGD {monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>Across all projects</p>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '14px' }}>
                            <Receipt size={28} color="#6366f1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="glass-panel" style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfdfe' }}>
                    <div style={{ display: 'flex', gap: '24px' }}>
                        {['all', 'unpaid', 'paid'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    padding: '8px 0', 
                                    fontSize: '0.9rem', 
                                    fontWeight: 700, 
                                    color: activeTab === tab ? '#6366f1' : '#94a3b8',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {activeTab === tab && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: '2px', background: '#6366f1' }} />}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input 
                            type="text" 
                            placeholder="Search by vendor or invoice..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ 
                                width: '100%', 
                                padding: '10px 12px 10px 40px', 
                                borderRadius: '10px', 
                                border: '1px solid #e2e8f0', 
                                fontSize: '0.85rem',
                                outline: 'none'
                            }} 
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Supplier</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Invoice No</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Linked Job</th>
                                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>GST</th>
                                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total</th>
                                <th style={{ textAlign: 'center', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ textAlign: 'right', padding: '16px 24px', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '60px' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
                            ) : filteredBills.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>No bills found matching your criteria.</td></tr>
                            ) : filteredBills.map(bill => (
                                <tr key={bill.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{bill.partner?.name || 'Unknown Vendor'}</div>
                                        {bill.partner?.registration_no && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>GST: {bill.partner.registration_no}</div>}
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{bill.invoice_no || 'N/A'}</td>
                                    <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: '#475569' }}>{bill.invoice_date ? new Date(bill.invoice_date).toLocaleDateString() : '-'}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {bill.job?.job_no ? (
                                            <button 
                                                onClick={() => navigate(`/workflows/editor/Job/${bill.job_id}`)}
                                                style={{ border: 'none', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                            >
                                                <Briefcase size={12} /> {bill.job.job_no}
                                            </button>
                                        ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 600, color: '#f97316' }}>{bill.gst_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 800, color: '#1e293b' }}>SGD {bill.grand_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <button 
                                            onClick={() => handleStatusToggle(bill)}
                                            style={{ 
                                                border: 'none', 
                                                background: bill.status === 'Paid' ? '#dcfce7' : '#fef2f2', 
                                                color: bill.status === 'Paid' ? '#15803d' : '#ef4444', 
                                                padding: '6px 12px', 
                                                borderRadius: '20px', 
                                                fontSize: '0.7rem', 
                                                fontWeight: 800, 
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {bill.status === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            {bill.status === 'Paid' ? 'PAID' : 'UNPAID'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {bill.bill_url && (
                                                <a href={bill.bill_url} target="_blank" rel="noreferrer" className="btn-icon-sm" title="View PDF">
                                                    <FileText size={16} color="#6366f1" />
                                                </a>
                                            )}
                                            <button className="btn-icon-sm" onClick={() => handleDelete(bill.id)} style={{ color: '#ef4444' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Upload Supplier Bill" icon={Upload}>
                <QuickExpenseAdd 
                    company_id={profile?.company_id}
                    partners={partners}
                    jobs={jobs}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchData();
                    }}
                    onCancel={() => setIsAddModalOpen(false)}
                    onUploadBill={handleUploadBill}
                />
            </Modal>
        </div>
    );
}

const Upload = ({ size, color }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
);

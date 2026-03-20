import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    ArrowLeft, 
    DollarSign, 
    ShieldCheck, 
    CheckCircle2, 
    ArrowRightLeft,
    Clock,
    Search,
    Filter,
    FileText,
    TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { shortlistSupplierQuote } from '../../lib/workflowService';
import { createQuotationFromSupplierQuote } from '../../lib/workflowV2Service';

export default function FloatSupplierOrder() {
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConverting, setIsConverting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchQuotes();
    }, []);

    async function fetchQuotes() {
        setLoading(true);
        try {
            // Fetch all quotes that are not yet converted or need action
            const { data, error } = await supabase
                .from('supplier_quotes')
                .select(`
                    *,
                    supplier:partners(id, name),
                    enquiry:enquiries(id, enquiry_no, subject)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuotes(data || []);
        } catch (err) {
            console.error("Error fetching quotes:", err);
        } finally {
            setLoading(false);
        }
    }

    const filteredQuotes = quotes.filter(q => 
        q.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.enquiry?.enquiry_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.enquiry?.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container" style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <button onClick={() => navigate(-1)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer', color: '#64748b' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Float Supplier Orders</h1>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Manage and shortlist incoming supplier quotes for your floating enquiries.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Search enquiries or suppliers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 12px 10px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '300px', outline: 'none', fontSize: '0.9rem' }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={fetchQuotes} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                {[
                    { label: 'Total Quotes', value: quotes.length, icon: <FileText color="#6366f1" />, bg: '#eef2ff' },
                    { label: 'Pending Review', value: quotes.filter(q => q.status === 'Received').length, icon: <Clock color="#f59e0b" />, bg: '#fffbeb' },
                    { label: 'Shortlisted', value: quotes.filter(q => q.status === 'Shortlisted').length, icon: <ShieldCheck color="#10b981" />, bg: '#ecfdf5' },
                    { label: 'Winning Bids', value: quotes.filter(q => q.status === 'Awarded').length, icon: <TrendingUp color="#8b5cf6" />, bg: '#f5f3ff' },
                ].map((stat, idx) => (
                    <div key={idx} style={{ background: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Table/List */}
            <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Recent Quotations</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}><Filter size={14} /> Filter</button>
                    </div>
                </div>

                <div style={{ padding: '0' }}>
                    {loading ? (
                        <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>
                            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: '12px' }}><Clock size={32} /></div>
                            <p>Loading quotations...</p>
                        </div>
                    ) : filteredQuotes.length === 0 ? (
                        <div style={{ padding: '100px', textAlign: 'center', color: '#94a3b8' }}>
                            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <p>No supplier quotes found matching your criteria.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredQuotes.map((quote, idx) => (
                                <div key={quote.id} style={{ 
                                    padding: '24px', 
                                    borderBottom: idx === filteredQuotes.length - 1 ? 'none' : '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background 0.2s',
                                    ':hover': { background: '#f8fafc' }
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                            <DollarSign size={24} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>{quote.supplier?.name}</span>
                                                <span style={{ fontSize: '0.75rem', background: '#eef2ff', color: '#6366f1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                    {quote.enquiry?.enquiry_no}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>{quote.enquiry?.subject}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Received: {new Date(quote.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Quote Amount</div>
                                            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1e293b' }}>${quote.quote_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
                                            {quote.status !== 'Shortlisted' ? (
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm("Make this the winning bid for this enquiry?")) return;
                                                        await shortlistSupplierQuote(quote.enquiry_id, quote.id);
                                                        fetchQuotes();
                                                    }}
                                                    className="btn btn-outline"
                                                    style={{ width: '100%', borderColor: '#10b981', color: '#10b981', background: '#fff' }}
                                                >
                                                    Shortlist Bid
                                                </button>
                                            ) : (
                                                <button
                                                    disabled={isConverting}
                                                    onClick={async () => {
                                                        setIsConverting(true);
                                                        try {
                                                            const doc = await createQuotationFromSupplierQuote(quote.id);
                                                            navigate(`/workflows/editor/quotation/${doc.id}`);
                                                        } catch (err) {
                                                            alert("Failed to generate quotation");
                                                            setIsConverting(false);
                                                        }
                                                    }}
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                                >
                                                    {isConverting ? '...' : <><ArrowRightLeft size={18} /> Generate Quote</>}
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.75rem', color: quote.status === 'Shortlisted' ? '#6366f1' : '#059669', fontWeight: 700 }}>
                                                {quote.status === 'Shortlisted' ? <ShieldCheck size={14} /> : <CheckCircle2 size={14} />} {quote.status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

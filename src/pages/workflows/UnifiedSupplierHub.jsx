import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
    getWorkflowDocuments, 
    deleteWorkflowDocument, 
    duplicateWorkflowDocument,
    createSupplierPOFromSupplierQuote,
    createQuotationFromSupplierQuote,
    convertEnquiryToV2Document
} from '../../lib/workflowV2Service';
import { 
    LayoutDashboard, 
    Search, 
    Plus, 
    FileText, 
    ArrowRightLeft, 
    ShoppingCart, 
    Clock, 
    CheckCircle2, 
    MoreVertical,
    Eye,
    Printer,
    Trash2,
    Copy,
    Filter,
    ChevronDown,
    ExternalLink,
    ArrowLeft,
    Package
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const TABS = [
    { id: 'customer_enquiries', label: 'Customer Enquiries', icon: <FileText size={18} />, color: '#6366f1' },
    { id: 'supplier_rfqs', label: 'Supplier RFQs', icon: <ArrowRightLeft size={18} />, color: '#f59e0b' },
    { id: 'supplier_quotes', label: 'Supplier Quotes', icon: <Clock size={18} />, color: '#10b981' },
    { id: 'purchase_orders', label: 'Purchase Orders', icon: <ShoppingCart size={18} />, color: '#8b5cf6' }
];

export default function UnifiedSupplierHub() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [activeTab, setActiveTab] = useState('customer_enquiries');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(null); // ID of document with open dropdown

    useEffect(() => {
        if (profile?.company_id) {
            fetchData();
        }
    }, [profile, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'customer_enquiries') {
                const { data: enquiries, error } = await supabase
                    .from('customer_enquiries')
                    .select('*, customer:partners(name)')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setData(enquiries || []);
            } else if (activeTab === 'supplier_rfqs') {
                const { data: docs, error } = await getWorkflowDocuments(profile.company_id, 'Enquiry');
                if (error) throw error;
                setData(docs || []);
            } else if (activeTab === 'supplier_quotes') {
                const { data: quotes, error } = await supabase
                    .from('supplier_quotes')
                    .select(`
                        *,
                        supplier:partners(name),
                        enquiry:customer_enquiries(enquiry_no, subject)
                    `)
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setData(quotes || []);
            } else if (activeTab === 'purchase_orders') {
                const { data: docs, error } = await getWorkflowDocuments(profile.company_id, 'Purchase Order');
                if (error) throw error;
                setData(docs || []);
            }
        } catch (err) {
            console.error(`Error fetching ${activeTab}:`, err);
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToPO = async (quoteId) => {
        if (!window.confirm('Convert this Supplier Quote to a Purchase Order?')) return;
        setLoading(true);
        try {
            const savedDoc = await createSupplierPOFromSupplierQuote(quoteId);
            alert(`Purchase Order ${savedDoc.document_no} created successfully!`);
            navigate(`/workflows/editor/purchase-order/${savedDoc.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to convert to PO: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToQuote = async (quoteId) => {
        if (!window.confirm('Generate a Customer Quotation based on this Supplier Quote?')) return;
        setLoading(true);
        try {
            const savedDoc = await createQuotationFromSupplierQuote(quoteId);
            alert(`Quotation ${savedDoc.document_no} drafted successfully!`);
            navigate(`/workflows/editor/quotation/${savedDoc.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to generate Quotation: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToEnquiry = async (enqId) => {
        if (!window.confirm('Convert this V1 Enquiry to a V2 RFQ/Enquiry?')) return;
        setLoading(true);
        try {
            const savedDoc = await convertEnquiryToV2Document(enqId, 'Enquiry');
            alert(`RFQ ${savedDoc.document_no} created successfully!`);
            navigate(`/workflows/editor/enquiry/${savedDoc.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to convert to RFQ: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        const s = status?.toLowerCase() || 'draft';
        if (s.includes('draft')) return 'badge-draft';
        if (s.includes('pending') || s.includes('waiting')) return 'badge-pending';
        if (s.includes('confirmed') || s.includes('approved')) return 'badge-confirmed';
        if (s.includes('received')) return 'badge-received';
        if (s.includes('sent') || s.includes('floated')) return 'badge-sent';
        if (s.includes('quoted')) return 'badge-quoted';
        if (s.includes('cancelled') || s.includes('rejected')) return 'badge-cancelled';
        if (s.includes('rfq')) return 'badge-rfq';
        return 'badge-draft';
    };

    const stripHtml = (html) => {
        if (!html) return '';
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const text = doc.body.textContent || "";
        return text.replace(/&nbsp;/g, ' ').trim();
    };

    const handleDelete = async (id, tab) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        
        try {
            if (tab === 'customer_enquiries') {
                await supabase.from('customer_enquiries').delete().eq('id', id);
            } else if (tab === 'supplier_rfqs' || tab === 'purchase_orders') {
                await deleteWorkflowDocument(id);
            } else if (tab === 'supplier_quotes') {
                await supabase.from('supplier_quotes').delete().eq('id', id);
            }
            fetchData();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const filteredData = data.filter(item => {
        const query = searchQuery.toLowerCase();
        if (activeTab === 'customer_enquiries') {
            return (item.enquiry_no || '').toLowerCase().includes(query) ||
                   (item.customer?.name || '').toLowerCase().includes(query) ||
                   (item.description || '').toLowerCase().includes(query);
        } else if (activeTab === 'supplier_rfqs' || activeTab === 'purchase_orders') {
            return (item.document_no || '').toLowerCase().includes(query) ||
                   (item.partners?.name || '').toLowerCase().includes(query) ||
                   (item.subject || '').toLowerCase().includes(query);
        } else if (activeTab === 'supplier_quotes') {
            return (item.supplier?.name || '').toLowerCase().includes(query) ||
                   (item.enquiry?.enquiry_no || '').toLowerCase().includes(query) ||
                   (item.enquiry?.subject || '').toLowerCase().includes(query);
        }
        return true;
    });

    const renderTable = () => {
        if (loading) return <div className="text-center py-20">Loading data...</div>;
        if (filteredData.length === 0) return (
            <div className="text-center py-20 opacity-50">
                <FileText size={48} className="mx-auto mb-4" />
                <p>No records found.</p>
            </div>
        );

        return (
            <div className="hub-table-wrapper">
                <table className="hub-table w-full">
                    <thead>
                        {activeTab === 'customer_enquiries' && (
                            <tr>
                                <th>Enquiry No</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        )}
                        {activeTab === 'supplier_rfqs' && (
                            <tr>
                                <th>RFQ No</th>
                                <th>Issue Date</th>
                                <th>Supplier</th>
                                <th>Subject</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        )}
                        {activeTab === 'supplier_quotes' && (
                            <tr>
                                <th>Supplier</th>
                                <th>Linked Enquiry</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Received Date</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        )}
                        {activeTab === 'purchase_orders' && (
                            <tr>
                                <th>PO No</th>
                                <th>Issue Date</th>
                                <th>Supplier</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id}>
                                {activeTab === 'customer_enquiries' && (
                                    <>
                                        <td className="font-bold">{item.enquiry_no}</td>
                                        <td>{new Date(item.enquiry_date).toLocaleDateString('en-GB')}</td>
                                        <td className="font-medium">{item.customer?.name || 'Walk-in'}</td>
                                        <td>
                                            <span className="tag">{item.source_type}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'supplier_rfqs' && (
                                    <>
                                        <td className="font-bold">{item.document_no}</td>
                                        <td>{new Date(item.issue_date).toLocaleDateString('en-GB')}</td>
                                        <td className="font-medium">{item.partners?.name}</td>
                                        <td className="truncate max-w-[200px] text-slate-500">{stripHtml(item.subject)}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                {activeTab === 'supplier_quotes' && (
                                    <>
                                        <td className="font-bold">{item.supplier?.name}</td>
                                        <td>
                                            <div 
                                                className="text-xs font-bold text-indigo-600 mb-0.5 cursor-pointer hover:underline flex items-center gap-1 w-fit"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/workflows/enquiry/${item.enquiry_id}`);
                                                }}
                                                title="Open Linked Enquiry"
                                            >
                                                {item.enquiry?.enquiry_no}
                                                <ExternalLink size={10} />
                                            </div>
                                            <div className="text-sm text-slate-600 truncate max-w-[300px]">{stripHtml(item.enquiry?.subject)}</div>
                                        </td>
                                        <td className="font-bold">
                                            {item.quote_amount ? `$${item.quote_amount.toLocaleString()}` : '-'}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="text-sm opacity-70">{new Date(item.created_at).toLocaleDateString('en-GB')}</td>
                                    </>
                                )}
                                {activeTab === 'purchase_orders' && (
                                    <>
                                        <td className="font-bold">{item.document_no}</td>
                                        <td>{new Date(item.issue_date).toLocaleDateString('en-GB')}</td>
                                        <td className="font-medium">{item.partners?.name}</td>
                                        <td className="font-bold">
                                            <span className="text-xs opacity-50 mr-1">{item.currency}</span>
                                            {item.total_amount?.toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </>
                                )}
                                <td className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            className="btn-icon-sm"
                                            onClick={() => {
                                                if (activeTab === 'customer_enquiries') navigate(`/workflows/enquiry/${item.id}`);
                                                else if (activeTab === 'supplier_rfqs') navigate(`/workflows/editor/enquiry/${item.id}`);
                                                else if (activeTab === 'purchase_orders') navigate(`/workflows/editor/purchase-order/${item.id}`);
                                                else if (activeTab === 'supplier_quotes') navigate(`/workflows/float-supplier-order`);
                                            }}
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>

                                        {activeTab === 'customer_enquiries' && (
                                            <>
                                                <button 
                                                    className="btn-icon-sm text-amber-500"
                                                    onClick={() => navigate(`/workflows/editor/enquiry/new?sourceEnquiryId=${item.id}`)}
                                                    title="Float to Suppliers (Manual RFQ)"
                                                >
                                                    <ArrowRightLeft size={16} />
                                                </button>
                                                <button 
                                                    className="btn-icon-sm text-indigo-500"
                                                    onClick={() => handleConvertToEnquiry(item.id)}
                                                    title="Convert to V2 Enquiry"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </>
                                        )}

                                        {activeTab === 'supplier_quotes' && (
                                            <>
                                                <button 
                                                    className="btn-icon-sm text-blue-500"
                                                    onClick={() => handleConvertToPO(item.id)}
                                                    title="Convert to Purchase Order"
                                                >
                                                    <Package size={16} />
                                                </button>
                                                <button 
                                                    className="btn-icon-sm text-green-500"
                                                    onClick={() => handleConvertToQuote(item.id)}
                                                    title="Convert to Customer Quotation"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </>
                                        )}

                                        <button 
                                            className="btn-icon-sm text-red-500"
                                            onClick={() => handleDelete(item.id, activeTab)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="hub-container animate-fade-in">
            <header className="hub-header">
                <div className="hub-title-group">
                    <h1>
                        <div className="hub-title-icon">
                            <LayoutDashboard size={32} />
                        </div>
                        Unified Supplier Hub
                    </h1>
                    <p className="hub-subtitle">Manage the complete lifecycle from inbound enquiry to supplier fulfillment.</p>
                </div>
                <div className="hub-actions">
                    <div className="hub-search-wrapper">
                        <Search size={20} className="hub-search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search records..." 
                            className="hub-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        className="btn btn-primary"
                        onClick={() => {
                            if (activeTab === 'customer_enquiries') navigate('/workflows/enquiry/new');
                            else if (activeTab === 'supplier_rfqs') navigate('/workflows/editor/enquiry/new');
                            else if (activeTab === 'purchase_orders') navigate('/workflows/editor/purchase-order/new');
                        }}
                    >
                        <Plus size={20} /> 
                        New {(() => {
                            const label = TABS.find(t => t.id === activeTab)?.label || '';
                            if (label === 'Customer Enquiries') return 'Customer Enquiry';
                            return label.replace(/s$/, '');
                        })()}
                    </button>
                </div>
            </header>

            <nav className="hub-tabs-nav">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`hub-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <div className="hub-tab-icon-wrapper">
                            {React.cloneElement(tab.icon, { size: 18 })}
                        </div>
                        {tab.label}
                    </button>
                ))}
            </nav>

            {renderTable()}
        </div>
    );
}

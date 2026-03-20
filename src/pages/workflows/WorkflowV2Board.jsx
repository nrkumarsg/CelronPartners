import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getWorkflowDocuments, deleteWorkflowDocument } from '../../lib/workflowV2Service';
import {
    FileText, Plus, Search, Filter,
    MoreVertical, Eye, Trash2, Printer,
    ChevronLeft, ChevronRight,
    ArrowRightLeft,
    FileCheck
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import CustomerEnquiryForm from '../../components/CustomerEnquiryForm';

const DOC_TYPES = [
    'Enquiry', 'Quotation', 'Purchase Order',
    'Delivery Order', 'Service Report', 'Proforma Invoice',
    'Packing List', 'Tax Invoice', 'Certificate',
    'Payment Received', 'Statement of Account'
];

export default function WorkflowV2Board() {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState('All');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showEnquiryForm, setShowEnquiryForm] = useState(false);
    const dropdownRef = useRef(null);

    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const jobId = searchParams.get('job_id');
    const paramType = searchParams.get('type');
    const view = searchParams.get('view');
    const isDepository = view === 'depository';

    useEffect(() => {
        // Support both query param (?type=Quotation) and pathname (/quotations)
        const path = location.pathname.substring(1).replace(/-/g, ' '); // simple normalization
        
        // Try exact match or plural match
        const foundDocType = DOC_TYPES.find(t => 
            t.toLowerCase() === path.toLowerCase() || 
            t.toLowerCase() === path.toLowerCase().replace(/s$/, '') ||
            (t + 's').toLowerCase() === path.toLowerCase()
        );

        if (paramType && DOC_TYPES.includes(paramType)) {
            setActiveType(paramType);
        } else if (foundDocType) {
            setActiveType(foundDocType);
        } else if (location.pathname === '/workflows') {
            setActiveType('All');
        }
    }, [paramType, location.pathname]);

    useEffect(() => {
        if (profile?.company_id) {
            fetchDocs();
        }
    }, [profile, activeType]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const fetchDocs = async () => {
        setLoading(true);
        const typeFilter = activeType === 'All' ? null : activeType;
        const { data, error } = await getWorkflowDocuments(profile.company_id, typeFilter);
        if (data) setDocuments(data);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            const { error } = await deleteWorkflowDocument(id);
            if (error) {
                console.error("Delete failed:", error);
                alert("Failed to delete the document. Error: " + (error.message || error.details || "Unknown database error."));
            } else {
                fetchDocs();
            }
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Enquiry': return '#6366f1';
            case 'Quotation': return '#3b82f6';
            case 'Purchase Order': return '#f59e0b';
            case 'Delivery Order': return '#10b981';
            case 'Service Report': return '#ec4899';
            case 'Tax Invoice': return '#ef4444';
            case 'Certificate': return '#6366f1';
            case 'Payment Received': return '#10b981';
            case 'Statement of Account': return '#3b82f6';
            default: return '#64748b';
        }
    };

    const filteredDocs = documents.filter(doc =>
        (doc.document_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.partners?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.subject || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenDocument = (type, id) => {
        let url = `/workflows/editor/${type.toLowerCase().replace(/\s+/g, '-')}/${id}`;
        if (id === 'new' && jobId) {
            url += `?job_id=${jobId}`;
        }
        window.open(url, '_blank');
    };

    const handlePrintPreview = (id) => {
        const url = `/workflows/print/${id}`;
        window.open(url, '_blank');
    };

    const getPageTitle = () => {
        if (isDepository) return 'RFQ Depository';
        if (activeType === 'All') return 'All Workflows';
        if (activeType === 'Enquiry') return 'Supplier Enquiries';
        return activeType + 's';
    };

    const getPageDescription = () => {
        if (isDepository) return 'Historical record of all floated enquiries to your suppliers.';
        if (activeType === 'All') return 'Manage all your documents and workflows across different stages.';
        if (activeType === 'Enquiry') return 'Generate and manage outgoing Enquiries to your suppliers.';
        if (activeType === 'Quotation') return 'Issue Quotations to your prospective buyers.';
        if (activeType === 'Purchase Order') return 'Issue Purchase Orders to your suppliers.';
        if (activeType === 'Delivery Order') return 'Manage Delivery Orders for your shipments.';
        if (activeType === 'Proforma Invoice') return 'Draft Proforma Invoices for advance payments.';
        if (activeType === 'Packing List') return 'Manage Packing Lists for your deliveries.';
        if (activeType === 'Tax Invoice') return 'Manage final Tax Invoices for your sales.';
        if (activeType === 'Payment Received') return 'Record and track payments received from customers.';
        if (activeType === 'Statement of Account') return 'Generate statements of account for your customers.';
        return '';
    };

    return (
        <div className="animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">{getPageTitle()}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {getPageDescription()}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', border: 'none' }}
                        onClick={() => setShowEnquiryForm(true)}
                    >
                        <Plus size={18} /> New Enquiry
                    </button>
                    <div className="dropdown" ref={dropdownRef}>
                        <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <Plus size={18} /> New Document
                        </button>
                        <div className={`dropdown-content ${showDropdown ? 'show' : ''}`} style={{ right: 0, minWidth: '200px' }}>
                            {DOC_TYPES.map(type => (
                                <button key={type} onClick={() => {
                                    setShowDropdown(false);
                                    handleOpenDocument(type, 'new');
                                }}>
                                    {type === 'Enquiry' ? 'Enquiry to Supplier' : type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {!isDepository && (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '24px',
                    overflowX: 'auto',
                    paddingBottom: '8px'
                }}>
                    <button
                        onClick={() => {
                            navigate('/workflows');
                            setActiveType('All');
                        }}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: activeType === 'All' ? 'var(--accent)' : 'var(--border-color)',
                            background: activeType === 'All' ? 'var(--accent)' : 'transparent',
                            color: activeType === 'All' ? '#fff' : 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        All Documents
                    </button>
                    <button
                        onClick={() => navigate('/enquiries')}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: '1px solid var(--border-color)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                            e.currentTarget.style.color = 'var(--accent)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <FileText size={16} /> Enquiry from customer
                    </button>
                    {DOC_TYPES.map(type => (
                        <button
                            key={type}
                            onClick={() => {
                                navigate(`/workflows?type=${encodeURIComponent(type)}`);
                                setActiveType(type);
                            }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: activeType === type ? 'var(--accent)' : 'var(--border-color)',
                                background: activeType === type ? 'var(--accent)' : 'transparent',
                                color: activeType === type ? '#fff' : 'var(--text-secondary)',
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (activeType !== type) {
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.color = 'var(--accent)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (activeType !== type) {
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            {type === 'Enquiry' ? 'Enquiry to Supplier' : type}
                        </button>
                    ))}
                </div>
            )}

            <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 16px', minWidth: '350px' }}>
                        <Search size={18} color="var(--text-secondary)" style={{ marginRight: '8px' }} />
                        <input
                            type="text"
                            placeholder="Search document no, customer, subject..."
                            style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: 'var(--text-primary)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Document No</th>
                                <th>Issue Date</th>
                                <th>Customer</th>
                                <th>Vessel / Work Location</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="text-center py-12">Loading documents...</td></tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-12">
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                            <p>No documents found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="table-row">
                                        <td>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                color: getTypeColor(doc.document_type),
                                                textTransform: 'uppercase'
                                            }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getTypeColor(doc.document_type) }} />
                                                {doc.document_type === 'Enquiry' ? 'Enquiry to Supplier' : doc.document_type}
                                            </span>
                                        </td>
                                        <td className="font-medium" style={{ color: 'var(--accent)' }}>{doc.document_no}</td>
                                        <td>{formatDate(doc.issue_date)}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{doc.partners?.name || 'Walk-in'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.subject || '-'}</div>
                                        </td>
                                        <td>
                                            {doc.vessels?.vessel_name || doc.work_locations?.location_name || '-'}
                                        </td>
                                        <td className="font-bold">
                                            {doc.currency} {doc.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: doc.status === 'Draft' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: doc.status === 'Draft' ? '#64748b' : '#10b981'
                                            }}>
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', position: 'relative', zIndex: 10 }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-secondary"
                                                    style={{ position: 'relative', zIndex: 20, cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const isExternal = doc.notes?.includes('drive.google.com') || doc.notes?.startsWith('http');
                                                        if (isExternal) {
                                                            window.open(doc.notes, '_blank');
                                                        } else {
                                                            navigate(`/workflows/editor/${doc.document_type.toLowerCase().replace(/\s+/g, '-')}/${doc.id}`);
                                                        }
                                                    }}
                                                >
                                                    <Eye size={14} /> {doc.notes?.startsWith('http') ? 'View' : 'Open'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-secondary"
                                                    style={{ position: 'relative', zIndex: 20, cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handlePrintPreview(doc.id);
                                                    }}
                                                    title="Print / Save PDF"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-secondary"
                                                    style={{ color: 'var(--danger)', position: 'relative', zIndex: 20, cursor: 'pointer' }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDelete(doc.id);
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showEnquiryForm && (
                <CustomerEnquiryForm
                    onClose={() => setShowEnquiryForm(false)}
                    onSave={() => {
                        setShowEnquiryForm(false);
                        fetchDocs();
                    }}
                />
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .dropdown {
                    position: relative;
                    display: inline-block;
                }
                .dropdown-content {
                    display: none;
                    position: absolute;
                    background-color: var(--bg-secondary);
                    min-width: 160px;
                    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                    z-index: 100;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    padding: 8px 0;
                    top: 100%;
                    margin-top: 4px;
                }
                .dropdown-content.show {
                    display: block;
                }
                .dropdown-content button {
                    color: var(--text-primary);
                    padding: 10px 16px;
                    text-decoration: none;
                    display: block;
                    width: 100%;
                    text-align: left;
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .dropdown-content button:hover {
                    background-color: var(--bg-primary);
                    color: var(--accent);
                }
                .table-row td {
                    padding: 8px 12px;
                }
            `}} />
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getWorkflowDocuments, deleteWorkflowDocument, duplicateWorkflowDocument, convertQuotationToJob, revertJobToQuotation, convertProformaToTaxInvoice } from '../../lib/workflowV2Service';
import {
    FileText, Plus, Search, Filter,
    MoreVertical, Eye, Trash2, Printer, Copy,
    ChevronLeft, ChevronRight,
    ArrowRightLeft,
    FileCheck, Play, Briefcase, X, Loader2, PlayCircle
} from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import CustomerEnquiryForm from '../../components/CustomerEnquiryForm';
import JobEditV2Modal from '../../components/workflows/JobEditV2Modal';

const DOC_TYPES = [
    'Enquiry', 'Quotation', 'Job', 'Purchase Order', 'Order Acknowledgment',
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
    
    // Convert to Job States
    const [showConversionModal, setShowConversionModal] = useState(false);
    const [conversionTarget, setConversionTarget] = useState(null);
    const [conversionLoading, setConversionLoading] = useState(false);

    // Job Editing States
    const [editingJob, setEditingJob] = useState(null);

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
        // If activeType is "Job", we fetch ALL documents for the company and filter by is_job
        let typeFilter = (activeType === 'All' || activeType === 'Job') ? null : activeType;
        // Fetch both Quotation and Order Acknowledgment when either is selected to handle crossover
        if (activeType === 'Quotation' || activeType === 'Order Acknowledgment') {
            typeFilter = ['Quotation', 'Order Acknowledgment'];
        }
        const { data, error } = await getWorkflowDocuments(profile.company_id, typeFilter);
        
        if (data) {
            let filtered = data;
            if (activeType === 'Job') {
                // Show everything that has is_job: true, but group by job number to avoid duplicates in the list
                const jobs = data.filter(d => d.is_job === true && d.assigned_job_no);
                const jobGroups = {};
                jobs.forEach(d => {
                    const jno = d.assigned_job_no;
                    // Prioritize 'Job' document type, or take the first one found (likely the QTN)
                    if (!jobGroups[jno] || d.document_type === 'Job') {
                        jobGroups[jno] = d;
                    }
                });
                filtered = Object.values(jobGroups).sort((a, b) => b.assigned_job_no.localeCompare(a.assigned_job_no));
            }
            setDocuments(filtered);
        }
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

    const handleDuplicate = async (id) => {
        if (window.confirm('Are you sure you want to duplicate this document? All items will be copied to a new draft.')) {
            try {
                await duplicateWorkflowDocument(id);
                fetchDocs();
            } catch (error) {
                console.error("Duplicate failed:", error);
                alert("Failed to duplicate document. Error: " + (error.message || "Unknown error."));
            }
        }
    };
    
    const handleConversionSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const poData = {
            po_no: formData.get('po_no'),
            po_date: formData.get('po_date'),
            po_value: formData.get('po_value'),
            po_description: formData.get('po_description'),
            po_by: formData.get('po_by')
        };
        const options = {
            includeCertificates: formData.get('includeCertificates') === 'on',
            includeServiceReport: formData.get('includeServiceReport') === 'on'
        };

        setConversionLoading(true);
        try {
            const { jobNo } = await convertQuotationToJob(conversionTarget.id, poData, options);
            alert(`Job ${jobNo} created successfully with all associated documents!`);
            setShowConversionModal(false);
            fetchDocs();
        } catch (error) {
            console.error("Conversion failed:", error);
            alert("Failed to convert to job: " + (error.message || "Unknown error"));
        } finally {
            setConversionLoading(false);
        }
    };

    const handleConvertToTaxInvoice = async (docId) => {
        if (!window.confirm('Are you sure you want to convert this Proforma Invoice to a Tax Invoice?')) return;
        
        setConversionLoading(true);
        try {
            const savedInv = await convertProformaToTaxInvoice(docId);
            alert(`Tax Invoice ${savedInv.document_no} created successfully!`);
            fetchDocs();
            // Optional: navigate to Tax Invoice tab
            navigate('/workflows?type=Tax+Invoice');
            setActiveType('Tax Invoice');
        } catch (error) {
            console.error("Conversion failed:", error);
            alert("Failed to convert to Tax Invoice: " + (error.message || "Unknown error"));
        } finally {
            setConversionLoading(false);
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
            case 'Order Acknowledgment': return '#059669';
            case 'Delivery Order': return '#10b981';
            case 'Service Report': return '#ec4899';
            case 'Tax Invoice': return '#ef4444';
            case 'Certificate': return '#6366f1';
            case 'Payment Received': return '#10b981';
            case 'Statement of Account': return '#3b82f6';
            case 'Proforma Invoice': return '#f43f5e';
            case 'Packing List': return '#f97316';
            default: return '#64748b';
        }
    };

    const filteredDocs = documents.filter(doc => {
        let matchesType = activeType === 'All' || doc.document_type === activeType;
        
        // Special logic for Job vs others
        if (activeType === 'Job') {
            matchesType = doc.document_type === 'Job';
        }
        // Special logic for Order Acknowledgment vs Quotation (Handling ORA-prefixed Quotations)
        else if (activeType === 'Order Acknowledgment') {
            matchesType = doc.document_type === 'Order Acknowledgment' || (doc.document_type === 'Quotation' && (doc.document_no || '').startsWith('ORA'));
        } else if (activeType === 'Quotation') {
            matchesType = doc.document_type === 'Quotation' && !(doc.document_no || '').startsWith('ORA');
        }

        const matchesSearch = (doc.document_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.partners?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

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
        if (activeType === 'Quotation') return 'Quote2Customers';
        if (activeType === 'Purchase Order') return 'P.O. 2 Suppliers';
        if (activeType === 'Payment Received') return 'Statement of Accounts';
        if (activeType === 'Statement of Account') return 'SOA List';
        if (activeType === 'Job') return 'Job List';
        return activeType + 's';
    };

    const getPageDescription = () => {
        if (isDepository) return 'Historical record of all floated enquiries to your suppliers.';
        if (activeType === 'All') return 'Manage all your documents and workflows across different stages.';
        if (activeType === 'Enquiry') return 'Generate and manage outgoing Enquiries to your suppliers.';
        if (activeType === 'Quotation') return 'Issue Quote2Customers to your prospective buyers.';
        if (activeType === 'Purchase Order') return 'Issue P.O. 2 Suppliers for your requirement.';
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
                    {activeType !== 'Payment Received' && (
                        <button
                        className="btn"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            background: activeType === 'Purchase Order' ? '#8b5cf6' : (activeType === 'Enquiry' ? '#10b981' : '#3b82f6'), 
                            color: 'white', 
                            border: 'none' 
                        }}
                        onClick={() => {
                            const config = {
                                'Quotation': { link: '/workflows/editor/quotation/new' },
                                'Purchase Order': { link: '/workflows/editor/purchase-order/new' },
                                'Delivery Order': { link: '/workflows/editor/delivery-order/new' },
                                'Service Report': { link: '/workflows/editor/service-report/new' },
                                'Proforma Invoice': { link: '/workflows/editor/proforma-invoice/new' },
                                'Packing List': { link: '/workflows/editor/packing-list/new' },
                                'Tax Invoice': { link: '/workflows/editor/tax-invoice/new' },
                                'Certificate': { link: '/workflows/editor/certificate/new' },
                                'Statement of Account': { link: '/workflows/editor/soa-recall/new' }
                            };
                            if (config[activeType]) {
                                window.open(config[activeType].link, '_blank');
                            } else if (activeType === 'All') {
                                window.open('/workflows/editor/certificate/new', '_blank');
                            } else {
                                setShowEnquiryForm(true);
                            }
                        }}
                    >
                        <Plus size={18} /> 
                        {(() => {
                            const labelMap = {
                                'Purchase Order': 'New Purchase Order 2 Supplier',
                                'Packing List': 'New Packing list',
                                'Delivery Order': 'New Delivery Order',
                                'Service Report': 'New Service Report',
                                'Quotation': 'New Quotation',
                                'Certificate': 'New Certificate',
                                'Proforma Invoice': 'New Proforma Invoice',
                                'Tax Invoice': 'New Tax Invoice',
                                'Statement of Account': 'SOA-Recall',
                                'All': 'New Certificate'
                            };
                            return labelMap[activeType] || `New ${activeType}`;
                        })()}
                    </button>
                    )}
                    {activeType === 'Job' && (
                        <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => {
                                window.open('/workflows/editor/quotation/new', '_blank');
                            }}
                        >
                            <Plus size={18} /> New Job
                        </button>
                    )}
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
                                    {type === 'Enquiry' ? 'Enquiry to Supplier' : (type === 'Quotation' ? 'Quote2Customers' : (type === 'Purchase Order' ? 'P.O. 2 Suppliers' : type))}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                overflowX: 'auto',
                paddingBottom: '8px'
            }}>
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

                <button
                    onClick={() => {
                        setActiveType('Enquiry');
                        if (!isDepository) navigate('/workflows?type=Enquiry');
                    }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: activeType === 'Enquiry' ? 'var(--accent)' : 'var(--border-color)',
                        background: activeType === 'Enquiry' ? 'var(--accent)' : 'transparent',
                        color: activeType === 'Enquiry' ? '#fff' : 'var(--text-secondary)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <ArrowRightLeft size={16} /> Enquiry to Supplier
                </button>

                {!isDepository && (
                    <button
                        onClick={() => {
                            setActiveType('All');
                            navigate('/workflows');
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
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <Filter size={14} /> All Documents
                    </button>
                )}

                {!isDepository && DOC_TYPES.filter(t => t !== 'Enquiry').map(type => (
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
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
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
                            {type === 'Jobs' && <Briefcase size={14} />}
                            {type === 'Quotation' && <FileText size={14} />}
                            {type === 'Enquiry' ? 'Enquiry to Supplier' : type}
                        </button>
                    ))}
                </div>

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
                            {activeType === 'Job' ? (
                                <tr>
                                    <th>CEL Job No</th>
                                    <th>Customer</th>
                                    <th>PO No</th>
                                    <th>PO Date</th>
                                    <th>PO By</th>
                                    <th>Description</th>
                                    <th>Value (SGD)</th>
                                    <th>Attachment</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            ) : (
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
                            )}
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
                                    activeType === 'Job' ? (
                                        <tr key={doc.id} className="table-row">
                                            <td className="font-bold" style={{ color: '#1e3a8a' }}>{doc.assigned_job_no || 'TBD'}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{doc.partners?.name || 'Walk-in'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{doc.subject || '-'}</div>
                                            </td>
                                            <td>{doc.customer_po_no || '-'}</td>
                                            <td>{doc.customer_po_date ? formatDate(doc.customer_po_date) : '-'}</td>
                                            <td>{doc.contacts?.first_name || '-'}</td>
                                            <td>
                                                <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={doc.delivery_verification?.po_description}>
                                                    {doc.delivery_verification?.po_description || '-'}
                                                </div>
                                            </td>
                                            <td className="font-bold">SGD {doc.delivery_verification?.po_value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}</td>
                                            <td>
                                                {doc.customer_po_attachment_url ? (
                                                    <a href={doc.customer_po_attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <FileText size={12} /> View PO
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No Upload</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => navigate(`/workflows/editor/${doc.document_type.toLowerCase().replace(/\s+/g, '-')}/${doc.id}`)}
                                                    >
                                                        <Eye size={14} /> Open
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ color: 'var(--accent)' }}
                                                        onClick={() => setEditingJob(doc)}
                                                    >
                                                        <Plus size={14} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => handlePrintPreview(doc.id)}
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            if (!confirm(`Are you sure you want to revert Job ${doc.assigned_job_no} back to a Quotation? This will delete all associated ORA, DO, INV, etc. documents.`)) return;
                                                            try {
                                                                setLoading(true);
                                                                await revertJobToQuotation(doc.assigned_job_no);
                                                                alert('Reverted to Quotation successfully.');
                                                                fetchDocs();
                                                            } catch (err) {
                                                                console.error(err);
                                                                alert('Failed to revert: ' + err.message);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                        title="Revert to Quotation (Cancel Job)"
                                                    >
                                                        <ArrowRightLeft size={14} /> Revert
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-secondary"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => handleDelete(doc.id)}
                                                        title="Delete Job Completely"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={doc.id} className="table-row">
                                            <td>
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    color: getTypeColor((doc.document_type === 'Quotation' && (doc.document_no || '').startsWith('ORA')) ? 'Order Acknowledgment' : doc.document_type),
                                                    textTransform: 'uppercase'
                                                }}>
                                                    <div style={{ 
                                                        width: '6px', 
                                                        height: '6px', 
                                                        borderRadius: '50%', 
                                                        background: getTypeColor((doc.document_type === 'Quotation' && (doc.document_no || '').startsWith('ORA')) ? 'Order Acknowledgment' : doc.document_type) 
                                                    }} />
                                                    {doc.document_type === 'Enquiry' ? 'Enquiry to Supplier' : 
                                                     (doc.document_type === 'Quotation' && (doc.document_no || '').startsWith('ORA')) ? 'Order Acknowledgment' : 
                                                     doc.document_type}
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
                                                        style={{ color: '#3b82f6', position: 'relative', zIndex: 20, cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDuplicate(doc.id);
                                                        }}
                                                        title="Duplicate Document"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
    
                                                    {(doc.document_type?.toUpperCase() === 'QUOTATION' || doc.document_type?.toUpperCase() === 'ENQUIRY') && (
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${doc.is_job ? 'btn-secondary' : 'btn-success'}`}
                                                            style={{ 
                                                                position: 'relative', 
                                                                zIndex: 20, 
                                                                cursor: doc.is_job ? 'default' : 'pointer', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '4px', 
                                                                padding: '4px 10px', 
                                                                opacity: (conversionLoading || doc.is_job) ? 0.7 : 1,
                                                                background: doc.is_job ? '#94a3b8' : '#10b981',
                                                                borderColor: doc.is_job ? '#94a3b8' : '#10b981',
                                                                color: '#fff'
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (doc.is_job) return;
                                                                setConversionTarget(doc);
                                                                setShowConversionModal(true);
                                                            }}
                                                            disabled={conversionLoading || doc.is_job}
                                                            title={doc.is_job ? "Already Converted to Job" : "Convert to Job"}
                                                        >
                                                            {conversionLoading ? <Loader2 size={12} className="animate-spin" /> : 
                                                             doc.is_job ? <FileCheck size={12} /> : <Play size={12} fill="currentColor" />} 
                                                            <span>{doc.is_job ? 'Job' : 'Job'}</span>
                                                        </button>
                                                    )}
    
                                                    {doc.document_type === 'Proforma Invoice' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm"
                                                            style={{ 
                                                                position: 'relative', 
                                                                zIndex: 20, 
                                                                cursor: 'pointer', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                gap: '4px', 
                                                                padding: '4px 10px', 
                                                                background: '#ef4444',
                                                                borderColor: '#ef4444',
                                                                color: '#fff'
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleConvertToTaxInvoice(doc.id);
                                                            }}
                                                            disabled={conversionLoading}
                                                            title="Convert to Tax Invoice"
                                                        >
                                                            {conversionLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} 
                                                            <span>Convert T.Inv</span>
                                                        </button>
                                                    )}


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
                                                    {isDepository && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm"
                                                            style={{ 
                                                                background: 'rgba(5, 150, 105, 0.1)',
                                                                color: '#059669',
                                                                border: '1px solid rgba(5, 150, 105, 0.2)',
                                                                position: 'relative', 
                                                                zIndex: 20, 
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                fontWeight: 600
                                                            }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleRestore(doc);
                                                            }}
                                                        >
                                                            <PlayCircle size={14} /> Restore
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))))
                                }
                            </tbody>
                    </table>
                </div>
            </div>

            {showEnquiryForm && (
                <div className="modal-backdrop" style={{ zIndex: 1000 }}>
                    <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Create New Enquiry to Supplier</h2>
                            <button className="btn btn-secondary" onClick={() => setShowEnquiryForm(false)}>Cancel</button>
                        </div>
                        <CustomerEnquiryForm 
                            onSuccess={() => {
                                setShowEnquiryForm(false);
                                fetchDocs();
                            }} 
                        />
                    </div>
                </div>
            )}

            {showConversionModal && conversionTarget && (
                <div className="modal-backdrop" style={{ zIndex: 1000, background: 'rgba(0, 0, 0, 0.4)' }}>
                    <div className="modal-content" style={{ 
                        maxWidth: '560px', 
                        width: '95%', 
                        background: '#ffffff', 
                        borderRadius: '12px', 
                        padding: '24px', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        border: '1px solid #e5e7eb',
                        fontFamily: "'Inter', sans-serif"
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#1e3a8a', fontSize: '1.25rem', fontWeight: 700 }}>
                                <Briefcase size={22} color="#1e3a8a" /> Convert Quotation to Job
                            </h3>
                            <button onClick={() => setShowConversionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleConversionSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>Customer PO No.</label>
                                    <input type="text" required className="form-input" name="po_no" placeholder="PO-12345" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                </div>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Date</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="date" required className="form-input" name="po_date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                    </div>
                                </div>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Value (SGD)</label>
                                    <input type="number" step="0.01" required className="form-input" name="po_value" defaultValue={conversionTarget.total_amount} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                </div>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Issued By</label>
                                    <input type="text" className="form-input" name="po_by" placeholder="Name of Person" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                </div>
                            </div>

                            <div className="form-item" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Description / Project Scope</label>
                                <textarea className="form-input" name="po_description" rows="3" placeholder="Briefly describe the PO scope..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', resize: 'none' }}></textarea>
                            </div>

                            <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #f3f4f6', marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automatically Generate:</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><FileCheck size={16} /> Order Acknowledgment</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><FileCheck size={16} /> Delivery Order</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><FileCheck size={16} /> Proforma Invoice</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><FileCheck size={16} /> Tax Invoice</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><FileCheck size={16} /> Packing List</div>
                                </div>
                                
                                <div style={{ marginTop: '16px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', color: '#374151' }}>
                                        <input type="checkbox" name="includeCertificates" style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} /> Include Certificates (CERT)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', color: '#374151' }}>
                                        <input type="checkbox" name="includeServiceReport" style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} /> Include Service Report (SR)
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                                <button type="button" onClick={() => setShowConversionModal(false)} style={{ 
                                    padding: '10px 24px', 
                                    borderRadius: '8px', 
                                    border: '1px solid #d1d5db', 
                                    background: '#ffffff', 
                                    color: '#374151', 
                                    fontSize: '0.95rem', 
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}>Cancel</button>
                                <button type="submit" disabled={conversionLoading} style={{ 
                                    padding: '10px 24px', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    background: '#5865f2', 
                                    color: '#ffffff', 
                                    fontSize: '0.95rem', 
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    minWidth: '200px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(88, 101, 242, 0.2)'
                                }}>
                                    {conversionLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" /> Generating...
                                        </>
                                    ) : 'Confirm & Generate Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingJob && (
                <JobEditV2Modal 
                    job={editingJob} 
                    onClose={() => setEditingJob(null)} 
                    onSave={() => {
                        fetchDocs();
                        setEditingJob(null);
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
                .modal-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    position: relative;
                }
            `}} />
        </div>
    );
}

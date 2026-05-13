import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getWorkflowDocuments, deleteWorkflowDocument, duplicateWorkflowDocument, convertQuotationToJob, revertJobToQuotation, convertProformaToTaxInvoice, getDocumentHistory } from '../../lib/workflowV2Service';
import {
    FileCheck, Play, Briefcase, X, Loader2, PlayCircle, Folder, Upload,
    ArrowRightLeft, Filter, Eye, Printer, Search, Trash2, Plus, FileText, Copy, Clock,
    ArrowUp, ArrowDown
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
    const [historyDoc, setHistoryDoc] = useState(null);
    const [historyItems, setHistoryItems] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    // SOA Aging View State
    const [soaGroups, setSoaGroups] = useState([]);
    const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
    const [selectedCustomerForSOA, setSelectedCustomerForSOA] = useState(null);
    const [customerDocs, setCustomerDocs] = useState([]);
    const [loadingCustomerDocs, setLoadingCustomerDocs] = useState(false);
    const [poFile, setPoFile] = useState(null);

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
        
        // Special fetch for SOA: we need all financial docs to calculate balances
        if (activeType === 'Statement of Account') {
            typeFilter = ['Tax Invoice', 'Proforma Invoice', 'Payment Received'];
        }

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
            } else if (activeType === 'Statement of Account') {
                // Group by Customer and calculate outstanding
                const groups = {};
                data.forEach(doc => {
                    const pname = doc.partners?.name || 'Walk-in';
                    if (!groups[pname]) {
                        groups[pname] = { 
                            partner_id: doc.partner_id, 
                            name: pname, 
                            outstanding: 0, 
                            total_invoiced: 0, 
                            total_paid: 0,
                            last_transaction: doc.issue_date,
                            doc_count: 0
                        };
                    }
                    
                    const amount = parseFloat(doc.total_amount) || 0;
                    if (doc.document_type.includes('Invoice')) {
                        groups[pname].outstanding += amount;
                        groups[pname].total_invoiced += amount;
                    } else if (doc.document_type === 'Payment Received') {
                        groups[pname].outstanding -= amount;
                        groups[pname].total_paid += amount;
                    }
                    groups[pname].doc_count++;
                    if (doc.issue_date && (!groups[pname].last_transaction || new Date(doc.issue_date) > new Date(groups[pname].last_transaction))) {
                        groups[pname].last_transaction = doc.issue_date;
                    }
                });
                setSoaGroups(Object.values(groups));
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

    const handleShowHistory = async (doc) => {
        setHistoryDoc(doc);
        setLoadingHistory(true);
        try {
            const { data, error } = await getDocumentHistory(doc);
            if (data) setHistoryItems(data);
            if (error) throw error;
        } catch (err) {
            console.error("History fetch error:", err);
            alert("Failed to fetch history: " + err.message);
        } finally {
            setLoadingHistory(false);
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
            
            // Handle PO File Upload if present
            if (poFile) {
                try {
                    const accessToken = localStorage.getItem('google_access_token');
                    if (accessToken) {
                        const { getDocumentSettings } = await import('../../lib/store');
                        const { getOrCreateFolder, provisionFullProjectStructure, uploadFileToDrive } = await import('../../lib/driveService');
                        
                        const settings = await getDocumentSettings(profile.company_id);
                        let celronRootId = settings?.gdrive_celron_root_id || settings?.google_drive_folder_id;
                        if (celronRootId?.includes('drive.google.com')) {
                            const match = celronRootId.match(/\/folders\/([a-zA-Z0-9_-]+)/) || celronRootId.match(/\/d\/([a-zA-Z0-9_-]+)/);
                            if (match) celronRootId = match[1];
                        }

                        const currentYear = new Date().getFullYear().toString();
                        const projectFolderId = await provisionFullProjectStructure(accessToken, celronRootId, currentYear, jobNo);
                        const targetFolderId = await getOrCreateFolder(accessToken, '1. Enquiries & Quotations', projectFolderId);
                        
                        const uploadResult = await uploadFileToDrive(accessToken, poFile, { folderId: targetFolderId });
                        const poUrl = `https://drive.google.com/file/d/${uploadResult.id}/view`;

                        // Update all documents associated with this job with the attachment URL
                        const { supabase } = await import('../../lib/supabase');
                        await supabase.from('workflow_documents').update({ 
                            customer_po_attachment_url: poUrl,
                            attachment_urls: [poUrl]
                        }).eq('assigned_job_no', jobNo);
                    }
                } catch (uploadErr) {
                    console.error("PO Upload to Drive failed:", uploadErr);
                    // Non-blocking error for main conversion
                }
            }

            alert(`Job ${jobNo} created successfully with all associated documents!`);
            setShowConversionModal(false);
            setPoFile(null);
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

    const handleRestore = async (doc) => {
        if (!window.confirm(`Restore ${doc.document_no} to active workflows?`)) return;
        try {
            setLoading(true);
            const { supabase } = await import('../../lib/supabase');
            await supabase.from('workflow_documents').update({ status: 'Draft' }).eq('id', doc.id);
            alert('Document restored to active list.');
            fetchDocs();
        } catch (error) {
            console.error('Restore failed:', error);
            alert('Restore failed: ' + error.message);
        } finally {
            setLoading(false);
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

    const handleUploadSignedProof = async (doc, file) => {
        if (!file) return;
        
        try {
            setLoading(true);
            const accessToken = localStorage.getItem('google_access_token');
            if (!accessToken) throw new Error('Google account not connected');

            const { getDocumentSettings } = await import('../../lib/store');
            const { getOrCreateFolder, provisionFullProjectStructure, uploadFileToDrive } = await import('../../lib/driveService');
            const { getGDriveFolderIdForStage } = await import('../../lib/workflowV2Service');

            const settings = await getDocumentSettings(profile.company_id);
            let celronRootId = settings?.gdrive_celron_root_id || settings?.google_drive_folder_id;
            if (celronRootId?.includes('drive.google.com')) {
                const match = celronRootId.match(/\/folders\/([a-zA-Z0-9_-]+)/) || celronRootId.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match) celronRootId = match[1];
            }

            const currentYear = new Date().getFullYear().toString();
            const jobNo = doc.assigned_job_no;
            const projectFolderId = await provisionFullProjectStructure(accessToken, celronRootId, currentYear, jobNo);
            
            const signedFolderId = await getOrCreateFolder(accessToken, '6. Completed Proof of Delivery / Signed Reports', projectFolderId);
            
            const result = await uploadFileToDrive(accessToken, file, { folderId: signedFolderId });
            const proofUrl = `https://drive.google.com/file/d/${result.id}/view`;

            // Save to DB in attachment_urls or a specific field if we had one, 
            // for now let's use internal_notes or just alert success as it's in the folder
            const { supabase } = await import('../../lib/supabase');
            const newAttachments = [...(doc.attachment_urls || []), proofUrl];
            await supabase.from('workflow_documents').update({ 
                attachment_urls: newAttachments,
                status: 'Confirmed' 
            }).eq('id', doc.id);

            alert('Signed proof uploaded successfully to Folder 6!');
            fetchDocs();
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setLoading(false);
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
            (doc.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.customer_ref || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleOpenDocument = (type, id) => {
        let url = `/workflows/editor/${type.toLowerCase().replace(/\s+/g, '-')}/${id}`;
        if (id === 'new' && jobId) {
            url += `?job_id=${jobId}`;
        }
        window.open(url, '_blank');
    };

    const openDriveFolder = async (doc) => {
        // 1. Direct link on the document itself
        const folderId = doc.drive_folder_id || doc.gdrive_folder_id;
        if (folderId) {
            window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
            return;
        }

        // 2. If it's a Job or part of a Job, try to find the Project folder
        const jobNo = doc.assigned_job_no;
        if (!jobNo) {
            alert('This document is not linked to an active Job or Enquiry folder.');
            return;
        }

        if (!window.confirm(`No folder linked for ${doc.document_no}. Provision folder for ${jobNo} now?`)) return;

        try {
            setLoading(true);
            const accessToken = localStorage.getItem('google_access_token');
            if (!accessToken) throw new Error('Google account not connected');

            const { getDocumentSettings } = await import('../../lib/store');
            const { getOrCreateFolder, provisionFullProjectStructure } = await import('../../lib/driveService');
            const { getGDriveFolderIdForStage } = await import('../../lib/workflowV2Service');

            const settings = await getDocumentSettings(profile.company_id);
            let celronRootId = settings?.gdrive_celron_root_id || settings?.google_drive_folder_id;
            
            if (!celronRootId) throw new Error('Google Drive Root Folder ID not configured in Settings.');
            
            // Extract ID if URL was provided
            if (celronRootId.includes('drive.google.com')) {
                const match = celronRootId.match(/\/folders\/([a-zA-Z0-9_-]+)/) || celronRootId.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match) celronRootId = match[1];
            }

            const currentYear = new Date().getFullYear().toString();
            const projectFolderId = await provisionFullProjectStructure(accessToken, celronRootId, currentYear, jobNo);
            
            // Find specific subfolder for this document type
            const subfolderName = getGDriveFolderIdForStage(doc.document_type);
            const targetFolderId = await getOrCreateFolder(accessToken, subfolderName, projectFolderId);

            // Update DB if possible (Optional, but helps for next time)
            const { supabase } = await import('../../lib/supabase');
            await supabase.from('workflow_documents').update({ drive_folder_id: targetFolderId }).eq('id', doc.id);

            alert('Folder provisioned successfully!');
            fetchDocs();
            window.open(`https://drive.google.com/drive/folders/${targetFolderId}`, '_blank');
        } catch (error) {
            console.error('Provisioning failed:', error);
            alert('Failed to provision: ' + error.message);
        } finally {
            setLoading(false);
        }
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
                                'Statement of Account': { link: '/soa' }
                            };
                            if (config[activeType]) {
                                window.open(config[activeType].link, '_blank');
                            } else if (activeType === 'All') {
                                setShowEnquiryForm(true);
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
                                'Statement of Account': 'Generate SOA',
                                'All': 'New Enquiry'
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
                            {activeType === 'Statement of Account' ? (
                                <tr>
                                    <th style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                                        Customer Name {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                    </th>
                                    <th>Outstanding Balance</th>
                                    <th>Total Invoiced</th>
                                    <th>Total Paid</th>
                                    <th>Last Transaction</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            ) : activeType === 'Job' ? (
                                <tr>
                                    <th>CEL Job No</th>
                                    <th>Customer</th>
                                    <th>Purchase Order Info</th>
                                    <th>Description</th>
                                    <th>Value (SGD)</th>
                                    <th>Signature</th>
                                    <th>Attachment</th>
                                    <th style={{ textAlign: 'center' }}>Folder</th>
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
                                    <th>Signature</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Folder</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="11" className="text-center py-12">Loading documents...</td></tr>
                            ) : (activeType === 'Statement of Account' ? soaGroups : filteredDocs).length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="text-center py-12">
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            <FileText size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                            <p>No documents found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : activeType === 'Statement of Account' ? (
                                soaGroups
                                    .sort((a, b) => sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
                                    .map((group) => (
                                        <tr key={group.name} className="table-row">
                                            <td 
                                                className="font-bold text-accent" 
                                                style={{ cursor: 'pointer', color: 'var(--accent)' }}
                                                onClick={() => {
                                                    setSelectedCustomerForSOA(group);
                                                    const docs = documents.filter(d => d.partner_id === group.partner_id);
                                                    setCustomerDocs(docs);
                                                }}
                                            >
                                                {group.name}
                                            </td>
                                            <td className="font-bold" style={{ color: group.outstanding > 0.01 ? '#ef4444' : (group.outstanding < -0.01 ? '#10b981' : 'var(--text-secondary)') }}>
                                                SGD {group.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>SGD {group.total_invoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>SGD {group.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td>{formatDate(group.last_transaction)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button 
                                                    className="btn btn-sm btn-secondary" 
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                                                    onClick={() => window.open(`/soa?partner_id=${group.partner_id}`, '_blank')}
                                                >
                                                    <Printer size={14} /> Generate SOA
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            ) : (
                                filteredDocs.map((doc) => (
                                    activeType === 'Job' ? (
                                        <tr key={doc.id} className="table-row">
                                            <td className="font-bold" style={{ color: '#1e3a8a' }}>{doc.assigned_job_no || 'TBD'}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: '0.9rem' }}>{doc.delivery_verification?.po_description || doc.partners?.name || 'Walk-in'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                                                        {doc.contacts?.name || 'N/A'}
                                                    </div>
                                                    
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.8 }}>
                                                        {doc.subject || '-'}
                                                    </div>
                                                    {doc.customer_ref && <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>Ref: {doc.customer_ref}</div>}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.85rem' }}>{doc.customer_po_no || 'N/A'}</span>
                                                        {doc.customer_po_attachment_url && (
                                                            <a 
                                                                href={doc.customer_po_attachment_url} 
                                                                target="_blank" 
                                                                rel="noreferrer"
                                                                style={{ color: '#6366f1' }}
                                                                title="View PO File"
                                                            >
                                                                <FileText size={12} />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                        {doc.customer_po_date ? formatDate(doc.customer_po_date) : 'No Date'}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                                                        By: {doc.contacts?.first_name || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={doc.subject}>
                                                    {doc.subject || '-'}
                                                </div>
                                            </td>
                                            <td className="font-bold">SGD {doc.delivery_verification?.po_value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '-'}</td>
                                            <td>
                                                {doc.signature_url ? (
                                                    <img src={doc.signature_url} alt="Sig" style={{ height: '24px', maxWidth: '80px', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
                                                )}
                                            </td>
                                            <td>
                                                {doc.customer_po_attachment_url ? (
                                                    <a href={doc.customer_po_attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <FileText size={12} /> View PO
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No Upload</span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openDriveFolder(doc)}
                                                    style={{ background: 'none', border: 'none', color: (doc.drive_folder_id || doc.gdrive_folder_id) ? '#f59e0b' : '#6366f1', cursor: 'pointer', opacity: (doc.drive_folder_id || doc.gdrive_folder_id) ? 1 : 0.4 }}
                                                    title={(doc.drive_folder_id || doc.gdrive_folder_id) ? "Open Project Folder" : "Provision Project Folder"}
                                                >
                                                    <Folder size={20} fill={(doc.drive_folder_id || doc.gdrive_folder_id) ? "#f59e0b" : "currentColor"} fillOpacity={0.2} />
                                                </button>
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
                                                    <label style={{ cursor: 'pointer', position: 'relative', zIndex: 20 }} title="Upload Signed Copy to Folder 6">
                                                        <div className="btn btn-sm btn-secondary" style={{ color: '#059669' }}>
                                                            <Upload size={14} />
                                                        </div>
                                                        <input 
                                                            type="file" 
                                                            hidden 
                                                            onChange={(e) => handleUploadSignedProof(doc, e.target.files[0])} 
                                                        />
                                                    </label>
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{doc.partners?.name || 'Walk-in'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                                                        {doc.contacts?.name || 'N/A'}
                                                    </div>
                                                    
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', opacity: 0.8 }}>
                                                        {doc.subject || '-'}
                                                    </div>
                                                    {doc.customer_ref && <div style={{ opacity: 0.6, fontSize: '0.7rem' }}>Ref: {doc.customer_ref}</div>}
                                                </div>
                                            </td>
                                            <td>
                                                {doc.vessels?.vessel_name || doc.work_locations?.location_name || '-'}
                                            </td>
                                            <td className="font-bold">
                                                {doc.currency} {doc.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td>
                                                {doc.signature_url ? (
                                                    <img src={doc.signature_url} alt="Sig" style={{ height: '24px', maxWidth: '80px', objectFit: 'contain' }} />
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>-</span>
                                                )}
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
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => openDriveFolder(doc)}
                                                    style={{ background: 'none', border: 'none', color: (doc.drive_folder_id || doc.gdrive_folder_id) ? '#f59e0b' : '#6366f1', cursor: 'pointer', opacity: (doc.drive_folder_id || doc.gdrive_folder_id) ? 1 : 0.4 }}
                                                    title={(doc.drive_folder_id || doc.gdrive_folder_id) ? "Open Drive Folder" : "Provision Drive Folder"}
                                                >
                                                    <Folder size={20} fill={(doc.drive_folder_id || doc.gdrive_folder_id) ? "#f59e0b" : "currentColor"} fillOpacity={0.2} />
                                                </button>
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

                                                    {doc.document_type === 'Certificate' && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-secondary"
                                                            style={{ color: '#8b5cf6', position: 'relative', zIndex: 20, cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleShowHistory(doc);
                                                            }}
                                                            title="View Revision History"
                                                        >
                                                            <Clock size={14} />
                                                        </button>
                                                    )}
    
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
                            onClose={() => setShowEnquiryForm(false)}
                            onSave={() => {
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
                                <textarea className="form-input" name="po_description" rows="2" placeholder="Briefly describe the PO scope..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', resize: 'none' }}></textarea>
                            </div>

                            <div className="form-item" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>Upload Customer PO (File Repository)</label>
                                <div style={{ 
                                    border: '2px dashed #e5e7eb', 
                                    borderRadius: '12px', 
                                    padding: '16px', 
                                    textAlign: 'center',
                                    background: poFile ? '#f0fdf4' : '#fafafa',
                                    borderColor: poFile ? '#22c55e' : '#e5e7eb',
                                    transition: 'all 0.2s'
                                }}>
                                    <input 
                                        type="file" 
                                        id="po-upload" 
                                        hidden 
                                        onChange={(e) => setPoFile(e.target.files[0])} 
                                    />
                                    <label htmlFor="po-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        {poFile ? (
                                            <>
                                                <FileCheck size={24} color="#22c55e" />
                                                <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>{poFile.name} selected</span>
                                                <button type="button" onClick={(e) => { e.preventDefault(); setPoFile(null); }} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={24} color="#6366f1" />
                                                <span style={{ fontSize: '0.85rem', color: '#4b5563' }}>Click to upload or drag and drop PO file</span>
                                                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>PDF, DOCX or Images (Max 10MB)</span>
                                            </>
                                        )}
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
            {/* History Modal */}
            {historyDoc && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ width: '800px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-panel)', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>Revision History</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{historyDoc.document_no} - {historyDoc.subject}</p>
                            </div>
                            <button onClick={() => setHistoryDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={24} /></button>
                        </div>

                        {loadingHistory ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Rev</th>
                                            <th>Document No</th>
                                            <th>Date</th>
                                            <th>Signature</th>
                                            <th>Status</th>
                                            {activeType === 'Job' && <th style={{ width: '150px' }}>Customer PO</th>}
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyItems.map(item => (
                                            <tr key={item.id} className="table-row">
                                                <td>R{item.revision_no || 0}</td>
                                                <td className="font-medium">{item.document_no}</td>
                                                <td>{new Date(item.issue_date).toLocaleDateString()}</td>
                                                <td>
                                                    {item.signature_url ? (
                                                        <img src={item.signature_url} alt="Sig" style={{ height: '20px' }} />
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{item.status}</span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button 
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={() => {
                                                            const isExternal = item.notes?.includes('drive.google.com') || item.notes?.startsWith('http');
                                                            if (isExternal) window.open(item.notes, '_blank');
                                                            else navigate(`/workflows/editor/${item.document_type.toLowerCase().replace(/\s+/g, '-')}/${item.id}`);
                                                            setHistoryDoc(null);
                                                        }}
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* SOA Drill-down Modal */}
            {selectedCustomerForSOA && (
                <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ width: '1000px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-panel)', padding: '32px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>{selectedCustomerForSOA.name}</h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Detailed Outstanding Ledger</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => window.open(`/soa?partner_id=${selectedCustomerForSOA.partner_id}`, '_blank')}
                                >
                                    <Printer size={18} /> Generate Official Statement
                                </button>
                                <button onClick={() => setSelectedCustomerForSOA(null)} style={{ background: 'var(--bg-secondary)', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%' }}><X size={24} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Outstanding</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>SGD {selectedCustomerForSOA.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Invoiced</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>SGD {selectedCustomerForSOA.total_invoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Total Payments</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>SGD {selectedCustomerForSOA.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>

                        <div className="table-container">
                            <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: 'transparent' }}>Date</th>
                                        <th style={{ background: 'transparent' }}>Type</th>
                                        <th style={{ background: 'transparent' }}>Document No</th>
                                        <th style={{ background: 'transparent' }}>Subject / Ref</th>
                                        <th style={{ background: 'transparent' }}>Debit (+)</th>
                                        <th style={{ background: 'transparent' }}>Credit (-)</th>
                                        <th style={{ background: 'transparent', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerDocs
                                        .sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))
                                        .map(doc => {
                                            const isInvoice = doc.document_type.includes('Invoice');
                                            return (
                                                <tr key={doc.id} className="table-row" style={{ background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                                    <td style={{ fontWeight: 500 }}>{formatDate(doc.issue_date)}</td>
                                                    <td>
                                                        <span style={{ 
                                                            fontSize: '0.75rem', 
                                                            padding: '4px 10px', 
                                                            borderRadius: '20px', 
                                                            background: isInvoice ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: isInvoice ? '#3b82f6' : '#10b981',
                                                            fontWeight: 600
                                                        }}>
                                                            {doc.document_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{doc.document_no}</td>
                                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{doc.subject || doc.payment_ref || '-'}</td>
                                                    <td style={{ fontWeight: 700, color: isInvoice ? 'var(--text-primary)' : 'transparent' }}>
                                                        {isInvoice ? `+ ${doc.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: !isInvoice ? '#10b981' : 'transparent' }}>
                                                        {!isInvoice ? `- ${doc.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <button 
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => window.open(`/workflows/editor/${doc.document_type.toLowerCase().replace(/\s+/g, '-')}/${doc.id}`, '_blank')}
                                                        >
                                                            <Eye size={14} /> Open
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

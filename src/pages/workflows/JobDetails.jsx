import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    getJobById, getJobExpenses, createJobExpense, deleteJobExpense, updateJobExpense,
    getDocuments, deleteJob, updateJob,
    getSupplierQuotes, updateEnquiry
} from '../../lib/workflowService';
import { getWorkflowDocumentsByJob, generateDocNumber, recordExternalDocument } from '../../lib/workflowV2Service';
import { generateDocumentPDF } from '../../lib/pdfGenerator';
import { moveFolder, checkFileExists, createFolderStructure, uploadFileToDrive } from '../../lib/driveService';
import { initializeVault } from '../../lib/vaultService';
import { validateToken, connectGoogleAPI } from '../../lib/googleAuthService';
import EditJobModal from '../../components/workflows/EditJobModal';
import CommunicationWall from '../../components/common/CommunicationWall';
import DriveScannerLinker from '../../components/workflows/DriveScannerLinker';
import { ArrowLeft, ArrowRight, ExternalLink, Ship, Package, DollarSign, Clock, CheckCircle2, AlertCircle, FileText, Download, Edit, Trash2, Printer, Plus, Search, Archive, Upload, ListChecks, FileDigit } from 'lucide-react';
import SafeDriveLink from '../../components/common/SafeDriveLink';
import UploadOverlay from '../../components/common/UploadOverlay';

export default function JobDetails() {
    const { id } = useParams();
    const { profile } = useAuth();

    const [job, setJob] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [v2Docs, setV2Docs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);
    const [fileExistence, setFileExistence] = useState({}); // { [expenseId/docId]: boolean }

    // Form States
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [newExpense, setNewExpense] = useState({ supplier_name: '', description: '', amount: '', status: 'Unpaid' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [jobRes, expRes, v2DocsRes, quoteRes] = await Promise.all([
                getJobById(profile.company_id, id),
                getJobExpenses(profile.company_id, id),
                getWorkflowDocumentsByJob(id),
                getSupplierQuotes(id)
            ]);

            if (jobRes.data) setJob(jobRes.data);
            if (expRes.data) {
                setExpenses(expRes.data);
                verifyExpenseAttachments(expRes.data);
            }
            if (v2DocsRes.data) setV2Docs(v2DocsRes.data);
            if (quoteRes?.data) setQuotes(quoteRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (profile && id) {
            fetchData();
        }
    }, [id, profile]);


    const verifyExpenseAttachments = async (expensesList) => {
        const accessToken = localStorage.getItem('google_access_token');
        if (!accessToken) return;

        const existenceMap = {};
        for (const exp of expensesList) {
            if (exp.attachment_url && exp.attachment_url.includes('drive.google.com')) {
                // Extract file ID from URL
                const match = exp.attachment_url.match(/\/d\/([^/]+)/);
                const fileId = match ? match[1] : null;
                if (fileId) {
                    const exists = await checkFileExists(accessToken, fileId);
                    existenceMap[exp.id] = exists;
                }
            }
        }
        setFileExistence(prev => ({ ...prev, ...existenceMap }));
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newExpense,
                job_id: id,
                company_id: profile.company_id,
                amount: parseFloat(newExpense.amount) || 0,
                // If they linked a Google Drive scan, set it directly right away
                attachment_url: newExpense.driveLink || null
            };
            
            // Cleanup UI-only fields before sending to API
            delete payload.driveLink;
            delete payload.billFile;

            // 1. Save the expense record
            const { data, error } = await createJobExpense(payload);
            if (error) throw error;

            // 2. Handle optional file upload if they selected a raw file instead of linking a scan
            if (newExpense.billFile && !newExpense.driveLink) {
                const accessToken = localStorage.getItem('google_access_token');
                const projectFolderId = job.enquiries?.gdrive_folder_id || job.gdrive_folder_id;

                if (accessToken && projectFolderId) {
                    const { createFolderStructure, uploadFileToDrive } = await import('../../lib/driveService');
                    const subFolderId = await createFolderStructure(accessToken, '2. Supplier_Quotes_&_PO', projectFolderId);

                    const uploadRes = await uploadFileToDrive(accessToken, newExpense.billFile, {
                        folderId: subFolderId,
                        title: `BILL_${data.supplier_name}_${newExpense.billFile.name}`,
                        company_id: profile.company_id,
                        onProgress: (p) => setUploadProgress(p)
                    });

                    if (uploadRes.webViewLink) {
                        setUploadLink(uploadRes.webViewLink);
                        await updateJobExpense(data.id, { attachment_url: uploadRes.webViewLink });
                        data.attachment_url = uploadRes.webViewLink;
                    }
                }
            }

            setExpenses([...expenses, data]);
            setShowExpenseForm(false);
            setNewExpense({ supplier_name: '', description: '', amount: '', status: 'Unpaid', billFile: null, driveLink: null });
        } catch (err) { alert('Failed to add job cost: ' + err.message); }
        finally { 
            // setUploadProgress(0); // Handled by onClose
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            const { error } = await deleteJobExpense(expenseId);
            if (error) throw error;
            setExpenses(expenses.filter(e => e.id !== expenseId));
        } catch (err) {
            alert('Failed to delete expense');
        }
    };

    const handleUpdatePaymentStatus = async (status) => {
        try {
            const { error } = await updateJob(id, { payment_status: status });
            if (error) throw error;
            setJob({ ...job, payment_status: status });
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleArchive = async () => {
        const folderId = job.enquiries?.gdrive_folder_id || job.gdrive_folder_id;
        if (!folderId) {
            alert("No Google Drive folder found for this job.");
            return;
        }

        const isPaid = job.payment_status === 'Paid';
        const confirmMsg = isPaid
            ? "Archive this job to the Corporate Vault?"
            : "Job is not fully paid. Archive anyway?";

        if (!window.confirm(confirmMsg)) return;

        setIsArchiving(true);
        try {
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                connectGoogleAPI('job_archive');
                return;
            }

            const vaultRootId = await initializeVault(accessToken, profile.company_id);
            await moveFolder(accessToken, folderId, vaultRootId);

            // Mark job and original enquiry as archived in DB
            await updateJob(id, { status: 'Archived' });
            if (job.enquiry_id) {
                await updateEnquiry(job.enquiry_id, { status: 'Archived' });
            }

            alert("Successfully moved to Corporate Vault!");
            fetchData();
        } catch (err) {
            console.error("Archive error:", err);
            alert(`Failed to archive: ${err.message}`);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleRecordDocument = async (type) => {
        try {
            // 1. Generate the PDF and get the blob
            const blob = await generateDocumentPDF(job, type);
            if (!blob) return;

            // 2. Check for Drive access and folder
            const accessToken = localStorage.getItem('google_access_token');
            const isValid = await validateToken(accessToken);
            if (!accessToken || !isValid) {
                connectGoogleAPI('job_document');
                return;
            }
            const projectFolderId = job.enquiries?.gdrive_folder_id || job.gdrive_folder_id;

            if (projectFolderId) {

                // Map document type to sub-folder
                let subFolderName = '';
                if (type === 'Invoice') subFolderName = '4. Finance_Invoices_&_Payments';
                else if (type === 'Delivery Order' || type === 'Service Report') subFolderName = '3. Operations_DO_SR_&_Certificates';
                else if (type === 'Purchase Order') subFolderName = '2. Supplier_Quotes_&_PO';
                else subFolderName = '1. Customer_Request_&_Offer';

                const subFolderId = await createFolderStructure(accessToken, subFolderName, projectFolderId);
                const fileName = `${type.replace(/\s+/g, '_')}_${job.job_no}.pdf`;

                const uploadRes = await uploadFileToDrive(accessToken, new File([blob], fileName, { type: 'application/pdf' }), {
                    folderId: subFolderId,
                    title: fileName,
                    company_id: profile.company_id,
                    onProgress: (p) => setUploadProgress(p)
                });
                setUploadLink(uploadRes.webViewLink);

                // Record in workflow_documents for the board
                try {
                    const docNo = await generateDocNumber(profile.company_id, type);
                    await recordExternalDocument({
                        company_id: profile.company_id,
                        job_id: id,
                        enquiry_id: job.enquiry_id,
                        document_type: type,
                        document_no: docNo,
                        subject: `${type} for ${job.job_no}`,
                        issue_date: new Date().toISOString().split('T')[0],
                        status: 'Completed',
                        notes: uploadRes.webViewLink,
                        partner_id: job.enquiries?.customer_id || job.customer_id,
                        vessel_id: job.enquiries?.vessel_id || job.vessel_id,
                        work_location_id: job.enquiries?.work_location_id || job.work_location_id
                    });
                } catch (recErr) {
                    console.error("Failed to record document:", recErr);
                }

                alert(`${type} generated and saved to Google Drive!`);
            } else {
                alert(`${type} generated and downloaded.`);
            }
        } catch (err) {
            console.error(`Failed to record ${type}:`, err);
            alert(`Error auto-saving ${type} to Drive. It was downloaded locally.`);
        } finally {
            // setUploadProgress(0); // Handled by onClose
        }
    };

    if (loading) return <div className="loading-state">Loading job portal...</div>;
    if (!job) return <div className="page-container"><h2>Job Not Found</h2></div>;

    const totalRevenue = job.po_amount || 0;
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const profit = totalRevenue - totalExpenses;

    return (
        <div className="page-container" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Link to="/workflows" className="btn btn-outline btn-sm" style={{ marginBottom: '16px', display: 'inline-flex', gap: '8px' }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'var(--primary)', color: 'white', padding: '12px', borderRadius: '12px' }}>
                            <Package size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{job.job_no}</h1>
                            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Job Portal • {job.type} • Created {new Date(job.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleArchive}
                        className={`btn ${job.status === 'Archived' ? 'btn-outline' : 'btn-secondary'}`}
                        disabled={isArchiving || job.status === 'Archived'}
                        style={{ gap: '8px', opacity: job.status === 'Archived' ? 0.7 : 1 }}
                    >
                        {isArchiving ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
                        {job.status === 'Archived' ? 'Job Archived' : 'Archive Job'}
                    </button>
                    <button onClick={() => setShowEdit(true)} className="btn btn-outline" style={{ gap: '8px' }}><Edit size={18} /> Edit Job</button>
                    <button onClick={() => window.print()} className="btn btn-primary" style={{ gap: '8px' }}><Download size={18} /> Print Record</button>
                </div>
            </header>

            {/* Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>

                {/* Main Content Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Phase 1: Enquiry & Quotes */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                                <FileText size={20} color="var(--primary)" /> 1. Enquiry & Quotations
                            </h3>
                            <Link to={`/workflows/enquiry/${job.enquiry_id}`} className="btn btn-sm btn-outline">Go to Enquiry</Link>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Source Enquiry</label>
                                <div style={{ fontWeight: 600 }}>{job.enquiries?.enquiry_no || 'Manual Entry'}</div>
                            </div>
                            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Customer</label>
                                <div style={{ fontWeight: 600 }}>{job.enquiries?.customer?.name || 'N/A'}</div>
                            </div>
                            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Supplier Quotes</label>
                                <div style={{ fontWeight: 600 }}>{quotes.length} Floating</div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 2: Orders Block */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Customer Order */}
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CreditCard size={18} color="#10b981" /> Order from Customer
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>PO Ref:</span>
                                    <span style={{ fontWeight: 600 }}>{job.po_ref || '-'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>PO Amount:</span>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>${totalRevenue.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                                    <span className={`badge ${job.payment_status?.toLowerCase() || 'unpaid'}`}>{job.payment_status || 'Unpaid'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Job Costing Section */}
                        <div className="glass-panel" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
                                    <BadgeDollarSign size={20} color="#059669" /> 3. Job Costing & Supplier Bills
                                </h3>
                                <button onClick={() => setShowExpenseForm(true)} className="btn btn-sm btn-primary" style={{ gap: '8px' }}>
                                    <Plus size={16} /> Add Job Cost
                                </button>
                            </div>
                            <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                        <tr>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Supplier</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Description</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bill</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expenses.map(exp => (
                                            <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{exp.supplier_name}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{exp.description}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>${exp.amount?.toLocaleString()}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    {exp.attachment_url ? (
                                                        <SafeDriveLink 
                                                            url={exp.attachment_url} 
                                                            label="View Bill"
                                                            className="btn btn-sm btn-outline"
                                                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                        />
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                const input = document.createElement('input');
                                                                input.type = 'file';
                                                                input.onchange = async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;
                                                                    try {
                                                                        const accessToken = localStorage.getItem('google_access_token');
                                                                        const isValid = await validateToken(accessToken);
                                                                        if (!accessToken || !isValid) {
                                                                            connectGoogleAPI('job_expense_upload');
                                                                            return;
                                                                        }
                                                                        const projectFolderId = job.enquiries?.gdrive_folder_id || job.gdrive_folder_id;
                                                                        if (projectFolderId) {
                                                                            const subFolderId = await createFolderStructure(accessToken, '2. Supplier_Quotes_&_PO', projectFolderId);
                                                                            const uploadRes = await uploadFileToDrive(accessToken, file, {
                                                                                folderId: subFolderId,
                                                                                title: `BILL_${exp.supplier_name}_${file.name}`,
                                                                                company_id: profile.company_id,
                                                                                onProgress: (p) => setUploadProgress(p)
                                                                            });
                                                                            if (uploadRes.webViewLink) {
                                                                                setUploadLink(uploadRes.webViewLink);
                                                                                await updateJobExpense(exp.id, { attachment_url: uploadRes.webViewLink });
                                                                                alert("Supplier Bill uploaded and filed to Drive!");
                                                                                fetchData();
                                                                            }
                                                                        }
                                                                    } catch (err) { alert("Upload failed: " + err.message); }
                                                                    finally { 
                                                                        // setUploadProgress(0); // Handled by onClose
                                                                    }
                                                                };
                                                                input.click();
                                                            }}
                                                            className="btn btn-sm btn-outline"
                                                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                            title="Upload Supplier Bill to GDrive"
                                                        >
                                                            <Upload size={12} /> Upload Bill
                                                        </button>
                                                    )}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button onClick={() => handleDeleteExpense(exp.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {expenses.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No supplier costs recorded.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* WFDocu Documents Block */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FileText size={20} color="#3b82f6" /> Linked Documents (Enquiry to Suppliers)
                            </h3>
                            <Link to={`/workflows?job_id=${id}`} className="btn btn-sm btn-primary">
                                Create via Enquiry to Suppliers
                            </Link>
                        </div>
                        {v2Docs.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                {v2Docs.map(doc => (
                                    <div key={doc.id} style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: '12px', background: 'var(--surface)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <span style={{ fontWeight: 700 }}>{doc.document_no}</span>
                                            <span className="badge">{doc.document_type}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            {doc.partners?.name || 'No Customer'} {doc.amount ? `- $${doc.amount.toLocaleString()}` : ''}
                                        </div>
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                            <Link to={`/workflows/edit/${doc.id}`} className="btn btn-sm btn-outline" style={{ flex: 1, padding: '4px' }}>Edit</Link>
                                            <Link to={`/workflows/print/${doc.id}`} className="btn btn-sm btn-outline" style={{ flex: 1, padding: '4px' }}>Print</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', background: 'var(--surface)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                                <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5, margin: '0 auto' }} />
                                <p>No documents generated yet.</p>
                                <p style={{ fontSize: '0.85rem' }}>Use 'Enquiry to Suppliers' to create Quotations, Invoices, Delivery Orders, etc.</p>
                            </div>
                        )}
                    </div>

                    {/* Calibration & Service Section (Conditional) */}
                    {job.type === 'Service' && (
                        <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ padding: '8px', background: '#fdf2f8', color: '#db2777', borderRadius: '10px' }}>
                                        <ListChecks size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Calibration & Certificates</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Manage operational certificates and calibration status</p>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-sm btn-outline"
                                    style={{ gap: '8px' }}
                                    onClick={() => {
                                        // Trigger upload to sub-folder 3
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.onchange = async (e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;

                                            try {
                                                const accessToken = localStorage.getItem('google_access_token');
                                                const isValid = await validateToken(accessToken);
                                                if (!accessToken || !isValid) {
                                                    connectGoogleAPI('job_cert_upload');
                                                    return;
                                                }
                                                const projectFolderId = job.enquiries?.gdrive_folder_id || job.gdrive_folder_id;
                                                if (projectFolderId) {
                                                    const subFolderId = await createFolderStructure(accessToken, '3. Operations_DO_SR_&_Certificates', projectFolderId);
                                                    const uploadRes = await uploadFileToDrive(accessToken, file, {
                                                        folderId: subFolderId,
                                                        title: `CERT_${job.job_no}_${file.name}`,
                                                        company_id: profile.company_id,
                                                        onProgress: (p) => setUploadProgress(p)
                                                    });
                                                    setUploadLink(uploadRes.webViewLink);

                                                    // Record Certificate in workflow
                                                    try {
                                                        const docNo = await generateDocNumber(profile.company_id, 'Certificate');
                                                        await recordExternalDocument({
                                                            company_id: profile.company_id,
                                                            job_id: id,
                                                            enquiry_id: job.enquiry_id,
                                                            document_type: 'Certificate',
                                                            document_no: docNo,
                                                            subject: `Certificate: ${file.name}`,
                                                            issue_date: new Date().toISOString().split('T')[0],
                                                            status: 'Completed',
                                                            notes: uploadRes.webViewLink,
                                                            partner_id: job.enquiries?.customer_id || job.customer_id,
                                                            vessel_id: job.enquiries?.vessel_id || job.vessel_id,
                                                            work_location_id: job.enquiries?.work_location_id || job.work_location_id
                                                        });
                                                    } catch (recErr) { console.error(recErr); }
                                                    alert("Certificate uploaded successfully to Drive!");
                                                }
                                            } catch (err) {
                                                alert("Upload failed: " + err.message);
                                            } finally {
                                                // setUploadProgress(0); // Handled by onClose
                                            }
                                        };
                                        input.click();
                                    }}
                                >
                                    <Plus size={16} /> Upload Certificate
                                </button>
                            </div>
                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                Operational certificates and service reports are automatically saved to the <strong>3. Operations...</strong> folder in Google Drive.
                            </div>
                        </div>
                    )}

                    {/* Profit & Finance Footer */}
                    <div style={{ background: 'var(--surface-dark)', color: 'white', padding: '24px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '40px' }}>
                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Value</label>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${totalRevenue.toLocaleString()}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Costing</label>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${totalExpenses.toLocaleString()}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Profit</label>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: profit >= 0 ? '#4ade80' : '#f87171', marginBottom: '16px' }}>
                                ${profit.toLocaleString()}
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => handleRecordDocument('Purchase Order')}
                                    className="btn btn-sm btn-outline"
                                    style={{ gap: '8px' }}
                                >
                                    <Quote size={14} /> Gen PO
                                </button>
                                <button
                                    onClick={() => handleRecordDocument(job.type === 'Service' ? 'Service Report' : 'Delivery Order')}
                                    className="btn btn-sm btn-outline"
                                    style={{ gap: '8px' }}
                                >
                                    <Truck size={14} /> {job.type === 'Service' ? 'Gen SR' : 'Gen DO'}
                                </button>
                                <button
                                    onClick={() => handleRecordDocument('Invoice')}
                                    className="btn btn-sm"
                                    style={{ background: '#4f46e5', color: '#fff', border: 'none', gap: '8px' }}
                                >
                                    <Download size={14} /> Gen Invoice
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Sidebar: Utility & Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                        <CommunicationWall 
                            referenceType="Job" 
                            referenceId={id} 
                            folderId={job.enquiries?.gdrive_folder_id || job.gdrive_folder_id}
                            title="Job Diary & Cloud Vault"
                        />
                    </div>

                    <div className="glass-panel" style={{ padding: '20px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Payment Tracking</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Customer Payment Status</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {['Unpaid', 'Partial', 'Paid'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleUpdatePaymentStatus(status)}
                                            style={{
                                                padding: '6px 16px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                border: '1px solid',
                                                borderColor: job.payment_status === status ? 'transparent' : 'var(--border-color)',
                                                background: job.payment_status === status ?
                                                    (status === 'Paid' ? '#10b981' : (status === 'Partial' ? '#f59e0b' : '#ef4444')) : 'transparent',
                                                color: job.payment_status === status ? '#fff' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#fdf2f2', border: '1px solid #fee2e2', padding: '20px', borderRadius: '16px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={14} /> Critical Action
                        </h4>
                        <button onClick={() => window.confirm('Delete job?') && deleteJob(id)} className="btn btn-sm btn-danger" style={{ width: '100%', marginTop: '12px' }}>Delete Job Record</button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showEdit && <EditJobModal job={job} onClose={() => setShowEdit(false)} onSave={() => fetchData()} />}

            {showExpenseForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <h3>Add Job Cost</h3>
                        <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Supplier Name</label>
                                <input placeholder="e.g. Maersk, Vendor A" value={newExpense.supplier_name} onChange={e => setNewExpense({ ...newExpense, supplier_name: e.target.value })} required className="form-input" />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Description</label>
                                <input placeholder="Service fee, Hardware parts, etc" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} className="form-input" />
                            </div>
                            <div className="form-group">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Order Value / Cost Amount</label>
                                <input type="number" step="0.01" placeholder="0.00" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} required className="form-input" />
                            </div>
                            <DriveScannerLinker 
                                label="Supplier Bill Attachment (Optional)"
                                selectedLink={newExpense.driveLink}
                                onClear={() => setNewExpense({...newExpense, driveLink: null, billFile: null})}
                                onLinkSelected={(link, name, rawFile) => {
                                    setNewExpense({...newExpense, driveLink: link, billFile: rawFile || null});
                                }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" onClick={() => setShowExpenseForm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Cost</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Standardized Upload Overlay */}
            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Uploading to Drive..."
                locationLink={uploadLink}
                onClose={() => {
                    setUploadProgress(0);
                    setUploadLink(null);
                }}
            />
        </div>
    );
}

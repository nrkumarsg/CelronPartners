import { provisionPartnerStructure, uploadFileToDrive, makeFilePublic } from '../../lib/driveService';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
    Search, Printer, Send, Filter, Calendar, 
    ChevronRight, ArrowLeft, Download, Loader2,
    Building2, FileText, CreditCard, AlertCircle, Save, CornerDownRight, Edit2, Trash2,
    Mail, MessageSquare, X, ChevronDown, Plus, ExternalLink
} from 'lucide-react';
import RichTextEditor from '../../components/common/RichTextEditor';
import { WhatsAppShareModal } from '../../components/workflow/WhatsAppShareModal';
import { getStoredToken } from '../../lib/googleAuthService';
import { useAuth } from '../../contexts/AuthContext';
import { getStatementData, saveWorkflowDocument, deleteWorkflowDocument } from '../../lib/workflowV2Service';
import { getPartners, getDocumentSettings } from '../../lib/store';
// import html2pdf from 'html2pdf.js';

export default function StatementOfAccount() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState([]);
    const [selectedPartner, setSelectedPartner] = useState('');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [statementData, setStatementData] = useState(null);
    const [hideSettled, setHideSettled] = useState(false);
    const [openingBalanceModal, setOpeningBalanceModal] = useState({ isOpen: false, items: [] });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, prefill: null });
    const [settings, setSettings] = useState(null);
    const [companyAging, setCompanyAging] = useState([]);
    const [overallLoading, setOverallLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [logoBase64, setLogoBase64] = useState('');
    const printRef = useRef();
    const printSummaryRef = useRef();

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const toBase64 = url => fetch(url, { mode: 'cors' })
        .then(response => response.blob())
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }));

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { getContacts } = await import('../../lib/store');
        const [pRes, sRes, cRes] = await Promise.all([
            getPartners(),
            getDocumentSettings(profile?.company_id),
            getContacts()
        ]);
        
        if (pRes) setPartners(pRes);
        if (sRes) {
            setSettings(sRes);
            if (sRes.logo_url) {
                toBase64(sRes.logo_url).then(setLogoBase64).catch(console.error);
            }
        }
        if (cRes) setContacts(cRes);
        fetchOverallSummary();
    };

    const fetchOverallSummary = async () => {
        if (!profile?.company_id) return;
        setOverallLoading(true);
        try {
            const { data } = await getStatementData(profile.company_id, null, null, new Date().toISOString().split('T')[0]);
            
            if (data) {
                // Deduplication logic: If Tax Invoice exists for a job/enquiry, hide Proforma
                const taxInvoicedKeys = new Set();
                data.forEach(d => {
                    if (d.document_type === 'Tax Invoice') {
                        if (d.assigned_job_no) taxInvoicedKeys.add(`job:${d.assigned_job_no}`);
                        if (d.enquiry_id) taxInvoicedKeys.add(`enq:${d.enquiry_id}`);
                    }
                });

                const filteredData = data.filter(doc => {
                    if (doc.document_type === 'Proforma Invoice') {
                        if (doc.assigned_job_no && taxInvoicedKeys.has(`job:${doc.assigned_job_no}`)) return false;
                        if (doc.enquiry_id && taxInvoicedKeys.has(`enq:${doc.enquiry_id}`)) return false;
                    }
                    return true;
                });

                const groups = {};
                const today = new Date();
                
                filteredData.forEach(doc => {
                    const pid = doc.partner_id;
                    if (!pid) return;

                    if (!groups[pid]) {
                        groups[pid] = { 
                            id: pid,
                            name: doc.partners?.name || 'Unknown', 
                            outstanding: 0, 
                            total_invoiced: 0, 
                            total_paid: 0,
                            last_date: doc.issue_date,
                            aging: {
                                current: 0,
                                thirty: 0,
                                sixty: 0,
                                ninety: 0,
                                overNinety: 0
                            }
                        };
                    }
                    
                    const amount = parseFloat(doc.total_amount) || 0;
                    const issueDate = new Date(doc.issue_date);
                    const diffDays = Math.floor((today - issueDate) / (1000 * 60 * 60 * 24));

                    if ((doc.document_type || '').includes('Invoice')) {
                        groups[pid].outstanding += amount;
                        groups[pid].total_invoiced += amount;
                        
                        // Age the invoice
                        if (diffDays <= 0) groups[pid].aging.current += amount;
                        else if (diffDays <= 30) groups[pid].aging.thirty += amount;
                        else if (diffDays <= 60) groups[pid].aging.sixty += amount;
                        else if (diffDays <= 90) groups[pid].aging.ninety += amount;
                        else groups[pid].aging.overNinety += amount;
                        
                    } else if (doc.document_type === 'Payment Received') {
                        groups[pid].outstanding -= amount;
                        groups[pid].total_paid += amount;
                        
                        // Deduct from oldest buckets first (simplified FIFO aging)
                        let remaining = amount;
                        const buckets = ['overNinety', 'ninety', 'sixty', 'thirty', 'current'];
                        for (const bucket of buckets) {
                            if (remaining <= 0) break;
                            const toDeduct = Math.min(remaining, groups[pid].aging[bucket]);
                            groups[pid].aging[bucket] -= toDeduct;
                            remaining -= toDeduct;
                        }
                        // If still remaining, deduct from current (negative aging)
                        if (remaining > 0) groups[pid].aging.current -= remaining;
                    }
                    
                    if (new Date(doc.issue_date) > new Date(groups[pid].last_date)) {
                        groups[pid].last_date = doc.issue_date;
                    }
                });

                const summary = Object.values(groups)
                    .filter(g => Math.abs(g.outstanding) > 0.01)
                    .sort((a, b) => b.outstanding - a.outstanding);
                
                setCompanyAging(summary);
            }
        } catch (err) {
            console.error('Overall summary failed:', err);
        } finally {
            setOverallLoading(false);
        }
    };

    const handleGenerate = async (partnerOverride = null) => {
        const partnerId = partnerOverride || selectedPartner;
        if (!partnerId) {
            alert('Please select a customer first.');
            return;
        }
        setLoading(true);
        try {
            const { data, partner, error: fetchErr } = await getStatementData(
                profile?.company_id, 
                partnerId, 
                dateRange.start, 
                dateRange.end
            );

            if (fetchErr || !data) {
                console.error('Fetch error:', fetchErr);
                setStatementData(null);
                setLoading(false);
                return;
            }

            // Deduplication logic: If Tax Invoice exists for a job/enquiry, hide Proforma
            const taxInvoicedKeys = new Set();
            data.forEach(d => {
                if (d.document_type === 'Tax Invoice') {
                    if (d.assigned_job_no) taxInvoicedKeys.add(`job:${d.assigned_job_no}`);
                    if (d.enquiry_id) taxInvoicedKeys.add(`enq:${d.enquiry_id}`);
                }
            });

            const filteredData = data.filter(doc => {
                if (doc.document_type === 'Proforma Invoice') {
                    if (doc.assigned_job_no && taxInvoicedKeys.has(`job:${doc.assigned_job_no}`)) return false;
                    if (doc.enquiry_id && taxInvoicedKeys.has(`enq:${doc.enquiry_id}`)) return false;
                }
                return true;
            });

            let openingBalance = 0;
            const openingBalanceItems = [];
            const relatedPayments = new Map(); // invoice_id -> [payments]
            const unallocatedLedger = [];

            filteredData.forEach(doc => {
                const docType = doc.document_type || '';
                const isInvoice = docType.includes('Invoice');
                const isPayment = docType === 'Payment Received';
                const amount = parseFloat(doc.total_amount) || 0;

                let relId = null;
                if (isPayment && doc.internal_notes) {
                    try {
                        const notes = JSON.parse(doc.internal_notes);
                        relId = notes.related_document_id;
                    } catch {}
                }

                const docWithAmounts = {
                    ...doc,
                    debit: isInvoice ? amount : 0,
                    credit: isPayment ? amount : 0
                };
                
                if (new Date(doc.issue_date) < new Date(dateRange.start)) {
                    if (isInvoice) openingBalance += amount;
                    if (isPayment) openingBalance -= amount;
                    openingBalanceItems.push(docWithAmounts);
                } else {
                    if (isPayment && relId) {
                        if (!relatedPayments.has(relId)) relatedPayments.set(relId, []);
                        relatedPayments.get(relId).push(docWithAmounts);
                    } else {
                        unallocatedLedger.push(docWithAmounts);
                    }
                }
            });

            // Reconstruct ledger: insert related payments after their invoices
            const ledger = [];
            unallocatedLedger.forEach(doc => {
                const docPayments = relatedPayments.get(doc.id) || [];
                const paymentsSum = docPayments.reduce((sum, p) => sum + p.credit, 0);
                const isInvoice = (doc.document_type || '').includes('Invoice');
                const isSettled = isInvoice && Math.abs(doc.debit - paymentsSum) < 0.01;
                
                const mainDoc = { ...doc, isSettled, groupId: doc.id, outstanding: (doc.debit || 0) - paymentsSum };
                ledger.push(mainDoc);
                
                docPayments.forEach(p => {
                    ledger.push({ ...p, isSettled, groupId: doc.id });
                });
                relatedPayments.delete(doc.id);
            });

            // Add remaining payments (e.g. those related to opening balance invoices)
            const remaining = Array.from(relatedPayments.values()).flat().sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date));
            ledger.push(...remaining.map(p => {
                // If it's a payment, we should check if it's "settled" against opening balance
                // For simplicity, we mark it settled if its credit is matched by SOME opening balance invoice
                // But generally, remaining payments should be visible if they are within the period.
                return { ...p, isSettled: false };
            }));

            // Final pass to ensure that if a payment is linked to an invoice, they share the SAME isSettled status
            // This fixes the issue where a payment might still be visible when hideSettled is ON
            const groupSettledStatus = new Map();
            ledger.forEach(l => {
                if (l.groupId && l.isSettled) groupSettledStatus.set(l.groupId, true);
            });
            
            const finalLedger = ledger.map(l => ({
                ...l,
                isSettled: l.groupId ? (groupSettledStatus.get(l.groupId) || l.isSettled) : l.isSettled
            }));

            // Calculate Aging with FIFO Reconciliation (applying total payments to oldest invoices)
            const aging = { current: 0, thirty: 0, sixty: 0, ninety: 0 };
            const today = new Date();
            
            // Get all invoices for THIS partner (sorted by date ascending for FIFO)
            const allInvoices = data.filter(d => (d.document_type || '').includes('Invoice'))
                .sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date));
            
            // Total payments received (Credit)
            let unallocatedCredit = data.filter(d => d.document_type === 'Payment Received')
                .reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
            
            allInvoices.forEach(inv => {
                const amount = parseFloat(inv.total_amount) || 0;
                let outstanding = amount;
                
                // Apply credit to the oldest invoices first
                if (unallocatedCredit >= outstanding) {
                    unallocatedCredit -= outstanding;
                    outstanding = 0;
                } else {
                    outstanding -= unallocatedCredit;
                    unallocatedCredit = 0;
                }
                
                // Only count outstanding amounts in aging buckets
                if (outstanding > 0.01) {
                    const creditDays = parseInt(partner?.customerCreditTime) || 0;
                    const dueDate = new Date(inv.issue_date);
                    dueDate.setDate(dueDate.getDate() + creditDays);
                    
                    const diffDaysFromDue = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
                    
                    if (diffDaysFromDue <= 0) aging.current += outstanding;
                    else if (diffDaysFromDue <= 30) aging.thirty += outstanding;
                    else if (diffDaysFromDue <= 60) aging.sixty += outstanding;
                    else aging.ninety += outstanding;
                }
            });

            setStatementData({
                ledger: finalLedger,
                openingBalance,
                openingBalanceItems,
                closingBalance: openingBalance + finalLedger.reduce((acc, d) => acc + (d.debit - d.credit), 0),
                partner: partners.find(p => p.id === partnerId) || partner,
                aging
            });
        } catch (err) {
            console.error('Failed to generate statement:', err);
            alert('Failed to generate statement.');
} finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        const isSummary = !statementData;
        const element = isSummary ? printSummaryRef.current : printRef.current;
        if (!element) return;
        
        const { default: html2pdf } = await import('html2pdf.js');
        const opt = {
            margin: isSummary ? [10, 10, 10, 10] : 1,
            filename: isSummary ? `Aging_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf` : `Statement_${statementData?.partner?.name || 'Customer'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: isSummary ? 'landscape' : 'portrait' }
        };
        
        await html2pdf().from(element).set(opt).save();
    };
    
    const handlePrintSummary = async () => {
        const element = printSummaryRef.current;
        if (!element) {
            alert('Print summary element not found.');
            return;
        }
        
        try {
            const { default: html2pdf } = await import('html2pdf.js');
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Aging_Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };
            
            await html2pdf().from(element).set(opt).save();
        } catch (err) {
            console.error('PDF Generation Error:', err);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    const handleDeleteDocument = async (id, docNo) => {
        if (!window.confirm(`Are you sure you want to delete ${docNo}? This action cannot be undone.`)) return;
        try {
            const { error } = await deleteWorkflowDocument(id);
            if (error) throw error;
            handleGenerate(); // Refresh
        } catch (err) {
            console.error('Delete Error:', err);
            toast.error(`Failed to delete: ${err.message}`);
        }
    };

    const handleQuickPaymentSuccess = () => {
        setPaymentModal({ isOpen: false, prefill: null });
        handleGenerate();
    };

    const handleShareFile = async (type = 'whatsapp', message = '', recipient = '', cc = '', bcc = '', subjectOverride = '') => {
        setLoading(true);
        try {
            const token = await getStoredToken();
            if (!token) {
                toast.error('Google Drive connection required. Please connect via Corporate Vault > Connect Google.');
                setLoading(false);
                return;
            }

            const element = printRef.current;
            if (!element) return;
            
            const { default: html2pdf } = await import('html2pdf.js');
            const opt = {
                margin: 1,
                filename: `Statement_${statementData.partner?.name}_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 1.5, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
            
            // Upload to Drive
            const uploadRes = await uploadFileToDrive(token, pdfBlob, { 
                title: opt.filename, 
                mimeType: 'application/pdf' 
            });

            if (uploadRes?.id) {
                await makeFilePublic(token, uploadRes.id);
                const link = uploadRes.webViewLink || `https://drive.google.com/file/d/${uploadRes.id}/view`;
                
                if (type === 'whatsapp') {
                    const text = `${message}\n\nView Statement: ${link}`;
                    const waUrl = recipient ? `https://wa.me/${recipient}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(waUrl, '_blank');
                } else {
                    const subject = subjectOverride || `Statement of Account - ${statementData.partner?.name}`;
                    const body = `${message}\n\nView/Download Statement: ${link}`;
                    let mailtoUrl = `mailto:${recipient || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    if (cc) mailtoUrl += `&cc=${encodeURIComponent(cc)}`;
                    if (bcc) mailtoUrl += `&bcc=${encodeURIComponent(bcc)}`;
                    window.location.href = mailtoUrl;
                }
            }
        } catch (err) {
            console.error('File sharing failed:', err);
            toast.error('Failed to share file: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!statementData) return toast.error('Please generate a statement first.');
        setLoading(true);
        try {
            const token = await getStoredToken();
            if (!token) {
                toast.error('Google Drive connection required. Please connect via Corporate Vault > Connect Google.');
                setLoading(false);
                return;
            }

            const element = printRef.current;
            if (!element) return;

            const { default: html2pdf } = await import('html2pdf.js');
            const opt = {
                margin: 1,
                filename: `SOA_${statementData.partner?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}_SGD_${statementData.closingBalance.toFixed(0)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
            const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

            // Create structured path: Financial Archive/Statements/[Customer Name]/[Year]
            const year = new Date().getFullYear().toString();
            const archivePath = `Financial Archive/Statements/${statementData.partner?.name}/${year}`;
            
            const { createFolderStructure } = await import('../../lib/driveService');
            const folderId = await createFolderStructure(token, archivePath);

            const uploadRes = await uploadFileToDrive(token, file, { folderId });

            if (uploadRes?.id) {
                toast.success(`Statement Archived!\nFolder: ${archivePath}`);
            }
        } catch (err) {
            console.error('Archive failed:', err);
            alert('Archive Failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewArchives = async () => {
        if (!statementData) return toast.error('Please select a customer first.');
        setLoading(true);
        try {
            const token = await getStoredToken();
            if (!token) {
                toast.error('Google Drive connection required. Please connect via Corporate Vault > Connect Google.');
                setLoading(false);
                return;
            }

            const archivePath = `Financial Archive/Statements/${statementData.partner?.name}`;
            const { createFolderStructure } = await import('../../lib/driveService');
            const folderId = await createFolderStructure(token, archivePath);
            
            if (folderId) {
                window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
            }
        } catch (err) {
            console.error('View Archive failed:', err);
            alert('Failed to open archive folder: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEmail = () => {
        if (!statementData) return toast.error('Please generate a statement first.');
        const defaultMsg = `Dear ${statementData.partner?.name || 'Accounts Team'},\n\nPlease find the Statement of Account (SOA-${new Date().toISOString().split('T')[0]}) for your review and reference.\n\nAwaiting for your valuable payment.\n\nTotal Due: SGD ${statementData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.\n\nKind Regards,\nANITHA (Ms)\nCELRON ENTERPRISES PTE LTD\n10, Jln, Besar, "Sim Lim Tower", #03-05, Singapore 208787\nEmail: accounts@celron.net | Tel: +6581962270\nweb: www.celron.net / www.celron.shop`;
        handleShareFile('email', defaultMsg);
    };

    const handleWhatsApp = () => {
        if (!statementData) return toast.error('Please generate a statement first.');
        setShowWhatsAppModal(true);
    };

    return (
        <div className="workflow-editor-theme" style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <header className="editor-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="icon-btn" onClick={() => navigate('/workflows')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                            Financial Module
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Statement Of Account</h1>
                            {statementData && (
                                <div style={{ 
                                    background: '#1e3a8a', 
                                    color: 'white', 
                                    padding: '4px 16px', 
                                    borderRadius: '20px', 
                                    fontSize: '1rem', 
                                    fontWeight: 800,
                                    boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <CreditCard size={16} />
                                    SGD {statementData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            )}
                            {!statementData && companyAging.length > 0 && (
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                                    color: 'white', 
                                    padding: '4px 16px', 
                                    borderRadius: '20px', 
                                    fontSize: '1rem', 
                                    fontWeight: 800,
                                    boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <Building2 size={16} />
                                    Total: SGD {companyAging.reduce((sum, item) => sum + (item.outstanding || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-vibrant-secondary" onClick={() => setPaymentModal({ isOpen: true, prefill: { partner_id: selectedPartner } })}>
                        <CreditCard size={18} /> Record Payment
                    </button>
                    <button className="btn-vibrant-secondary" onClick={handleArchive} disabled={loading}>
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                        {loading ? ' Archiving...' : ' Save to Archive'}
                    </button>
                    <button className="btn-vibrant-secondary" onClick={handleViewArchives} title="Open Google Drive Archive">
                        <ExternalLink size={18} /> View Archives
                    </button>
                    <button className="btn-vibrant-secondary" onClick={handlePrint}>
                        <Printer size={18} /> Print PDF
                    </button>
                    <button className="btn-vibrant-secondary" onClick={() => setShowEmailModal(true)}>
                        <Mail size={18} /> Send by Email
                    </button>
                    <button className="btn-vibrant-secondary" style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => setShowWhatsAppModal(true)}>
                        <MessageSquare size={18} /> Share via WhatsApp
                    </button>
                    <button className="icon-btn" onClick={() => navigate('/workflows')}>
                        <X size={20} />
                    </button>
                </div>
            </header>

            <div className="main-content" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ background: 'var(--accent)', color: 'white', padding: '8px', borderRadius: '10px' }}>
                            <Filter size={20} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Statement Filters</h2>
                    </div>

                    <div className="input-grid" style={{ gridTemplateColumns: '1.5fr 1fr 1fr auto auto auto', alignItems: 'flex-end', gap: '16px' }}>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Select Customer</label>
                            <select 
                                className="form-select"
                                value={selectedPartner}
                                onChange={(e) => setSelectedPartner(e.target.value)}
                                style={{ height: '48px', fontSize: '1rem' }}
                            >
                                <option value="">-- Choose Customer --</option>
                                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="form-item" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Start Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    style={{ height: '48px', paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <div className="form-item" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>End Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    style={{ height: '48px', paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <button 
                            className="btn-vibrant" 
                            onClick={() => handleGenerate()} 
                            disabled={loading || !selectedPartner}
                            style={{ height: '48px', padding: '0 24px', minWidth: '140px' }}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Generate'}
                        </button>

                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            background: '#f0fdf4', 
                            padding: '0 16px', 
                            borderRadius: '12px', 
                            border: '1px solid #bbf7d0',
                            height: '48px'
                        }}>
                            <div 
                                onClick={() => setHideSettled(!hideSettled)}
                                style={{ 
                                    width: '44px', 
                                    height: '24px', 
                                    background: hideSettled ? '#10b981' : '#cbd5e1', 
                                    borderRadius: '12px', 
                                    position: 'relative', 
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <div style={{ 
                                    width: '18px', 
                                    height: '18px', 
                                    background: 'white', 
                                    borderRadius: '50%', 
                                    position: 'absolute', 
                                    top: '3px', 
                                    left: hideSettled ? '23px' : '3px',
                                    transition: 'all 0.3s'
                                }} />
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#166534' }}>Hide Settled</span>
                        </div>

                        <button 
                            className="btn-vibrant-secondary" 
                            onClick={() => { 
                                setSelectedPartner(''); 
                                setStatementData(null); 
                                setDateRange({
                                    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                                    end: new Date().toISOString().split('T')[0]
                                });
                            }}
                            style={{ height: '48px', padding: '0 20px' }}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {statementData ? (
                    <>
                        <div className="animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                        {[
                            { label: 'Current', value: statementData?.aging.current || 0, color: '#10b981', gradient: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', text: '#166534' },
                            { label: '31 - 60 Days', value: statementData?.aging.thirty || 0, color: '#f59e0b', gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', text: '#92400e' },
                            { label: '61 - 90 Days', value: statementData?.aging.sixty || 0, color: '#ea580c', gradient: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)', text: '#9a3412' },
                            { label: '90+ Days Due', value: statementData?.aging.ninety || 0, color: '#ef4444', gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', text: '#b91c1c' }
                        ].map((bucket, i) => (
                            <div key={i} style={{ 
                                background: bucket.gradient, 
                                padding: '24px', 
                                borderRadius: '16px', 
                                border: `1px solid ${bucket.color}40`,
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '4px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                            }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: bucket.text, textTransform: 'uppercase', opacity: 0.8 }}>{bucket.label}</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: bucket.text }}>
                                    SGD {bucket.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Transaction Ledger</h2>
                            {statementData && (
                                <div style={{ display: 'flex', gap: '24px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Period Balance</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent)' }}>
                                            SGD {statementData.ledger.reduce((acc, d) => acc + (d.debit - d.credit), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Statement Total</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                            SGD {statementData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#fff', borderBottom: '2px solid #f1f5f9' }}>
                                        <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Date</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Document / Subject</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Reference</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Vessel / Workplace</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'right', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Debit</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'right', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Credit</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'right', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Balance</th>
                                        <th style={{ padding: '16px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statementData && statementData.openingBalance !== 0 && (
                                        <tr style={{ background: '#f0f9ff' }}>
                                            <td style={{ padding: '12px 20px', color: '#0369a1', fontWeight: 700 }} colSpan={6}>OPENING BALANCE</td>
                                            <td style={{ padding: '12px 20px', textAlign: 'right', color: '#0369a1', fontWeight: 800 }}>{statementData.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td></td>
                                        </tr>
                                    )}
                                    {statementData && statementData.ledger.map((doc, idx) => {
                                        if (hideSettled && doc.isSettled) return null;
                                        
                                        const running = statementData.openingBalance + statementData.ledger.slice(0, idx + 1).reduce((acc, d) => acc + (d.debit - d.credit), 0);
                                        
                                        return (
                                            <tr key={doc.id} className="table-row" style={{ borderBottom: '1px solid #f1f5f9', opacity: doc.isSettled ? 0.6 : 1 }}>
                                                <td style={{ padding: '16px 20px' }}>{formatDate(doc.issue_date)}</td>
                                                <td style={{ padding: '16px 20px', fontFamily: "'Inter', sans-serif" }}>
                                                    <div style={{ color: '#1e293b' }}>{doc.document_no}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.document_type} {doc.subject ? `- ${doc.subject}` : ''}</div>
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#475569', fontFamily: "'Inter', sans-serif" }}>
                                                    {doc.order_reference || doc.assigned_job_no || doc.customer_po_no || '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: '#64748b', fontFamily: "'Inter', sans-serif" }}>
                                                    {doc.vessels?.vessel_name || doc.work_locations?.location_name || doc.vessel_name || doc.work_location || '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right', color: '#ef4444', fontFamily: "'Inter', sans-serif" }}>
                                                    {doc.debit > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                            <span>{doc.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                            {doc.outstanding !== undefined && doc.outstanding !== doc.debit && (
                                                                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px', fontWeight: 700 }}>
                                                                    BAL: SGD {doc.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right', color: '#10b981', fontFamily: "'Inter', sans-serif" }}>
                                                    {doc.credit > 0 ? doc.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontFamily: "'Inter', sans-serif" }}>
                                                    {running.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        {doc.debit > 0 && !doc.isSettled && (
                                                            <button 
                                                                className="btn-vibrant-secondary" 
                                                                onClick={() => setPaymentModal({ 
                                                                    isOpen: true, 
                                                                    prefill: { 
                                                                        partner_id: statementData.partner.id, 
                                                                        amount: doc.outstanding !== undefined ? doc.outstanding : doc.debit, 
                                                                        related_document_id: doc.id, 
                                                                        document_no: doc.document_no 
                                                                    } 
                                                                })} 
                                                                style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }} 
                                                                title="Record Payment"
                                                            >
                                                                <CreditCard size={12} /> Payment Entry
                                                            </button>
                                                        )}
                                                        <button className="icon-btn" onClick={() => navigate(`/workflows/editor/${(doc.document_type || 'Tax Invoice').toLowerCase().replace(/ /g, '-')}/${doc.id}`)} title="Edit">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button className="icon-btn" onClick={() => handleDeleteDocument(doc.id, doc.document_no)} style={{ color: '#ef4444' }} title="Delete">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {statementData && (
                            <div style={{ 
                                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', 
                                color: 'white', 
                                padding: '24px 32px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                borderTop: '1px solid rgba(255,255,255,0.1)',
                                position: 'relative',
                                zIndex: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px' }}>
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Outstanding</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Statement Balance</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                                        <span style={{ fontSize: '1.25rem', marginRight: '8px', opacity: 0.9 }}>SGD</span>
                                        {statementData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Statement Internal Notes */}
                    <div className="glass-panel" style={{ marginTop: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText size={20} className="text-accent" />
                                <h3 style={{ margin: 0 }}>Statement Internal Notes</h3>
                            </div>
                            <button className="btn-vibrant" onClick={() => alert('Notes updated successfully.')}>
                                <Save size={16} /> Update Notes
                            </button>
                        </div>
                        <RichTextEditor 
                            value={statementData.notes || ''} 
                            onChange={(val) => setStatementData({ ...statementData, notes: val })}
                            placeholder="Add reconciliation notes, special instructions, or payment agreements..."
                            height="300px"
                        />
                    </div>
                </div>
            </>
                ) : companyAging.length > 0 ? (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Company-Wide Aging Summary Report</h2>
                                <p style={{ color: '#64748b' }}>Overview of all customers with detailed aging buckets (Current to 91+ Days).</p>
                            </div>
                            <button 
                                className="btn-vibrant" 
                                onClick={() => handlePrintSummary()}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Printer size={18} /> Print Summary Report
                            </button>
                        </div>
                        
                        <div className="table-container" style={{ background: 'white' }}>
                            <table>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                         <th>Customer Name</th>
                                         <th style={{ textAlign: 'right' }}>Current</th>
                                         <th style={{ textAlign: 'right' }}>1-30 Days</th>
                                         <th style={{ textAlign: 'right' }}>31-60 Days</th>
                                         <th style={{ textAlign: 'right' }}>61-90 Days</th>
                                         <th style={{ textAlign: 'right' }}>91+ Days</th>
                                         <th style={{ textAlign: 'right' }}>Total Due</th>
                                         <th style={{ textAlign: 'right' }}>Action</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {companyAging.map(item => (
                                         <tr key={item.id} className="table-row">
                                             <td 
                                                 style={{ fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}
                                                 onClick={() => setSelectedPartner(item.id)}
                                             >
                                                 {item.name}
                                             </td>
                                             <td style={{ textAlign: 'right' }}>{(item.aging.current || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                             <td style={{ textAlign: 'right' }}>{(item.aging.thirty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                             <td style={{ textAlign: 'right' }}>{(item.aging.sixty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                             <td style={{ textAlign: 'right' }}>{(item.aging.ninety || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                             <td style={{ textAlign: 'right', color: item.aging.overNinety > 0 ? '#ef4444' : 'inherit' }}>{(item.aging.overNinety || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                             <td style={{ textAlign: 'right', fontWeight: 700, color: (item.outstanding || 0) > 0 ? '#1e3a8a' : '#10b981' }}>
                                                 SGD {(item.outstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                             </td>
                                             <td style={{ textAlign: 'right' }}>
                                                 <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                     <button 
                                                         className="btn-vibrant-secondary"
                                                         style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                                                         onClick={() => {
                                                             setSelectedPartner(item.id);
                                                             handleGenerate(item.id);
                                                         }}
                                                     >
                                                         SOA
                                                     </button>
                                                     <button 
                                                         className="btn-primary"
                                                         style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px' }}
                                                         onClick={() => setPaymentModal({ isOpen: true, prefill: { partner_id: item.id } })}
                                                     >
                                                         <CreditCard size={14} /> Payment Entry
                                                     </button>
                                                 </div>
                                             </td>
                                         </tr>
                                     ))}
                                     {/* Totals Row */}
                                     <tr style={{ background: '#f1f5f9', fontWeight: 900 }}>
                                         <td>TOTAL</td>
                                         <td style={{ textAlign: 'right' }}>SGD {companyAging.reduce((acc, it) => acc + it.aging.current, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                         <td style={{ textAlign: 'right' }}>SGD {companyAging.reduce((acc, it) => acc + it.aging.thirty, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                         <td style={{ textAlign: 'right' }}>SGD {companyAging.reduce((acc, it) => acc + it.aging.sixty, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                         <td style={{ textAlign: 'right' }}>SGD {companyAging.reduce((acc, it) => acc + it.aging.ninety, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                         <td style={{ textAlign: 'right' }}>SGD {companyAging.reduce((acc, it) => acc + it.aging.overNinety, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                         <td style={{ textAlign: 'right', color: '#1e3a8a' }}>SGD {companyAging.reduce((acc, it) => acc + it.outstanding, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                         <td></td>
                                     </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <Filter size={32} color="#3b82f6" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '12px' }}>Customer Financial Dashboard</h2>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 24px' }}>Select a customer from the top filters to generate a detailed Statement of Account, view aging history, and record payments.</p>
                    </div>
                )}
            </div>


            {/* Hidden Print Content - Off-screen for PDF capture */}
            <div style={{ position: 'absolute', top: 0, left: '-10000px', pointerEvents: 'none', width: '850px', zIndex: -100 }}>
                <div ref={printRef} style={{ background: 'white', padding: '5mm' }}>
                    <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;700&display=swap');
                    `}</style>
                    {statementData && (
                        <div style={{ background: 'white', color: '#000', fontFamily: "'Roboto Condensed', sans-serif" }}>
                            {/* Celron Letterhead */}
                            {/* ERP Style Letterhead - Condensed */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    {logoBase64 && <img src={logoBase64} alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />}
                                    <div>
                                        <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Statement of Account</h1>
                                        <p style={{ margin: '2px 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Period: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a' }}>{profile?.company_name || 'CEL-RON ENTERPRISES PTE LTD'}</h2>
                                    <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '4px', lineHeight: 1.3 }}>
                                        <div>{settings?.address || '10, Jln, Besar, "Sim Lim Tower", #03-05, Singapore 208787'}</div>
                                        <div>Tel: {settings?.phone || '+6581962270'} | Email: {settings?.email || 'accounts@celron.net'} | www.celron.net</div>
                                    </div>
                                </div>
                            </div>

                            {/* Info & Balance Cards - Compact */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Statement To</div>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>{statementData.partner?.name}</h3>
                                    <div style={{ marginTop: '6px', color: '#475569', fontSize: '0.65rem', lineHeight: 1.4 }}>
                                        <div style={{ whiteSpace: 'pre-line' }}>
                                            {statementData.partner?.address}
                                            {(statementData.partner?.city || statementData.partner?.pincode || statementData.partner?.country) && (
                                                <div>
                                                    {[
                                                        statementData.partner?.city,
                                                        statementData.partner?.country,
                                                        statementData.partner?.pincode
                                                    ].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ marginTop: '4px' }}>
                                            {(statementData.partner?.phone1 || statementData.partner?.phone) && (
                                                <div>Tel: {statementData.partner.phone1 || statementData.partner.phone}</div>
                                            )}
                                            {(statementData.partner?.email1 || statementData.partner?.email) && (
                                                <div style={{ fontWeight: 600 }}>{statementData.partner.email1 || statementData.partner.email}</div>
                                            )}
                                            {statementData.partner?.weblink && (
                                                <div style={{ color: '#1e3a8a', fontSize: '0.6rem' }}>{statementData.partner.weblink}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-12px' }}>
                                            <div style={{ fontSize: '0.6rem', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, color: '#1e3a8a' }}>
                                                TERMS: {statementData.partner?.customerCreditTime && statementData.partner.customerCreditTime !== '0' ? `${statementData.partner.customerCreditTime} DAYS` : 'C.O.D'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: '260px', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', padding: '12px', borderRadius: '10px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 10px rgba(30, 58, 138, 0.15)', textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Outstanding Balance</div>
                                    <div style={{ fontSize: '2.1rem', fontWeight: 900, marginTop: '2px' }}>
                                        <span style={{ fontSize: '0.9rem', opacity: 0.9, marginRight: '4px' }}>SGD</span>
                                        {statementData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '0.55rem', marginTop: '8px', color: 'rgba(255,255,255,0.6)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
                                        As of {formatDate(dateRange.end)}
                                    </div>
                                </div>
                            </div>

                            {/* ERP Premium Table - Industrial-Fit Layout */}
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '-0.01em' }}>
                                <thead>
                                    <tr style={{ background: '#1e3a8a', color: 'white' }}>
                                        <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 800, borderRight: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', width: '9%' }}>DATE</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 800, borderRight: '1px solid rgba(255,255,255,0.1)', width: '20%' }}>DOCUMENT / TYPE</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 800, borderRight: '1px solid rgba(255,255,255,0.1)', width: '18%' }}>REFERENCE (CUST PO)</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 800, borderRight: '1px solid rgba(255,255,255,0.1)', width: '24%' }}>VESSEL / WORKPLACE</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', width: '10%' }}>AMOUNT</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 800, borderRight: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', width: '9%' }}>AGING</th>
                                        <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap', width: '10%' }}>BALANCE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <td style={{ padding: '12px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, color: '#64748b', fontSize: '11px' }}>-</td>
                                        <td style={{ padding: '12px 6px', borderBottom: '1px solid #e2e8f0', fontWeight: 900, color: '#1e3a8a', fontSize: '11px' }} colSpan={5}>OPENING BALANCE</td>
                                        <td style={{ padding: '12px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 900, color: '#1e3a8a', whiteSpace: 'nowrap', fontSize: '11px' }}>{statementData.openingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    {statementData.ledger.map((row, idx) => {
                                        // Calculate running balance for the print template
                                        let runningBalance = statementData.openingBalance;
                                        for (let i = 0; i <= idx; i++) {
                                            const r = statementData.ledger[i];
                                            runningBalance += (r.debit - r.credit);
                                        }

                                        return (
                                            <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', whiteSpace: 'nowrap', color: '#64748b' }}>
                                                    {formatDate(row.issue_date)}
                                                </td>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                                                    <div style={{ color: '#1e293b' }}>{row.document_no}</div>
                                                    <div style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '1px' }}>{row.document_type}</div>
                                                </td>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', color: '#475569', whiteSpace: 'nowrap' }}>{row.customer_po_no || row.order_reference || row.assigned_job_no || '-'}</td>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', color: '#475569', wordBreak: 'break-word', lineHeight: 1.2 }}>{row.vessels?.vessel_name || row.work_locations?.location_name || row.vessel_name || row.work_location || '-'}</td>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', color: row.debit > 0 ? '#e11d48' : '#059669', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                                    {row.debit > 0 ? (
                                                        <div>
                                                            <div>{row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                            {row.outstanding !== undefined && row.outstanding !== row.debit && (
                                                                <div style={{ fontSize: '7px', color: '#64748b', marginTop: '1px' }}>
                                                                    BAL: SGD {row.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : `(${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })})`}
                                                </td>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#64748b', fontSize: '9px', fontWeight: 600 }}>
                                                    {Math.floor((new Date() - new Date(row.issue_date)) / (1000 * 60 * 60 * 24))} Days
                                                </td>
                                                <td style={{ padding: '4px 6px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>{runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr style={{ background: '#0f172a', color: 'white' }}>
                                        <td style={{ padding: '15px 10px', textAlign: 'center', fontWeight: 700, color: 'white', fontSize: '13px' }}>-</td>
                                        <td style={{ padding: '15px 10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'white', fontSize: '13px' }} colSpan={5}>TOTAL OUTSTANDING</td>
                                        <td style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 900, fontSize: '13px', color: 'white', whiteSpace: 'nowrap' }}>
                                            {statementData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Aging Summary & Terms */}
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', flex: 1 }}>
                                {[
                                    { label: 'Current', value: statementData.aging.current },
                                    { label: '31-60 Days', value: statementData.aging.thirty },
                                    { label: '61-90 Days', value: statementData.aging.sixty },
                                    { label: '90+ Days', value: statementData.aging.ninety }
                                ].map((bucket, i) => (
                                    <div key={i} style={{ background: bucket.value > 0 ? '#fff1f2' : '#f8fafc', padding: '10px', borderRadius: '8px', border: `1px solid ${bucket.value > 0 ? '#fecdd3' : '#e2e8f0'}`, textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.5rem', fontWeight: 800, color: bucket.value > 0 ? '#e11d48' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{bucket.label}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: bucket.value > 0 ? '#9f1239' : '#0f172a' }}>SGD {bucket.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                    </div>
                                ))}
                                </div>
                                <div style={{ width: '120px', marginLeft: '15px', padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', background: '#f8fafc' }}>
                                    <div style={{ fontSize: '0.45rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Delivery / Payment Terms</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1e3a8a' }}>{statementData.partner?.customerCreditTime && statementData.partner.customerCreditTime !== '0' ? `${statementData.partner.customerCreditTime} DAYS` : 'C.O.D'}</div>
                                    <div style={{ fontSize: '0.4rem', color: '#94a3b8', marginTop: '2px' }}>{statementData.partner?.customerCreditTime && statementData.partner.customerCreditTime !== '0' ? 'From Date of Invoice' : 'Payable upon Delivery'}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '25px', borderTop: '1px solid #e2e8f0', paddingTop: '15px', fontSize: '0.55rem', color: '#94a3b8', textAlign: 'center' }}>
                                This is a computer generated document. No signature is required.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Opening Balance Modal */}
            {openingBalanceModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '24px', backdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '900px', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff', padding: 0 }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>Opening Balance Breakdown</h3>
                                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Transactions recorded before {new Date(dateRange.start).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setOpeningBalanceModal({ isOpen: false, items: [] })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><AlertCircle size={24} style={{ transform: 'rotate(45deg)' }} /></button>
                        </div>
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                                        <th style={{ padding: '12px' }}>Date</th>
                                        <th style={{ padding: '12px' }}>Document No</th>
                                        <th style={{ padding: '12px' }}>Type</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Debit (+)</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Credit (-)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openingBalanceModal.items.map(it => (
                                        <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px' }}>{new Date(it.issue_date).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px', fontWeight: 600 }}>{it.document_no}</td>
                                            <td style={{ padding: '12px', fontSize: '0.8rem' }}>{it.document_type}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: it.debit > 0 ? '#1e293b' : '#94a3b8' }}>{it.debit > 0 ? it.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: it.credit > 0 ? '#10b981' : '#94a3b8' }}>{it.credit > 0 ? it.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                                        <td colSpan="3" style={{ padding: '16px', borderRadius: '0 0 0 12px' }}>CALCULATED OPENING BALANCE</td>
                                        <td colSpan="2" style={{ padding: '16px', textAlign: 'right', borderRadius: '0 0 12px 0', color: '#1e3a8a', fontSize: '1.1rem' }}>
                                            SGD {statementData?.openingBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div style={{ padding: '20px', background: '#f8fafc', textAlign: 'right' }}>
                            <button className="btn btn-primary" onClick={() => setOpeningBalanceModal({ isOpen: false, items: [] })}>Close Breakdown</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Payment Modal */}
            {paymentModal.isOpen && (
                <ReceivePaymentModal 
                    prefill={paymentModal.prefill} 
                    onClose={() => setPaymentModal({ isOpen: false, prefill: null })} 
                    onSuccess={handleQuickPaymentSuccess} 
                    partners={partners}
                    company_id={profile?.company_id}
                />
            )}

            {/* Hidden Print Content for Summary Report */}
            <div style={{ position: 'absolute', top: 0, left: '-10000px', pointerEvents: 'none', width: '1100px', zIndex: -100 }}>
                <div ref={printSummaryRef} style={{ background: 'white', padding: '10mm' }}>
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <h1 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.6rem', fontWeight: 900 }}>A/R Ageing Summary Report</h1>
                        <h2 style={{ margin: '5px 0', fontSize: '1.1rem', color: '#475569' }}>{profile?.company_name || 'CEL-RON ENTERPRISES PTE LTD'}</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>As of {formatDate(new Date())}</p>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #1e3a8a' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>CUSTOMER NAME</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>CURRENT</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>1-30 DAYS</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>31-60 DAYS</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>61-90 DAYS</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>91+ DAYS</th>
                                <th style={{ padding: '10px', textAlign: 'right' }}>TOTAL DUE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {companyAging.map((item, idx) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#fcfcfc' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{item.name}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.aging.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.aging.thirty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.aging.sixty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.aging.ninety.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.aging.overNinety.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{item.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#f1f5f9', fontWeight: 900, borderTop: '2px solid #1e3a8a' }}>
                                <td style={{ padding: '12px 10px' }}>TOTAL</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>{companyAging.reduce((acc, it) => acc + it.aging.current, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>{companyAging.reduce((acc, it) => acc + it.aging.thirty, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>{companyAging.reduce((acc, it) => acc + it.aging.sixty, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>{companyAging.reduce((acc, it) => acc + it.aging.ninety, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>{companyAging.reduce((acc, it) => acc + it.aging.overNinety, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td style={{ padding: '12px 10px', textAlign: 'right' }}>SGD {companyAging.reduce((acc, it) => acc + it.outstanding, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ marginTop: '30px', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
                        This report is generated from CelronHub ERP as of {new Date().toLocaleString()}
                    </div>
                </div>
            </div>
            {showWhatsAppModal && (
                <WhatsAppShareModal 
                    isOpen={showWhatsAppModal}
                    onClose={() => setShowWhatsAppModal(false)}
                    contacts={selectedPartner ? contacts.filter(c => c.partnerId === selectedPartner) : []}
                    partner={statementData?.partner || null}
                    documentData={{
                        document_type: statementData ? 'Statement of Account' : 'Aging Summary Report',
                        document_no: statementData ? `SOA-${new Date().toISOString().split('T')[0]}` : `SUM-${new Date().toISOString().split('T')[0]}`,
                        subject: statementData ? `Statement for period ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}` : `Company-Wide Aging Summary as of ${new Date().toLocaleDateString()}`,
                        currency: 'SGD',
                        total_amount: statementData ? statementData.closingBalance : companyAging.reduce((sum, item) => sum + item.outstanding, 0),
                        salesperson_name: profile?.full_name
                    }}
                    onShareFile={(msg, phone) => handleShareFile('whatsapp', msg, phone)}
                />
            )}

            {showEmailModal && (
                <EmailShareModal 
                    isOpen={showEmailModal}
                    onClose={() => setShowEmailModal(false)}
                    partner={statementData?.partner || null}
                    contacts={contacts}
                    dateRange={dateRange}
                    documentData={{
                        document_type: statementData ? 'Statement of Account' : 'Aging Summary Report',
                        document_no: statementData ? `SOA-${new Date().toISOString().split('T')[0]}` : `SUM-${new Date().toISOString().split('T')[0]}`,
                        closingBalance: statementData ? statementData.closingBalance : companyAging.reduce((sum, item) => sum + item.outstanding, 0)
                    }}
                    onShare={(preview) => handleShareFile('email', preview.body, preview.to, preview.cc, preview.bcc, preview.subject)}
                />
            )}
        </div>
    );
}

function EmailShareModal({ isOpen, onClose, partner, documentData, onShare, contacts = [], dateRange }) {
    const [emailPreview, setEmailPreview] = useState({
        to: partner?.email || 'accounts@celron.net',
        cc: '',
        bcc: '',
        subject: `${documentData.document_type} - ${partner?.name || 'Customer'}`,
        body: '',
        attachments: []
    });

    const formatDate = (d) => {
        if (!d) return '-';
        const date = new Date(d);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    };

    useEffect(() => {
        if (isOpen) {
            const periodStr = dateRange ? `Period: ${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}\n\n` : '';
            const defaultMsg = `Dear ${partner?.name || 'Accounts Team'},\n\n${periodStr}Please find the ${documentData.document_type} (${documentData.document_no}) for your review and reference.\n\nAwaiting for your valuable payment.\n\nTotal Due: SGD ${documentData.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.\n\nKind Regards,\nANITHA (Ms)\nCELRON ENTERPRISES PTE LTD\n10, Jln, Besar, "Sim Lim Tower", #03-05, Singapore 208787\nEmail: accounts@celron.net | Tel: +6581962270\nweb: www.celron.net / www.celron.shop`;
            setEmailPreview(prev => ({ ...prev, body: defaultMsg }));
        }
    }, [isOpen, partner, documentData, dateRange]);

    const getSuggestedEmails = () => {
        const suggestions = [];
        
        // 1. Partner main email (Company)
        if (partner?.email) {
            suggestions.push({ name: partner.name, email: partner.email, type: 'Company' });
        }
        
        // 2. Individual Contacts
        const companyContacts = partner ? contacts.filter(c => c.partnerId === partner.id) : [];
        companyContacts.forEach(c => {
            if (c.email && !suggestions.find(s => s.email === c.email)) {
                suggestions.push({ name: c.name, email: c.email, type: 'Contact' });
            }
        });
        
        // 3. Office emails
        suggestions.push({ name: 'Our Office', email: 'accounts@celron.net', type: 'Internal' });
        suggestions.push({ name: 'Director Review', email: 'director@celron.net', type: 'Internal' });
        
        return suggestions;
    };

    const addEmailToField = (field, emailToAdd) => {
        setEmailPreview(prev => {
            const current = prev[field] || '';
            const emails = current.split(';').map(e => e.trim()).filter(Boolean);
            if (!emails.includes(emailToAdd)) {
                emails.push(emailToAdd);
            }
            return { ...prev, [field]: emails.join('; ') };
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', width: '100%', maxWidth: '850px', display: 'flex', flexDirection: 'column', maxHeight: '95vh', overflow: 'hidden' }}>

                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Send size={20} color="#3b82f6" /> Email Preview
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
                            <input
                                type="email"
                                style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                                value={emailPreview.to}
                                onChange={(e) => setEmailPreview(prev => ({ ...prev, to: e.target.value }))}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cc (Separate with semicolon)</label>
                                <textarea
                                    rows="2"
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }}
                                    value={emailPreview.cc}
                                    onChange={(e) => setEmailPreview(prev => ({ ...prev, cc: e.target.value }))}
                                    placeholder="email1@example.com; email2@example.com"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bcc</label>
                                <textarea
                                    rows="2"
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box', resize: 'none' }}
                                    value={emailPreview.bcc}
                                    onChange={(e) => setEmailPreview(prev => ({ ...prev, bcc: e.target.value }))}
                                    placeholder="bcc1@example.com; bcc2@example.com"
                                />
                            </div>
                        </div>

                        {getSuggestedEmails().length > 0 && (
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                    SELECT CONTACTS FROM COMPANY
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {getSuggestedEmails().map((contact, idx) => (
                                        <div 
                                            key={idx} 
                                            style={{ 
                                                background: '#fff', 
                                                border: '1px solid #cbd5e1', 
                                                borderRadius: '6px', 
                                                padding: '4px 8px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>{contact.name}</span>
                                                <span style={{ fontSize: '10px', color: '#64748b' }}>{contact.email}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', marginLeft: '4px' }}>
                                                <button 
                                                    type="button"
                                                    onClick={() => addEmailToField('to', contact.email)}
                                                    style={{ background: '#eef2ff', color: '#6366f1', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                                >
                                                    To
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => addEmailToField('cc', contact.email)}
                                                    style={{ background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
                                                >
                                                    Cc
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
                        <input
                            type="text"
                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                            value={emailPreview.subject}
                            onChange={(e) => setEmailPreview(prev => ({ ...prev, subject: e.target.value }))}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message Body</label>
                        <textarea
                            style={{ width: '100%', minHeight: '200px', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', boxSizing: 'border-box' }}
                            value={emailPreview.body}
                            onChange={(e) => setEmailPreview(prev => ({ ...prev, body: e.target.value }))}
                        />
                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FileText size={24} color="#16a34a" />
                            <div>
                                <p style={{ fontSize: '12px', color: '#166534', margin: 0, fontWeight: 700 }}>📄 PDF Automatically Attached</p>
                                <p style={{ fontSize: '11px', color: '#166534', margin: '2px 0 0 0', opacity: 0.9 }}>The {documentData.document_type || 'Statement'} PDF has been generated and is attached to this email.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onShare(emailPreview); onClose(); }}
                        style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Send size={16} /> Send Email Now
                    </button>
                </div>
            </div>
        </div>
    );
}

function ReceivePaymentModal({ prefill, onClose, onSuccess, partners, company_id }) {
    const [formData, setFormData] = useState({
        id: prefill?.id || null,
        partner_id: prefill?.partner_id || '',
        issue_date: prefill?.issue_date || new Date().toISOString().split('T')[0],
        total_amount: prefill?.amount || 0,
        payment_method: prefill?.payment_method || 'Bank Transfer',
        payment_ref: prefill?.payment_ref || '',
        related_document_id: prefill?.related_document_id || '',
        invoice_no: prefill?.document_no || '',
        subject: prefill?.subject || (prefill?.document_no ? `Payment for Invoice ${prefill.document_no}` : 'General Payment Received'),
        notes: prefill?.notes || ''
    });
    const [saving, setSaving] = useState(false);
    const [outstandingInvoices, setOutstandingInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!formData.partner_id) {
                setOutstandingInvoices([]);
                return;
            }
            setLoadingInvoices(true);
            try {
                const { data } = await getStatementData(company_id, formData.partner_id, '2000-01-01', '2099-12-31');
                if (data) {
                    const invoices = [];
                    const payments = new Map();
                    data.forEach(doc => {
                        if ((doc.document_type || '').includes('Invoice')) {
                            invoices.push(doc);
                        } else if (doc.document_type === 'Payment Received' && doc.internal_notes) {
                            try {
                                const notes = JSON.parse(doc.internal_notes);
                                if (notes.related_document_id) {
                                    payments.set(notes.related_document_id, (payments.get(notes.related_document_id) || 0) + parseFloat(doc.total_amount || 0));
                                }
                            } catch {}
                        }
                    });
                    const outstanding = invoices.map(inv => {
                        const paid = payments.get(inv.id) || 0;
                        return { ...inv, outstanding: (parseFloat(inv.total_amount || 0) - paid) };
                    }).filter(inv => inv.outstanding > 0.01);
                    setOutstandingInvoices(outstanding);
                }
            } catch (err) {
                console.error('Error fetching invoices', err);
            } finally {
                setLoadingInvoices(false);
            }
        };
        fetchInvoices();
    }, [formData.partner_id, company_id]);


    const handleSave = async () => {
        if (!formData.partner_id || !formData.total_amount) {
            alert('Partner and Amount are required.');
            return;
        }
        setSaving(true);
        try {
            const { generateDocNumber } = await import('../../lib/workflowV2Service');
            
            // If it's a new payment, generate a number. If editing, keep existing.
            const docNo = formData.id ? prefill?.document_no : await generateDocNumber(company_id || partners.find(p => p.id === formData.partner_id)?.company_id, 'Payment Received');
            
            const payload = {
                id: formData.id,
                partner_id: formData.partner_id,
                issue_date: formData.issue_date,
                total_amount: formData.total_amount,
                subject: formData.invoice_no ? `Payment for ${formData.invoice_no}` : formData.subject,
                notes: formData.notes,
                document_type: 'Payment Received',
                document_no: docNo || `PAY-${new Date().getTime()}`,
                company_id: company_id || partners.find(p => p.id === formData.partner_id)?.company_id,
                status: 'Confirmed',
                internal_notes: JSON.stringify({
                    payment_method: formData.payment_method,
                    payment_ref: formData.payment_ref,
                    related_document_id: formData.related_document_id === 'other_custom' ? null : formData.related_document_id
                })
            };

            const { error } = await saveWorkflowDocument(payload, []);
            if (error) throw error;
            onSuccess();
        } catch (err) {
            console.error('Save Payment Error:', err);
            alert(`Failed to record payment: ${err.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '24px', backdropFilter: 'blur(4px)' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '1000px', background: '#fff', borderRadius: '20px', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Record Customer Payment</h3>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>Instantly log payment and update SOA balance.</p>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-item" style={{ margin: 0 }}>
                        <label>Customer</label>
                        <select className="form-input" value={formData.partner_id} onChange={e => setFormData({ ...formData, partner_id: e.target.value })} disabled={!!prefill?.partner_id}>
                            <option value="">-- Select Customer --</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="grid-2">
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Payment Date</label>
                            <input type="date" className="form-input" value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} />
                        </div>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Amount Received (SGD)</label>
                            <input type="number" className="form-input" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Payment Method</label>
                            <select className="form-input" value={formData.payment_method} onChange={e => setFormData({ ...formData, payment_method: e.target.value })}>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="PayNow">PayNow</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Cash">Cash</option>
                            </select>
                        </div>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Transaction Ref</label>
                            <input type="text" className="form-input" value={formData.payment_ref} onChange={e => setFormData({ ...formData, payment_ref: e.target.value })} placeholder="e.g. TXN-12345" />
                        </div>
                    </div>
                    <div className="grid-2">
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>
                                Invoice No / Job No Reference 
                                {loadingInvoices && <Loader2 size={12} className="animate-spin" style={{ display: 'inline-block', marginLeft: '6px' }} />}
                            </label>
                            {formData.related_document_id === 'other_custom' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        style={{ flex: 1 }}
                                        value={formData.invoice_no} 
                                        onChange={e => setFormData({ ...formData, invoice_no: e.target.value })} 
                                        placeholder="Enter manual reference..." 
                                    />
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0 12px' }} 
                                        onClick={() => setFormData({ ...formData, related_document_id: '' })}
                                    >
                                        Back
                                    </button>
                                </div>
                            ) : (
                                <select 
                                    className="form-input" 
                                    value={formData.related_document_id} 
                                    onChange={e => {
                                        const selectedId = e.target.value;
                                        if (selectedId === 'other_custom') {
                                            setFormData({ ...formData, related_document_id: 'other_custom', invoice_no: '' });
                                        } else {
                                            const selectedInv = outstandingInvoices.find(i => i.id === selectedId);
                                            if (selectedInv) {
                                                setFormData({ 
                                                    ...formData, 
                                                    related_document_id: selectedId, 
                                                    invoice_no: selectedInv.document_no,
                                                    total_amount: selectedInv.outstanding > 0 ? selectedInv.outstanding : formData.total_amount
                                                });
                                            } else {
                                                setFormData({ ...formData, related_document_id: '', invoice_no: '' });
                                            }
                                        }
                                    }}
                                >
                                    <option value="">-- Select Outstanding Invoice --</option>
                                    {outstandingInvoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.document_no} {inv.assigned_job_no ? `(Job: ${inv.assigned_job_no})` : ''} - Bal: SGD {inv.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </option>
                                    ))}
                                    <option value="other_custom">Custom Reference...</option>
                                </select>
                            )}
                        </div>
                        <div className="form-item" style={{ margin: 0 }}>
                            <label>Description / Allocation</label>
                            <input type="text" className="form-input" value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-item" style={{ margin: 0 }}>
                        <label>NOTES WITH RICH TEXT (TABLES & IMAGES SUPPORTED):-</label>
                        <RichTextEditor 
                            value={formData.notes} 
                            onChange={val => setFormData({ ...formData, notes: val })} 
                            placeholder="Add internal notes, insert tables or upload images for reconciliation..."
                            height="250px"
                        />
                    </div>
                </div>
                <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 size={18} className="animate-spin" /> : 'Record Payment Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}

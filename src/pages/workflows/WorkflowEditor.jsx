import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2,
    Printer, Send, X, Package,
    FileText, Calculator, Ship,
    MoreHorizontal, Search, Settings,
    ChevronDown, CreditCard, User, Users, MapPin, Paperclip, Pencil, Sparkles,
    FileCheck, Play, RefreshCw, AlertCircle, Loader2,
    ExternalLink, Folder, File as FileIcon, HardDrive, Upload, MessageSquare
} from 'lucide-react';
import { getExchangeRateWithGemini } from '../../lib/geminiService';
import { listFolderContent, uploadFileToDrive, deleteFile, getOrCreateFolder, provisionFullProjectStructure, provisionPartnerStructure } from '../../lib/driveService';
import { validateToken, connectGoogleAPI, getStoredToken, performOCR } from '../../lib/googleAuthService';
import { extractLineItemsFromImage } from '../../lib/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import {
    getWorkflowDocumentById,
    saveWorkflowDocument,
    generateDocNumber,
    createDocumentRevision,
    convertQuotationToJob,
    convertProformaToTaxInvoice,
    getGDriveFolderIdForStage
} from '../../lib/workflowV2Service';
import { getPartners, getContacts, getDocumentSettings } from '../../lib/store';
import { getCatalogItems } from '../../lib/catalogService';
import { supabase } from '../../lib/supabase';
import { getJobExpenses, saveJobExpense, deleteJobExpense } from '../../lib/jobExpenseService';
import { getJobPayments, saveCustomerPayment, saveSupplierPayment, deletePayment } from '../../lib/paymentService';
import {
    Modal,
    QuickPartnerAdd,
    QuickContactAdd,
    QuickPartnerContactDualAdd,
    QuickVesselAdd,
    QuickWorkLocationAdd,
    QuickExpenseAdd
} from '../../components/workflow/QuickAddForms';
import FloatingControlHub from '../../components/FloatingControlHub';
import RichTextEditor from '../../components/common/RichTextEditor';
import { ITEM_UNITS } from '../../utils/units';
import WorkflowDocumentLayout from '../../components/workflow/WorkflowDocumentLayout';
import html2pdf from 'html2pdf.js';
import { generateSleekPDF } from '../../lib/pdfGeneratorV2';
import { WhatsAppShareModal } from '../../components/workflow/WhatsAppShareModal';

export default function WorkflowEditor() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const linkedJobId = searchParams.get('job_id');
    const sourceId = searchParams.get('source_id');

    const { profile } = useAuth();
    const isNew = id === 'new';

    // UI State
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('items'); // 'items' | 'other'
    const [modal, setModal] = useState({ isOpen: false, type: null });
    const [whatsappShareModal, setWhatsappShareModal] = useState({ isOpen: false });
    const [emailPreview, setEmailPreview] = useState(null);
    const [poModal, setPoModal] = useState({ isOpen: false });
    const [lineItems, setLineItems] = useState([]);
    const [workflowDocs, setWorkflowDocs] = useState([]); // Documents in the same job suite
    const [expenses, setExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [expenseModal, setExpenseModal] = useState({ isOpen: false, data: null });
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const [galleryUploadProgress, setGalleryUploadProgress] = useState(0);
    const [galleryUploadSuccess, setGalleryUploadSuccess] = useState(false);

    // Payments State
    const [customerPayments, setCustomerPayments] = useState([]);
    const [supplierPayments, setSupplierPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, type: null, data: null }); // type: 'customer' | 'supplier'
    const [signedProofs, setSignedProofs] = useState([]);
    const [loadingSignedProofs, setLoadingSignedProofs] = useState(false);

    // Explorer State
    const [explorerFiles, setExplorerFiles] = useState([]);
    const [loadingExplorer, setLoadingExplorer] = useState(false);
    const [authStatus, setAuthStatus] = useState('checking'); // 'checking' | 'connected' | 'expired' | 'disconnected'
    const [explorerFolderId, setExplorerFolderId] = useState(null);
    const [explorerPath, setExplorerPath] = useState([]); // Array of {id, name} for breadcrumbs
    const [explorerError, setExplorerError] = useState(null);
    const [uploadingExplorer, setUploadingExplorer] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [paymentQuarter, setPaymentQuarter] = useState('All'); // 'All' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
    const [isOCRLoading, setIsOCRLoading] = useState(false);
    const [showOCRModal, setShowOCRModal] = useState(false);

    const [settings, setSettings] = useState(null);
    const [logoBase64, setLogoBase64] = useState('');
    const [signatureBase64, setSignatureBase64] = useState('');
    const [paynowBase64, setPaynowBase64] = useState('');
    const printRef = useRef();

    const toBase64 = url => fetch(url, { mode: 'cors' })
        .then(response => response.blob())
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }));

    // Master Data
    const [partners, setPartners] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [workLocations, setWorkLocations] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [staff, setStaff] = useState([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);

    // Default Dates
    const defaultIssue = new Date();
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);

    // Form Data
    // Form Data
    const [formData, setFormData] = useState(() => {
        const docType = (type || 'Enquiry').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const isAnithaDoc = ['Tax Invoice', 'Purchase Order', 'Delivery Order', 'Proforma Invoice', 'Packing List'].includes(docType);
        
        return {
        document_type: docType,
        document_no: '',
        job_id: '',
        enquiry_id: '',
        issue_date: defaultIssue.toISOString().split('T')[0],
        expiry_date: defaultExpiry.toISOString().split('T')[0],
        partner_id: '',
        contact_id: '',
        vessel_id: '',
        work_location_id: '',
        salesperson_name: isAnithaDoc ? 'ANITHA' : (profile?.full_name || 'N.R.KUMAR'),
        salesperson_phone: isAnithaDoc ? '+6591090347' : (profile?.phone || '+6597685891'),
        salesperson_email: isAnithaDoc ? 'accounts@celron.net' : (profile?.professional_email || 'kumar@celron.net'),
        subject: '',
        customer_ref: 'WALK IN',
        currency: 'SGD',
        exchange_rate: 1.0,
        base_currency: 'SGD',
        status: 'Draft',
        notes: '',
        terms_conditions: '',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        discount_amount: 0,
        discount_percent: 0,
        customer_po_no: '',
        customer_po_date: '',
        customer_po_by_id: '',
        customer_po_attachment_url: '',
        is_job: false,
        assigned_job_no: '',
        original_document_id: '',
        revision_no: 0,
        attachment_urls: [],
        delivery_verification: {}
    };
    });

    useEffect(() => {
        fetchMasterData();
        if (!isNew) {
            fetchDocument();
        } else {
            initNewDocument();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, type]);

    const fetchMasterData = async () => {
        const [pRes, vRes, wlRes, cRes, sRes, allContacts] = await Promise.all([
            getPartners(),
            supabase.from('vessels').select('*').order('vessel_name'),
            supabase.from('work_locations').select('*').order('location_name'),
            getCatalogItems(1, 100),
            getDocumentSettings(profile?.company_id),
            getContacts()
        ]);

        if (pRes) setPartners(pRes);
        if (vRes.data) setVessels(vRes.data);
        if (wlRes.data) setWorkLocations(wlRes.data);
        if (cRes.data) setCatalog(cRes.data);
        if (sRes) {
            setSettings(sRes);
            if (sRes.logo_url) toBase64(sRes.logo_url).then(setLogoBase64).catch(console.error);
            if (sRes.signature_url) toBase64(sRes.signature_url).then(setSignatureBase64).catch(console.error);
            if (sRes.paynow_url) toBase64(sRes.paynow_url).then(setPaynowBase64).catch(console.error);
        }
        if (allContacts) setContacts(allContacts);
        
        const { data: staffData } = await supabase.from('staff').select('*').order('full_name');
        if (staffData) setStaff(staffData);
    };

    const checkGoogleAuth = async () => {
        const token = getStoredToken();
        if (!token) {
            setAuthStatus('disconnected');
            return false;
        }
        const isValid = await validateToken(token);
        if (!isValid) {
            setAuthStatus('expired');
            return false;
        }
        setAuthStatus('connected');
        return true;
    };

    const handleExplorerReconnect = () => {
        connectGoogleAPI(`job_${id}`);
    };

    const fetchExplorerFiles = async (folderId = null, forceRoot = false) => {
        const targetId = folderId || explorerFolderId;
        if (!targetId) return;

        setLoadingExplorer(true);
        setExplorerError(null);
        try {
            const token = getStoredToken();
            let files = await listFolderContent(token, targetId);

            // Filter logic: Only show 8 major SOP folders at the root level
            const isAtRoot = forceRoot || explorerPath.length <= 1;

            if (isAtRoot && targetId) {
                const sopFolders = [
                    '1. Enquiries & Quotations',
                    '2. Supplier Bids & POs',
                    '3. Operations & Logistics',
                    '4. Finance & Invoices',
                    '5. Expenses & Payments',
                    '6. Job Gallery & Photos',
                    '7. Correspondence & Admin',
                    '8. Technical Documents'
                ];
                // Strict filter: only these 8 folders, or non-folder files
                const seenFolders = new Set();
                files = files.filter(f => {
                    const isFolder = f.mimeType === 'application/vnd.google-apps.folder';
                    if (isFolder) {
                        const name = f.name.trim();
                        if (sopFolders.includes(name)) {
                            if (seenFolders.has(name)) return false; // Deduplicate
                            seenFolders.add(name);
                            return true;
                        }
                        return false; // Hide other folders
                    }
                    return true; // Show all files
                });
            }
            setExplorerFiles(files);
        } catch (err) {
            console.error('Error fetching explorer files:', err);
            setExplorerError('Failed to load files from Google Drive.');
        } finally {
            setLoadingExplorer(false);
        }
    };

    const ensureJobFolder = async () => {
        if (!formData.assigned_job_no || explorerFolderId) return;

        setLoadingExplorer(true);
        try {
            const token = getStoredToken();
            const year = new Date(formData.issue_date).getFullYear().toString();
            const folderId = await provisionFullProjectStructure(
                token, 
                settings?.gdrive_celron_root_id, 
                year, 
                formData.assigned_job_no
            );
            setExplorerFolderId(folderId);
            setExplorerPath([{ id: folderId, name: formData.assigned_job_no }]);
            return folderId;
        } catch (err) {
            console.error('Error ensuring job folder:', err);
            setExplorerError('Failed to connect to Google Drive project folder.');
        } finally {
            setLoadingExplorer(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'explorer') {
            const run = async () => {
                const isAuthed = await checkGoogleAuth();
                if (isAuthed) {
                    const folderId = await ensureJobFolder();
                    if (folderId) fetchExplorerFiles(folderId);
                    else if (explorerFolderId) fetchExplorerFiles();
                }
            };
            run();
        } else if (activeTab === 'costing' && !isNew) {
            fetchExpenses();
        } else if (activeTab === 'gallery' && !isNew) {
            fetchGallery();
        } else if (activeTab === 'payments' && !isNew) {
            fetchPayments();
        } else if (activeTab === 'explorer' && !isNew) {
            fetchSignedProofs();
        }
    }, [activeTab, formData.assigned_job_no]);

    const fetchSignedProofs = async () => {
        if (!formData.assigned_job_no) return;
        setLoadingSignedProofs(true);
        try {
            const token = getStoredToken();
            const rootId = await ensureJobFolder();
            const signedFolderId = await getOrCreateFolder(token, '6. Completed Proof of Delivery / Signed Reports', rootId);
            const files = await listFolderContent(token, signedFolderId);
            setSignedProofs(files);
        } catch (err) {
            console.error('Error fetching signed proofs:', err);
        } finally {
            setLoadingSignedProofs(false);
        }
    };

    const handleUploadSignedProofDirect = async (file) => {
        if (!file) return;
        setLoadingSignedProofs(true);
        try {
            const token = getStoredToken();
            const rootId = await ensureJobFolder();
            const signedFolderId = await getOrCreateFolder(token, '6. Completed Proof of Delivery / Signed Reports', rootId);
            
            const result = await uploadFileToDrive(token, file, { folderId: signedFolderId });
            const proofUrl = `https://drive.google.com/file/d/${result.id}/view`;

            const newAttachments = [...(formData.attachment_urls || []), proofUrl];
            setFormData(prev => ({ ...prev, attachment_urls: newAttachments }));
            
            alert('Signed proof uploaded to Folder 6!');
            fetchSignedProofs();
        } catch (err) {
            console.error('Proof upload failed:', err);
            alert('Upload failed: ' + err.message);
        } finally {
            setLoadingSignedProofs(false);
        }
    };

    const fetchGallery = async () => {
        if (!formData.assigned_job_no) return;
        setLoadingGallery(true);
        try {
            const token = getStoredToken();
            const rootId = await ensureJobFolder();
            const mediaFolderId = await getOrCreateFolder(token, '6. Job Gallery & Photos', rootId);
            const files = await listFolderContent(token, mediaFolderId);
            setGalleryFiles(files.filter(f => f.mimeType.startsWith('image/')));
        } catch (err) {
            console.error('Error fetching gallery:', err);
        } finally {
            setLoadingGallery(false);
        }
    };

    const handleGalleryUpload = async (file) => {
        if (!file) return;
        setLoadingGallery(true);
        setGalleryUploadProgress(0);
        setGalleryUploadSuccess(false);
        try {
            const token = getStoredToken();
            const rootId = await ensureJobFolder();
            const mediaFolderId = await getOrCreateFolder(token, '6. Job Gallery & Photos', rootId);
            
            await uploadFileToDrive(token, file, { 
                folderId: mediaFolderId,
                onProgress: (pct) => setGalleryUploadProgress(pct)
            });
            
            setGalleryUploadSuccess(true);
            setTimeout(() => setGalleryUploadSuccess(false), 3000);
            fetchGallery();
        } catch (err) {
            console.error('Gallery upload failed:', err);
            alert('Upload failed: ' + err.message);
        } finally {
            setLoadingGallery(false);
            setGalleryUploadProgress(0);
        }
    };

    const fetchExpenses = async () => {
        setLoadingExpenses(true);
        const { data } = await getJobExpenses(id);
        if (data) setExpenses(data);
        setLoadingExpenses(false);
    };

    const addExpenseRow = () => {
        setExpenseModal({ isOpen: true, data: null });
    };

    const updateExpenseRow = (index, field, value) => {
        const updated = [...expenses];
        updated[index][field] = value;

        // Recalculate totals
        if (['unit_price', 'quantity', 'gst_rate', 'gst_amount'].includes(field)) {
            const up = parseFloat(updated[index].unit_price) || 0;
            const qty = parseFloat(updated[index].quantity) || 0;
            const sub = up * qty;
            updated[index].total_before_tax = sub;
            
            // If field isn't gst_amount, auto-calculate amount based on rate
            if (field !== 'gst_amount') {
                const rate = parseFloat(updated[index].gst_rate) || 0;
                updated[index].gst_amount = sub * (rate / 100);
            }
            
            updated[index].grand_total = sub + (parseFloat(updated[index].gst_amount) || 0);
        }

        setExpenses(updated);
    };

    const handleSaveExpense = async (index) => {
        const row = expenses[index];
        if (!row.supplier_id) {
            alert('Please select a supplier');
            return;
        }
        const { data, error } = await saveJobExpense(row);
        if (error) {
            alert('Error saving expense: ' + error.message);
        } else {
            const updated = [...expenses];
            updated[index] = data;
            setExpenses(updated);
        }
    };

    const handleDeleteExpense = async (index) => {
        const row = expenses[index];
        if (!window.confirm('Delete this expense record?')) return;
        
        if (!row.id.startsWith('temp_')) {
            const { error } = await deleteJobExpense(row.id);
            if (error) {
                alert('Error deleting: ' + error.message);
                return;
            }
        }
        
        const updated = expenses.filter((_, i) => i !== index);
        setExpenses(updated);
    };

    const handleBillUpload = async (index, file) => {
        if (!file) return;
        
        const updated = [...expenses];
        updated[index].uploading = true;
        setExpenses(updated);

        try {
            const token = getStoredToken();
            const folderId = await ensureJobFolder(); // Get or create root
            const financeFolder = await getOrCreateFolder(token, '5. Expenses & Payments', folderId);
            
            const result = await uploadFileToDrive(token, file, { folderId: financeFolder });
            
            // Save link to DB
            const fileUrl = `https://drive.google.com/file/d/${result.id}/view`;
            const { data, error } = await saveJobExpense({ ...expenses[index], bill_url: fileUrl });
            
            if (error) throw error;
            
            const final = [...expenses];
            final[index] = { ...data, uploading: false };
            setExpenses(final);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed: ' + err.message);
            const reset = [...expenses];
            reset[index].uploading = false;
            setExpenses(reset);
        }
    };

    const fetchPayments = async () => {
        setLoadingPayments(true);
        const { customerPayments: cp, supplierPayments: sp } = await getJobPayments(id);
        setCustomerPayments(cp);
        setSupplierPayments(sp);
        setLoadingPayments(false);
    };

    const handleSavePayment = async (type, paymentData) => {
        const saver = type === 'customer' ? saveCustomerPayment : saveSupplierPayment;
        const { data, error } = await saver({ ...paymentData, company_id: profile?.company_id, job_id: id });
        if (error) {
            alert('Error saving payment: ' + error.message);
        } else {
            fetchPayments();
            setPaymentModal({ isOpen: false, type: null, data: null });
        }
    };

    const handleDeletePayment = async (type, paymentId) => {
        if (!window.confirm('Delete this payment record?')) return;
        const { error } = await deletePayment(type, paymentId);
        if (error) alert('Error deleting: ' + error.message);
        else fetchPayments();
    };

    const handlePaymentProofUpload = async (type, paymentId, file) => {
        if (!file) return;
        try {
            const token = getStoredToken();
            const rootId = await ensureJobFolder();
            const folderName = type === 'customer' ? '4. Finance & Invoices' : '5. Expenses & Payments';
            const targetFolder = await getOrCreateFolder(token, folderName, rootId);
            const result = await uploadFileToDrive(token, file, { folderId: targetFolder });
            const proofUrl = `https://drive.google.com/file/d/${result.id}/view`;
            
            const saver = type === 'customer' ? saveCustomerPayment : saveSupplierPayment;
            await saver({ id: paymentId, proof_url: proofUrl });
            fetchPayments();
        } catch (err) {
            console.error('Proof upload failed:', err);
            alert('Proof upload failed: ' + err.message);
        }
    };

    const handleExplorerNavigate = (folder) => {
        setExplorerPath(prev => [...prev, { id: folder.id, name: folder.name }]);
        setExplorerFolderId(folder.id);
        fetchExplorerFiles(folder.id, false); // Not root anymore
    };

    const handleExplorerBack = (index) => {
        const newPath = explorerPath.slice(0, index + 1);
        const target = newPath[newPath.length - 1];
            setExplorerPath(newPath);
        setExplorerFolderId(target.id);
        fetchExplorerFiles(target.id, newPath.length === 1); // Only root if path length is 1
    };

    const handleExplorerDelete = async (fileId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}" from Google Drive?`)) return;
        setLoadingExplorer(true);
        try {
            const token = getStoredToken();
            await deleteFile(token, fileId);
            fetchExplorerFiles();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete file.');
            setLoadingExplorer(false);
        }
    };

    const handleOpenPartnerVault = async () => {
        if (!formData.partner_id) {
            alert("Please select a partner first.");
            return;
        }
        setLoadingExplorer(true);
        try {
            const token = getStoredToken();
            const partner = partners.find(p => p.id === formData.partner_id);
            const partnerFolderId = await provisionPartnerStructure(token, settings?.gdrive_partners_root_id, partner.name);
            window.open(`https://drive.google.com/drive/folders/${partnerFolderId}`, '_blank');
        } catch (err) {
            console.error('Partner Vault error:', err);
            alert('Failed to open partner vault.');
        } finally {
            setLoadingExplorer(false);
        }
    };

    const handleExplorerUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploadingExplorer(true);
        setUploadProgress(0);
        try {
            const token = getStoredToken();
            for (let i = 0; i < files.length; i++) {
                await uploadFileToDrive(token, files[i], { folderId: explorerFolderId });
                setUploadProgress(((i + 1) / files.length) * 100);
            }
            fetchExplorerFiles();
        } catch (err) {
            console.error('Upload error:', err);
            alert('Failed to upload files.');
        } finally {
            setUploadingExplorer(false);
            setUploadProgress(0);
        }
    };

    const autoUploadPDF = async (docData) => {
        try {
            const token = getStoredToken();
            const pdfBlob = await generateSleekPDF({
                ...docData,
                items: lineItems,
                partners: partners.find(p => p.id === docData.partner_id),
                vessels: vessels.find(v => v.id === docData.vessel_id),
                work_locations: workLocations.find(wl => wl.id === docData.work_location_id)
            }, settings, 'blob');
            
            // Provision folder
            const year = new Date(docData.issue_date).getFullYear().toString();
            const rootId = await provisionFullProjectStructure(token, settings?.gdrive_celron_root_id, year, docData.assigned_job_no);
            
            // Respective sub-folders logic based on professional classification
            let subfolderName = '7. Admin & Misc';
            const type = docData.document_type.toUpperCase();
            
            if (type === 'QUOTATION' || type === 'ORDER ACKNOWLEDGMENT' || type === 'ENQUIRY') {
                subfolderName = '1. Enquiries & Quotations';
            } else if (type === 'DELIVERY ORDER' || type === 'SERVICE REPORT' || type === 'CERTIFICATE' || type === 'PACKING LIST') {
                subfolderName = '3. Operations & Logistics';
            } else if (type === 'TAX INVOICE' || type === 'PROFORMA INVOICE' || type === 'STATEMENT OF ACCOUNT') {
                subfolderName = '4. Finance & Invoices';
            }

            const targetFolderId = await getOrCreateFolder(token, subfolderName, rootId);
            
            const file = new File([pdfBlob], `${docData.document_no}.pdf`, { type: 'application/pdf' });
            await uploadFileToDrive(token, file, { folderId: targetFolderId });
        } catch (err) {
            console.warn('Auto-upload PDF background task failed:', err);
        }
    };

    const fetchDocument = async () => {
        setLoading(true);
        console.log('Fetching document with ID:', id);
        try {
            const { data, error } = await getWorkflowDocumentById(id);
            if (error) {
                console.error('Fetch error:', error);
                alert('Error loading document: ' + error.message);
            } else if (data) {
                console.log('Document loaded:', data);
                setFormData(prev => ({ ...prev, ...data }));
                
                // Deduplicate items on load to fix any existing database repeats
                // We use a more robust key to handle null/undefined and whitespace
                const rawItems = data.items || [];
                const uniqueItems = [];
                const seen = new Set();
                
                rawItems.forEach(item => {
                    const desc = (item.description || '').trim();
                    const details = (item.details || '').trim();
                    const qty = parseFloat(item.quantity) || 0;
                    const price = parseFloat(item.unit_price) || 0;
                    const isSec = !!item.is_section;
                    const isNote = !!item.is_note;

                    const key = `${desc}|${details}|${qty}|${price}|${isSec}|${isNote}`;
                    
                    if (!seen.has(key)) {
                        uniqueItems.push(item);
                        seen.add(key);
                    }
                });
                
                setLineItems(uniqueItems);

                // Fetch other docs in the same job suite
                if (data.assigned_job_no) {
                    const { data: suiteData } = await supabase
                        .from('workflow_documents')
                        .select('id, document_no, document_type, status, total_amount, currency, issue_date')
                        .eq('assigned_job_no', data.assigned_job_no)
                        .eq('company_id', profile.company_id)
                        .order('issue_date', { ascending: true });
                    
                    if (suiteData) {
                        setWorkflowDocs(suiteData);
                    }
                }
            } else {
                console.warn('No data returned for ID:', id);
                alert('Document not found.');
            }
        } catch (err) {
            console.error('Unexpected fetch error:', err);
            alert('An unexpected error occurred while loading the document.');
        }
        setLoading(false);
    };

    const initNewDocument = async () => {
        const newNo = await generateDocNumber(profile.company_id, formData.document_type);

        let initialPartnerId = '';
        let initialContactId = '';

        const docType = formData.document_type?.toUpperCase();
        const DEFAULT_TERMS = `<ul>
            <li><strong>Availability:</strong> Ex-stock, subject to prior sale.</li>
            <li><strong>Product Type:</strong> Maker's genuine spare parts | OEM spare parts | Equivalent spare parts</li>
            <li><strong>Delivery Time:</strong> Ex-stock | 1-2 days | 4-6 weeks</li>
            <li><strong>Quote Validity:</strong> As per stated due date</li>
            <li><strong>Payment Terms:</strong> Advance payment | 50% advance & 50% on COD | 7 days | 14 days | 30 days</li>
        </ul>
        <p><strong>Warranty:</strong> Manufacturer's standard warranty against manufacturing defects only. This warranty does not cover workmanship errors, misuse, or improper handling.</p>`;
        
        const defaultNotes = '';

        if (sourceId) {
            const { data: sourceDoc } = await getWorkflowDocumentById(sourceId);
            if (sourceDoc) {
                setFormData(prev => ({
                    ...prev,
                    document_no: newNo,
                    partner_id: sourceDoc.partner_id || '',
                    contact_id: sourceDoc.contact_id || '',
                    vessel_id: sourceDoc.vessel_id || '',
                    work_location_id: sourceDoc.work_location_id || '',
                    subject: sourceDoc.subject || `Derived from ${sourceDoc.document_no}`,
                    customer_ref: sourceDoc.customer_ref || '',
                    currency: sourceDoc.currency || 'SGD',
                    enquiry_id: sourceDoc.enquiry_id || '',
                    job_id: sourceDoc.job_id || '',
                    notes: sourceDoc.notes || defaultNotes,
                    terms_conditions: sourceDoc.terms_conditions || (docType === 'QUOTATION' ? DEFAULT_TERMS : '')
                }));

                if (sourceDoc.items && sourceDoc.items.length > 0) {
                    const inheritedItems = sourceDoc.items.map((item, idx) => ({
                        ...item,
                        id: 'src-' + idx + '-' + Date.now(),
                        document_id: undefined // Will be set on save
                    }));
                    setLineItems(inheritedItems);
                }
                return; // Skip other inheritance if sourceId is used
            }
        }

        if (linkedJobId) {
            const { getJobById } = await import('../../lib/workflowService');
            const jobRes = await getJobById(profile.company_id, linkedJobId);
            if (jobRes.data) {
                const job = jobRes.data;
                const enq = job.enquiries || {};
                
                initialPartnerId = enq.customer_id || '';
                initialContactId = job.contact_id || '';
                
                setFormData(prev => ({
                    ...prev,
                    document_no: newNo,
                    job_id: linkedJobId,
                    partner_id: initialPartnerId,
                    contact_id: initialContactId,
                    vessel_id: job.vessel_id || enq.vessel_id || '',
                    work_location_id: job.work_location_id || enq.work_location_id || '',
                    subject: prev.subject || job.subject || enq.subject || `Ref: ${job.job_no}`,
                    customer_ref: prev.customer_ref || job.customer_ref || enq.customer_ref || '',
                    notes: prev.notes || defaultNotes,
                    terms_conditions: prev.terms_conditions || (docType === 'QUOTATION' ? DEFAULT_TERMS : '')
                }));

                // Inherit line items if available
                const sourceItems = enq.catalog_items || [];
                if (sourceItems.length > 0) {
                    const inheritedItems = sourceItems.map((item, idx) => ({
                        id: 'inherited-' + idx + '-' + Date.now(),
                        item_id: item.id,
                        description: item.name,
                        details: item.specification || '',
                        quantity: 1,
                        unit_price: item.selling_price || 0,
                        amount: item.selling_price || 0,
                        tax_enabled: true,
                        tax_rate: 9,
                        uom: 'UNIT(S)'
                    }));
                    setLineItems(inheritedItems);
                    return; // skip adding empty line
                }
            }
        }

        let defaultNotesVal = formData.notes || '';
        const docTypeUpper = formData.document_type?.toUpperCase();
        
        const packageDetailsTemplate = `
            <p><strong>Package Details</strong></p>
            <ul>
                <li>Size of the Package : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; mm (L) x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; mm (B) x &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; mm (H)</li>
                <li>Weight of the Package : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Kgs</li>
                <li>Origin of spares : Singapore</li>
                <li>Total No. of Packages: </li>
                <li>Package Type (Carton / Wooden Crate / Pallet / Drum): </li>
                <li>Package Qty: </li>
                <li>Description of Contents: </li>
            </ul>
        `;

        if ((docTypeUpper === 'DELIVERY ORDER' || docTypeUpper === 'PACKING LIST') && !defaultNotesVal) {
            defaultNotesVal = packageDetailsTemplate;
        }

        setFormData(prev => ({
            ...prev,
            salesperson_name: prev.salesperson_name || profile?.full_name || '',
            salesperson_phone: prev.salesperson_phone || profile?.phone || '',
            salesperson_email: prev.salesperson_email || profile?.professional_email || '',
            document_no: newNo,
            job_id: linkedJobId || '',
            partner_id: initialPartnerId || prev.partner_id,
            contact_id: initialContactId || prev.contact_id,
            notes: defaultNotesVal,
            terms_conditions: prev.terms_conditions || (docTypeUpper === 'QUOTATION' ? DEFAULT_TERMS : '')
        }));

        // Add one empty line
        setLineItems([{
            id: 'temp-' + Date.now(),
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 9,
            amount: 0,
            uom: 'UNIT(S)'
        }]);
    };

    // Auto-calculate totals
    useEffect(() => {
        const sub = lineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        
        // Calculate Discount
        let discAmt = parseFloat(formData.discount_amount) || 0;
        if (parseFloat(formData.discount_percent) > 0) {
            discAmt = sub * (parseFloat(formData.discount_percent) / 100);
        }
        
        const discountedSub = sub - discAmt;

        const tax = lineItems.reduce((acc, curr) => {
            if (curr.is_section || curr.is_note) return acc;
            if (curr.tax_enabled === false) return acc;
            const tRate = parseFloat(curr.tax_rate ?? 9) || 0;
            // Apply tax on discounted proportional amount
            const itemWeight = sub > 0 ? (parseFloat(curr.amount) || 0) / sub : 0;
            const itemDiscountedAmount = (parseFloat(curr.amount) || 0) - (discAmt * itemWeight);
            return acc + (itemDiscountedAmount * (tRate / 100));
        }, 0);
        
        const total = discountedSub + tax;

        setFormData(prev => ({
            ...prev,
            subtotal: sub,
            tax_amount: tax,
            total_amount: total,
            discount_amount: discAmt
        }));
    }, [lineItems, formData.discount_percent, formData.discount_amount]);

    const handleHeaderChange = (e) => {
        const { name, value } = e.target;

        if (value === 'ADD_NEW') {
            setModal({ isOpen: true, type: name });
            return;
        }

        if (name.startsWith('delivery_verification.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                delivery_verification: {
                    ...(prev.delivery_verification || {}),
                    [field]: value
                }
            }));
            return;
        }

        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'issue_date') {
                const newExpiry = new Date(value);
                // Check if date is valid
                if (!isNaN(newExpiry.getTime())) {
                    newExpiry.setDate(newExpiry.getDate() + 30);
                    next.expiry_date = newExpiry.toISOString().split('T')[0];
                }
            }
            return next;
        });
    };

    const handleEditorChange = (name, content) => {
        setFormData(prev => ({ ...prev, [name]: content }));
    };

    const [isFetchingRate, setIsFetchingRate] = useState(false);
    const handleAiFetchExchangeRate = async () => {
        if (formData.currency === 'SGD') return;
        setIsFetchingRate(true);
        try {
            const data = await getExchangeRateWithGemini(formData.currency, 'SGD');
            if (data.rate) {
                setFormData(prev => ({ ...prev, exchange_rate: data.rate }));
                alert(`AI found current rate: 1 ${formData.currency} = ${data.rate} SGD (Source: ${data.source || 'AI Search'})`);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to fetch rate via AI. Please enter manually.');
        } finally {
            setIsFetchingRate(false);
        }
    };

    const handleEditMaster = (type) => {
        let initialData = null;
        if (type === 'partner_id') initialData = partners.find(p => p.id === formData.partner_id);
        else if (type === 'contact_id') initialData = contacts.find(c => c.id === formData.contact_id);
        else if (type === 'vessel_id') initialData = vessels.find(v => v.id === formData.vessel_id);
        else if (type === 'work_location_id') initialData = workLocations.find(l => l.id === formData.work_location_id);

        if (!initialData) return alert('Please select a record to edit first.');
        setModal({ isOpen: true, type, initialData });
    };

    const handleQuickAddSuccess = (data) => {
        const typeAdded = modal.type;
        setModal({ isOpen: false, type: null });

        // Refresh master data to include the new item(s)
        fetchMasterData();

        // Handle dual data from QuickPartnerContactDualAdd
        if (data && data.partner) {
            setFormData(prev => ({ 
                ...prev, 
                partner_id: data.partner.id, 
                contact_id: data.contact?.id || '' 
            }));
            return;
        }

        // Select the new item for single-add cases
        const newItem = data;
        if (typeAdded === 'partner_id') {
            setFormData(prev => ({ ...prev, partner_id: newItem.id, contact_id: '' }));
        } else if (typeAdded === 'contact_id') {
            setFormData(prev => ({ ...prev, contact_id: newItem.id }));
        } else if (typeAdded === 'vessel_id') {
            setFormData(prev => ({ ...prev, vessel_id: newItem.id }));
        } else if (typeAdded === 'work_location_id') {
            setFormData(prev => ({ ...prev, work_location_id: newItem.id }));
        }
    };

    const updateLineItem = (index, field, value) => {
        const updated = [...lineItems];
        updated[index][field] = value;

        if (field === 'quantity' || field === 'unit_price') {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unit_price) || 0;
            updated[index].amount = qty * price;
        }

        setLineItems(updated);
    };

    const addLineItem = (type = 'item') => {
        const newItem = {
            id: 'temp-' + Date.now(),
            description: '',
            quantity: type === 'item' ? 1 : 0,
            unit_price: 0,
            amount: 0,
            tax_enabled: true,
            tax_rate: 9,
            uom: 'Units',
            is_section: type === 'section',
            is_note: type === 'note'
        };
        setLineItems([...lineItems, newItem]);
    };

    const removeLineItem = (index) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const handleAddItemFromCatalog = (catalogItem) => {
        const newItem = {
            id: 'temp-' + Date.now(),
            item_id: catalogItem.id,
            description: catalogItem.name,
            details: catalogItem.specification || '',
            quantity: 1,
            unit_price: catalogItem.selling_price || 0,
            amount: catalogItem.selling_price || 0,
            tax_enabled: true,
            tax_rate: 9,
            uom: 'UNIT(S)'
        };
        // Add or replace the last empty line if it's empty
        if (lineItems.length > 0 && !lineItems[lineItems.length - 1].description) {
            const updated = [...lineItems];
            updated[updated.length - 1] = newItem;
            setLineItems(updated);
        } else {
            setLineItems([...lineItems, newItem]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Deduplicate items proactively before saving
            const uniqueItems = [];
            const seen = new Set();
            lineItems.forEach(item => {
                const desc = (item.description || '').trim();
                const details = (item.details || '').trim();
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.unit_price) || 0;
                const isSec = !!item.is_section;
                const isNote = !!item.is_note;
                const key = `${desc}|${details}|${qty}|${price}|${isSec}|${isNote}`;
                if (!seen.has(key)) {
                    uniqueItems.push(item);
                    seen.add(key);
                }
            });
            setLineItems(uniqueItems);

            const dataToSave = { ...formData, company_id: profile.company_id };
            
            const { data, error } = await saveWorkflowDocument(dataToSave, uniqueItems);
            if (error) throw error;
            if (isNew) navigate(`/workflows/editor/${type}/${data.id}`, { replace: true });
            else {
                alert('Saved successfully');
                fetchDocument();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRevision = async () => {
        if (isNew) return;
        if (!confirm('This will create a new draft revision of this document. Continue?')) return;
        setSaving(true);
        try {
            const { data } = await createDocumentRevision(id);
            navigate(`/workflows/editor/${type}/${data.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to create revision');
        } finally {
            setSaving(false);
        }
    };

    const handleConvertToJob = async () => {
        // Save first to ensure all current edits are captured
        setSaving(true);
        try {
            await handleSave();
            setPoModal({ isOpen: true });
        } catch (err) {
            console.error('Failed to save before conversion:', err);
            alert('Please save the document successfully before converting to job.');
        } finally {
            setSaving(false);
        }
    };

    const confirmJobConversion = async (poData, options) => {
        setSaving(true);
        try {
            const { jobNo } = await convertQuotationToJob(id, poData, options);
            alert(`Job ${jobNo} created successfully with all associated documents!`);
            setPoModal({ isOpen: false });
            fetchDocument(); // Refresh to show job info
        } catch (err) {
            console.error(err);
            alert('Failed to convert to job: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleConvertToTaxInvoice = async () => {
        if (isNew) return;
        if (!window.confirm('Convert this Proforma Invoice to a Tax Invoice?')) return;
        
        setSaving(true);
        try {
            const savedInv = await convertProformaToTaxInvoice(id);
            alert(`Tax Invoice ${savedInv.document_no} created successfully!`);
            navigate(`/workflows/editor/tax-invoice/${savedInv.id}`);
        } catch (err) {
            console.error(err);
            alert('Failed to convert to Tax Invoice: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };


    const handlePrint = async () => {
        if (isNew) {
            alert('Please Save the document first to preview and print.');
            return;
        }
        window.open(`/workflows/print/${id}`, '_blank');
    };

    const handleEmail = async () => {
        const partner = partners.find(p => p.id === formData.partner_id);
        const contact = contacts.find(c => c.id === formData.contact_id);

        const recipient = contact?.email || partner?.email1 || '';
        const subject = `${formData.document_type} ${formData.document_no}: ${formData.subject || ''}`;

        // Build items list for email body
        let itemsContent = "";
        if (lineItems.length > 0) {
            itemsContent = "\n\nQUOTATION DETAILS:\n" +
                "--------------------------------------------------\n" +
                "Description".padEnd(30) + "Qty".padStart(8) + "Total".padStart(12) + "\n" +
                "--------------------------------------------------\n";

            lineItems.forEach(item => {
                if (item.is_section) {
                    itemsContent += `\n[ ${item.description.toUpperCase()} ]\n`;
                } else if (item.is_note) {
                    itemsContent += `Note: ${item.description}\n`;
                } else {
                    const desc = (item.description || "").substring(0, 28).padEnd(30);
                    const qty = (item.quantity?.toString() || "0").padStart(8);
                    const amount = (parseFloat(item.amount || 0).toFixed(2)).padStart(12);
                    itemsContent += `${desc}${qty}${amount}\n`;
                }
            });

            itemsContent += "--------------------------------------------------\n";
            itemsContent += `TOTAL: ${formData.currency} ${(formData.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }).padStart(10)}\n`;
            itemsContent += "--------------------------------------------------\n";
        }

        const footer = `\n\nBest Regards,\n\n${formData.salesperson_name || 'CEL-RON Team'}\n${settings?.company_name || 'CEL-RON ENTERPRISES PTE LTD'}\n${settings?.address || ''}\nEmail: ${settings?.sales_email || 'sales@celron.net'} | Tel: ${settings?.phone || ''}`;

        const effectiveType = (formData.document_type === 'Quotation' && (formData.document_no || '').startsWith('ORA')) ? 'Order Acknowledgment' : formData.document_type;
        const body = `Dear ${contact?.name || 'Customer'},\n\nPlease find attached the ${effectiveType} (${formData.document_no}) for your review.${itemsContent}${footer}`;

        setEmailPreview({ to: recipient, cc: '', bcc: 'celron.simlim0305@gmail.com; accounts@celron.net', subject, body, attachments: [] });
    };

    const attachDocumentFromSuite = async (doc) => {
        if (saving) return;
        setSaving(true);
        try {
            const filename = `${doc.document_type}_${doc.document_no}.pdf`;
            
            // If already attached, skip
            if (emailPreview.attachments?.find(a => a.name === filename)) {
                alert('Already attached.');
                return;
            }

            console.log(`Attaching ${doc.document_no} to email...`);
            
            // Check if we can fetch from Drive first (faster)
            let fileBlob = null;
            try {
                const token = getStoredToken();
                const rootId = await ensureJobFolder();
                if (rootId) {
                    const foldersToCheck = ['1. Enquiries & Quotations', '3. Operations & Logistics', '4. Finance & Invoices'];
                    for (const folderName of foldersToCheck) {
                        const folderId = await getOrCreateFolder(token, folderName, rootId);
                        const folderFiles = await listFolderContent(token, folderId);
                        const match = folderFiles.find(f => f.name === `${doc.document_no}.pdf` || f.name === filename);
                        if (match) {
                            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${match.id}?alt=media`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            fileBlob = await response.blob();
                            break;
                        }
                    }
                }
            } catch (driveErr) {
                console.warn('Drive fetch failed, falling back to on-the-fly generation:', driveErr);
            }

            // Fallback: Generate PDF on the fly
            if (!fileBlob) {
                const { data: fullDoc, error } = await getWorkflowDocumentById(doc.id);
                if (error) throw error;
                if (!fullDoc) throw new Error("Document data not found in database.");
                
                fileBlob = await generateSleekPDF({
                    ...fullDoc,
                    items: fullDoc.items || [],
                    partners: partners.find(p => p.id === fullDoc.partner_id),
                    vessels: vessels.find(v => v.id === fullDoc.vessel_id),
                    work_locations: workLocations.find(wl => wl.id === fullDoc.work_location_id)
                }, settings, 'blob');
            }

            const file = new File([fileBlob], filename, { type: 'application/pdf' });
            setEmailPreview(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), file]
            }));
            
        } catch (err) {
            console.error('Failed to attach document:', err);
            alert('Failed to attach: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const attachGalleryFile = async (fileInfo) => {
        if (saving) return;
        setSaving(true);
        try {
            const token = getStoredToken();
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileInfo.id}?alt=media`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await response.blob();
            const file = new File([blob], fileInfo.name, { type: fileInfo.mimeType });
            
            setEmailPreview(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), file]
            }));
        } catch (err) {
            console.error('Failed to attach gallery photo:', err);
            alert('Failed to attach photo');
        } finally {
            setSaving(false);
        }
    };

    const handleWhatsApp = async () => {
        if (isNew) {
            alert('Please Save the document first to share.');
            return;
        }
        setWhatsappShareModal({ isOpen: true });
    };

    const performWhatsAppShare = async (customMessage, phone = null) => {
        setSaving(true);
        try {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            let popup = null;
            // On desktop, we MUST open the popup immediately before any async await to avoid popup blockers
            if (!isMobile && phone) {
                const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(customMessage || '')}`;
                popup = window.open(waUrl, '_blank');
            }

            // High Fidelity PDF Generation from the unified layout
            console.log('Generating high-fidelity PDF from layout...');
            const element = printRef.current;
            const opt = {
                margin: [5, 5, 5, 5],
                filename: `${(formData.document_type === 'Quotation' && (formData.document_no || '').startsWith('ORA')) ? 'Order Acknowledgment' : formData.document_type}_${(formData.document_no || 'Draft').replace(/[/\\?%*:|"<>]/g, '-')}.pdf`,
                image: { type: 'jpeg', quality: 0.92 },
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    scrollY: 0,
                    windowWidth: 1000 
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            if (isMobile && navigator.share && navigator.canShare && !phone) {
                // Use native share on mobile when no specific phone is targeted
                const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
                const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: opt.filename, text: customMessage || '' });
                } else {
                    await html2pdf().set(opt).from(element).save();
                    alert("PDF downloaded! Please attach it manually to your WhatsApp chat.");
                }
            } else {
                // On Desktop, or when targeting a specific phone: Download PDF directly using html2pdf's built-in save
                await html2pdf().set(opt).from(element).save();

                if (!phone) {
                    alert("PDF downloaded! Please attach it manually to your WhatsApp chat.");
                }
            }
        } catch (err) {
            console.error('[WhatsApp Share] Direct file share failed:', err);
            alert(`Failed to share or download PDF. Error: ${err.message || err}`);
        } finally {
            setSaving(false);
        }
    };

    const sendEmail = async () => {
        setSaving(true);
        try {
            const newStatus = formData.status === 'Draft' ? 'Sent' : formData.status;
            const updatedData = { ...formData, status: newStatus };
            setFormData(updatedData);

            if (!isNew) {
                const dataToSave = { ...updatedData, company_id: profile.company_id };
                await saveWorkflowDocument(dataToSave, lineItems);
            }

            // High Fidelity PDF Generation from the unified layout
            console.log('Generating high-fidelity PDF from layout...');
            const element = printRef.current;
            const opt = {
                margin: [5, 5, 5, 5], // Reduced margin to avoid overflow
                filename: `${formData.document_type}_${formData.document_no || 'Draft'}.pdf`,
                image: { type: 'jpeg', quality: 0.92 }, // Balanced quality for memory efficiency
                html2canvas: { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    scrollY: 0,
                    windowWidth: 1000 // Force a consistent width for rendering
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // Convert to Base64 via html2pdf blob
            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
            const reader = new FileReader();
            const b64Pdf = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(pdfBlob);
            });

            // Determine sender based on document type
            const isAccountDoc = ['Invoice', 'Receipt', 'Credit Note'].includes(formData.document_type);
            const fallbackSalesEmail = settings?.sales_email || 'sales@celron.net';
            const fallbackAccountsEmail = settings?.accounts_email || 'accounts@celron.net';
            const fromEmail = isAccountDoc ? fallbackAccountsEmail : fallbackSalesEmail;

            const systemPdf = {
                name: `${formData.document_type}_${formData.document_no || 'Draft'}.pdf`,
                content: `base64,${b64Pdf}`,
                type: 'application/pdf'
            };

            // Format custom attachments
            const customAttachments = await Promise.all((emailPreview.attachments || []).map(async (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve({ name: file.name, type: file.type, content: e.target.result });
                    reader.readAsDataURL(file);
                });
            }));

            // Call real backend API
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company_id: profile.company_id,
                    from_email: fromEmail,
                    to: emailPreview.to,
                    cc: emailPreview.cc,
                    bcc: emailPreview.bcc,
                    subject: emailPreview.subject,
                    body: emailPreview.body,
                    attachments: [systemPdf, ...customAttachments]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            alert(`Email dispatched successfully with high-fidelity PDF attachment!`);
            setEmailPreview(null);
        } catch (err) {
            console.error('Failed to send email:', err);
            alert(`Failed to send email: ${err.message || 'Please try again.'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center py-20">Loading Document...</div>;

    const renderModalContent = () => {
        const initialData = modal.initialData;
        switch (modal.type) {
            case 'partner_id':
            case 'contact_id':
                // For either partner or contact, we now show both side-by-side
                const partner = partners.find(p => p.id === formData.partner_id) || (modal.type === 'partner_id' ? initialData : null);
                const contact = contacts.find(c => c.id === formData.contact_id) || (modal.type === 'contact_id' ? initialData : null);
                
                return (
                    <QuickPartnerContactDualAdd 
                        company_id={profile.company_id} 
                        initialPartner={partner || (['Enquiry', 'Purchase Order', 'RFQ'].includes(formData.document_type) ? { types: ['Supplier'] } : { types: ['Customer'] })}
                        initialContact={contact}
                        partners={partners}
                        onSuccess={handleQuickAddSuccess} 
                        onCancel={() => setModal({ isOpen: false, type: null })} 
                    />
                );
            case 'vessel_id':
                return <QuickVesselAdd company_id={profile.company_id} initialData={initialData} onSuccess={handleQuickAddSuccess} onCancel={() => setModal({ isOpen: false, type: null })} />;
            case 'work_location_id':
                return <QuickWorkLocationAdd company_id={profile.company_id} initialData={initialData} onSuccess={handleQuickAddSuccess} onCancel={() => setModal({ isOpen: false, type: null })} />;
            default:
                return null;
        }
    };

    const getModalTitle = () => {
        switch (modal.type) {
            case 'partner_id': 
            case 'contact_id': return 'Customer & Contact Management';
            case 'vessel_id': return 'Add New Vessel';
            case 'work_location_id': return 'Add New Location';
            default: return '';
        }
    };

    const getModalIcon = () => {
        switch (modal.type) {
            case 'partner_id': return User;
            case 'contact_id': return Users;
            case 'vessel_id': return Ship;
            case 'work_location_id': return MapPin;
            default: return Settings;
        }
    };

    return (
        <div className="workflow-editor-theme" style={{ overflow: 'visible' }}>
            {/* Header / Actions */}
            <header className="editor-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="icon-btn" onClick={() => navigate('/workflows')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                            {formData.document_type === 'Enquiry' ? 'Enquiry to Supplier' : 
                             (formData.document_type === 'Quotation' && (formData.document_no || '').startsWith('ORA')) ? 'Order Acknowledgment' : 
                             formData.document_type}
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formData.document_no || 'Draft'}</h1>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-vibrant" onClick={handleSave} disabled={saving}>
                        <Save size={18} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn-vibrant-secondary" onClick={handlePrint}>
                        <Printer size={18} /> Print PDF
                    </button>
                    <button className="btn-vibrant-secondary" onClick={handleEmail}>
                        <Send size={18} /> Send by Email
                    </button>
                    <button className="btn-vibrant-secondary" style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={handleWhatsApp}>
                        <MessageSquare size={18} /> Share via WhatsApp
                    </button>
                    {!isNew && (
                        <button className="btn-vibrant-secondary" onClick={handleRevision}>
                            <FileText size={18} /> Create Revision
                        </button>
                    )}
                    {!isNew && (formData.document_type?.toUpperCase() === 'QUOTATION' || formData.document_type?.toUpperCase() === 'ENQUIRY') && (
                        <button 
                            className="btn-vibrant" 
                            onClick={handleConvertToJob} 
                            disabled={saving || formData.is_job} 
                            style={{ 
                                background: formData.is_job ? '#94a3b8' : '#10b981', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                opacity: (saving || formData.is_job) ? 0.7 : 1,
                                cursor: formData.is_job ? 'default' : 'pointer'
                            }}
                        >
                            {formData.is_job ? <FileCheck size={18} /> : <Package size={18} />} 
                            {formData.is_job ? 'Already Job' : (saving ? 'Processing...' : 'Convert to Job')}
                        </button>
                    )}
                    {!isNew && formData.document_type === 'Proforma Invoice' && (
                        <button 
                            className="btn-vibrant" 
                            onClick={handleConvertToTaxInvoice} 
                            disabled={saving} 
                            style={{ 
                                background: '#ef4444', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            <FileText size={18} /> {saving ? 'Converting...' : 'Convert to Tax Invoice'}
                        </button>
                    )}

                    <button className="icon-btn" onClick={() => navigate('/workflows')}>
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Breadcrumb Status */}
            <div className="status-container">
                <div className={`status-step ${formData.status === 'Draft' ? 'active' : ''}`}>Draft</div>
                <div className={`status-step ${formData.status === 'Sent' ? 'active' : ''}`}>Sent</div>
                <div className={`status-step ${formData.status === 'Confirmed' ? 'active' : 'confirmed'}`}>Confirmed</div>
                <div className={`status-step ${formData.status === 'Cancelled' ? 'cancelled' : ''}`}>Cancelled</div>
            </div>

            <div className="editor-content">
                {/* Header Info Panel */}
                <div className="glass-panel header-panel">
                    <div className="input-grid">
                        <div className="col-left">
                            <div className="form-item">
                                <label><User size={14} /> {formData.document_type === 'Purchase Order' ? 'Supplier' : 'Customer'}</label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <select className="form-select" name="partner_id" value={formData.partner_id} onChange={handleHeaderChange} style={{ flex: 1 }}>
                                            <option value="">Choose {formData.document_type === 'Purchase Order' ? 'supplier' : 'partner'}...</option>
                                            <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New {formData.document_type === 'Purchase Order' ? 'Supplier' : 'Customer'}</option>
                                            {partners
                                                .filter(p => formData.document_type !== 'Purchase Order' || p.category === 'Supplier')
                                                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <button 
                                            className="icon-btn" 
                                            onClick={() => setModal({ isOpen: true, type: 'partner_id' })}
                                            style={{ padding: '8px', background: '#f8fafc' }}
                                            title="Add New Partner"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {formData.partner_id && (
                                        <button className="btn-edit-inline" onClick={() => handleEditMaster('partner_id')} title="Edit Customer">
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="form-item">
                                <label><MoreHorizontal size={14} /> Contact Person</label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <select className="form-select" name="contact_id" value={formData.contact_id} onChange={handleHeaderChange} style={{ flex: 1 }}>
                                            <option value="">Choose contact...</option>
                                            <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New Contact</option>
                                            {contacts
                                                .filter(c => !formData.partner_id || c.partnerId === formData.partner_id)
                                                .map(c => {
                                                    const pName = partners.find(p => p.id === c.partnerId)?.name;
                                                    return <option key={c.id} value={c.id}>{c.name} {pName ? `(${pName})` : ''}</option>;
                                                })}
                                        </select>
                                        <button 
                                            className="icon-btn" 
                                            onClick={() => setModal({ isOpen: true, type: 'contact_id' })}
                                            style={{ padding: '8px', background: '#f8fafc' }}
                                            title="Add New Contact"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {formData.contact_id && (
                                        <button className="btn-edit-inline" onClick={() => handleEditMaster('contact_id')} title="Edit Contact">
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="form-item">
                                <label><FileText size={14} /> Subject / Project Name</label>
                                <input type="text" className="form-input" name="subject" value={formData.subject} onChange={handleHeaderChange} placeholder="What is this for?" />
                            </div>
                            <div className="form-item">
                                <label><User size={14} /> Salesperson (Assigned)</label>
                                <select 
                                    className="form-select" 
                                    name="salesperson_name" 
                                    value={formData.salesperson_name} 
                                    onChange={(e) => {
                                        const selected = staff.find(s => s.full_name === e.target.value);
                                        if (selected) {
                                            setFormData(prev => ({
                                                ...prev,
                                                salesperson_name: selected.full_name,
                                                salesperson_phone: selected.phone || '',
                                                salesperson_email: selected.professional_email || selected.email || ''
                                            }));
                                        } else {
                                            handleHeaderChange(e);
                                        }
                                    }}
                                >
                                    <option value="">-- Choose Salesperson --</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.full_name}>{s.full_name} ({s.designation || 'Staff'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="col-right">
                            {formData.is_job && (
                                <div className="form-item" style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
                                    <label style={{ color: '#166534' }}><Package size={14} /> Assigned Job Number</label>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#15803d' }}>{formData.assigned_job_no}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '4px' }}>
                                        Linked Project Folder: {formData.drive_folder_id ? (
                                            <a href={`https://drive.google.com/drive/folders/${formData.drive_folder_id}`} target="_blank" rel="noreferrer" className="text-accent underline">Open Drive</a>
                                        ) : 'Provisioning on save...'}
                                    </div>
                                </div>
                            )}
                            <div className="form-item">
                                <label>Date</label>
                                <input type="date" className="form-input" name="issue_date" value={formData.issue_date} onChange={handleHeaderChange} />
                            </div>
                            <div className="form-item">
                                <label>Expiration / Due Date</label>
                                <input type="date" className="form-input" name="expiry_date" value={formData.expiry_date} onChange={handleHeaderChange} />
                            </div>
                            <div className="form-item">
                                <label><Ship size={14} /> Vessel / Service Location</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <select 
                                            className="form-select" 
                                            name="vessel_id" 
                                            value={formData.vessel_id} 
                                            onChange={(e) => {
                                                if (e.target.value === 'ADD_NEW') {
                                                    setModal({ isOpen: true, type: 'vessel_id' });
                                                } else {
                                                    handleHeaderChange(e);
                                                }
                                            }} 
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">[Vessel]</option>
                                            <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New Vessel</option>
                                            {vessels.map(v => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                                        </select>
                                        {formData.vessel_id && (
                                            <button 
                                                className="btn-edit-inline"
                                                onClick={() => handleEditMaster('vessel_id')}
                                                title="Edit Vessel"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <select 
                                            className="form-select" 
                                            name="work_location_id" 
                                            value={formData.work_location_id} 
                                            onChange={(e) => {
                                                if (e.target.value === 'ADD_NEW') {
                                                    setModal({ isOpen: true, type: 'work_location_id' });
                                                } else {
                                                    handleHeaderChange(e);
                                                }
                                            }} 
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">[Workplace]</option>
                                            <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New Workplace</option>
                                            {workLocations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
                                        </select>
                                        {formData.work_location_id && (
                                            <button 
                                                className="btn-edit-inline"
                                                onClick={() => handleEditMaster('work_location_id')}
                                                title="Edit Workplace"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {formData.document_type === 'Delivery Order' && (
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '8px' }}>Delivery Details</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            name="delivery_verification.delivery_address" 
                                            value={formData.delivery_verification?.delivery_address || ''} 
                                            onChange={handleHeaderChange} 
                                            placeholder="Delivery Address" 
                                            style={{ fontSize: '12px', padding: '6px 10px' }}
                                        />
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            name="delivery_verification.delivery_pic" 
                                            value={formData.delivery_verification?.delivery_pic || ''} 
                                            onChange={handleHeaderChange} 
                                            placeholder="Person in Charge (PIC)" 
                                            style={{ fontSize: '12px', padding: '6px 10px' }}
                                        />
                                    </div>
                                </div>
                            )}

                             <div className="form-item">
                                <label>Currency</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select className="form-select" name="currency" value={formData.currency} onChange={handleHeaderChange} style={{ flex: 1 }}>
                                        <option value="SGD">SGD - Singapore Dollar</option>
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="INR">INR - Indian Rupee</option>
                                        <option value="MYR">MYR - Malaysian Ringgit</option>
                                        <option value="JPY">JPY - Japanese Yen</option>
                                        <option value="CHF">CHF - Swiss Franc</option>
                                        <option value="CAD">CAD - Canadian Dollar</option>
                                        <option value="AUD">AUD - Australian Dollar</option>
                                        <option value="CNY">CNY - Chinese Yuan</option>
                                        <option value="HKD">HKD - Hong Kong Dollar</option>
                                        <option value="NZD">NZD - New Zealand Dollar</option>
                                        <option value="KRW">KRW - South Korean Won</option>
                                        <option value="AED">AED - UAE Dirham</option>
                                        <option value="SAR">SAR - Saudi Riyal</option>
                                        <option value="THB">THB - Thai Baht</option>
                                        <option value="IDR">IDR - Indonesian Rupiah</option>
                                        <option value="PHP">PHP - Philippine Peso</option>
                                        <option value="VND">VND - Vietnamese Dong</option>
                                    </select>
                                    {formData.currency !== 'SGD' && (
                                        <div style={{ position: 'relative', width: '120px' }}>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                name="exchange_rate" 
                                                value={formData.exchange_rate} 
                                                onChange={handleHeaderChange} 
                                                placeholder="Rate" 
                                                step="0.0001"
                                                title="Exchange rate to SGD"
                                            />
                                            <button 
                                                onClick={handleAiFetchExchangeRate} 
                                                disabled={isFetchingRate}
                                                style={{ 
                                                    position: 'absolute', 
                                                    right: '4px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--accent)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '4px'
                                                }}
                                            >
                                                {isFetchingRate ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {formData.currency !== 'SGD' && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                                        1 {formData.currency} = {formData.exchange_rate} SGD
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Action Tabs */}
                <div className="tab-container">
                    <button className={`tab ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>Order Lines</button>
                    <button className={`tab ${activeTab === 'other' ? 'active' : ''}`} onClick={() => setActiveTab('other')}>Other Info</button>
                            {formData.assigned_job_no && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className={`tab ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}>Workflow Suite</button>
                             <button className={`tab ${activeTab === 'po' ? 'active' : ''}`} onClick={() => setActiveTab('po')}>PO Details</button>
                            <button className={`tab ${activeTab === 'costing' ? 'active' : ''}`} onClick={() => setActiveTab('costing')}>Project Costing</button>
                            <button className={`tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>Payments & GST</button>
                            <button className={`tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>Job Gallery</button>
                            <button className={`tab ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveTab('explorer')}>Explorer</button>
                        </div>
                    )}
                </div>

                {activeTab === 'gallery' && (
                    <div className="glass-panel job-gallery animate-fade-in">
                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Ship size={20} className="text-accent" />
                                <h3 style={{ margin: 0 }}>Job Photos & Media</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {loadingGallery && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: `${galleryUploadProgress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s ease' }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)' }}>{galleryUploadProgress}%</span>
                                    </div>
                                )}
                                {galleryUploadSuccess && (
                                    <div className="animate-bounce" style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                                        <FileCheck size={18} /> Upload Success!
                                    </div>
                                )}
                                <label className="btn btn-primary" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                    <Upload size={16} /> Upload Photo
                                    {loadingGallery && <div className="btn-loading-overlay" />}
                                    <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        // For simplicity, we handle one by one or we could implement a queue
                                        // Here we'll just process them sequentially to show progress for each
                                        const uploadSequence = async () => {
                                            for (const f of files) {
                                                await handleGalleryUpload(f);
                                            }
                                        };
                                        uploadSequence();
                                    }} />
                                </label>
                            </div>
                        </div>

                        {loadingGallery && galleryFiles.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <div className="upload-animation-ring">
                                    <div />
                                    <div />
                                    <div />
                                    <div />
                                </div>
                                <p style={{ marginTop: '24px', fontWeight: 600 }}>Uploading to Drive...</p>
                                <style>{`
                                    .upload-animation-ring { display: inline-block; position: relative; width: 80px; height: 80px; }
                                    .upload-animation-ring div { box-sizing: border-box; display: block; position: absolute; width: 64px; height: 64px; margin: 8px; border: 8px solid var(--accent); border-radius: 50%; animation: upload-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; border-color: var(--accent) transparent transparent transparent; }
                                    .upload-animation-ring div:nth-child(1) { animation-delay: -0.45s; }
                                    .upload-animation-ring div:nth-child(2) { animation-delay: -0.3s; }
                                    .upload-animation-ring div:nth-child(3) { animation-delay: -0.15s; }
                                    @keyframes upload-ring { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                `}</style>
                            </div>
                        ) : galleryFiles.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #cbd5e1' }}>
                                <Ship size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>No photos uploaded yet for this job.</p>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>Capture and upload job progress photos directly here.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                                {galleryFiles.map(file => (
                                    <div key={file.id} className="gallery-item" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', aspectRatio: '4/3', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'transform 0.2s' }}>
                                        <img 
                                            src={file.thumbnailLink?.replace('=s220', '=s600')} 
                                            alt={file.name} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                        <div className="gallery-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                            <a href={file.webViewLink} target="_blank" rel="noreferrer" style={{ color: '#fff', padding: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}><ExternalLink size={20} /></a>
                                        </div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                                            {file.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <style>{`
                            .gallery-item:hover .gallery-overlay { opacity: 1; } 
                            .gallery-item:hover { transform: translateY(-4px); }
                            .btn-loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.3); animation: pulse 1.5s infinite; }
                            @keyframes pulse { 0% { opacity: 0.2; } 50% { opacity: 0.5; } 100% { opacity: 0.2; } }
                        `}</style>
                    </div>
                )}

                {activeTab === 'costing' && (
                    <div className="glass-panel project-costing">
                        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Calculator size={20} className="text-accent" />
                                <h3 style={{ margin: 0 }}>Project Costing & Profit Summary</h3>
                            </div>
                            <button className="btn btn-primary" onClick={addExpenseRow}>
                                <Plus size={16} /> Add Expense
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Total Revenue</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
                                    {formData.currency} {formData.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div style={{ background: '#fff1f2', padding: '20px', borderRadius: '16px', border: '1px solid #fecdd3' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase', marginBottom: '8px' }}>Total Expenses</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#9f1239' }}>
                                    {formData.currency} {expenses.reduce((acc, curr) => acc + (parseFloat(curr.grand_total) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            {(() => {
                                const totalRevenue = parseFloat(formData.total_amount) || 0;
                                const totalExpenses = expenses.reduce((acc, curr) => acc + (parseFloat(curr.grand_total) || 0), 0);
                                const profit = totalRevenue - totalExpenses;
                                const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
                                return (
                                    <>
                                        <div style={{ background: profit >= 0 ? '#f0fdf4' : '#fff1f2', padding: '20px', borderRadius: '16px', border: `1px solid ${profit >= 0 ? '#bbf7d0' : '#fecdd3'}` }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: profit >= 0 ? '#15803d' : '#be123c', textTransform: 'uppercase', marginBottom: '8px' }}>Gross Profit</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: profit >= 0 ? '#166534' : '#9f1239' }}>
                                                {formData.currency} {profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div style={{ background: profit >= 0 ? '#ecfdf5' : '#fff7ed', padding: '20px', borderRadius: '16px', border: `1px solid ${profit >= 0 ? '#d1fae5' : '#ffedd5'}` }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: profit >= 0 ? '#047857' : '#c2410c', textTransform: 'uppercase', marginBottom: '8px' }}>Profit Margin</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: profit >= 0 ? '#065f46' : '#9a3412' }}>
                                                {margin.toFixed(1)}%
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Expense Table */}
                        <div className="table-container" style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '200px' }}>Supplier</th>
                                        <th style={{ width: '120px' }}>Inv No</th>
                                        <th style={{ width: '130px' }}>Date</th>
                                        <th>Description</th>
                                        <th style={{ width: '100px', textAlign: 'right' }}>Grand Total</th>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Bill</th>
                                        <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingExpenses ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading expenses...</td></tr>
                                    ) : expenses.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No expenses recorded yet. Click "Add Expense" to start.</td></tr>
                                    ) : (
                                        expenses.map((exp, idx) => (
                                            <tr key={exp.id}>
                                                <td style={{ fontWeight: 600 }}>{partners.find(p => p.id === exp.supplier_id)?.name || 'Unknown Supplier'}</td>
                                                <td>{exp.invoice_no || '-'}</td>
                                                <td>{exp.invoice_date ? new Date(exp.invoice_date).toLocaleDateString() : '-'}</td>
                                                <td>{exp.description}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                                                    {formData.currency} {(parseFloat(exp.grand_total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {exp.bill_url ? (
                                                        <a href={exp.bill_url} target="_blank" rel="noreferrer" title="View Bill" style={{ color: '#10b981' }}><FileCheck size={18} /></a>
                                                    ) : <span style={{ color: '#cbd5e1' }}><Paperclip size={18} /></span>}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button className="btn-icon" onClick={() => setExpenseModal({ isOpen: true, data: exp })} title="Edit Expense" style={{ color: 'var(--accent)' }}>
                                                            <FileText size={16} />
                                                        </button>
                                                        <button className="btn-icon" onClick={() => handleDeleteExpense(idx)} title="Delete Record" style={{ color: '#ef4444' }}>
                                                            <Trash2 size={16} />
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
                )}

                {activeTab === 'items' && (
                    <div className="items-editor">
                        <table className="editor-table">
                            <thead>
                                <tr>
                                    <th style={{ width: formData.document_type === 'Enquiry' ? '70%' : '40%' }}>Product / Description</th>
                                    <th style={{ width: '8%' }}>Quantity</th>
                                    <th style={{ width: '12%' }}>Unit</th>
                                    {formData.document_type !== 'Enquiry' && (
                                        <>
                                            <th style={{ width: '12%' }}>Unit Price</th>
                                            <th style={{ width: '10%' }}>Taxes</th>
                                            <th style={{ width: '10%' }}>Amount</th>
                                        </>
                                    )}
                                    <th style={{ width: '8%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, index) => (
                                    <tr key={item.id} className={item.is_section ? 'row-section' : item.is_note ? 'row-note' : ''}>
                                        <td>
                                            {item.is_note ? (
                                                <textarea
                                                    className="table-input"
                                                    style={{ resize: 'vertical', minHeight: '40px' }}
                                                    value={item.description}
                                                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                                    placeholder="Note: e.g. Lead time 1 week"
                                                    rows={2}
                                                />
                                            ) : (
                                                <input
                                                    className="table-input"
                                                    value={item.description}
                                                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                                    placeholder={item.is_section ? "SECTION: e.g. Spare Parts" : "Select product or enter description..."}
                                                />
                                            )}
                                            {!item.is_section && !item.is_note && (
                                                <textarea
                                                    className="table-textarea"
                                                    value={item.details || ''}
                                                    onChange={(e) => updateLineItem(index, 'details', e.target.value)}
                                                    placeholder="Add technical details, specifications..."
                                                />
                                            )}
                                        </td>
                                        <td>
                                            {!item.is_section && !item.is_note && (
                                                <input
                                                    type="number"
                                                    className="table-input center"
                                                    value={item.quantity}
                                                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                                                />
                                            )}
                                        </td>
                                        <td>
                                            {!item.is_section && !item.is_note && (
                                                <select
                                                    className="table-input"
                                                    value={item.uom || 'UNIT(S)'}
                                                    onChange={(e) => updateLineItem(index, 'uom', e.target.value)}
                                                >
                                                    {ITEM_UNITS.map(unit => (
                                                        <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                        {formData.document_type !== 'Enquiry' && (
                                            <>
                                                <td>
                                                    {!item.is_section && !item.is_note && (
                                                        <input
                                                            type="number"
                                                            className="table-input right"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="center">
                                                    {!item.is_section && !item.is_note && (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={item.tax_enabled !== false}
                                                                onChange={(e) => updateLineItem(index, 'tax_enabled', e.target.checked)}
                                                                title="Enable/Disable Tax"
                                                            />
                                                            <input
                                                                type="number"
                                                                className="table-input center"
                                                                style={{ width: '45px', padding: '4px' }}
                                                                value={item.tax_rate ?? 9}
                                                                onChange={(e) => updateLineItem(index, 'tax_rate', e.target.value)}
                                                                min="1" max="100"
                                                                disabled={item.tax_enabled === false}
                                                            /> %
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="right font-bold">
                                                    {formData.currency} {(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </>
                                        )}
                                        <td className="center">
                                            <button className="del-btn" onClick={() => removeLineItem(index)}><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="table-actions">
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="add-btn" onClick={() => addLineItem('item')}><Plus size={14} /> Add a product</button>
                                <button className="add-btn" onClick={() => addLineItem('section')}>Add a section</button>
                                <button className="add-btn" onClick={() => addLineItem('note')}>Add a note</button>
                                <button className="add-btn" onClick={() => setShowOCRModal(true)} style={{ color: '#8b5cf6', fontWeight: 700 }}>
                                    <Sparkles size={14} /> Image to Items
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="add-btn catalog-btn" onClick={() => setShowCatalogDropdown(!showCatalogDropdown)}>
                                            <Package size={14} /> From Catalog
                                        </button>
                                        <button
                                            className="add-btn"
                                            onClick={() => navigate('/catalog/new')}
                                            title="Add new item to catalog"
                                            style={{ padding: '4px', opacity: 0.7 }}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    {showCatalogDropdown && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, zIndex: 50,
                                            minWidth: '380px', maxHeight: '380px', marginTop: '4px',
                                            background: '#fff', border: '1px solid #e2e8f0',
                                            borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                                            overflow: 'hidden', display: 'flex', flexDirection: 'column'
                                        }}>
                                            {/* Header with search and close */}
                                            <div style={{
                                                padding: '10px 12px', borderBottom: '1px solid #e2e8f0',
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                background: '#f8fafc'
                                            }}>
                                                <input
                                                    type="text"
                                                    placeholder="Search catalog items..."
                                                    value={catalogSearch}
                                                    onChange={(e) => setCatalogSearch(e.target.value)}
                                                    autoFocus
                                                    style={{
                                                        flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0',
                                                        borderRadius: '8px', fontSize: '0.85rem', outline: 'none',
                                                        background: '#fff'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => { setShowCatalogDropdown(false); setCatalogSearch(''); }}
                                                    style={{
                                                        background: '#f1f5f9', border: 'none', borderRadius: '50%',
                                                        width: '30px', height: '30px', display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', color: '#64748b', flexShrink: 0
                                                    }}
                                                    title="Close"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            {/* Items list */}
                                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                                {catalog
                                                    .filter(cat =>
                                                        cat.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                        cat.specification?.toLowerCase().includes(catalogSearch.toLowerCase())
                                                    )
                                                    .map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => { handleAddItemFromCatalog(cat); setCatalogSearch(''); setShowCatalogDropdown(false); }}
                                                            style={{
                                                                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                                                gap: '2px', padding: '10px 14px', width: '100%', textAlign: 'left',
                                                                background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9',
                                                                cursor: 'pointer', transition: 'background 0.15s'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                                        >
                                                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{cat.name}</span>
                                                            {cat.specification && (
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '340px' }}>
                                                                    {cat.specification}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))
                                                }
                                                {catalog.filter(cat =>
                                                    cat.name?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                                                    cat.specification?.toLowerCase().includes(catalogSearch.toLowerCase())
                                                ).length === 0 && (
                                                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                            No items found
                                                        </div>
                                                    )}
                                            </div>
                                            {/* Footer */}
                                            <button
                                                onClick={() => { setShowCatalogDropdown(false); navigate('/catalog'); }}
                                                style={{
                                                    color: 'var(--accent)', fontWeight: 600, borderTop: '1px solid #e2e8f0',
                                                    padding: '10px 14px', background: '#fff', border: 'none',
                                                    cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                            >
                                                View All Catalog (Manage CRUD)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {formData.document_type !== 'Enquiry' && (
                                <div className="summary-box">
                                    <div className="summary-row">
                                        <span>Untaxed Amount:</span>
                                        <span>{formData.currency} {(formData.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="summary-row" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>Discount:</span>
                                            <input 
                                                type="number" 
                                                className="table-input" 
                                                style={{ width: '50px', padding: '2px', borderBottom: '1px solid #ddd' }}
                                                value={formData.discount_percent}
                                                onChange={(e) => setFormData(prev => ({ ...prev, discount_percent: e.target.value, discount_amount: 0 }))}
                                                placeholder="%"
                                            /> %
                                        </div>
                                        <span>- {formData.currency} {(formData.discount_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Taxes:</span>
                                        <span>{formData.currency} {formData.tax_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="summary-total">
                                        <span>Total:</span>
                                        <span>{formData.currency} {(formData.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Terms & Conditions */}
                        <div className="glass-panel" style={{ marginTop: '24px', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '16px', background: '#f8fafc' }}>
                            <div className="form-item" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <div style={{ width: '36px', height: '36px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <FileText size={18} color="#2563eb" />
                                    </div>
                                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a8a', letterSpacing: '-0.01em' }}>Terms & Conditions</span>
                                </label>
                                <div style={{ background: '#fff', borderRadius: '12px', padding: '8px', border: '1px solid #e2e8f0' }}>
                                    <RichTextEditor
                                        value={formData.terms_conditions}
                                        onChange={(val) => handleEditorChange('terms_conditions', val)}
                                        placeholder="Payment terms, delivery details..."
                                        height="160px"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes & Comments */}
                        <div className="glass-panel" style={{ marginTop: '24px', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '16px', background: '#f8fafc' }}>
                            <div className="form-item" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <div style={{ width: '36px', height: '36px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        <FileText size={18} color="#2563eb" />
                                    </div>
                                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e3a8a', letterSpacing: '-0.01em' }}>Notes & Comments</span>
                                </label>
                                <div style={{ background: '#fff', borderRadius: '12px', padding: '8px', border: '1px solid #e2e8f0' }}>
                                    <RichTextEditor
                                        value={formData.notes}
                                        onChange={(val) => handleEditorChange('notes', val)}
                                        placeholder="Add additional notes, technical details, or comments for this document (Included in PDF)..."
                                        height="210px"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'other' && (
                    <div className="glass-panel other-info">
                        <div className="grid-2">
                            <div className="form-item">
                                <label>Company Reference</label>
                                <input type="text" className="form-input" name="customer_ref" value={formData.customer_ref} onChange={handleHeaderChange} placeholder="PO Reference from Customer..." />
                            </div>

                            <div className="form-item">
                                <label>Salesperson Name</label>
                                <input type="text" className="form-input" name="salesperson_name" value={formData.salesperson_name} onChange={handleHeaderChange} placeholder="Your name" />
                            </div>

                            <div className="form-item">
                                <label>Salesperson Phone</label>
                                <input type="text" className="form-input" name="salesperson_phone" value={formData.salesperson_phone} onChange={handleHeaderChange} placeholder="+65 ..." />
                            </div>

                            <div className="form-item">
                                <label>Salesperson Email</label>
                                <input type="text" className="form-input" name="salesperson_email" value={formData.salesperson_email} onChange={handleHeaderChange} placeholder="your@email.com" />
                            </div>
                            
                            <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Paperclip size={16} className="text-accent" />
                                        <span>Documents & Attachments (Saved to GDrive)</span>
                                    </div>
                                    <label style={{ cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Plus size={14} /> Upload File
                                        <input type="file" multiple style={{ display: 'none' }} onChange={async (e) => {
                                            const files = Array.from(e.target.files);
                                            // Handle file upload to GDrive here via workflowV2Service/driveService
                                            alert('GDrive upload integration in progress. Files will be saved to: ' + getGDriveFolderIdForStage(formData.document_type));
                                        }} />
                                    </label>
                                </label>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', minHeight: '60px' }}>
                                    {formData.attachment_urls?.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {formData.attachment_urls.map((url, idx) => (
                                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                    <span style={{ fontSize: '0.85rem' }}>{url.split('/').pop()}</span>
                                                    <a href={url} target="_blank" rel="noreferrer" className="text-accent">View</a>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No attachments yet. Click 'Upload' to add.</div>
                                    )}
                                </div>
                            </div>

                            {(formData.document_type === 'Active Job' || formData.document_type === 'Delivery Order') && (
                                <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <Ship size={18} className="text-accent" />
                                        <span style={{ fontWeight: 700 }}>Mobile Delivery & POD Verification (Future App Integration)</span>
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px' }}>
                                        <div className="form-item">
                                            <label>GPS Coordinates (Stored on Sign-off)</label>
                                            <input type="text" className="form-input" value={formData.gps_coordinates || ''} readOnly placeholder="0.000000, 0.000000" />
                                        </div>
                                        <div className="form-item">
                                            <label>Device ID & Network Timestamp</label>
                                            <input type="text" className="form-input" value={formData.device_id ? `${formData.device_id} @ ${formData.mobile_signed_at}` : ''} readOnly placeholder="Tracking details..." />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label>Delivery Proof Photos (2-4 required)</label>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                                {[1, 2, 3, 4].map(idx => (
                                                    <div key={idx} style={{ width: '120px', height: '90px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                                                        {formData.signature_image_url ? <Package size={24} color="#cbd5e1" /> : <Plus size={24} color="#cbd5e1" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {activeTab === 'workflow' && (
                    <div className="glass-panel workflow-suite">
                        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileCheck size={20} className="text-accent" />
                            <h3 style={{ margin: 0 }}>Documents Linked to Job: <span style={{ color: 'var(--accent)' }}>{formData.assigned_job_no}</span></h3>
                        </div>
                        
                        <div className="table-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Type</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Document No</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Issue Date</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Amount</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Status</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workflowDocs.map(doc => (
                                        <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', background: doc.id === id ? '#f0f9ff' : 'transparent' }}>
                                            <td style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 600 }}>{doc.document_type}</td>
                                            <td style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--accent)' }}>{doc.document_no}</td>
                                            <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(doc.issue_date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontSize: '0.85rem' }}>{doc.currency} {doc.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: doc.status === 'Draft' ? '#f1f5f9' : '#dcfce7', color: doc.status === 'Draft' ? '#64748b' : '#15803d' }}>
                                                    {doc.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                {doc.id !== id ? (
                                                    <button 
                                                        className="btn btn-sm btn-secondary" 
                                                        onClick={() => {
                                                            const targetType = doc.document_type.toLowerCase().replace(/\s+/g, '-');
                                                            navigate(`/workflows/editor/${targetType}/${doc.id}`);
                                                        }}
                                                    >
                                                        Open
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Current</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'po' && (
                    <div className="glass-panel po-details">
                        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Package size={20} className="text-accent" />
                            <h3 style={{ margin: 0 }}>Customer Purchase Order Details</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div className="po-info-group">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="info-item">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>PO Number</label>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{formData.customer_po_no || 'N/A'}</div>
                                    </div>
                                    <div className="info-item">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>PO Date</label>
                                        <div style={{ fontSize: '1rem', color: '#1e293b' }}>
                                            {formData.customer_po_date ? new Date(formData.customer_po_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>PO Value</label>
                                        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                                            {formData.currency} {formData.delivery_verification?.po_value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || formData.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="info-item">
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Issued By</label>
                                        <div style={{ fontSize: '1rem', color: '#1e293b' }}>
                                            {contacts.find(c => c.id === formData.customer_po_by_id)?.name || formData.customer_po_by_id || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="po-description-group">
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Description / Project Scope</label>
                                <div style={{ 
                                    padding: '16px', 
                                    background: '#f8fafc', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.95rem',
                                    lineHeight: '1.5',
                                    color: '#334155',
                                    minHeight: '120px',
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {formData.delivery_verification?.po_description || 'No description provided.'}
                                </div>
                            </div>
                        </div>

                        {formData.customer_po_attachment_url && (
                            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>PO Attachment</label>
                                <a 
                                    href={formData.customer_po_attachment_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '8px', 
                                        padding: '10px 16px', 
                                        background: '#eff6ff', 
                                        color: '#2563eb', 
                                        borderRadius: '8px', 
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        border: '1px solid #bfdbfe'
                                    }}
                                >
                                    <FileText size={18} /> View Signed Purchase Order
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'explorer' && (
                    <div className="glass-panel animate-fade-in" style={{ padding: '32px' }}>
                        {/* Signed Proofs Section */}
                        <div style={{ marginBottom: '32px', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                                    <FileCheck2 size={22} color="#059669" /> Signed Proofs of Delivery / Service
                                </h3>
                                <button 
                                    className="btn btn-sm btn-primary" 
                                    style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    onClick={() => document.getElementById('signed-proof-upload').click()}
                                >
                                    <Upload size={14} /> Upload Signed Copy
                                </button>
                                <input id="signed-proof-upload" type="file" hidden onChange={(e) => handleUploadSignedProofDirect(e.target.files[0])} />
                            </div>

                            {loadingSignedProofs ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={24} className="animate-spin" /></div>
                            ) : signedProofs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>
                                    No signed proofs found in Folder 6. Use the Scanner App or upload here.
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                    {signedProofs.map(proof => (
                                        <div key={proof.id} style={{ background: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <FileCheck size={18} color="#059669" />
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proof.name}</div>
                                            </div>
                                            <a href={proof.webViewLink} target="_blank" rel="noreferrer" style={{ color: '#64748b' }}><ExternalLink size={14} /></a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.document_type === 'Tax Invoice' && (
                                <div style={{ marginTop: '24px', padding: '16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <AlertCircle size={18} color="#d97706" />
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#92400e' }}>Invoice Compliance Check</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309' }}>
                                        {signedProofs.length > 0 
                                            ? `Found ${signedProofs.length} signed proof(s) in Folder 6. Ensure they are attached when emailing the customer.`
                                            : "Warning: No signed Proof of Delivery found in Folder 6. It is highly recommended to upload a signed copy before sending the invoice."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Auth Status Bar */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            background: authStatus === 'connected' ? '#f0fdf4' : '#fef2f2', 
                            padding: '12px 20px', 
                            borderRadius: '12px', 
                            marginBottom: '24px',
                            border: `1px solid ${authStatus === 'connected' ? '#bbf7d0' : '#fecaca'}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: authStatus === 'connected' ? '#22c55e' : '#ef4444' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: authStatus === 'connected' ? '#166534' : '#991b1b' }}>
                                    Google Drive: {authStatus === 'connected' ? 'Connected' : authStatus === 'expired' ? 'Session Expired' : 'Disconnected'}
                                </span>
                            </div>
                            {authStatus !== 'connected' && (
                                <button onClick={handleExplorerReconnect} className="btn btn-sm btn-primary" style={{ fontSize: '0.8rem', padding: '6px 16px' }}>
                                    <RefreshCw size={14} style={{ marginRight: '6px' }} /> Reconnect Now
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button 
                                    onClick={() => handleExplorerBack(explorerPath.length - 2)} 
                                    disabled={explorerPath.length <= 1}
                                    style={{ background: 'none', border: 'none', cursor: explorerPath.length > 1 ? 'pointer' : 'default', color: explorerPath.length > 1 ? 'var(--accent)' : '#cbd5e1' }}
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', fontWeight: 600 }}>
                                    {explorerPath.map((segment, idx) => (
                                        <React.Fragment key={segment.id}>
                                            <span 
                                                onClick={() => handleExplorerBack(idx)}
                                                style={{ cursor: 'pointer', color: idx === explorerPath.length - 1 ? '#1e293b' : '#64748b' }}
                                            >
                                                {segment.name}
                                            </span>
                                            {idx < explorerPath.length - 1 && <span style={{ color: '#cbd5e1' }}>/</span>}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => fetchExplorerFiles()} className="btn btn-secondary" title="Refresh list">
                                    <RefreshCw size={18} className={loadingExplorer ? 'animate-spin' : ''} />
                                </button>
                                <button className="btn btn-primary" onClick={() => document.getElementById('explorer-upload').click()}>
                                    <Upload size={18} /> Upload Files
                                </button>
                                <input id="explorer-upload" type="file" multiple hidden onChange={handleExplorerUpload} />
                            </div>
                        </div>

                        {explorerError && (
                            <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={18} /> {explorerError}
                            </div>
                        )}

                        {loadingExplorer && explorerFiles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
                                <p>Syncing with Google Drive...</p>
                            </div>
                        ) : explorerFiles.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                <Folder size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                <p style={{ fontSize: '1.1rem' }}>This folder is empty.</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Upload drawings, photos, or documents to keep them with this job.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                                {explorerFiles.map(file => (
                                    <div key={file.id} className="glass-panel" style={{ padding: '16px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0', transition: 'transform 0.2s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div 
                                                style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: file.mimeType.includes('folder') ? 'pointer' : 'default', flex: 1, overflow: 'hidden' }}
                                                onClick={() => file.mimeType.includes('folder') && handleExplorerNavigate(file)}
                                            >
                                                {file.mimeType.includes('folder') ? <Folder size={24} color="#6366f1" /> : <FileIcon size={24} color="#64748b" />}
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                                                        {file.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Folder'}</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleExplorerDelete(file.id, file.name)}
                                                style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '4px', cursor: 'pointer' }}
                                                onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                                                onMouseOut={(e) => e.currentTarget.style.color = '#cbd5e1'}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a href={file.webViewLink} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ flex: 1, padding: '6px', fontSize: '0.75rem', gap: '4px' }}>
                                                <ExternalLink size={12} /> View
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Partner Vault Shortcut */}
                        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: '#e0e7ff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={20} color="#4338ca" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Partner Vault Bridge</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quick access to {formData.partners?.name || 'Customer'}'s master documents</div>
                                </div>
                            </div>
                            <button 
                                className="btn btn-secondary" 
                                style={{ fontSize: '0.8rem', gap: '8px' }}
                                onClick={handleOpenPartnerVault}
                            >
                                <ExternalLink size={14} /> Open Partner Folder
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="glass-panel job-payments">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Payments & GST Dashboard</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Reporting Period:</label>
                                <select 
                                    className="form-select" 
                                    value={paymentQuarter} 
                                    onChange={(e) => setPaymentQuarter(e.target.value)}
                                    style={{ width: '150px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="All">Full Project</option>
                                    <option value="Q1">Q1 (Jan - Mar)</option>
                                    <option value="Q2">Q2 (Apr - Jun)</option>
                                    <option value="Q3">Q3 (Jul - Sep)</option>
                                    <option value="Q4">Q4 (Oct - Dec)</option>
                                </select>
                            </div>
                        </div>

                        {/* GST & Financial Summary */}
                        {(() => {
                            const getQuarter = (dateStr) => {
                                const month = new Date(dateStr).getMonth();
                                if (month <= 2) return 'Q1';
                                if (month <= 5) return 'Q2';
                                if (month <= 8) return 'Q3';
                                return 'Q4';
                            };

                            const fCust = paymentQuarter === 'All' ? customerPayments : customerPayments.filter(p => getQuarter(p.payment_date) === paymentQuarter);
                            const fSupp = paymentQuarter === 'All' ? supplierPayments : supplierPayments.filter(p => getQuarter(p.payment_date) === paymentQuarter);
                            
                            const outGst = fCust.reduce((acc, p) => acc + (parseFloat(p.gst_amount) || 0), 0);
                            const inGst = fSupp.reduce((acc, p) => acc + (parseFloat(p.gst_amount) || 0), 0);
                            const netGst = outGst - inGst;

                            return (
                                <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', marginBottom: '8px' }}>Output GST (Collected)</div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e3a8a' }}>
                                            {formData.currency} {outGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#60a5fa', marginTop: '4px' }}>From {fCust.length} receipts</div>
                                    </div>
                                    <div className="summary-card" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', padding: '20px', borderRadius: '16px', border: '1px solid #fed7aa' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', marginBottom: '8px' }}>Input GST (Paid)</div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#7c2d12' }}>
                                            {formData.currency} {inGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#fb923c', marginTop: '4px' }}>From {fSupp.length} invoices</div>
                                    </div>
                                    <div className="summary-card" style={{ background: `linear-gradient(135deg, ${netGst >= 0 ? '#f0fdf4 0%, #dcfce7 100%' : '#fef2f2 0%, #fee2e2 100%'})`, padding: '20px', borderRadius: '16px', border: `1px solid ${netGst >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: netGst >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>Net GST Position</div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 900, color: netGst >= 0 ? '#14532d' : '#7f1d1d' }}>
                                            {formData.currency} {netGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: netGst >= 0 ? '#4ade80' : '#f87171', marginTop: '4px' }}>{netGst >= 0 ? 'Payable to Govt' : 'Claimable Refund'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
                                    {/* Customer Payments (Incoming) */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><CreditCard size={20} className="text-accent" /> Customer Ledger</h3>
                                            <button className="btn btn-sm btn-primary" onClick={() => setPaymentModal({ isOpen: true, type: 'customer', data: null })}>+ Add Payment</button>
                                        </div>
                                        <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead style={{ background: '#f8fafc' }}>
                                                    <tr>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Inv No</th>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                                        <th style={{ padding: '12px', textAlign: 'right' }}>GST</th>
                                                        <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                                                        <th style={{ padding: '12px', textAlign: 'center' }}>Proof</th>
                                                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fCust.length === 0 ? (
                                                        <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No {paymentQuarter === 'All' ? '' : paymentQuarter} payments recorded.</td></tr>
                                                    ) : (
                                                        fCust.map(p => (
                                                            <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '12px' }}>{p.invoice_no}</td>
                                                                <td style={{ padding: '12px' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{p.gst_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{p.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                    {p.proof_url ? (
                                                                        <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ color: '#10b981' }}><FileCheck size={16} /></a>
                                                                    ) : (
                                                                        <label style={{ cursor: 'pointer', color: '#94a3b8' }}>
                                                                            <Upload size={16} />
                                                                            <input type="file" hidden onChange={(e) => handlePaymentProofUpload('customer', p.id, e.target.files[0])} />
                                                                        </label>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                        <button onClick={() => setPaymentModal({ isOpen: true, type: 'customer', data: p })} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}><FileText size={14} /></button>
                                                                        <button onClick={() => handleDeletePayment('customer', p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Supplier Payments (Outgoing) */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={20} className="text-accent" /> Supplier Ledger</h3>
                                            <button className="btn btn-sm btn-primary" onClick={() => setPaymentModal({ isOpen: true, type: 'supplier', data: null })}>+ Add Record</button>
                                        </div>
                                        <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                <thead style={{ background: '#f8fafc' }}>
                                                    <tr>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Supplier / Inv No</th>
                                                        <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                                                        <th style={{ padding: '12px', textAlign: 'right' }}>GST</th>
                                                        <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                                                        <th style={{ padding: '12px', textAlign: 'center' }}>Proof</th>
                                                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fSupp.length === 0 ? (
                                                        <tr><td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No {paymentQuarter === 'All' ? '' : paymentQuarter} records found.</td></tr>
                                                    ) : (
                                                        fSupp.map(p => (
                                                            <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                                                <td style={{ padding: '12px' }}>
                                                                    <div style={{ fontWeight: 600 }}>{partners.find(part => part.id === p.supplier_id)?.name || 'Unknown'}</div>
                                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.invoice_no}</div>
                                                                </td>
                                                                <td style={{ padding: '12px' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', color: '#64748b' }}>{p.gst_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{p.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                                    {p.proof_url ? (
                                                                        <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ color: '#10b981' }}><FileCheck size={16} /></a>
                                                                    ) : (
                                                                        <label style={{ cursor: 'pointer', color: '#94a3b8' }}>
                                                                            <Upload size={16} />
                                                                            <input type="file" hidden onChange={(e) => handlePaymentProofUpload('supplier', p.id, e.target.files[0])} />
                                                                        </label>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '12px', textAlign: 'right' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                                        <button onClick={() => setPaymentModal({ isOpen: true, type: 'supplier', data: p })} style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}><FileText size={14} /></button>
                                                                        <button onClick={() => handleDeletePayment('supplier', p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Quick Add Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ isOpen: false, type: null })}
                title={getModalTitle()}
                icon={getModalIcon()}
                size={(modal.type === 'partner_id' || modal.type === 'contact_id') ? 'xl' : 'md'}
            >
                {renderModalContent()}
            </Modal>

            {/* Job Conversion PO Modal */}
            {poModal.isOpen && (
                <div className="modal-backdrop" style={{ zIndex: 10000 }}>
                    <div className="modal-content" style={{ 
                        maxWidth: '560px', 
                        width: '95%', 
                        background: '#ffffff', 
                        borderRadius: '12px', 
                        padding: '24px', 
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#1e3a8a', fontSize: '1.25rem', fontWeight: 700 }}>
                                <Package size={22} color="#1e3a8a" /> Convert Quotation to Job
                            </h3>
                            <button onClick={() => setPoModal({ isOpen: false })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                                const poData = {
                                    po_no: formData.get('po_no'),
                                    po_date: formData.get('po_date'),
                                    po_value: formData.get('po_value'),
                                    po_description: formData.get('po_description'),
                                    contact_id: formData.get('contact_id')
                                };
                            const options = {
                                includeCertificates: formData.get('includeCertificates') === 'on',
                                includeServiceReport: formData.get('includeServiceReport') === 'on'
                            };
                            confirmJobConversion(poData, options);
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>Customer PO No.</label>
                                    <input type="text" required className="form-input" name="po_no" placeholder="PO-12345" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                </div>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Date</label>
                                    <input type="date" required className="form-input" name="po_date" defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                </div>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Value ({formData.currency})</label>
                                    <input type="number" step="0.01" required className="form-input" name="po_value" defaultValue={formData.total_amount} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }} />
                                </div>
                                <div className="form-item">
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Issued By</label>
                                    <select required className="form-input" name="contact_id" defaultValue={formData.contact_id} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}>
                                        <option value="">-- Select Contact --</option>
                                        {contacts.filter(c => c.partnerId === formData.partner_id).map(c => (
                                            <option key={c.id} value={c.id}>{c.name} {c.designation ? `(${c.designation})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-item" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#374151', marginBottom: '6px', fontWeight: 500 }}>PO Description / Project Scope</label>
                                <textarea className="form-input" name="po_description" rows="3" placeholder="Briefly describe the PO scope..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', resize: 'none' }}></textarea>
                            </div>

                            <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #f3f4f6', marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e40af', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automatically Generate:</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><Package size={16} /> Order Acknowledgment</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><Package size={16} /> Delivery Order</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><Package size={16} /> Proforma Invoice</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><Package size={16} /> Tax Invoice</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46' }}><Package size={16} /> Packing List</div>
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
                                <button type="button" onClick={() => setPoModal({ isOpen: false })} style={{ 
                                    padding: '10px 24px', 
                                    borderRadius: '8px', 
                                    border: '1px solid #d1d5db', 
                                    background: '#ffffff', 
                                    color: '#374151', 
                                    fontSize: '0.95rem', 
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}>Cancel</button>
                                <button type="submit" disabled={saving} style={{ 
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
                                    {saving ? (
                                        <>
                                            <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div> Generating...
                                        </>
                                    ) : 'Confirm & Generate Job'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* Email Preview Modal */}
            {emailPreview && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>

                        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Send size={20} color="#3b82f6" /> Email Preview
                            </h2>
                            <button onClick={() => setEmailPreview(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</label>
                                    <input
                                        type="email"
                                        style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                                        value={emailPreview.to}
                                        onChange={(e) => setEmailPreview(prev => ({ ...prev, to: e.target.value }))}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cc</label>
                                        <input
                                            type="email"
                                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                                            value={emailPreview.cc}
                                            onChange={(e) => setEmailPreview(prev => ({ ...prev, cc: e.target.value }))}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bcc</label>
                                        <input
                                            type="email"
                                            style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                                            value={emailPreview.bcc}
                                            onChange={(e) => setEmailPreview(prev => ({ ...prev, bcc: e.target.value }))}
                                        />
                                    </div>
                                </div>
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
                                        <p style={{ fontSize: '11px', color: '#166534', margin: '2px 0 0 0', opacity: 0.9 }}>The {formData.document_type || 'Document'} PDF has been generated and is attached to this email.</p>
                                    </div>
                                </div>

                                {/* SUGGESTED ATTACHMENTS (Linked Documents) */}
                                {workflowDocs.length > 1 && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                                            Quick Attach Linked Documents (Job Suite)
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {workflowDocs.filter(d => {
                                                if (d.id === id) return false;
                                                // If current doc is an Invoice, only show Delivery Order
                                                if (formData.document_type?.includes('Invoice')) {
                                                    return d.document_type === 'Delivery Order';
                                                }
                                                return true;
                                            }).map(doc => {
                                                const isAttached = emailPreview.attachments?.some(a => a.name.includes(doc.document_no));
                                                return (
                                                    <button
                                                        key={doc.id}
                                                        type="button"
                                                        onClick={() => attachDocumentFromSuite(doc)}
                                                        disabled={saving || isAttached}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            background: isAttached ? '#f1f5f9' : '#eff6ff',
                                                            border: `1px solid ${isAttached ? '#e2e8f0' : '#bfdbfe'}`,
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: isAttached ? '#94a3b8' : '#2563eb',
                                                            cursor: isAttached ? 'default' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {isAttached ? <FileCheck size={12} /> : <Plus size={12} />} 
                                                        {doc.document_type}: {doc.document_no}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* QUICK ATTACH GALLERY PHOTOS */}
                                {galleryFiles.length > 0 && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '12px' }}>
                                            Quick Attach Job Photos
                                        </label>
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                            {galleryFiles.map(file => {
                                                const isAttached = emailPreview.attachments?.some(a => a.name === file.name);
                                                return (
                                                    <div 
                                                        key={file.id} 
                                                        onClick={() => !isAttached && attachGalleryFile(file)}
                                                        style={{ 
                                                            minWidth: '80px', 
                                                            height: '60px', 
                                                            borderRadius: '6px', 
                                                            overflow: 'hidden', 
                                                            position: 'relative', 
                                                            cursor: isAttached ? 'default' : 'pointer',
                                                            border: isAttached ? '2px solid #10b981' : '1px solid #e2e8f0',
                                                            opacity: isAttached ? 0.6 : 1
                                                        }}
                                                    >
                                                        <img src={file.thumbnailLink} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        {isAttached && (
                                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <FileCheck size={16} color="#fff" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Custom Attachments Section */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Additional Attachments</span>
                                        <label style={{ cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'none', letterSpacing: 'normal' }}>
                                            <Paperclip size={14} /> Add File
                                            <input
                                                type="file"
                                                multiple
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files);
                                                    if (files.length > 0) {
                                                        setEmailPreview(prev => ({
                                                            ...prev,
                                                            attachments: [...(prev.attachments || []), ...files]
                                                        }));
                                                    }
                                                    e.target.value = null; // Reset input so same file can be selected again if needed
                                                }}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </label>

                                    {emailPreview.attachments?.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {emailPreview.attachments.map((file, idx) => (
                                                <div key={idx} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                                        <Paperclip size={16} color="#64748b" />
                                                        <span style={{ fontSize: '12px', color: '#334155', whiteWhiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>({Math.round(file.size / 1024)} KB)</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setEmailPreview(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                        title="Remove attachment"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
                            <button
                                onClick={() => setEmailPreview(null)}
                                disabled={saving}
                                style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={sendEmail}
                                disabled={saving}
                                style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600, color: '#fff', background: '#3b82f6', border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}
                            >
                                <Send size={16} /> {saving ? 'Sending...' : 'Send Email Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OCR Modal */}
            {showOCRModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 30000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', background: '#fff' }}>
                        <button onClick={() => setShowOCRModal(false)} style={{ position: 'absolute', right: '24px', top: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div style={{ width: '64px', height: '64px', background: '#f5f3ff', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#8b5cf6' }}>
                                <Sparkles size={32} />
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>Image to Line Items</h2>
                            <p style={{ color: '#64748b', marginTop: '8px' }}>Upload an image of an enquiry or quote to extract line items automatically.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '40px', textAlign: 'center', background: '#f8fafc' }}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        setIsOCRLoading(true);
                                        try {
                                            const text = await performOCR(file);
                                            if (text) {
                                                const items = await extractLineItemsFromImage(text);
                                                if (items && items.length > 0) {
                                                    items.forEach(item => {
                                                        const newItem = {
                                                            id: Date.now() + Math.random(),
                                                            description: item.name,
                                                            details: item.specification,
                                                            quantity: item.quantity || 1,
                                                            uom: item.uom || 'PC(S)',
                                                            unit_price: item.unit_price || 0,
                                                            amount: (item.quantity || 1) * (item.unit_price || 0),
                                                            tax_enabled: true,
                                                            tax_rate: 9
                                                        };
                                                        setLineItems(prev => [...prev, newItem]);
                                                    });
                                                    setShowOCRModal(false);
                                                } else {
                                                    alert("No items found in the image. Please try a clearer photo.");
                                                }
                                            }
                                        } catch (err) {
                                            console.error(err);
                                            alert("Failed to process image.");
                                        } finally {
                                            setIsOCRLoading(false);
                                        }
                                    }} 
                                    style={{ display: 'none' }} 
                                    id="ocr-upload-editor"
                                />
                                <label htmlFor="ocr-upload-editor" style={{ cursor: isOCRLoading ? 'not-allowed' : 'pointer' }}>
                                    {isOCRLoading ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Loader2 size={40} className="animate-spin" color="#8b5cf6" />
                                            <span style={{ fontWeight: 600, color: '#8b5cf6' }}>AI is extracting items...</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <Upload size={40} color="#94a3b8" />
                                            <span style={{ fontWeight: 700, color: '#1e293b' }}>Click to Upload Image</span>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Supports JPEG, PNG</span>
                                        </div>
                                    )}
                                </label>
                            </div>
                            <button onClick={() => setShowOCRModal(false)} className="btn btn-outline" style={{ width: '100%', padding: '12px', borderRadius: '12px' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}


            <style dangerouslySetInnerHTML={{
                __html: `
                .workflow-editor-theme {
                    background: var(--bg-primary);
                    min-height: 100vh;
                    margin: -32px -40px;
                    padding: 0;
                    color: var(--text-primary);
                    font-family: 'Inter', sans-serif;
                }
            .editor-header {
                background: var(--bg-secondary);
            padding: 16px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            z-index: 100;
                }
            .icon-btn {
                background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 8px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
                }
            .icon-btn:hover {
                background: #f1f5f9;
            color: var(--accent);
                }
            .btn-vibrant {
                background: var(--accent);
            color: #fff;
            border: none;
            padding: 10px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
                }
            .btn-vibrant-secondary {
                background: #fff;
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
                }
            .btn-vibrant-secondary:hover {background: #f8fafc; }
            .status-container {
                background: var(--bg-secondary);
            margin: 20px 40px;
            border-radius: 12px;
            display: flex;
            padding: 4px;
            border: 1px solid var(--border-color);
                }
            .status-step {
                flex: 1;
            text-align: center;
            padding: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);
            position: relative;
                }
            .status-step.active {
                background: #f1f5f9;
            color: var(--accent);
            border-radius: 8px;
                }
            .status-step.confirmed {color: #10b981; }
            .editor-content {
                padding: 0 40px 100px 40px;
                }
            .header-panel {
                margin - bottom: 24px;
                }
            .input-grid {
                display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
                }
            .form-item {
                margin - bottom: 16px;
                }
            .form-item label {
                display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: 8px;
            font-weight: 600;
                }
            .tab-container {
                display: flex;
            gap: 4px;
            margin: 30px 0 20px 0;
            border-bottom: 1px solid var(--border-color);
                }
            .tab {
                padding: 10px 24px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
                }
            .tab.active {
                color: var(--accent);
            border-bottom-color: var(--accent);
                }
            .editor-table {
                width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border-color);
                }
            .editor-table th {
                background: #f8fafc;
            padding: 12px;
            text-align: left;
            font-size: 0.75rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            border-bottom: 1px solid var(--border-color);
                }
            .editor-table td {
                padding: 12px;
            border-bottom: 1px solid var(--border-color);
            vertical-align: top;
                }
            .table-input {
                width: 100%;
            background: transparent;
            border: none;
            border-bottom: 1px solid transparent;
            color: var(--text-primary);
            padding: 8px 4px;
            font-family: inherit;
            font-size: 0.95rem;
                }
            .table-input:focus {
                border - bottom - color: var(--accent);
            outline: none;
                }
            .table-textarea {
                width: 100%;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 0.85rem;
            resize: none;
            height: 20px;
            font-family: inherit;
                }
            .center {text - align: center; }
            .right {text - align: right; }
            .row-section {background: rgba(99, 102, 241, 0.05); }
            .row-section .table-input {font - weight: 700; color: var(--accent); }
            .row-note .table-input {font - style: italic; color: #64748b; }

            .table-actions {
                display: flex;
            justify-content: space-between;
            margin-top: 24px;
                }
            .add-btn {
                background: transparent;
            border: none;
            color: var(--accent);
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.9rem;
            padding: 8px 12px;
            border-radius: 6px;
                }
            .add-btn:hover {background: rgba(99, 102, 241, 0.05); }

            .summary-box {
                width: 350px;
            background: #fff;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid var(--border-color);
                }
            .summary-row {
                display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.95rem;
            color: var(--text-secondary);
                }
            .summary-total {
                display: flex;
            justify-content: space-between;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid var(--border-color);
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
                }
            .del-btn {
                background: transparent;
            border: none;
            color: #ef4444;
            cursor: pointer;
            padding: 8px;
            opacity: 0.5;
                }
            .del-btn:hover {opacity: 1; }

            .dropdown {position: relative; }
            .dropdown-content {
                display: none;
            position: absolute;
            background: #fff;
            min-width: 200px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            border-radius: 8px;
            z-index: 100;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
                }
            .dropdown:hover .dropdown-content {display: block; }
            .dropdown-content button {
                width: 100%;
            padding: 10px;
            text-align: left;
            background: transparent;
            border: none;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 0.85rem;
                }
            .dropdown-content button:hover {background: #f8fafc; color: var(--accent); }
            `}} />
            {/* Hidden Print Content for PDF Generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div ref={printRef}>
                    <WorkflowDocumentLayout 
                        doc={{ ...formData, items: lineItems, partners: partners.find(p => p.id === formData.partner_id) }} 
                        settings={settings}
                        logoBase64={logoBase64}
                        signatureBase64={signatureBase64}
                        paynowBase64={paynowBase64}
                    />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .workflow-editor-theme {
                    --bg-primary: #f8fafc;
                    --text-primary: #0f172a;
                    --text-secondary: #64748b;
                    --accent: #3b82f6;
                    --glass: rgba(255, 255, 255, 0.7);
                    font-family: 'Inter', sans-serif;
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
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
                .btn-edit-inline {
                    position: absolute;
                    right: 32px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #6366f1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 4px;
                    opacity: 0.7;
                    transition: all 0.2s;
                    z-index: 10;
                }
                .btn-edit-inline:hover {
                    opacity: 1;
                    transform: translateY(-50%) scale(1.1);
                }
                `
            }} />
            {/* Quick Action Floating Hub */}
            {!isNew && <FloatingControlHub jobId={id} />}

            {expenseModal.isOpen && (
                <Modal 
                    isOpen={expenseModal.isOpen} 
                    onClose={() => setExpenseModal({ isOpen: false, data: null })}
                    title={expenseModal.data ? 'Edit Project Expense' : 'Add Project Expense'}
                    icon={Calculator}
                >
                    <QuickExpenseAdd 
                        company_id={profile?.company_id}
                        job_id={id}
                        partners={partners}
                        expense={expenseModal.data}
                        onSuccess={(data) => {
                            if (expenseModal.data) {
                                setExpenses(prev => prev.map(e => e.id === data.id ? data : e));
                            } else {
                                setExpenses(prev => [...prev, data]);
                            }
                            setExpenseModal({ isOpen: false, data: null });
                        }}
                        onCancel={() => setExpenseModal({ isOpen: false, data: null })}
                        onUploadBill={async (file) => {
                            const token = getStoredToken();
                            const folderId = await ensureJobFolder();
                            const financeFolder = await getOrCreateFolder(token, '5. Expenses & Payments', folderId);
                            const result = await uploadFileToDrive(token, file, { folderId: financeFolder });
                            return `https://drive.google.com/file/d/${result.id}/view`;
                        }}
                    />
                </Modal>
            )}

            {paymentModal.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>{paymentModal.data ? 'Edit' : 'Add'} {paymentModal.type === 'customer' ? 'Customer Payment' : 'Supplier Payment'}</h3>
                            <button onClick={() => setPaymentModal({ isOpen: false, type: null, data: null })} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.target);
                            handleSavePayment(paymentModal.type, {
                                id: paymentModal.data?.id,
                                invoice_no: f.get('invoice_no'),
                                payment_date: f.get('payment_date'),
                                amount: f.get('amount'),
                                gst_amount: f.get('gst_amount'),
                                supplier_id: f.get('supplier_id'),
                                payment_term: f.get('payment_term'),
                                status: f.get('status')
                            });
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {paymentModal.type === 'supplier' && (
                                    <div className="form-item">
                                        <label>Supplier</label>
                                        <select name="supplier_id" defaultValue={paymentModal.data?.supplier_id} className="form-select" required>
                                            <option value="">-- Select Supplier --</option>
                                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="form-item">
                                    <label>Invoice No</label>
                                    <input type="text" name="invoice_no" defaultValue={paymentModal.data?.invoice_no} className="form-input" required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-item">
                                        <label>Date</label>
                                        <input type="date" name="payment_date" defaultValue={paymentModal.data?.payment_date || new Date().toISOString().split('T')[0]} className="form-input" required />
                                    </div>
                                    <div className="form-item">
                                        <label>Status</label>
                                        <select name="status" defaultValue={paymentModal.data?.status || 'Open'} className="form-select">
                                            <option value="Open">Open</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-item">
                                        <label>Amount ({formData.currency})</label>
                                        <input type="number" step="0.01" name="amount" defaultValue={paymentModal.data?.amount} className="form-input" required />
                                    </div>
                                    <div className="form-item">
                                        <label>GST Amount</label>
                                        <input type="number" step="0.01" name="gst_amount" defaultValue={paymentModal.data?.gst_amount} className="form-input" required />
                                    </div>
                                </div>
                                {paymentModal.type === 'supplier' && (
                                    <div className="form-item">
                                        <label>Payment Terms</label>
                                        <input type="text" name="payment_term" defaultValue={paymentModal.data?.payment_term} className="form-input" placeholder="e.g. 30 Days" />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setPaymentModal({ isOpen: false, type: null, data: null })} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <WhatsAppShareModal 
                isOpen={whatsappShareModal.isOpen}
                onClose={() => setWhatsappShareModal({ isOpen: false })}
                contacts={contacts.filter(c => c.partnerId === formData.partner_id)}
                partner={partners.find(p => p.id === formData.partner_id)}
                documentData={formData}
                onShareFile={performWhatsAppShare}
            />
        </div>
    );
}

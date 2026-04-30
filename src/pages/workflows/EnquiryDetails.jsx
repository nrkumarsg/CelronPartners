import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateEnquiry, shortlistSupplierQuote } from '../../lib/workflowService';
import { convertEnquiryToV2Document } from '../../lib/workflowV2Service';

import { getPartners, getDocumentSettings, saveVessel, saveWorkLocation } from '../../lib/store';
import { getCatalogItems, createCatalogItem, updateCatalogItem } from '../../lib/catalogService';
import { ArrowLeft, ArrowRight, Send, Ship, Mail, Phone, ExternalLink, Database, FolderPlus, ArrowRightLeft, FileText, CheckCircle2, Clock, DollarSign, BadgeDollarSign, ShieldCheck, Plus, Search, Trash, Save, Edit, AlertTriangle, Users, Eye, MailCheck, Download, Calendar, ChevronDown, PlusCircle, MapPin, MessageSquare } from 'lucide-react';
import UploadOverlay from '../../components/common/UploadOverlay';
import SafeDriveLink from '../../components/common/SafeDriveLink';
import EmailPreviewModal from '../../components/workflows/EmailPreviewModal';
import html2pdf from 'html2pdf.js';

import { useEnquiry } from '../../hooks/useEnquiry';
import { useSupplierActions } from '../../hooks/useSupplierActions';
import DocumentManager from '../../components/workflows/DocumentManager';
import RichTextEditor from '../../components/common/RichTextEditor';
import CommunicationWall from '../../components/common/CommunicationWall';
import { ITEM_UNITS } from '../../utils/units';
import { WhatsAppShareModal } from '../../components/workflow/WhatsAppShareModal';

export default function EnquiryDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();

    // Core Logic Hooks
    const {
        enquiry, setEnquiry, catalog, selectedItems, setSelectedItems,
        loading, isSavingNewItem,
        handleAddItem, handleUpdateItem, handleRemoveItem, handleUpdateHeader, setCatalog, refresh: refreshEnquiry
    } = useEnquiry(profile?.company_id, id);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [editingPartnerId, setEditingPartnerId] = useState(null);
    const [editingContactId, setEditingContactId] = useState(null);
    const [addingContactToPartnerId, setAddingContactToPartnerId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const {
        suppliers,
        selectedSuppliers,
        setSelectedSuppliers,
        supplierContacts,
        recipientOverrides,
        setRecipientOverrides,
        isFloating,
        isSavingContact,
        fetchSuppliers,
        handleToggleSupplier,
        handleUpdateRecipientOverride,
        handleSaveNewContact,
        handleUpdatePartner,
        handleUpdateContact,
        handleDeleteContact,
        handleFloatQuotation
    } = useSupplierActions(profile?.company_id, id, enquiry);

    // Local UI State
    const [settings, setSettings] = useState(null);
    const [driveLink, setDriveLink] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [supplierQuotes, setSupplierQuotes] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [locations, setLocations] = useState([]);
    const [allPartners, setAllPartners] = useState([]);
    const [isConverting, setIsConverting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLink, setUploadLink] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCatalogList, setShowCatalogList] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [emailPreviewData, setEmailPreviewData] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showNewVesselModal, setShowNewVesselModal] = useState(false);
    const [showNewLocationModal, setShowNewLocationModal] = useState(false);
    const [editingCatalogItem, setEditingCatalogItem] = useState(null);
    const [newItemForm, setNewItemForm] = useState({ name: '', specification: '' });
    const [whatsappShareModal, setWhatsappShareModal] = useState({ isOpen: false });

    useEffect(() => {
        if (profile?.company_id) {
            fetchLookups();
            fetchSuppliers();
        }
    }, [profile]);

    useEffect(() => {
        if (enquiry) {
            if (enquiry.gdrive_file_link) {
                setDriveLink(enquiry.gdrive_file_link);
            }
            
            // Smart Defaults for missing fields
            const updates = {};
            if (!enquiry.enquiry_date) {
                updates.enquiry_date = new Date().toISOString().split('T')[0];
            }
            if (!enquiry.due_date) {
                const baseDate = enquiry.enquiry_date ? new Date(enquiry.enquiry_date) : new Date();
                updates.due_date = new Date(baseDate.getTime() + 86400000).toISOString().split('T')[0];
            }
            if (!enquiry.customer_ref && enquiry.enquiry_no) {
                updates.customer_ref = `Ref: ${enquiry.enquiry_no}`;
            }
            
            if (Object.keys(updates).length > 0) {
                handleUpdateHeader(updates);
            }
        }
    }, [enquiry]);

    const fetchLookups = async () => {
        try {
            const [settingsData, quoteRes, vesselsData, locationsData, partnersData] = await Promise.all([
                getDocumentSettings(),
                import('../../lib/workflowService').then(m => m.getSupplierQuotes(id)),
                import('../../lib/store').then(m => m.getVessels()),
                import('../../lib/store').then(m => m.getWorkLocations()),
                import('../../lib/store').then(m => m.getPartners())
            ]);
            if (settingsData) setSettings(settingsData);
            if (quoteRes.data) setSupplierQuotes(quoteRes.data);
            if (vesselsData) setVessels(vesselsData);
            if (locationsData) setLocations(locationsData);
            if (partnersData) setAllPartners(partnersData);
        } catch (err) {
            console.error("Failed to load secondary lookups", err);
        }
    };

    const handlePrepareFloat = () => {
        if (selectedSuppliers.length === 0) return alert("Select at least one supplier.");
        if (selectedItems.length === 0) return alert("Add at least one item from the catalog.");

        const emails = selectedSuppliers.map(s => {
            const override = recipientOverrides[s.id];
            return override?.email || s.email1;
        }).filter(e => e).join(',') + (selectedSuppliers.length > 0 ? ';' : '') + 'celron.simlim0305@gmail.com; accounts@celron.net';
        
        const subject = encodeURIComponent(`Request for Quotation: ${enquiry?.enquiry_no} - CELRON ENTERPRISES`);

        let itemRows = selectedItems.map((item, idx) => {
            const specPrefix = item.specification ? `\n   - Spec: ${item.specification.substring(0, 100)}${item.specification.length > 100 ? '...' : ''}` : '';
            return `${idx + 1}. ${item.name} (${item.qty} ${item.unit || 'pcs'})${specPrefix}`;
        }).join('\n\n');

        const greeting = selectedSuppliers.length === 1 
            ? `Dear ${recipientOverrides[selectedSuppliers[0].id]?.attn_name || 'Supplier'},\n\n`
            : `Dear Supplier,\n\n`;

        const body = encodeURIComponent(`${greeting}We are pleased to invite you to quote for the following items:\n\n${itemRows}\n\n${enquiry.gdrive_file_link ? `You can view photos and additional attachments here: ${enquiry.gdrive_file_link}\n\n` : ''}Please revert with your best price and lead time at your earliest convenience.\n\nThank you,\nCEL-RON ENTERPRISES PTE LTD`);

        setEmailPreviewData({ emails, subject, body });
    };

    const handleWhatsApp = () => {
        if (selectedSuppliers.length === 0) {
            alert("Please select at least one supplier.");
            return;
        }
        setWhatsappShareModal({ isOpen: true });
    };

    const confirmFloat = async () => {
        const success = await handleFloatQuotation(selectedItems, enquiry);
        if (success) {
            setEmailPreviewData(null);
            refreshEnquiry();
        }
    };

    const updateDriveLink = async () => {
        try {
            await updateEnquiry(id, { gdrive_file_link: driveLink });
            setEnquiry({ ...enquiry, gdrive_file_link: driveLink });
            setShowLinkInput(false);
        } catch (error) {
            console.error('Failed to update storage link:', error);
            alert('Failed to update storage link');
        }
    };

    const handleConvertToV2 = async () => {
        if (!window.confirm("Convert this Enquiry to a Detailed Quotation for manual editing?")) return;
        setIsConverting(true);
        try {
            const doc = await convertEnquiryToV2Document(id, 'Quotation');
            navigate(`/workflows/editor/quotation/${doc.id}`);
        } catch (error) {
            console.error('Conversion Failed:', error);
            alert('Failed to convert to detailed document');
            setIsConverting(false);
        }
    };

    const handleConvertToOrder = async () => {
        if (!window.confirm("Convert this Enquiry to a Purchase Order?")) return;
        setIsConverting(true);
        try {
            const doc = await convertEnquiryToV2Document(id, 'Purchase Order');
            navigate(`/workflows/editor/purchase-order/${doc.id}`);
        } catch (error) {
            console.error('Order Conversion Failed:', error);
            alert('Failed to convert to Order');
            setIsConverting(false);
        }
    };
    const handleSaveVessel = async (vesselName) => {
        if (!vesselName) return;
        try {
            const data = await saveVessel({ vessel_name: vesselName, company_id: profile.company_id });
            setVessels(prev => [...prev, data].sort((a,b) => a.vessel_name.localeCompare(b.vessel_name)));
            handleUpdateHeader({ vessel_id: data.id });
            setShowNewVesselModal(false);
        } catch (err) {
            alert("Failed to save vessel");
        }
    };

    const handleSaveWorkLocation = async (locationName) => {
        if (!locationName) return;
        try {
            const data = await saveWorkLocation({ location_name: locationName, company_id: profile.company_id });
            setLocations(prev => [...prev, data].sort((a,b) => a.location_name.localeCompare(b.location_name)));
            handleUpdateHeader({ work_location_id: data.id });
            setShowNewLocationModal(false);
        } catch (err) {
            alert("Failed to save location");
        }
    };

    const handleSaveCatalogItem = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingCatalogItem.id) {
                res = await updateCatalogItem(editingCatalogItem.id, editingCatalogItem);
            } else {
                res = await createCatalogItem({ ...editingCatalogItem, company_id: profile.company_id });
            }
            if (res.error) throw res.error;
            
            // Refresh catalog list
            const catRes = await getCatalogItems(1, 100, {}, '');
            if (catRes.data) setCatalog(catRes.data);
            
            setEditingCatalogItem(null);
        } catch (err) {
            alert("Failed to save catalog item: " + (err.message || err));
        }
    };


    if (loading) return <div className="loading-state">Loading details...</div>;
    if (!enquiry) return <div className="page-container"><h2>Enquiry Not Found</h2></div>;

    return (
        <>
            <div className="page-container" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
            {/* 1. Status Navigation Bar */}
            <div style={{ display: 'flex', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden' }}>
                {['New Enquiry', 'RFQ Floated', 'Quotation Sent', 'Job Created'].map((status) => (
                    <div 
                        key={status} 
                        style={{ 
                            flex: 1, 
                            textAlign: 'center', 
                            padding: '12px', 
                            borderRadius: '10px', 
                            fontSize: '0.85rem', 
                            fontWeight: 700,
                            background: enquiry.status === status ? '#eff6ff' : 'transparent',
                            color: enquiry.status === status ? '#3b82f6' : '#94a3b8',
                            position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'default'
                        }}
                    >
                        {status}
                        <div style={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            left: enquiry.status === status ? '20%' : '50%', 
                            right: enquiry.status === status ? '20%' : '50%', 
                            height: '3px', 
                            background: '#3b82f6',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            opacity: enquiry.status === status ? 1 : 0,
                            borderRadius: '2px'
                        }} />
                    </div>
                ))}
            </div>

            {/* 2. Page Header Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link to="/enquiries" style={{ color: '#94a3b8' }}><ArrowLeft size={20} /></Link>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Enquiry {enquiry.enquiry_no}</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={() => refreshEnquiry()}
                        className="btn btn-sm btn-primary" 
                        style={{ background: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Save size={16} /> Save
                    </button>
                    <button onClick={() => window.open(`/workflows/enquiry/print/${id}`, '_blank')} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> Print PDF</button>
                    <button onClick={handleFloatQuotation} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={16} /> Send by email</button>
                    <button onClick={handleWhatsApp} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', color: '#fff', border: 'none' }}><MessageSquare size={16} /> WhatsApp Share</button>
                    <button onClick={handleConvertToV2} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', borderColor: '#6366f1' }}><ArrowRightLeft size={16} /> Convert to Quote</button>
                    <button onClick={handleConvertToOrder} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', borderColor: '#059669' }}><BadgeDollarSign size={16} /> Convert to Order</button>
                    <button className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Create Revision</button>
                </div>
            </div>

            {/* 3. Info Grid (Enquiry Template) */}
            <div className="glass-panel" style={{ padding: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* 
                            Customer selection hidden as it's now handled by selection in 
                            the Floating Module for RFQ purposes. 
                        */}
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>Subject / Project Notes</label>
                            <input 
                                type="text"
                                className="form-input"
                                value={enquiry.customer_ref || ''}
                                onChange={(e) => handleUpdateHeader({ customer_ref: e.target.value })}
                                placeholder={enquiry.enquiry_no ? `Ref: ${enquiry.enquiry_no}` : "E.g. Spares for MV Brave..."}
                                style={{ borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 12px' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>Date</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="date"
                                    value={enquiry.enquiry_date || new Date().toISOString().split('T')[0]}
                                    onChange={(e) => handleUpdateHeader({ enquiry_date: e.target.value })}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                                />
                                <Calendar size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>Expiration / Due Date</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="date"
                                    value={enquiry.due_date || (enquiry.enquiry_date ? new Date(new Date(enquiry.enquiry_date).getTime() + 86400000).toISOString().split('T')[0] : '')}
                                    onChange={(e) => handleUpdateHeader({ due_date: e.target.value })}
                                    style={{ width: '100%', borderRadius: '8px', padding: '8px 12px 8px 36px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#f97316' }}
                                />
                                <Clock size={16} color="#f97316" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            </div>
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>Vessel / Service Location</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <select 
                                        className="form-select"
                                        value={enquiry.vessel_id || ''}
                                        onChange={(e) => {
                                            if (e.target.value === 'ADD_NEW') {
                                                setShowNewVesselModal(true);
                                            } else {
                                                handleUpdateHeader({ vessel_id: e.target.value });
                                            }
                                        }}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px 12px 10px 36px', appearance: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#10b981', fontWeight: 600 }}
                                    >
                                        <option value="">No Vessel</option>
                                        {vessels.map(v => (
                                            <option key={v.id} value={v.id}>{v.vessel_name}</option>
                                        ))}
                                        <option value="ADD_NEW" style={{ fontWeight: 700, color: '#10b981' }}>+ Add New Vessel</option>
                                    </select>
                                    <Ship size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
                                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                </div>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <select 
                                        className="form-select"
                                        value={enquiry.work_location_id || ''}
                                        onChange={(e) => {
                                            if (e.target.value === 'ADD_NEW') {
                                                setShowNewLocationModal(true);
                                            } else {
                                                handleUpdateHeader({ work_location_id: e.target.value });
                                            }
                                        }}
                                        style={{ width: '100%', borderRadius: '8px', padding: '10px 12px 10px 32px', appearance: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' }}
                                    >
                                        <option value="">General / Local</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.id}>{l.location_name}</option>
                                        ))}
                                        <option value="ADD_NEW" style={{ fontWeight: 700, color: '#64748b' }}>+ Add New Location</option>
                                    </select>
                                    <Database size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            {/* 4. Content Area */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'visible', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Quantity</th>
                                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>UoM</th>
                                    <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                            <Database size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>No items added yet</p>
                                        </td>
                                    </tr>
                                ) : (
                                    selectedItems.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: item.is_section ? '#f8fafc' : 'transparent' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                {item.is_note ? (
                                                    <textarea 
                                                        style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: 500, fontSize: '0.9rem', outline: 'none', color: '#1e293b', resize: 'vertical', minHeight: '40px', fontFamily: 'inherit' }}
                                                        value={item.description || item.name}
                                                        onChange={(e) => handleUpdateItem(idx, { description: e.target.value, name: e.target.value })}
                                                        placeholder="Note content..."
                                                        rows={2}
                                                    />
                                                ) : (
                                                    <input 
                                                        style={{ width: '100%', border: 'none', background: 'transparent', fontWeight: item.is_section ? 700 : 500, fontSize: '0.9rem', outline: 'none', color: item.is_section ? '#3b82f6' : '#1e293b' }}
                                                        value={item.description || item.name}
                                                        onChange={(e) => handleUpdateItem(idx, { description: e.target.value, name: e.target.value })}
                                                        placeholder={item.is_section ? "SECTION TITLE" : "Product name..."}
                                                    />
                                                )}
                                                {!item.is_section && !item.is_note && (
                                                    <textarea 
                                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.75rem', color: '#64748b', outline: 'none', marginTop: '4px', resize: 'none' }}
                                                        value={item.details || item.specification}
                                                        onChange={(e) => handleUpdateItem(idx, { details: e.target.value, specification: e.target.value })}
                                                        placeholder="Add specifications..."
                                                        rows={1}
                                                    />
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {!item.is_section && !item.is_note && (
                                                    <input 
                                                        type="number"
                                                        style={{ width: '60px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px', fontSize: '0.9rem', textAlign: 'center' }}
                                                        value={item.quantity || item.qty}
                                                        onChange={(e) => handleUpdateItem(idx, { quantity: e.target.value, qty: e.target.value })}
                                                    />
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {!item.is_section && !item.is_note && (
                                                    <input 
                                                        type="text" 
                                                        value={item.uom || item.unit || ''} 
                                                        onChange={(e) => handleUpdateItem(idx, { uom: e.target.value, unit: e.target.value })}
                                                        style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center', fontSize: '0.85rem' }}
                                                        placeholder="pcs"
                                                    />
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <button 
                                                    onClick={() => handleRemoveItem(idx)}
                                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' }}
                                                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        
                        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={() => handleAddItem({ name: '', unit_price: 0 })}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <PlusCircle size={16} /> Add a product
                                </button>
                                <button 
                                    onClick={() => handleAddItem({ name: 'NEW SECTION', is_section: true })}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    Add a section
                                </button>
                                <button 
                                    onClick={() => handleAddItem({ name: '', is_note: true })}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                                >
                                    Add a note
                                </button>
                            </div>
                            
                            <div style={{ position: 'relative' }}>
                                <button 
                                    onClick={() => setShowCatalogList(!showCatalogList)}
                                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Database size={14} /> From Catalog <ChevronDown size={14} />
                                </button>
                                
                                 {showCatalogList && (
                                    <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 -10px 15px -3px rgba(0,0,0,0.1)', marginBottom: '8px', minWidth: '400px', maxHeight: '450px', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
                                            <div style={{ position: 'relative', flex: 1 }}>
                                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                <input 
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Search catalog..."
                                                    style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => { setEditingCatalogItem({ name: searchQuery, specification: '', type: 'Supply' }); }}
                                                className="btn btn-sm btn-primary"
                                                style={{ padding: '0 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Plus size={16} /> New
                                            </button>
                                        </div>
                                        <div style={{ overflowY: 'auto', flex: 1 }}>
                                            {catalog.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
                                                <div 
                                                    key={c.id}
                                                    style={{ width: '100%', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                                    className="catalog-item-row"
                                                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'none'}
                                                >
                                                    <button 
                                                        onClick={() => { handleAddItem({ ...c, unit_price: 0 }); setShowCatalogList(false); }}
                                                        style={{ flex: 1, textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{c.specification}</div>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setEditingCatalogItem(c); }}
                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Workspace & Documents Section */}
                    <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Database size={18} color="#3b82f6" /> Project Workspace & Documents
                                </h4>
                                {enquiry.gdrive_file_link && !showLinkInput && (
                                    <button onClick={() => setShowLinkInput(true)} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Edit Drive Link</button>
                                )}
                            </div>

                            {(!enquiry.gdrive_file_link || showLinkInput) && (
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1', marginBottom: '20px' }}>
                                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>Paste a Google Drive folder link to sync with this enquiry.</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="text"
                                            placeholder="Paste Google Drive URL..."
                                            value={driveLink}
                                            onChange={(e) => setDriveLink(e.target.value)}
                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                                        />
                                        <button onClick={updateDriveLink} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Link</button>
                                        {showLinkInput && <button onClick={() => setShowLinkInput(false)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <CommunicationWall 
                                        referenceType="Enquiry" 
                                        referenceId={id} 
                                        folderId={enquiry?.gdrive_inventory_photos_id || enquiry?.gdrive_file_link?.split('/')?.pop()} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                                        <h5 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Internal Documents</h5>
                                        <DocumentManager referenceType="Enquiry" referenceId={id} />
                                    </div>
                                    {enquiry.gdrive_file_link && !showLinkInput && (
                                        <SafeDriveLink 
                                            url={enquiry.gdrive_file_link} 
                                            label="Open Project Drive"
                                            className="btn btn-block"
                                            style={{ 
                                                width: '100%', 
                                                background: '#fff', 
                                                color: '#334155', 
                                                border: '1px solid #cbd5e1', 
                                                padding: '12px', 
                                                borderRadius: '8px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                gap: '8px', 
                                                fontWeight: 600, 
                                                cursor: 'pointer'
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            
            {/* Always visible Notes area */}
            <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#3b82f6" /> Notes & Comments
                </h4>
                <RichTextEditor 
                    value={enquiry.notes || ''}
                    onChange={(val) => setEnquiry({ ...enquiry, notes: val })}
                    placeholder="Add additional notes here..."
                />
            </div>

            {/* Enquiry Floating Module (Bottom) */}
            <div style={{ marginTop: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', fontWeight: 700 }}>Floating Module</h4>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text"
                        placeholder="Search suppliers..."
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                </div>
                <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).map(supplier => {
                        const isSelected = selectedSuppliers.some(s => s.id === supplier.id);
                        const contacts = supplierContacts[supplier.id] || [];
                        const isEditingPartner = editingPartnerId === supplier.id;
                        
                        return (
                            <div key={supplier.id} style={{ 
                                border: isSelected ? '1px solid #6366f1' : '1px solid #f1f5f9', 
                                borderRadius: '16px', 
                                padding: '16px', 
                                background: isSelected ? '#f8faff' : '#fff', 
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 4px 6px -1px rgba(99, 102, 241, 0.1)' : 'none'
                            }}>
                                {/* Row 1: Header/Name */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isSelected ? '12px' : 0 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => handleToggleSupplier(supplier)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                                        />
                                        <span style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? '#4f46e5' : '#1e293b' }}>{supplier.name}</span>
                                    </label>
                                    {isSelected && !isEditingPartner && (
                                        <button 
                                            onClick={() => { setEditingPartnerId(supplier.id); setEditForm(supplier); }}
                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                            onMouseOver={e => e.currentTarget.style.color = '#6366f1'}
                                            onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                                        >
                                            <Edit size={14} />
                                        </button>
                                    )}
                                </div>
                                
                                {isSelected && isEditingPartner ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '28px', marginBottom: '12px' }}>
                                        <textarea 
                                            value={editForm.address || ''} 
                                            onChange={e => setEditForm({...editForm, address: e.target.value})}
                                            placeholder="Address"
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                            rows={2}
                                        />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                value={editForm.city || ''} 
                                                onChange={e => setEditForm({...editForm, city: e.target.value})}
                                                placeholder="City"
                                                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                            />
                                            <input 
                                                value={editForm.pincode || ''} 
                                                onChange={e => setEditForm({...editForm, pincode: e.target.value})}
                                                placeholder="Pin"
                                                style={{ width: '80px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input 
                                                value={editForm.phone1 || ''} 
                                                onChange={e => setEditForm({...editForm, phone1: e.target.value})}
                                                placeholder="Phone"
                                                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                            />
                                            <input 
                                                value={editForm.email1 || ''} 
                                                onChange={e => setEditForm({...editForm, email1: e.target.value})}
                                                placeholder="Email"
                                                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                            <button 
                                                onClick={async () => {
                                                    await handleUpdatePartner(supplier.id, editForm);
                                                    setEditingPartnerId(null);
                                                }}
                                                style={{ flex: 1, padding: '4px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                            >Save</button>
                                            <button 
                                                onClick={() => setEditingPartnerId(null)}
                                                style={{ flex: 1, padding: '4px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                            >Cancel</button>
                                        </div>
                                    </div>
                                ) : isSelected && (
                                    <div className="animate-fade-in" style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {/* Row 2: Address */}
                                        <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                                            {supplier.address || supplier.city || supplier.pincode || supplier.country ? (
                                                `${supplier.address || ''}${supplier.city ? `, ${supplier.city}` : ''}${supplier.pincode ? `, ${supplier.pincode}` : ''}${supplier.country ? `, ${supplier.country}` : ''}`
                                            ) : (
                                                <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No address provided</span>
                                            )}
                                        </div>
                                        
                                        {/* Row 3: Phone/Email */}
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                                            {supplier.phone1 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> T: {supplier.phone1}</span>}
                                            {supplier.email1 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> E: {supplier.email1}</span>}
                                        </div>
                                        
                                        {/* Attn List with CRUD */}
                                        <div style={{ marginTop: '12px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Attention To:</span>
                                                <button 
                                                    onClick={() => { setAddingContactToPartnerId(supplier.id); setEditForm({ name: '', phone: '', email: '' }); }}
                                                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                                >+ Add New</button>
                                            </div>
                                            
                                            {addingContactToPartnerId === supplier.id && (
                                                <div style={{ background: '#fff', border: '1px solid #6366f1', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <input autoFocus value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" style={{ padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone" style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                                                        <input value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Email" style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem' }} />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button onClick={async () => { await handleSaveNewContact(supplier.id, editForm); setAddingContactToPartnerId(null); }} style={{ flex: 1, padding: '4px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>Save</button>
                                                        <button onClick={() => setAddingContactToPartnerId(null)} style={{ flex: 1, padding: '4px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}

                                            {contacts.length > 0 ? (
                                                contacts.map(c => (
                                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', background: '#fff', padding: '8px 10px', borderRadius: '10px' }}>
                                                        {editingContactId === c.id ? (
                                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ padding: '4px', fontSize: '0.75rem' }} />
                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                    <button onClick={async () => { await handleUpdateContact(c.id, { ...editForm, partnerId: supplier.id }); setEditingContactId(null); }} style={{ height: '20px', padding: '0 8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.65rem' }}>Save</button>
                                                                    <button onClick={() => setEditingContactId(null)} style={{ height: '20px', padding: '0 8px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '4px', fontSize: '0.65rem' }}>X</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                    <span style={{ fontWeight: 700, color: '#6366f1' }}>Attn:</span> {c.name} / {c.handphone || c.phone || '-'} / {c.email || '-'}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                                                    <Edit size={12} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => { setEditingContactId(c.id); setEditForm(c); }} />
                                                                    <Trash size={12} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={async () => { if(confirm("Delete contact?")) await handleDeleteContact(c.id, supplier.id); }} />
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))
                                            ) : !addingContactToPartnerId && (
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No contacts found.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setIsPreviewModalOpen(true)} className="btn btn-sm btn-outline" style={{ flex: 1 }}>Preview</button>
                    <button onClick={handlePrepareFloat} disabled={selectedSuppliers.length === 0} className="btn btn-sm btn-primary" style={{ flex: 1, background: '#4f46e5' }}>Float RFQ</button>
                </div>
            </div>


            {/* Standardized Upload Overlay */}
            <UploadOverlay 
                isVisible={uploadProgress > 0 || !!uploadLink} 
                progress={uploadProgress} 
                title="Uploading Quote..."
                locationLink={uploadLink}
                onClose={() => {
                    setUploadProgress(0);
                    setUploadLink(null);
                }}
            />
            {/* Enquiry Preview Modal */}
            {isPreviewModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '850px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 700 }}>RFQ Preview</h2>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>{enquiry.enquiry_no} • {new Date().toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setIsPreviewModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}>
                                <Plus size={20} style={{ transform: 'rotate(45deg)' }} color="#64748b" />
                            </button>
                        </div>
                        
                        <div id="rfq-preview-content" style={{ padding: '40px', overflowY: 'auto', flex: 1, background: '#fff' }}>
                            {/* Document Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
                                <div style={{ maxWidth: '400px' }}>
                                    <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1e3a8a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.025em' }}>REQUEST FOR QUOTATION</h1>
                                    <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Enquiry Ref: {enquiry.enquiry_no}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>CEL-RON ENTERPRISES PTE LTD</h3>
                                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                        10, Jln Besar, #03-05, Singapore 208787<br />
                                        Phone: +65 8196 2270 | Email: sales@celron.net
                                    </p>
                                </div>
                            </div>

                            {/* Recipients Section */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                                {selectedSuppliers.map(s => {
                                    const override = recipientOverrides[s.id] || {};
                                    return (
                                        <div key={s.id} style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: 700 }}>{s.name}</h4>
                                            <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                                                <div style={{ marginBottom: '4px' }}>{override.address || s.address}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                    <Mail size={12} /> {override.email || s.email1 || 'N/A'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Phone size={12} /> {override.phone || s.phone || 'N/A'}
                                                </div>
                                            </div>
                                            {override.attn_name && (
                                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Attention To</div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{override.attn_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{override.attn_phone} | {override.attn_email}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Items Table (Strictly No Prices) */}
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '30px', background: '#fff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                            <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRODUCT / DESCRIPTION</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>QUANTITY</th>
                                            <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px' }}>UNIT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item, idx) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '20px' }}>
                                                    <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px', fontSize: '0.95rem' }}>{idx + 1}. {item.name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.specification || 'No specification provided'}</div>
                                                </td>
                                                <td style={{ padding: '20px', textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                                    {item.qty}
                                                </td>
                                                <td style={{ padding: '20px', textAlign: 'center', fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                                    {item.unit || 'pcs'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Attachments Note */}
                            {enquiry.gdrive_file_link && (
                                <div style={{ padding: '16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <FileText size={20} color="#3b82f6" style={{ marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Photos & Attachments Included</div>
                                        <div style={{ fontSize: '0.85rem', color: '#1e40af', opacity: 0.8, marginTop: '2px' }}>
                                            Suppliers will receive a link to the project folder to view technical drawings or photos.
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '40px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                                This is an electronically generated RFQ. No signature is required for quotation purposes.
                            </div>
                        </div>

                        <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
                            <button onClick={() => setIsPreviewModalOpen(false)} className="btn btn-outline" style={{ background: '#fff' }}>Close</button>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    onClick={async () => {
                                        setIsDownloading(true);
                                        const element = document.getElementById('rfq-preview-content');
                                        const opt = {
                                            margin: 10,
                                            filename: `RFQ_${enquiry.enquiry_no}.pdf`,
                                            image: { type: 'jpeg', quality: 0.98 },
                                            html2canvas: { scale: 2, useCORS: true },
                                            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                        };
                                        try {
                                            await html2pdf().set(opt).from(element).save();
                                        } finally {
                                            setIsDownloading(false);
                                        }
                                    }}
                                    disabled={isDownloading}
                                    className="btn btn-outline" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff' }}
                                >
                                    {isDownloading ? <><Clock size={16} className="animate-spin" /> Saving...</> : <><Download size={16} /> Download PDF</>}
                                </button>
                                
                                <button 
                                    onClick={() => { setIsPreviewModalOpen(false); handlePrepareFloat(); }} 
                                    disabled={selectedSuppliers.length === 0}
                                    className="btn btn-primary" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#4f46e5', borderColor: '#4f46e5' }}
                                >
                                    <MailCheck size={18} /> Send as RFQ Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Draft Preview Modal */}
            <EmailPreviewModal 
                isOpen={!!emailPreviewData}
                onClose={() => setEmailPreviewData(null)}
                onConfirm={confirmFloat}
                data={emailPreviewData || {}}
            />
        </div>
            {/* Modals for Inline creation */}
            {showNewVesselModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add New Vessel</h3>
                        <input 
                            autoFocus
                            type="text" 
                            className="form-input" 
                            placeholder="Vessel Name" 
                            style={{ width: '100%', marginBottom: '16px', padding: '10px' }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveVessel(e.target.value); }}
                            id="newVesselName"
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowNewVesselModal(false)} className="btn btn-outline">Cancel</button>
                            <button onClick={() => handleSaveVessel(document.getElementById('newVesselName').value)} className="btn btn-primary">Save Vessel</button>
                        </div>
                    </div>
                </div>
            )}

            {showNewLocationModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add New Location</h3>
                        <input 
                            autoFocus
                            type="text" 
                            className="form-input" 
                            placeholder="Location Name" 
                            style={{ width: '100%', marginBottom: '16px', padding: '10px' }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveWorkLocation(e.target.value); }}
                            id="newLocationName"
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowNewLocationModal(false)} className="btn btn-outline">Cancel</button>
                            <button onClick={() => handleSaveWorkLocation(document.getElementById('newLocationName').value)} className="btn btn-primary">Save Location</button>
                        </div>
                    </div>
                </div>
            )}

            {editingCatalogItem && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <form onSubmit={handleSaveCatalogItem} style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{editingCatalogItem.id ? 'Edit Catalog Item' : 'New Catalog Item'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Item Name</label>
                                <input 
                                    autoFocus
                                    required
                                    type="text" 
                                    value={editingCatalogItem.name || ''} 
                                    onChange={e => setEditingCatalogItem({...editingCatalogItem, name: e.target.value})}
                                    className="form-input" 
                                    style={{ width: '100%', padding: '10px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Specification</label>
                                <textarea 
                                    value={editingCatalogItem.specification || ''} 
                                    onChange={e => setEditingCatalogItem({...editingCatalogItem, specification: e.target.value})}
                                    className="form-input" 
                                    style={{ width: '100%', padding: '10px', minHeight: '80px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select 
                                    className="form-select"
                                    value={editingCatalogItem.type || 'Supply'}
                                    onChange={e => setEditingCatalogItem({...editingCatalogItem, type: e.target.value})}
                                >
                                    <option value="Supply">Supply</option>
                                    <option value="Service">Service</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button type="button" onClick={() => setEditingCatalogItem(null)} className="btn btn-outline">Cancel</button>
                            <button type="submit" className="btn btn-primary">Save Item</button>
                        </div>
                    </form>
                </div>
            )}
            <WhatsAppShareModal 
                isOpen={whatsappShareModal.isOpen}
                onClose={() => setWhatsappShareModal({ isOpen: false })}
                contacts={supplierContacts[selectedSuppliers[0]?.id] || []}
                partner={selectedSuppliers[0]}
                documentData={{
                    document_type: 'Enquiry',
                    document_no: enquiry.enquiry_no,
                    subject: enquiry.customer_ref,
                    currency: 'SGD',
                    total_amount: 0,
                    salesperson_name: profile?.full_name || 'CEL-RON Team'
                }}
                onShareFile={(msg) => {
                    alert("PDF Sharing for Enquiries: Please use the 'Print PDF' button to generate the file first, then use your phone's share feature. Alternatively, use 'Chat Now' to send the text message.");
                }}
            />
        </>
    );
}

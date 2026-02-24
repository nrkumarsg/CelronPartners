import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save, ArrowLeft, Plus, Trash2,
    Printer, Send, X, Package,
    FileText, Calculator, Ship,
    MoreHorizontal, Search, Settings,
    ChevronDown, CreditCard, User, MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getWorkflowDocumentById,
    saveWorkflowDocument,
    generateDocNumber
} from '../../lib/workflowV2Service';
import { getPartners, getContactsByPartner, getDocumentSettings } from '../../lib/store';
import { getCatalogItems } from '../../lib/catalogService';
import { supabase } from '../../lib/supabase';
import { generateSleekPDF } from '../../lib/pdfGeneratorV2';
import {
    Modal,
    QuickPartnerAdd,
    QuickContactAdd,
    QuickVesselAdd,
    QuickLocationAdd
} from '../../components/workflow/QuickAddForms';

export default function WorkflowEditor() {
    const { type, id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isNew = id === 'new';

    // UI State
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('items'); // 'items' | 'other'
    const [modal, setModal] = useState({ isOpen: false, type: null });

    // Master Data
    const [partners, setPartners] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [workLocations, setWorkLocations] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [settings, setSettings] = useState(null);

    // Form Data
    const [formData, setFormData] = useState({
        document_type: type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        document_no: '',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        partner_id: '',
        contact_id: '',
        vessel_id: '',
        work_location_id: '',
        salesperson_name: profile?.email?.split('@')[0] || '',
        subject: '',
        customer_ref: '',
        currency: 'SGD',
        status: 'Draft',
        notes: '',
        terms_conditions: '',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0
    });

    const [lineItems, setLineItems] = useState([]);

    useEffect(() => {
        fetchMasterData();
        if (!isNew) {
            fetchDocument();
        } else {
            initNewDocument();
        }
    }, [id, type]);

    const fetchMasterData = async () => {
        const [pRes, vRes, wlRes, cRes, sRes] = await Promise.all([
            getPartners(),
            supabase.from('vessels').select('*').order('vessel_name'),
            supabase.from('work_locations').select('*').order('location_name'),
            getCatalogItems(1, 100),
            getDocumentSettings(profile?.company_id)
        ]);

        if (pRes) setPartners(pRes);
        if (vRes.data) setVessels(vRes.data);
        if (wlRes.data) setWorkLocations(wlRes.data);
        if (cRes.data) setCatalog(cRes.data);
        if (sRes) setSettings(sRes);
    };

    const fetchDocument = async () => {
        setLoading(true);
        const { data, error } = await getWorkflowDocumentById(id);
        if (data) {
            setFormData(data);
            setLineItems(data.items || []);
            // Load contacts for the partner
            if (data.partner_id) {
                const cData = await getContactsByPartner(data.partner_id);
                setContacts(cData || []);
            }
        }
        setLoading(false);
    };

    const initNewDocument = async () => {
        const newNo = await generateDocNumber(profile.company_id, formData.document_type);
        setFormData(prev => ({ ...prev, document_no: newNo }));

        // Add one empty line
        setLineItems([{
            id: 'temp-' + Date.now(),
            description: '',
            quantity: 1,
            unit_price: 0,
            tax_rate: 9,
            amount: 0,
            uom: 'Units'
        }]);
    };

    // Auto-calculate totals
    useEffect(() => {
        const sub = lineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const tax = sub * 0.09;
        const total = sub + tax;

        setFormData(prev => ({
            ...prev,
            subtotal: sub,
            tax_amount: tax,
            total_amount: total
        }));
    }, [lineItems]);

    const handleHeaderChange = (e) => {
        const { name, value } = e.target;

        if (value === 'ADD_NEW') {
            setModal({ isOpen: true, type: name });
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'partner_id' && value) {
            getContactsByPartner(value).then(setContacts);
        }
    };

    const handleQuickAddSuccess = (newItem) => {
        const typeAdded = modal.type;
        setModal({ isOpen: false, type: null });

        // Refresh master data to include the new item
        fetchMasterData();

        // Select the new item
        if (typeAdded === 'partner_id') {
            setFormData(prev => ({ ...prev, partner_id: newItem.id, contact_id: '' }));
            getContactsByPartner(newItem.id).then(setContacts);
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
            uom: 'Units'
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
            const dataToSave = { ...formData, company_id: profile.company_id };
            const { data, error } = await saveWorkflowDocument(dataToSave, lineItems);
            if (error) throw error;
            if (isNew) navigate(`/workflows/editor/${type}/${data.id}`, { replace: true });
            else alert('Saved successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        const partner = partners.find(p => p.id === formData.partner_id);
        const contact = contacts.find(c => c.id === formData.contact_id);

        const docForPdf = {
            ...formData,
            items: lineItems,
            partners: partner,
            contacts: contact,
            vessels: vessels.find(v => v.id === formData.vessel_id),
            work_locations: workLocations.find(l => l.id === formData.work_location_id)
        };
        generateSleekPDF(docForPdf, settings);
    };

    const handleEmail = () => {
        const partner = partners.find(p => p.id === formData.partner_id);
        const contact = contacts.find(c => c.id === formData.contact_id);

        const recipient = contact?.email || partner?.email1 || '';
        const subject = encodeURIComponent(`${formData.document_type} ${formData.document_no}: ${formData.subject}`);
        const body = encodeURIComponent(`Dear ${contact?.name || 'Customer'},\n\nPlease find attached the ${formData.document_type} (${formData.document_no}) for your review.\n\nBest Regards,\n${formData.salesperson_name}`);

        window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    };

    if (loading) return <div className="text-center py-20">Loading Document...</div>;

    const renderModalContent = () => {
        switch (modal.type) {
            case 'partner_id':
                return <QuickPartnerAdd company_id={profile.company_id} onSuccess={handleQuickAddSuccess} onCancel={() => setModal({ isOpen: false, type: null })} />;
            case 'contact_id':
                return <QuickContactAdd company_id={profile.company_id} partner_id={formData.partner_id} partners={partners} onSuccess={handleQuickAddSuccess} onCancel={() => setModal({ isOpen: false, type: null })} />;
            case 'vessel_id':
                return <QuickVesselAdd company_id={profile.company_id} onSuccess={handleQuickAddSuccess} onCancel={() => setModal({ isOpen: false, type: null })} />;
            case 'work_location_id':
                return <QuickLocationAdd company_id={profile.company_id} onSuccess={handleQuickAddSuccess} onCancel={() => setModal({ isOpen: false, type: null })} />;
            default:
                return null;
        }
    };

    const getModalTitle = () => {
        switch (modal.type) {
            case 'partner_id': return 'Add New Customer';
            case 'contact_id': return 'Add New Contact';
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
        <div className="workflow-editor-theme">
            {/* Header / Actions */}
            <header className="editor-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="icon-btn" onClick={() => navigate('/workflows')}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>{formData.document_type}</div>
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
                                <label><User size={14} /> Customer</label>
                                <select className="form-select" name="partner_id" value={formData.partner_id} onChange={handleHeaderChange}>
                                    <option value="">Choose a partner...</option>
                                    <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New Customer</option>
                                    {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-item">
                                <label><MoreHorizontal size={14} /> Contact Person</label>
                                <select className="form-select" name="contact_id" value={formData.contact_id} onChange={handleHeaderChange}>
                                    <option value="">Choose contact...</option>
                                    <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New Contact</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-item">
                                <label><FileText size={14} /> Subject / Project Name</label>
                                <input type="text" className="form-input" name="subject" value={formData.subject} onChange={handleHeaderChange} placeholder="What is this for?" />
                            </div>
                        </div>

                        <div className="col-right">
                            <div className="form-item">
                                <label>Date</label>
                                <input type="date" className="form-input" name="issue_date" value={formData.issue_date} onChange={handleHeaderChange} />
                            </div>
                            <div className="form-item">
                                <label>Expiration</label>
                                <input type="date" className="form-input" name="expiry_date" value={formData.expiry_date} onChange={handleHeaderChange} />
                            </div>
                            <div className="form-item">
                                <label><Ship size={14} /> Vessel / Service Location</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select className="form-select" name="vessel_id" value={formData.vessel_id} onChange={handleHeaderChange} style={{ flex: 1 }}>
                                        <option value="">[Vessel]</option>
                                        <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New</option>
                                        {vessels.map(v => <option key={v.id} value={v.id}>{v.vessel_name}</option>)}
                                    </select>
                                    <select className="form-select" name="work_location_id" value={formData.work_location_id} onChange={handleHeaderChange} style={{ flex: 1 }}>
                                        <option value="">[Workplace]</option>
                                        <option value="ADD_NEW" style={{ fontWeight: 700, color: 'var(--accent)' }}>+ Add New</option>
                                        {workLocations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Action Tabs */}
                <div className="tab-container">
                    <button className={`tab ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>Order Lines</button>
                    <button className={`tab ${activeTab === 'other' ? 'active' : ''}`} onClick={() => setActiveTab('other')}>Other Info</button>
                </div>

                {activeTab === 'items' && (
                    <div className="items-editor">
                        <table className="editor-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '45%' }}>Product / Description</th>
                                    <th style={{ width: '10%' }}>Quantity</th>
                                    <th style={{ width: '12%' }}>Unit Price</th>
                                    <th style={{ width: '10%' }}>Taxes</th>
                                    <th style={{ width: '15%' }}>Amount</th>
                                    <th style={{ width: '8%' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lineItems.map((item, index) => (
                                    <tr key={item.id} className={item.is_section ? 'row-section' : item.is_note ? 'row-note' : ''}>
                                        <td>
                                            <input
                                                className="table-input"
                                                value={item.description}
                                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                                placeholder={item.is_section ? "SECTION: e.g. Spare Parts" : item.is_note ? "Note: e.g. Lead time 1 week" : "Select product or enter description..."}
                                            />
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
                                                <input
                                                    type="number"
                                                    className="table-input right"
                                                    value={item.unit_price}
                                                    onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                                                />
                                            )}
                                        </td>
                                        <td className="center" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                            {!item.is_section && !item.is_note && '9% SR'}
                                        </td>
                                        <td className="right font-bold">
                                            {formData.currency} {(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
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
                                <div className="dropdown">
                                    <button className="add-btn catalog-btn"><Package size={14} /> From Catalog</button>
                                    <div className="dropdown-content">
                                        {catalog.map(cat => (
                                            <button key={cat.id} onClick={() => handleAddItemFromCatalog(cat)}>{cat.name}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="summary-box">
                                <div className="summary-row">
                                    <span>Untaxed Amount:</span>
                                    <span>{formData.currency} {formData.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="summary-row">
                                    <span>9% GST:</span>
                                    <span>{formData.currency} {formData.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="summary-total">
                                    <span>Total:</span>
                                    <span>{formData.currency} {formData.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                                <label>Currency</label>
                                <select className="form-select" name="currency" value={formData.currency} onChange={handleHeaderChange}>
                                    <option value="SGD">SGD - Singapore Dollar</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>
                            <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                                <label>Notes</label>
                                <textarea className="form-textarea" name="notes" value={formData.notes} onChange={handleHeaderChange} placeholder="Internal notes or additional content for PDF..." />
                            </div>
                            <div className="form-item" style={{ gridColumn: '1 / -1' }}>
                                <label>Terms & Conditions</label>
                                <textarea className="form-textarea" name="terms_conditions" value={formData.terms_conditions} onChange={handleHeaderChange} placeholder="Payment terms, delivery details..." />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Add Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ isOpen: false, type: null })}
                title={getModalTitle()}
                icon={getModalIcon()}
            >
                {renderModalContent()}
            </Modal>

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
                .btn-vibrant-secondary:hover { background: #f8fafc; }
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
                .status-step.confirmed { color: #10b981; }
                .editor-content {
                    padding: 0 40px 100px 40px;
                }
                .header-panel {
                    margin-bottom: 24px;
                }
                .input-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                }
                .form-item {
                    margin-bottom: 16px;
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
                    border-bottom-color: var(--accent);
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
                .center { text-align: center; }
                .right { text-align: right; }
                .row-section { background: rgba(99, 102, 241, 0.05); }
                .row-section .table-input { font-weight: 700; color: var(--accent); }
                .row-note .table-input { font-style: italic; color: #64748b; }
                
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
                .add-btn:hover { background: rgba(99, 102, 241, 0.05); }
                
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
                .del-btn:hover { opacity: 1; }

                .dropdown { position: relative; }
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
                .dropdown:hover .dropdown-content { display: block; }
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
                .dropdown-content button:hover { background: #f8fafc; color: var(--accent); }
            `}} />
        </div>
    );
}

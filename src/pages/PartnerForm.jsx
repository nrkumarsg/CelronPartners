import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, ArrowLeft, X, Plus, ExternalLink, Globe, Building2, MessageSquare } from 'lucide-react';
import { getPartners, savePartner, getContactsByPartner, deleteContact, uploadFile } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';
import BusinessCardUpload from '../components/common/BusinessCardUpload';
import CompanyAutocomplete from '../components/common/CompanyAutocomplete';
import PartnerDocuments from '../components/partners/PartnerDocuments';
import { COUNTRIES, PARTNER_CATEGORIES } from '../lib/constants';

export default function PartnerForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { profile } = useAuth();
    const isNew = id === 'new';
    const quillRef = useRef(null);

    const [formData, setFormData] = useState({
        types: [],
        others: '',
        name: '',
        uen: '',
        company_type: '',
        address: '',
        city: '',
        pincode: '',
        country: '',
        email1: '',
        email2: '',
        phone1: '',
        phone2: '',
        weblink: '',
        info: '',
        customerCredit: '',
        supplierCredit: '',
        customerCreditTime: '',
        supplierCreditTime: '',
        business_card_url: '',
        business_card_back_url: '',
        gdrive_folder_id: '',
        google_drive_link: ''
    });

    const [typeInput, setTypeInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'documents'

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ]
    };

    useEffect(() => {
        async function load() {
            if (!isNew) {
                setLoading(true);
                const partners = await getPartners();
                const existing = partners.find(p => p.id === id);
                if (existing) {
                    setFormData(existing);
                }
                setLoading(false);
            }
        }
        load();
    }, [id, isNew]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditorChange = (content) => {
        setFormData(prev => ({ ...prev, info: content }));
    };

    const openWebsite = () => {
        const link = (formData.weblink || '').trim();
        if (link) {
            const fullUrl = link.startsWith('http') ? link : `https://${link}`;
            window.open(fullUrl, '_blank');
        } else {
            window.open('https://www.google.com', '_blank');
        }
    };

    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            types: (prev.types || []).includes(cat)
                ? prev.types.filter(t => t !== cat)
                : [...(prev.types || []), cat]
        }));
    };

    const handleAddCustomCategory = () => {
        if (typeInput.trim() && !(formData.types || []).includes(typeInput.trim())) {
            setFormData(prev => ({
                ...prev,
                types: [...(prev.types || []), typeInput.trim()]
            }));
            setTypeInput('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert('Partner Name is required');

        setLoading(true);
        try {
            const dataToSave = { ...formData, id: isNew ? undefined : id };
            if (isNew && profile?.company_id) {
                dataToSave.company_id = profile.company_id;
            }
            // Cleanup empty strings
            if (dataToSave.customerCredit === '') dataToSave.customerCredit = null;
            if (dataToSave.supplierCredit === '') dataToSave.supplierCredit = null;

            await savePartner(dataToSave);
            navigate('/partners');
        } catch (err) {
            console.error("SUPABASE SAVE ERROR:", err);
            alert(`Error saving partner: ${err.message || 'Check console.'}`);
            setLoading(false);
        }
    };

    const handleCompanySelect = (place) => {
        const address = place.formatted_address || '';
        const name = place.name || '';
        const weblink = place.website || '';

        let country = '';
        let city = '';
        let pincode = '';
        place.address_components?.forEach(c => {
            if (c.types.includes('country')) country = c.long_name;
            if (c.types.includes('locality')) city = c.long_name;
            if (c.types.includes('postal_code')) pincode = c.long_name;
        });

        setFormData(prev => ({
            ...prev,
            name,
            address,
            city: city || prev.city,
            pincode: pincode || prev.pincode,
            country: country || prev.country,
            weblink: weblink || prev.weblink
        }));
    };

    const handleOCR = (text) => {
        if (!text) return;
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = text.match(/[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/);
        const webMatch = text.match(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i);

        setFormData(prev => ({
            ...prev,
            email1: prev.email1 || emailMatch?.[0] || '',
            phone1: prev.phone1 || phoneMatch?.[0] || '',
            weblink: prev.weblink || webMatch?.[0] || '',
            info: (prev.info || '') + `<p><br></p><p><strong>[OCR EXTRACTED TEXT]</strong></p><p>${text.replace(/\n/g, '<br>')}</p>`
        }));
    };

    const isCustomerSelected = (formData.types || []).includes('Customer');
    const isSupplierSelected = (formData.types || []).includes('Supplier');

    if (loading && !isNew) return <div style={{ padding: '40px' }}>Loading partner data...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '24px' }}>
            <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button className="btn btn-secondary" style={{ padding: '8px' }} onClick={() => navigate('/partners')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="page-title">{isNew ? 'New Partner' : 'Edit Partner'}</h2>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Partner'}
                    </button>
                </div>
            </div>

            <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '24px' }}>
                <button
                    className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveTab('details')}
                    style={{
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'details' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'details' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'details' ? 600 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Building2 size={18} /> Partner Details
                </button>
                {!isNew && (
                    <button
                        className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
                        onClick={() => setActiveTab('documents')}
                        style={{
                            padding: '12px 16px',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === 'documents' ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === 'documents' ? '#6366f1' : '#64748b',
                            fontWeight: activeTab === 'documents' ? 600 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Plus size={18} /> Documents & Verification
                    </button>
                )}
            </div>

            {activeTab === 'details' ? (
                <div className="glass-panel" style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Header Card: Company Name Search */}
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '32px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                            <div style={{ width: '80px', height: '80px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 color="#6366f1" size={32} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label" style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px', display: 'block' }}>Company Name *</label>
                                <CompanyAutocomplete
                                    value={formData.name || ''}
                                    onChange={(val) => setFormData(prev => ({ ...prev, name: val }))}
                                    onSelect={handleCompanySelect}
                                />
                                <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>Search globally or enter a custom name.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Address & Location */}
                                <div className="form-group">
                                    <label className="form-label">Full Address</label>
                                    <textarea
                                        className="form-textarea"
                                        name="address"
                                        value={formData.address || ''}
                                        onChange={handleChange}
                                        placeholder="Street, Building, etc."
                                        rows={3}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">City</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="city"
                                            value={formData.city || ''}
                                            onChange={handleChange}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Pin / ZIP</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            name="pincode"
                                            value={formData.pincode || ''}
                                            onChange={handleChange}
                                            placeholder="e.g. 629851"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Country *</label>
                                        <select
                                            className="form-select"
                                            name="country"
                                            value={formData.country || ''}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select Country...</option>
                                            {COUNTRIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Primary Phone</label>
                                        <input type="tel" className="form-input" name="phone1" value={formData.phone1 || ''} onChange={handleChange} placeholder="+1..." />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Primary Email *</label>
                                        <input type="email" className="form-input" name="email1" value={formData.email1 || ''} onChange={handleChange} required placeholder="email@company.com" />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Company Website</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            placeholder="https://company.com"
                                            name="weblink"
                                            value={formData.weblink || ''}
                                            onChange={handleChange}
                                            className="form-input"
                                            style={{ paddingRight: '70px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={openWebsite}
                                            style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                                        >
                                            <ExternalLink size={14} /> Visit
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">UEN No (optional)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        name="uen"
                                        value={formData.uen || ''}
                                        onChange={handleChange}
                                        placeholder="e.g. 201436227C"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <BusinessCardUpload
                                    frontValue={formData.business_card_url}
                                    backValue={formData.business_card_back_url}
                                    onFrontChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                                    onBackChange={(url) => setFormData(prev => ({ ...prev, business_card_back_url: url }))}
                                    onOCR={handleOCR}
                                />

                                {/* Categories */}
                                <div className="form-group">
                                    <label className="form-label">Categories</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                        {PARTNER_CATEGORIES.map(cat => (
                                            <div
                                                key={cat}
                                                onClick={() => handleCategoryToggle(cat)}
                                                style={{ padding: '6px 14px', borderRadius: '24px', border: (formData.types || []).includes(cat) ? '1px solid #6366f1' : '1px solid #e2e8f0', background: (formData.types || []).includes(cat) ? '#e0e7ff' : '#fff', color: (formData.types || []).includes(cat) ? '#6366f1' : '#475569', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                                            >
                                                {cat}
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            placeholder="Add custom category"
                                            value={typeInput}
                                            onChange={e => setTypeInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCategory())}
                                            className="form-input"
                                            style={{ flex: 1, fontSize: '0.85rem' }}
                                        />
                                        <button type="button" onClick={handleAddCustomCategory} className="btn btn-secondary">Add</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Credit Section */}
                        {(isCustomerSelected || isSupplierSelected) && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                {isCustomerSelected && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Credit</h4>
                                        <div className="form-group">
                                            <label className="form-label">Limit</label>
                                            <input type="text" className="form-input" name="customerCredit" value={formData.customerCredit || ''} onChange={handleChange} placeholder="e.g. 5000" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Days</label>
                                            <input type="number" className="form-input" name="customerCreditTime" value={formData.customerCreditTime || ''} onChange={handleChange} placeholder="e.g. 30" />
                                        </div>
                                    </div>
                                )}
                                {isSupplierSelected && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supplier Credit</h4>
                                        <div className="form-group">
                                            <label className="form-label">Limit</label>
                                            <input type="text" className="form-input" name="supplierCredit" value={formData.supplierCredit || ''} onChange={handleChange} placeholder="e.g. 10000" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Days</label>
                                            <input type="number" className="form-input" name="supplierCreditTime" value={formData.supplierCreditTime || ''} onChange={handleChange} placeholder="e.g. 60" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Notes & Details</label>
                            <ReactQuill
                                ref={quillRef}
                                theme="snow"
                                value={formData.info || ''}
                                onChange={handleEditorChange}
                                modules={modules}
                                style={{ height: '300px', marginBottom: '40px' }}
                            />
                        </div>
                    </form>
                </div>
            ) : (
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <PartnerDocuments
                        partnerId={id}
                        partnerName={formData.name}
                        initialFolderId={formData.gdrive_folder_id}
                        initialDriveLink={formData.google_drive_link}
                        onUpdate={(data) => setFormData(prev => ({
                            ...prev,
                            gdrive_folder_id: data.id,
                            google_drive_link: data.link
                        }))}
                    />
                </div>
            )}

            {!isNew && (
                <div style={{ maxWidth: '1000px', margin: '48px auto 0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Related Contacts</h3>
                        <button className="btn btn-secondary" onClick={() => navigate(`/contacts/new?partnerId=${id}`)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} /> Add Contact
                        </button>
                    </div>
                    <ContactsList partnerId={id} />
                </div>
            )}
        </div>
    );
}

// Sub-component to list contacts inline for a partner
function ContactsList({ partnerId }) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const loadContacts = React.useCallback(async () => {
        setLoading(true);
        setContacts(await getContactsByPartner(partnerId));
        setLoading(false);
    }, [partnerId]);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    const remove = async (id) => {
        if (window.confirm('Delete this contact?')) {
            await deleteContact(id);
            loadContacts();
        }
    };

    if (loading) return <div className="glass-panel">Loading contacts...</div>;
    if (contacts.length === 0) return <div className="glass-panel" style={{ textAlign: 'center', py: '40px', color: '#64748b' }}>No contacts linked to this partner yet.</div>;

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th style={{ background: '#f8fafc' }}>Contact Name</th>
                        <th style={{ background: '#f8fafc' }}>Position</th>
                        <th style={{ background: '#f8fafc' }}>Email / Phone</th>
                        <th style={{ background: '#f8fafc' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {contacts.map(c => (
                        <tr key={c.id}>
                            <td style={{ fontWeight: '600', color: '#1e293b' }}>{c.name}</td>
                            <td>{c.post || '-'}</td>
                            <td>
                                <div style={{ color: '#6366f1', fontWeight: 500 }}>{c.email || '-'}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>HP: {c.handphone || '-'}</div>
                                    {c.handphone && (() => {
                                        const digits = c.handphone.replace(/\D/g, '');
                                        return (
                                            <a
                                                href={`https://wa.me/${digits}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: '#25d366', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                title="Chat on WhatsApp"
                                            >
                                                <MessageSquare size={14} fill="#25d366" color="#fff" />
                                            </a>
                                        );
                                    })()}
                                </div>
                            </td>
                            <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => navigate(`/contacts/${c.id}?partnerId=${partnerId}`)}>Edit</button>
                                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => remove(c.id)}>Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

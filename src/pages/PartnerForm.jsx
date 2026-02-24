import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, ArrowLeft, X, Plus } from 'lucide-react';
import { getPartners, savePartner, getContactsByPartner, deleteContact, uploadFile } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';
import BusinessCardUpload from '../components/common/BusinessCardUpload';
import { COUNTRIES } from '../lib/constants';

const PARTNER_TYPES = ['Customer', 'Supplier', 'Customer Related', 'Supplier Related', 'Freelancer', 'Service Company'];

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
        address: '',
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
        business_card_url: ''
    });

    const [typeInput, setTypeInput] = useState('');
    const [loading, setLoading] = useState(false);

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

    const handleAddType = (e) => {
        if (e.target.value && !formData.types.includes(e.target.value)) {
            setFormData(prev => ({ ...prev, types: [...prev.types, e.target.value] }));
        }
        setTypeInput('');
    };

    const removeType = (typeToRemove) => {
        setFormData(prev => ({
            ...prev,
            types: prev.types.filter(t => t !== typeToRemove)
        }));
    };

    const isRelatedSelected = formData.types.some(t => t.includes('Related'));
    const isCustomerSelected = formData.types.includes('Customer');
    const isSupplierSelected = formData.types.includes('Supplier');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert('Partner Name is required');

        setLoading(true);
        try {
            const dataToSave = { ...formData, id: isNew ? undefined : id };
            if (isNew && profile?.company_id) {
                dataToSave.company_id = profile.company_id;
            }
            await savePartner(dataToSave);
            navigate('/partners');
        } catch (err) {
            console.error("SUPABASE SAVE ERROR:", err);
            alert("Error saving partner. Check console.");
            setLoading(false);
        }
    };

    if (loading && !isNew) return <div style={{ padding: '40px' }}>Loading partner data...</div>;

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                try {
                    const url = await uploadFile('company_assets', `partners / content / ${id || 'temp'} `, file, { maxWidth: 1024 });
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', url);
                } catch (error) {
                    console.error('Image upload failed:', error);
                }
            }
        };
    };

    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px' }}
                        onClick={() => navigate('/partners')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="page-title">{isNew ? 'New Partner' : 'Edit Partner'}</h2>
                </div>
                <div>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Partner'}
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label className="form-label">Partner Type (Multiselect)</label>
                        <div className="multi-select-container">
                            {formData.types.map(t => (
                                <div key={t} className="tag">
                                    {t}
                                    <span className="tag-remove" onClick={() => removeType(t)}>×</span>
                                </div>
                            ))}
                        </div>
                        <select
                            className="form-select"
                            value={typeInput}
                            onChange={handleAddType}
                            style={{ padding: '8px', maxWidth: '300px' }}
                        >
                            <option value="">Select a type to add...</option>
                            {PARTNER_TYPES.map(t => (
                                <option key={t} value={t} disabled={formData.types.includes(t)}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {isRelatedSelected && (
                        <div className="form-group animate-fade-in" style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                            <label className="form-label text-accent">Others (Related details)</label>
                            <input
                                type="text"
                                className="form-input"
                                name="others"
                                value={formData.others || ''}
                                onChange={handleChange}
                                placeholder="Specify relationship details..."
                            />
                        </div>
                    )}

                    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '40px' }}>
                        <div>
                            <div className="form-group">
                                <label className="form-label">Partner Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. Acme Corporation"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Country</label>
                                <select
                                    className="form-select"
                                    name="country"
                                    value={formData.country || ''}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Country...</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <textarea
                                    className="form-textarea"
                                    name="address"
                                    value={formData.address || ''}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Email 1</label>
                                    <input type="email" className="form-input" name="email1" value={formData.email1 || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email 2</label>
                                    <input type="email" className="form-input" name="email2" value={formData.email2 || ''} onChange={handleChange} />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Phone 1</label>
                                    <input type="tel" className="form-input" name="phone1" value={formData.phone1 || ''} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone 2</label>
                                    <input type="tel" className="form-input" name="phone2" value={formData.phone2 || ''} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Weblink (URL)</label>
                                <input
                                    type="url"
                                    className="form-input"
                                    name="weblink"
                                    value={formData.weblink || ''}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="grid-2">
                                {isCustomerSelected && (
                                    <>
                                        <div className="form-group animate-fade-in">
                                            <label className="form-label">Customer Credit Limit</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="customerCredit"
                                                value={formData.customerCredit || ''}
                                                onChange={handleChange}
                                                placeholder="e.g. 5000"
                                            />
                                        </div>
                                        <div className="form-group animate-fade-in">
                                            <label className="form-label">Customer Credit Time (Days)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                name="customerCreditTime"
                                                value={formData.customerCreditTime || ''}
                                                onChange={handleChange}
                                                placeholder="e.g. 30"
                                            />
                                        </div>
                                    </>
                                )}

                                {isSupplierSelected && (
                                    <>
                                        <div className="form-group animate-fade-in">
                                            <label className="form-label">Supplier Credit Limit</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                name="supplierCredit"
                                                value={formData.supplierCredit || ''}
                                                onChange={handleChange}
                                                placeholder="e.g. 10000"
                                            />
                                        </div>
                                        <div className="form-group animate-fade-in">
                                            <label className="form-label">Supplier Credit Time (Days)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                name="supplierCreditTime"
                                                value={formData.supplierCreditTime || ''}
                                                onChange={handleChange}
                                                placeholder="e.g. 60"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <BusinessCardUpload
                                value={formData.business_card_url}
                                onChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                            />

                            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', border: '1px dashed var(--accent)' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--accent)' }}>Quick Tip</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    Upload a photo of the business card to quickly reference contact details later without searching through emails.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '24px' }}>
                        <label className="form-label">Other Information</label>
                        <ReactQuill
                            ref={quillRef}
                            theme="snow"
                            value={formData.info || ''}
                            onChange={handleEditorChange}
                            modules={modules}
                        />
                    </div>
                </form>
            </div>

            {!isNew && (
                <div style={{ marginTop: '40px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3>Related Contacts</h3>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/ contacts / new? partnerId = ${id} `)}
                        >
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

    useEffect(() => {
        loadContacts();
    }, [partnerId]);

    const loadContacts = async () => {
        setLoading(true);
        setContacts(await getContactsByPartner(partnerId));
        setLoading(false);
    };

    const remove = async (id) => {
        if (window.confirm('Delete this contact?')) {
            await deleteContact(id);
            loadContacts();
        }
    };

    if (loading) return <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
    if (contacts.length === 0) return <div className="glass-panel" style={{ color: 'var(--text-secondary)' }}>No contacts found.</div>;

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Contact Name</th>
                        <th>Post</th>
                        <th>Email / Phone</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {contacts.map(c => (
                        <tr key={c.id}>
                            <td style={{ fontWeight: '500' }}>{c.name}</td>
                            <td>{c.post || '-'}</td>
                            <td>
                                <div>{c.email || '-'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>HP: {c.handphone || '-'}</div>
                            </td>
                            <td>
                                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.85rem', marginRight: '8px' }} onClick={() => navigate(`/ contacts / ${c.id}?partnerId = ${partnerId} `)}>Edit</button>
                                <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.85rem' }} onClick={() => remove(c.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

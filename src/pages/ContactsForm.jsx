import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Save, ArrowLeft, X, User, Mail, Phone, Briefcase, Plus, ExternalLink, Settings } from 'lucide-react';
import { getContacts, saveContact, getPartners } from '../lib/store';
import BusinessCardUpload from '../components/common/BusinessCardUpload';

export default function ContactsForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isNew = id === 'new';
    const partnerIdFromUrl = searchParams.get('partnerId') || searchParams.get(' partnerId') || searchParams.get('partnerId ');

    const [formData, setFormData] = useState({
        partnerId: partnerIdFromUrl || '',
        name: '',
        post: '',
        email: '',
        phone: '',
        handphone: '',
        // Default to 'Contact' if from a partner, otherwise 'Other'
        type: partnerIdFromUrl ? 'Contact' : 'Other',
        info: '',
        business_card_url: '',
        business_card_back_url: '',
        department: ''
    });

    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setPartners(await getPartners());

            if (!isNew) {
                const contacts = await getContacts();
                const existing = contacts.find(c => c.id === id);
                if (existing) {
                    setFormData(existing);
                }
            }
            setLoading(false);
        }
        load();
    }, [id, isNew]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'partnerId' && value === 'NEW_PARTNER') {
            navigate('/partners/new');
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (redirect = true) => {
        if (!formData.name) return alert('Contact Name is required');
        if (!formData.partnerId) return alert('Please select a Partner to link this contact to');

        setSaving(true);
        try {
            await saveContact({
                ...formData,
                id: isNew ? undefined : id
            });

            if (redirect) {
                navigate(`/partners/${formData.partnerId}`);
            } else {
                // Reset for "Save & New"
                setFormData({
                    partnerId: partnerIdFromUrl || formData.partnerId,
                    name: '',
                    post: '',
                    email: '',
                    phone: '',
                    handphone: '',
                    type: (partnerIdFromUrl || formData.partnerId) ? 'Contact' : 'Other',
                    info: '',
                    business_card_url: '',
                    business_card_back_url: '',
                    department: ''
                });
                alert('Contact saved! You can now create another.');
            }
        } catch (err) {
            alert(`Error saving contact: ${err.message || 'See console.'}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading form...</div>;

    const contactTypes = ['Contact', 'Purchase', 'Technical', 'Accounts', 'Delivery', 'Freelancer', 'Personal', 'Friend', 'Relative', 'Other'];

    return (
        <div className="animate-fade-in" style={{ padding: '20px', background: '#f8fafc', minHeight: '100vh' }}>
            {/* Odoo Style Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                    {isNew ? 'Create Contact' : 'Edit Contact'}
                </h2>
                <button
                    onClick={() => navigate(formData.partnerId ? `/partners/${formData.partnerId}` : '/partners')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                    <X size={24} />
                </button>
            </div>

            <div className="glass-panel" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px', borderRadius: '12px', background: '#fff' }}>
                {/* Type Selectors */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', rowGap: '12px', marginBottom: '32px' }}>
                    {contactTypes.map(t => (
                        <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', color: formData.type === t ? '#008b8b' : '#64748b', fontWeight: formData.type === t ? 600 : 400 }}>
                            <input
                                type="radio"
                                name="type"
                                value={t}
                                checked={formData.type === t}
                                onChange={handleChange}
                                style={{ accentColor: '#008b8b', width: '18px', height: '18px' }}
                            />
                            {t}
                        </label>
                    ))}
                </div>

                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f1f5f9' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>Linked Company *</label>
                    <select
                        name="partnerId"
                        value={formData.partnerId}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: '1rem', fontWeight: 500 }}
                        required
                    >
                        <option value="">Select Company...</option>
                        <option value="NEW_PARTNER" style={{ fontWeight: 'bold', color: '#6366f1' }}>+ Add New Partner...</option>
                        {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '32px' }}>
                    {/* Left Side: Avatar */}
                    <div style={{ width: '100px', height: '100px', background: '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={64} color="#cbd5e1" strokeWidth={1} />
                    </div>

                    {/* Right Side: Main Fields */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Brandon Freeman"
                                style={{ width: '100%', fontSize: '1.75rem', border: 'none', borderBottom: '2px solid #008b8b', outline: 'none', padding: '4px 0', color: '#1e293b' }}
                                required
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Mail size={16} color="#64748b" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email"
                                style={{ flex: 1, border: 'none', fontSize: '1rem', outline: 'none', color: '#475569' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Phone size={16} color="#64748b" />
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Phone"
                                style={{ flex: 1, border: 'none', fontSize: '1rem', outline: 'none', color: '#475569' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Settings size={16} color="#64748b" />
                            <input
                                type="text"
                                name="department"
                                value={formData.department || ''}
                                onChange={handleChange}
                                placeholder="Department"
                                style={{ flex: 1, border: 'none', fontSize: '1rem', outline: 'none', color: '#475569' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Briefcase size={16} color="#64748b" />
                            <input
                                type="text"
                                name="post"
                                value={formData.post}
                                onChange={handleChange}
                                placeholder="Job title"
                                style={{ flex: 1, border: 'none', fontSize: '1rem', outline: 'none', color: '#475569' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Side Content Section */}
                <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px', borderTop: '1px solid #f1f5f9', paddingTop: '32px' }}>
                    {/* Left: Notes */}
                    <div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem' }}>Internal Notes</span>
                        </div>
                        <textarea
                            name="info"
                            value={formData.info}
                            onChange={handleChange}
                            placeholder="Add internal notes about this contact..."
                            style={{ width: '100%', minHeight: '300px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', outline: 'none', fontSize: '1rem', color: '#475569', resize: 'vertical', background: '#fcfcfc' }}
                        />
                    </div>

                    {/* Right: Metadata & Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Cards</h4>
                            <BusinessCardUpload
                                frontValue={formData.business_card_url}
                                backValue={formData.business_card_back_url}
                                onFrontChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                                onBackChange={(url) => setFormData(prev => ({ ...prev, business_card_back_url: url }))}
                                onOCR={(text) => {
                                    if (!text) return;
                                    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                    const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);

                                    setFormData(prev => ({
                                        ...prev,
                                        email: prev.email || emailMatch?.[0] || '',
                                        phone: prev.phone || phoneMatch?.[0] || '',
                                        info: (prev.info || '') + `\n\n[OCR EXTRACTED TEXT]\n${text}`
                                    }));
                                }}
                                label=""
                            />
                        </div>

                        <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', border: '1px dashed #6366f1' }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#6366f1', lineHeight: 1.4 }}>
                                <strong>Pro Tip:</strong> Snap a photo of physical cards to keep digital records always available.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Footer Buttons */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', gap: '12px', zIndex: 1000 }}>
                <button
                    className="btn btn-primary"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    style={{ background: '#714b67', borderColor: '#714b67', padding: '10px 24px', borderRadius: '6px' }}
                >
                    Save & Close
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    style={{ background: '#714b67', color: '#fff', borderColor: '#714b67', padding: '10px 24px', borderRadius: '6px' }}
                >
                    Save & New
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={() => navigate(formData.partnerId ? `/partners/${formData.partnerId}` : '/partners')}
                    style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 24px', borderRadius: '6px' }}
                >
                    Discard
                </button>
            </div>

            {/* Padding for Footer */}
            <div style={{ height: '80px' }} />
        </div>
    );
}

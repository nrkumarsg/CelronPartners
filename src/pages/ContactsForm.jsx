import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, ArrowLeft } from 'lucide-react';
import { getContacts, saveContact, getPartners } from '../lib/store';

export default function ContactsForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isNew = id === 'new';
    const partnerId = searchParams.get('partnerId');

    const [formData, setFormData] = useState({
        partnerId: partnerId || '',
        name: '',
        post: '',
        address: '',
        email: '',
        phone: '',
        handphone: '',
        facebook: '',
        info: ''
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
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditorChange = (content) => {
        setFormData(prev => ({ ...prev, info: content }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert('Contact Name is required');
        if (!formData.partnerId) return alert('Please select a Partner to link this contact to');

        setSaving(true);
        try {
            await saveContact({
                ...formData,
                id: isNew ? undefined : id
            });
            navigate(`/partners/${formData.partnerId}`);
        } catch (err) {
            alert("Error saving contact. See console.");
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '40px' }}>Loading form...</div>;

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px' }}
                        onClick={() => navigate(formData.partnerId ? `/partners/${formData.partnerId}` : '/partners')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="page-title">{isNew ? 'New Contact Entity' : 'Edit Contact Entity'}</h2>
                </div>
                <div>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Contact'}
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label className="form-label">Linked Partner (Company) *</label>
                        <select
                            className="form-select"
                            name="partnerId"
                            value={formData.partnerId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Partner...</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Contact Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Post / Designation</label>
                            <input
                                type="text"
                                className="form-input"
                                name="post"
                                value={formData.post || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address (if available)</label>
                        <textarea
                            className="form-textarea"
                            name="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                            style={{ minHeight: '80px' }}
                        />
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input type="email" className="form-input" name="email" value={formData.email || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input type="tel" className="form-input" name="phone" value={formData.phone || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Handphone / Mobile</label>
                            <input type="tel" className="form-input" name="handphone" value={formData.handphone || ''} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Facebook Weblink</label>
                            <input
                                type="url"
                                className="form-input"
                                name="facebook"
                                placeholder="https://facebook.com/..."
                                value={formData.facebook || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '24px' }}>
                        <label className="form-label">Other Information</label>
                        <ReactQuill
                            theme="snow"
                            value={formData.info || ''}
                            onChange={handleEditorChange}
                            modules={{
                                toolbar: [
                                    [{ 'header': [1, 2, false] }],
                                    ['bold', 'italic', 'underline', 'strike'],
                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                    ['link', 'image'],
                                    ['clean']
                                ]
                            }}
                        />
                    </div>
                </form>
            </div>
        </div>
    );
}

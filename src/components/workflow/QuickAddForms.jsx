import React, { useState } from 'react';
import { Ship, User, Users, MapPin, X, Save, Globe, Mail, Phone, Map, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePartner } from '../../lib/store';
import BusinessCardUpload from '../common/BusinessCardUpload';
import { COUNTRIES, PARTNER_CATEGORIES } from '../../lib/constants';

// Generic Modal Base
export const Modal = ({ isOpen, onClose, title, children, icon: Icon }) => {
    if (!isOpen) return null;
    return (
        <div className="quick-modal-overlay">
            <div className="quick-modal-content">
                <div className="quick-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {Icon && <Icon size={20} className="text-accent" />}
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
                    </div>
                    <button className="icon-btn-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="quick-modal-body">
                    {children}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .quick-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                    padding: 20px;
                }
                .quick-modal-content {
                    background: #fff;
                    width: 100%;
                    max-width: 700px;
                    max-height: 90vh;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    animation: modal-slide-up 0.3s ease-out;
                }
                @keyframes modal-slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .quick-modal-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #fff;
                    z-index: 10;
                }
                .quick-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }
                .icon-btn-close {
                    background: transparent;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 6px;
                }
                .icon-btn-close:hover { background: #f1f5f9; color: #1e293b; }
                .text-accent { color: #6366f1; }
                .quick-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid #e2e8f0;
                    background: #fff;
                }
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .full-width {
                    grid-column: 1 / -1;
                }
            `}} />
        </div>
    );
};

// Quick Partner Add
export const QuickPartnerAdd = ({ company_id, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        types: ['Customer'],
        address: '',
        country: '',
        email1: '',
        phone1: '',
        weblink: '',
        customerCredit: '',
        supplierCredit: '',
        customerCreditTime: '',
        supplierCreditTime: '',
        city: '',
        brand: '',
        notes: '',
        business_card_url: '',
        business_card_back_url: ''
    });
    const [customCategory, setCustomCategory] = useState('');

    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            types: prev.types.includes(cat)
                ? prev.types.filter(t => t !== cat)
                : [...prev.types, cat]
        }));
    };

    const handleAddCustomCategory = () => {
        if (customCategory.trim() && !formData.types.includes(customCategory.trim())) {
            setFormData(prev => ({
                ...prev,
                types: [...prev.types, customCategory.trim()]
            }));
            setCustomCategory('');
        }
    };
    const openWebsite = () => {
        const url = formData.weblink;
        if (url) {
            const path = url.startsWith('http') ? url : `https://${url}`;
            window.open(path, '_blank');
        } else {
            window.open('https://www.google.com', '_blank');
        }
    };

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Name is required');
        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                company_id
            };
            const { data, error } = await supabase.from('partners').insert([dataToSave]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert(`Failed to save partner: ${err.message || 'Check connection.'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Website Section */}
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                <div style={{ width: '64px', height: '64px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe color="#6366f1" size={28} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontWeight: 500, color: '#1e293b', display: 'block', marginBottom: '6px' }}>Company Website</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            placeholder="https://partner.com"
                            name="weblink"
                            value={formData.weblink}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={openWebsite}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <ExternalLink size={14} /> Visit
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="form-item">
                    <label>Company Name *</label>
                    <input className="form-input" name="name" value={formData.name} onChange={handleChange} placeholder="Partner company name" autoFocus />
                </div>
                <div className="form-item">
                    <label>Email *</label>
                    <input className="form-input" name="email1" type="email" value={formData.email1} onChange={handleChange} placeholder="contact@partner.com" />
                </div>
                <div className="form-item">
                    <label>Phone</label>
                    <input className="form-input" name="phone1" value={formData.phone1} onChange={handleChange} placeholder="+1 234 567 8900" />
                </div>
                <div className="form-item">
                    <label>Country *</label>
                    <select className="form-select" name="country" value={formData.country} onChange={handleChange}>
                        <option value="" disabled>Select Country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="form-item">
                    <label>City</label>
                    <input className="form-input" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
                </div>
                <div className="form-item">
                    <label>Address</label>
                    <input className="form-input" name="address" value={formData.address} onChange={handleChange} placeholder="Full address" />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {PARTNER_CATEGORIES.map(cat => (
                        <div
                            key={cat}
                            onClick={() => handleCategoryToggle(cat)}
                            style={{ padding: '6px 14px', borderRadius: '24px', border: formData.types.includes(cat) ? '1px solid #6366f1' : '1px solid #e2e8f0', background: formData.types.includes(cat) ? '#e0e7ff' : '#fff', color: formData.types.includes(cat) ? '#6366f1' : '#475569', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                            {cat}
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                        placeholder="Add custom category"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCategory())}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                    />
                    <button type="button" onClick={handleAddCustomCategory} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Add</button>
                </div>
            </div>

            <div className="form-item">
                <label>Brands Supported</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="form-input" name="brand" value={formData.brand} onChange={handleChange} placeholder="Brand names" />
                    <button type="button" className="btn btn-secondary" style={{ padding: '0 12px' }}><Plus size={16} /></button>
                </div>
            </div>

            <div className="grid-2">
                <div className="form-item">
                    <label>Customer Credit Limit</label>
                    <input className="form-input" name="customerCredit" value={formData.customerCredit} onChange={handleChange} placeholder="e.g. 5000" />
                </div>
                <div className="form-item">
                    <label>Customer Credit Time (Days)</label>
                    <input className="form-input" name="customerCreditTime" value={formData.customerCreditTime} onChange={handleChange} placeholder="e.g. 30" />
                </div>
                <div className="form-item">
                    <label>Supplier Credit Limit</label>
                    <input className="form-input" name="supplierCredit" value={formData.supplierCredit} onChange={handleChange} placeholder="e.g. 10000" />
                </div>
                <div className="form-item">
                    <label>Supplier Credit Time (Days)</label>
                    <input className="form-input" name="supplierCreditTime" value={formData.supplierCreditTime} onChange={handleChange} placeholder="e.g. 60" />
                </div>
            </div>

            <div style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <BusinessCardUpload
                    frontValue={formData.business_card_url}
                    backValue={formData.business_card_back_url}
                    onFrontChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                    onBackChange={(url) => setFormData(prev => ({ ...prev, business_card_back_url: url }))}
                    label="Business Card"
                />
            </div>

            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !formData.name}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Partner'}
                </button>
            </div>
        </div>
    );
};

export const QuickContactAdd = ({ company_id, partner_id, partners, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        partnerId: partner_id || '',
        post: '',
        phone: '',
        handphone: '',
        address: '',
        business_card_url: '',
        business_card_back_url: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.partnerId) return alert('Name and Partner are required');
        setLoading(true);
        try {
            const { data, error } = await supabase.from('contacts').insert([{
                ...formData,
                company_id
            }]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert('Failed to save contact');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="grid-2">
                <div className="form-item full-width">
                    <label>Customer / Partner *</label>
                    <select
                        className="form-select"
                        name="partnerId"
                        value={formData.partnerId}
                        onChange={handleChange}
                    >
                        <option value="">Select Partner...</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="form-item">
                    <label>Contact Name *</label>
                    <input
                        className="form-input"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        autoFocus
                    />
                </div>

                <div className="form-item">
                    <label>Post / Designation</label>
                    <input
                        className="form-input"
                        name="post"
                        value={formData.post}
                        onChange={handleChange}
                        placeholder="e.g. Purchasing Manager"
                    />
                </div>

                <div className="form-item">
                    <label><Mail size={14} /> Email Address</label>
                    <input
                        className="form-input"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                    />
                </div>

                <div className="form-item">
                    <label><Phone size={14} /> Office Phone</label>
                    <input
                        className="form-input"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+65 ...."
                    />
                </div>

                <div className="form-item">
                    <label><Phone size={14} /> Handphone / Mobile</label>
                    <input
                        className="form-input"
                        name="handphone"
                        value={formData.handphone}
                        onChange={handleChange}
                        placeholder="+65 ...."
                    />
                </div>

                <div className="form-item full-width">
                    <label>Contact Address (if different)</label>
                    <textarea
                        className="form-textarea"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter specific address if any..."
                        rows={2}
                    />
                </div>
            </div>

            <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                <BusinessCardUpload
                    frontValue={formData.business_card_url}
                    backValue={formData.business_card_back_url}
                    onFrontChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                    onBackChange={(url) => setFormData(prev => ({ ...prev, business_card_back_url: url }))}
                    label="Contact Business Card"
                />
            </div>

            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !formData.name || !formData.partnerId}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Contact'}
                </button>
            </div>
        </div>
    );
};

export const QuickVesselAdd = ({ company_id, onSuccess, onCancel }) => {
    const [vesselName, setVesselName] = useState('');
    const [imo, setImo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!vesselName) return alert('Vessel Name is required');
        setLoading(true);
        try {
            const { data, error } = await supabase.from('vessels').insert([{
                vessel_name: vesselName,
                imo_number: imo,
                company_id
            }]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert('Failed to save vessel');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="form-item">
                <label>Vessel Name *</label>
                <input
                    className="form-input"
                    value={vesselName}
                    onChange={e => setVesselName(e.target.value)}
                    placeholder="e.g. MS Galaxy"
                    autoFocus
                />
            </div>
            <div className="form-item">
                <label>IMO Number</label>
                <input
                    className="form-input"
                    value={imo}
                    onChange={e => setImo(e.target.value)}
                    placeholder="e.g. 9123456"
                />
            </div>
            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !vesselName}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Vessel'}
                </button>
            </div>
        </div>
    );
};

export const QuickLocationAdd = ({ company_id, onSuccess, onCancel }) => {
    const [locationName, setLocationName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!locationName) return alert('Location Name is required');
        setLoading(true);
        try {
            const { data, error } = await supabase.from('work_locations').insert([{
                location_name: locationName,
                company_id
            }]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert('Failed to save location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="form-item">
                <label>Location Name *</label>
                <input
                    className="form-input"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="e.g. Port of Singapore"
                    autoFocus
                />
            </div>
            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !locationName}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Location'}
                </button>
            </div>
        </div>
    );
};

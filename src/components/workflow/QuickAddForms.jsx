import React, { useState } from 'react';
import { Ship, User, Users, MapPin, X, Save, Globe, Mail, Phone, Map } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePartner } from '../../lib/store';

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
        supplierCreditTime: ''
    });
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
            alert('Failed to save partner');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="grid-2">
                <div className="form-item full-width">
                    <label>Partner / Company Name *</label>
                    <input
                        className="form-input"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Acme Corp"
                        autoFocus
                    />
                </div>

                <div className="form-item">
                    <label>Partner Type (Customer/Supplier)</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.types.includes('Customer')}
                                onChange={(e) => {
                                    const newTypes = e.target.checked
                                        ? [...formData.types, 'Customer']
                                        : formData.types.filter(t => t !== 'Customer');
                                    setFormData(prev => ({ ...prev, types: newTypes }));
                                }}
                            /> Customer
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.types.includes('Supplier')}
                                onChange={(e) => {
                                    const newTypes = e.target.checked
                                        ? [...formData.types, 'Supplier']
                                        : formData.types.filter(t => t !== 'Supplier');
                                    setFormData(prev => ({ ...prev, types: newTypes }));
                                }}
                            /> Supplier
                        </label>
                    </div>
                </div>

                <div className="form-item">
                    <label><Mail size={14} /> Email</label>
                    <input
                        className="form-input"
                        name="email1"
                        type="email"
                        value={formData.email1}
                        onChange={handleChange}
                        placeholder="email@example.com"
                    />
                </div>

                <div className="form-item">
                    <label><Phone size={14} /> Phone</label>
                    <input
                        className="form-input"
                        name="phone1"
                        value={formData.phone1}
                        onChange={handleChange}
                        placeholder="+65 ...."
                    />
                </div>

                <div className="form-item">
                    <label><Globe size={14} /> Website</label>
                    <input
                        className="form-input"
                        name="weblink"
                        value={formData.weblink}
                        onChange={handleChange}
                        placeholder="https://..."
                    />
                </div>

                <div className="form-item">
                    <label><Map size={14} /> Country</label>
                    <input
                        className="form-input"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="Singapore"
                    />
                </div>

                <div className="form-item full-width">
                    <label>Address</label>
                    <textarea
                        className="form-textarea"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter full address..."
                        rows={3}
                    />
                </div>

                <div className="form-item">
                    <label>Customer Credit Limit</label>
                    <input
                        className="form-input"
                        name="customerCredit"
                        value={formData.customerCredit}
                        onChange={handleChange}
                        placeholder="e.g. 5000"
                    />
                </div>

                <div className="form-item">
                    <label>Customer Credit Time (Days)</label>
                    <input
                        className="form-input"
                        name="customerCreditTime"
                        value={formData.customerCreditTime}
                        onChange={handleChange}
                        placeholder="e.g. 30"
                    />
                </div>

                <div className="form-item">
                    <label>Supplier Credit Limit</label>
                    <input
                        className="form-input"
                        name="supplierCredit"
                        value={formData.supplierCredit}
                        onChange={handleChange}
                        placeholder="e.g. 10000"
                    />
                </div>

                <div className="form-item">
                    <label>Supplier Credit Time (Days)</label>
                    <input
                        className="form-input"
                        name="supplierCreditTime"
                        value={formData.supplierCreditTime}
                        onChange={handleChange}
                        placeholder="e.g. 60"
                    />
                </div>
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
        address: ''
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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Globe, Building2, Mail, Phone, Star, Filter, ChevronDown, CheckCircle2, Circle, X, UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import { getPartners, deletePartner, savePartner } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

export default function Partners() {
    const { profile } = useAuth();
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
        name: '', email1: '', phone1: '', weblink: '', country: '', city: '', address: '', notes: '', brand: '',
        types: [],
        rating: 0
    });

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        setLoading(true);
        const data = await getPartners();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setPartners(sorted);
        setLoading(false);
    };

    const handleSaveNewSupplier = async (e) => {
        e.preventDefault();
        try {
            // Map fields that match the db schema
            const dataToSave = {
                name: newSupplier.name,
                email1: newSupplier.email1,
                phone1: newSupplier.phone1,
                weblink: newSupplier.weblink,
                country: newSupplier.country,
                address: newSupplier.address,
                types: newSupplier.types,
                info: newSupplier.notes || ''
            };

            if (newSupplier.city) {
                dataToSave.address = `${newSupplier.city}, ${dataToSave.address}`;
            }

            if (newSupplier.brand) {
                dataToSave.info += ` | Brands: ${newSupplier.brand}`;
            }

            if (profile?.company_id) {
                dataToSave.company_id = profile.company_id;
            }

            await savePartner(dataToSave);
            setShowModal(false);
            loadPartners(); // reload the grid
            alert('Supplier added successfully!');
        } catch (error) {
            console.error('Failed to save supplier', error);
            alert('Failed to save. Check inputs.');
        }
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function (results) {
                let imported = 0;
                for (const row of results.data) {
                    const types = row.types ? row.types.split(';') : [];
                    const dataToSave = { ...row, types };
                    if (!dataToSave.id) delete dataToSave.id;
                    try {
                        await savePartner(dataToSave);
                        imported++;
                    } catch (err) {
                        console.error("Error saving partner row", err);
                    }
                }
                alert(`Successfully imported ${imported} partners`);
                loadPartners();
            },
            error: function () {
                alert('Error parsing CSV file');
                setLoading(false);
            }
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredPartners = partners.filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.email1 && p.email1.toLowerCase().includes(term)) ||
            (p.country && p.country.toLowerCase().includes(term)) ||
            (p.types && p.types.some(t => t.toLowerCase().includes(term))) ||
            (p.brand && p.brand.toLowerCase().includes(term))
        );
    });

    const paginatedPartners = filteredPartners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleCategoryToggle = (cat) => {
        setNewSupplier(prev => ({
            ...prev,
            types: prev.types.includes(cat)
                ? prev.types.filter(t => t !== cat)
                : [...prev.types, cat]
        }));
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px', position: 'relative' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Suppliers</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage your global supplier network</p>
                </div>
                <button onClick={() => setShowModal(true)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                    <Plus size={18} /> Add Supplier
                </button>
            </header>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flex: 1, minWidth: '400px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#94a3b8' }}>
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 0', fontSize: '0.95rem', color: '#334155' }}
                        placeholder="Search by name, city, or brand..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                        <MapPin size={16} color="#94a3b8" /> All Countries <ChevronDown size={14} />
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                        <Filter size={16} color="#94a3b8" /> All Categories <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            {/* Results Grid Based on Partners.jsx list data */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading suppliers...</div>
            ) : filteredPartners.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No suppliers found.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                    {paginatedPartners.map(res => (
                        <div key={res.id} style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => navigate(`/partners/${res.id}`)}>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                    <Building2 size={24} />
                                </div>
                                <div style={{ flex: 1, paddingRight: '24px' }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{res.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                                        <MapPin size={14} /> {res.country || 'No Location'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < (res.rating || 5) ? "#fbbf24" : "transparent"} color={i < (res.rating || 5) ? "#fbbf24" : "#e2e8f0"} />
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                                    <Mail size={16} /> {res.email1 || 'No email provided'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                                    <Phone size={16} /> {res.phone1 || 'No phone provided'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                {res.types && res.types.map((cat, i) => (
                                    <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px', fontWeight: 500 }}>
                                        {cat}
                                    </span>
                                ))}
                            </div>

                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                Brands: <span style={{ color: '#475569' }}>{res.brand || 'General Supplies'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredPartners.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredPartners.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}


            {/* The BASE44 Replicated Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '600px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>

                        <div onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', color: '#94a3b8' }}>
                            <X size={24} />
                        </div>

                        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Add New Supplier</h2>

                        <form onSubmit={handleSaveNewSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '24px', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', marginBottom: '8px' }}>
                                <div style={{ width: '64px', height: '64px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UploadCloud color="#94a3b8" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 500, color: '#1e293b' }}>Company Logo</div>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Upload a logo image</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Company Name *</label>
                                    <input required placeholder="Supplier company name" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Email *</label>
                                    <input required type="email" placeholder="contact@supplier.com" value={newSupplier.email1} onChange={e => setNewSupplier({ ...newSupplier, email1: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Phone</label>
                                    <input placeholder="+1 234 567 8900" value={newSupplier.phone1} onChange={e => setNewSupplier({ ...newSupplier, phone1: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Website</label>
                                    <input placeholder="https://supplier.com" value={newSupplier.weblink} onChange={e => setNewSupplier({ ...newSupplier, weblink: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Country *</label>
                                    <input required placeholder="Country" value={newSupplier.country} onChange={e => setNewSupplier({ ...newSupplier, country: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>City</label>
                                    <input placeholder="City" value={newSupplier.city} onChange={e => setNewSupplier({ ...newSupplier, city: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Address</label>
                                <input placeholder="Full address" value={newSupplier.address} onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Categories</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {['Supplier', 'Spare Parts', 'Service', 'Calibration', 'Automation', 'Electrical', 'Mechanical', 'Instrumentation', 'Safety Equipment', 'Industrial Supplies'].map(cat => (
                                        <div
                                            key={cat}
                                            onClick={() => handleCategoryToggle(cat)}
                                            style={{ padding: '6px 14px', borderRadius: '24px', border: newSupplier.types.includes(cat) ? '1px solid #6366f1' : '1px solid #e2e8f0', background: newSupplier.types.includes(cat) ? '#e0e7ff' : '#fff', color: newSupplier.types.includes(cat) ? '#6366f1' : '#475569', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Brands Supported</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input placeholder="Add brand name" value={newSupplier.brand} onChange={e => setNewSupplier({ ...newSupplier, brand: e.target.value })} style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                    <button type="button" style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff' }}><Plus size={16} /></button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Notes</label>
                                <textarea rows="3" placeholder="Internal notes about this supplier..." value={newSupplier.notes} onChange={e => setNewSupplier({ ...newSupplier, notes: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 24px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                                    Add Supplier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

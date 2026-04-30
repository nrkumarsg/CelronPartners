import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Globe, Building2, Mail, Phone, Star, Filter, ChevronDown, CheckCircle2, Circle, X, UploadCloud, Upload, Download, Printer, MoreVertical, Edit, Trash2, Loader2, ExternalLink, Settings, Paperclip, FileX, HardDrive, User, Users } from 'lucide-react';
import Papa from 'papaparse';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { getPartners, deletePartner, savePartner, purgeCategoryGlobally } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import BusinessCardUpload from '../components/common/BusinessCardUpload';
import { COUNTRIES, PARTNER_CATEGORIES } from '../lib/constants';


import CompanyAutocomplete from '../components/common/CompanyAutocomplete';
import PartnerDocuments from '../components/partners/PartnerDocuments';

export default function Partners() {
    const { profile } = useAuth();
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [activeMenu, setActiveMenu] = useState(null);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ]
    };

    // Close menu when clicking outside
    useEffect(() => {
        const closeMenu = () => setActiveMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [newPartner, setNewPartner] = useState({
        name: '', email1: '', phone1: '', weblink: '', country: '', city: '', address: '', notes: '', brand: '',
        types: [],
        rating: 0,
        customerCredit: '',
        supplierCredit: '',
        customerCreditTime: '',
        supplierCreditTime: '',
        business_card_url: '',
        business_card_back_url: ''
    });
    const [newContact, setNewContact] = useState({
        name: '', email: '', phone: '', handphone: '', post: '', address: '', business_card_url: '', business_card_back_url: ''
    });
    const [customCategory, setCustomCategory] = useState('');
    const [showCategoryMgr, setShowCategoryMgr] = useState(false);
    const [modalTab, setModalTab] = useState('details'); // 'details' or 'documents'
    const [createdPartner, setCreatedPartner] = useState(null);

    const handlePurgeCategory = async (catName) => {
        if (window.confirm(`Are you sure you want to delete "${catName}" globally? This will remove it from all partners.`)) {
            try {
                await purgeCategoryGlobally(catName);
                await loadPartners();
            } catch (err) {
                alert('Purge failed: ' + err.message);
            }
        }
    };

    const loadPartners = React.useCallback(async () => {
        setLoading(true);
        const data = await getPartners(profile);
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setPartners(sorted);
        setLoading(false);
    }, [profile]);

    useEffect(() => {
        loadPartners();
    }, [loadPartners]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleCountryChange = (e) => {
        setSelectedCountry(e.target.value);
        setCurrentPage(1);
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
        setCurrentPage(1);
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
            try {
                await deletePartner(id);
                loadPartners();
            } catch (err) {
                alert('Failed to delete partner: ' + err.message);
            }
        }
    };

    const openWebsite = (url) => {
        const link = (url || '').trim();
        if (link) {
            const fullUrl = link.startsWith('http') ? link : `https://${link}`;
            window.open(fullUrl, '_blank');
        } else {
            window.open('https://www.google.com', '_blank');
        }
    };

    const handleSaveNewPartner = async (e) => {
        e.preventDefault();
        try {
            // Map fields that match the db schema
            const dataToSave = {
                name: newPartner.name,
                email1: newPartner.email1,
                phone1: newPartner.phone1,
                weblink: newPartner.weblink,
                country: newPartner.country,
                address: newPartner.address,
                types: newPartner.types,
                info: newPartner.notes || '',
                customerCredit: newPartner.customerCredit,
                supplierCredit: newPartner.supplierCredit,
                customerCreditTime: newPartner.customerCreditTime,
                supplierCreditTime: newPartner.supplierCreditTime,
                business_card_url: newPartner.business_card_url,
                business_card_back_url: newPartner.business_card_back_url
            };

            if (newPartner.city) {
                // We keep city separate in form but join in address if needed, 
                // or just rely on the address being updated by handleCompanySelect
                if (newPartner.address && !newPartner.address.includes(newPartner.city)) {
                    dataToSave.address = `${newPartner.city}, ${newPartner.address}`;
                }
            }

            if (newPartner.brand) {
                dataToSave.info += ` | Brands: ${newPartner.brand}`;
            }

            if (profile?.company_id) {
                dataToSave.company_id = profile.company_id;
            }

            const saved = await savePartner(dataToSave);

            // Save Contact if name is provided
            if (newContact.name && saved.id) {
                const { error: cError } = await supabase.from('contacts').insert([{
                    ...newContact,
                    partnerId: saved.id,
                    company_id: profile?.company_id
                }]);
                if (cError) {
                    console.error('Failed to save associated contact:', cError);
                    alert('Partner saved, but failed to create the primary contact.');
                }
            }

            setCreatedPartner(saved);
            setModalTab('documents');
            loadPartners(); // reload the grid
            // alert('Partner added successfully!'); // Removing alert for smoother tab transition
        } catch (error) {
            console.error('Failed to save partner', error);
            alert(`Failed to save: ${error.message || 'Check inputs.'}`);
        }
    };

    const handleOCR = (text) => {
        if (!text) return;
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = text.match(/[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/);
        const webMatch = text.match(/(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/i);

        setNewPartner(prev => ({
            ...prev,
            email1: prev.email1 || emailMatch?.[0] || '',
            phone1: prev.phone1 || phoneMatch?.[0] || '',
            weblink: prev.weblink || webMatch?.[0] || '',
            notes: (prev.notes || '') + `<p><br></p><p><strong>[OCR EXTRACTED TEXT]</strong></p><p>${text.replace(/\n/g, '<br>')}</p>`
        }));
    };

    const handleCompanySelect = (place) => {
        const address = place.formatted_address || '';
        const name = place.name || '';
        const weblink = place.website || '';

        let country = '';
        let city = '';

        place.address_components?.forEach(c => {
            if (c.types.includes('country')) country = c.long_name;
            if (c.types.includes('locality')) city = c.long_name;
        });

        setNewPartner(prev => ({
            ...prev,
            name,
            address,
            city: city || prev.city,
            country: country || prev.country,
            weblink: weblink || prev.weblink
        }));
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

    const handleExportCSV = () => {
        const csvData = filteredPartners.map(p => ({
            name: p.name || '',
            email1: p.email1 || '',
            phone1: p.phone1 || '',
            country: p.country || '',
            address: p.address || '',
            weblink: p.weblink || '',
            types: p.types ? p.types.join(';') : '',
            brand: p.brand || '',
            info: p.info || ''
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'partners_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredPartners = partners.filter(p => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || (
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.email1 && p.email1.toLowerCase().includes(term)) ||
            (p.phone1 && p.phone1.toLowerCase().includes(term)) ||
            (p.country && p.country.toLowerCase().includes(term)) ||
            (p.address && p.address.toLowerCase().includes(term)) ||
            (p.weblink && p.weblink.toLowerCase().includes(term)) ||
            (p.types && p.types.some(t => t?.toLowerCase().includes(term))) ||
            (p.brand && p.brand.toLowerCase().includes(term)) ||
            (p.info && p.info.toLowerCase().includes(term))
        );
        const matchesCountry = !selectedCountry || (p.country && p.country === selectedCountry);
        const matchesCategory = !selectedCategory || (p.types && p.types.includes(selectedCategory));

        return matchesSearch && matchesCountry && matchesCategory;
    });

    const paginatedPartners = filteredPartners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const availableCategories = Array.from(new Set([...PARTNER_CATEGORIES, ...partners.flatMap(p => p.types || [])])).filter(Boolean).sort();

    const handleCategoryToggle = (cat) => {
        setNewPartner(prev => ({
            ...prev,
            types: prev.types.includes(cat)
                ? prev.types.filter(t => t !== cat)
                : [...prev.types, cat]
        }));
    };

    const handleAddCustomCategory = () => {
        if (customCategory.trim() && !newPartner.types.includes(customCategory.trim())) {
            setNewPartner(prev => ({
                ...prev,
                types: [...prev.types, customCategory.trim()]
            }));
            setCustomCategory('');
        }
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px', position: 'relative' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Partners Directory</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Global network of suppliers, customers, and service providers</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }} className="hide-on-print">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current.click()} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Upload size={18} /> Add CSV
                    </button>
                    <button onClick={handleExportCSV} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Download size={18} /> Export
                    </button>
                    <button onClick={() => window.print()} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Printer size={18} /> Print
                    </button>
                    <button onClick={() => setShowModal(true)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                        <Plus size={18} /> Add Partner
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }} className="hide-on-print">
                <div style={{ display: 'flex', flex: 1, minWidth: '400px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#94a3b8' }}>
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 0', fontSize: '0.95rem', color: '#334155' }}
                        placeholder="Search by name, website, brand, address, or notes..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 16px', gap: '8px' }}>
                        <MapPin size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <select
                            value={selectedCountry}
                            onChange={handleCountryChange}
                            style={{ appearance: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 500, padding: '10px 24px 10px 0', cursor: 'pointer', width: '100%', minWidth: '150px' }}
                        >
                            <option value="">All Countries</option>
                            {COUNTRIES.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 16px', gap: '8px' }}>
                        <Filter size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <select
                            value={selectedCategory}
                            onChange={handleCategoryChange}
                            style={{ appearance: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 500, padding: '10px 24px 10px 0', cursor: 'pointer', width: '100%', minWidth: '150px' }}
                        >
                            <option value="">All Categories</option>
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />
                    </div>

                    <button
                        onClick={() => setShowCategoryMgr(true)}
                        style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: '8px', padding: '0 12px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        title="Manage Categories"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <Loader2 className="animate-spin" size={32} style={{ marginBottom: '16px', display: 'inline-block' }} />
                    <p>Loading your business network...</p>
                </div>
            ) : filteredPartners.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '80px 40px', background: '#fff' }}>
                    <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Search size={32} color="#94a3b8" />
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No local partners found</h3>
                    <p style={{ margin: '0 0 32px 0', color: '#64748b' }}>We couldn't find any partners matching "{searchTerm}" in your directory.</p>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={() => { setSearchTerm(''); setSelectedCountry(''); setSelectedCategory(''); }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>Clear Filters</button>
                        <button onClick={() => {
                            setNewPartner(prev => ({ ...prev, name: searchTerm }));
                            setShowModal(true);
                        }} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Globe size={18} /> Search Worldwide
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                    {paginatedPartners.map(res => (
                        <div key={res.id} style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => navigate(`/partners/${res.id}`)}>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: res.business_card_url ? '#fff' : '#e0e7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', overflow: 'hidden', border: res.business_card_url ? '1px solid #e2e8f0' : 'none' }}>
                                    {res.business_card_url ? (
                                        <img src={res.business_card_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <Building2 size={24} />
                                    )}
                                </div>
                                <div style={{ flex: 1, paddingRight: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{res.name}</h3>
                                        {res.weblink && (
                                            <a href={res.weblink.trim().startsWith('http') ? res.weblink.trim() : `https://${res.weblink.trim()}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#6366f1', display: 'flex', alignItems: 'center' }} title="Visit Website">
                                                <Globe size={16} />
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                                        <MapPin size={14} /> {res.country || 'No Location'}
                                        {res.google_drive_link && (
                                            <div style={{
                                                marginLeft: 'auto',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '2px 8px',
                                                background: '#eef2ff',
                                                borderRadius: '6px',
                                                color: '#4f46e5',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                border: '1px solid #c7d2fe'
                                            }} title="Documents Linked to Google Drive">
                                                <HardDrive size={12} /> DOCS
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Ellipsis Menu */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === res.id ? null : res.id);
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {activeMenu === res.id && (
                                        <div style={{ position: 'absolute', top: '100%', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, padding: '4px', minWidth: '120px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/partners/${res.id}`);
                                                }}
                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', cursor: 'pointer', borderRadius: '4px' }}
                                                onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                                                onMouseOut={e => e.currentTarget.style.background = 'none'}
                                            >
                                                <Edit size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, res.id)}
                                                style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }}
                                                onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseOut={e => e.currentTarget.style.background = 'none'}
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    )}
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

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', width: modalTab === 'details' ? '1280px' : '700px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', transition: 'width 0.3s ease' }}>

                        <div onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', color: '#94a3b8' }}>
                            <X size={24} />
                        </div>

                        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>{createdPartner ? 'Manage Documents' : 'Add New Partner'}</h2>

                        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                            <button
                                type="button"
                                onClick={() => !createdPartner && setModalTab('details')}
                                style={{
                                    padding: '10px 0',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: modalTab === 'details' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: modalTab === 'details' ? '#6366f1' : '#64748b',
                                    fontWeight: modalTab === 'details' ? 600 : 500,
                                    cursor: createdPartner ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                1. Partner Details
                            </button>
                            <button
                                type="button"
                                onClick={() => createdPartner && setModalTab('documents')}
                                style={{
                                    padding: '10px 0',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: modalTab === 'documents' ? '2px solid #6366f1' : '2px solid transparent',
                                    color: modalTab === 'documents' ? '#6366f1' : '#64748b',
                                    fontWeight: modalTab === 'documents' ? 600 : 500,
                                    cursor: createdPartner ? 'pointer' : 'not-allowed',
                                    fontSize: '0.9rem',
                                    opacity: createdPartner ? 1 : 0.5
                                }}
                            >
                                2. Documents & Verification
                            </button>
                        </div>

                        {modalTab === 'details' ? (
                            <form onSubmit={handleSaveNewPartner}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', alignItems: 'start' }}>
                                    {/* Left Column: Partner Details */}
                                    <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '40px' }}>
                                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
                                            <Building2 size={18} />
                                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Step 1: Partner Information</span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', marginBottom: '16px' }}>
                                            <div style={{ width: '64px', height: '64px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Building2 color="#6366f1" size={28} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <label style={{ fontWeight: 500, color: '#1e293b', margin: 0 }}>Company Name *</label>
                                                    {newPartner.name && (
                                                        <a 
                                                            href={`https://www.google.com/search?q=${encodeURIComponent(newPartner.name)}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            style={{ color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            Search <Search size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                                <CompanyAutocomplete
                                                    value={newPartner.name}
                                                    onChange={val => setNewPartner({ ...newPartner, name: val })}
                                                    onSelect={handleCompanySelect}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Email *</label>
                                                <input required type="email" placeholder="contact@partner.com" value={newPartner.email1} onChange={e => setNewPartner({ ...newPartner, email1: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Phone</label>
                                                <input placeholder="+1 234 567 8900" value={newPartner.phone1} onChange={e => setNewPartner({ ...newPartner, phone1: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Full Address</label>
                                            <textarea placeholder="Street, Building, etc." value={newPartner.address} onChange={e => setNewPartner({ ...newPartner, address: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '60px' }} />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>City</label>
                                                <input placeholder="City" value={newPartner.city} onChange={e => setNewPartner({ ...newPartner, city: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Country *</label>
                                                <select
                                                    required
                                                    value={newPartner.country}
                                                    onChange={e => setNewPartner({ ...newPartner, country: e.target.value })}
                                                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                                >
                                                    <option value="">Select Country</option>
                                                    {COUNTRIES.map(country => (
                                                        <option key={country} value={country}>{country}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: '12px', display: 'block' }}>Categories</label>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {Array.from(new Set([...availableCategories, ...(newPartner.types || [])])).map(cat => (
                                                    <div
                                                        key={cat}
                                                        onClick={() => handleCategoryToggle(cat)}
                                                        style={{ padding: '6px 14px', borderRadius: '24px', border: (newPartner.types || []).includes(cat) ? '1px solid #6366f1' : '1px solid #e2e8f0', background: (newPartner.types || []).includes(cat) ? '#e0e7ff' : '#fff', color: (newPartner.types || []).includes(cat) ? '#6366f1' : '#475569', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                                                    >
                                                        {cat}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                                            <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Notes & Business Profile</label>
                                            <div style={{ background: '#fff' }}>
                                                <ReactQuill
                                                    theme="snow"
                                                    value={newPartner.notes}
                                                    onChange={(val) => setNewPartner({ ...newPartner, notes: val })}
                                                    modules={modules}
                                                    style={{ height: '150px', marginBottom: '50px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Primary Contact */}
                                    <div>
                                        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                                            <User size={18} />
                                            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Step 2: Primary Contact (Optional)</span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Full Name</label>
                                                <input placeholder="e.g. John Doe" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', outline: 'none' }} />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Job Title / Designation</label>
                                                <input placeholder="e.g. Purchasing Manager" value={newContact.post} onChange={e => setNewContact({ ...newContact, post: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', outline: 'none' }} />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Email</label>
                                                    <input type="email" placeholder="john@partner.com" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', outline: 'none' }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>Mobile / WhatsApp</label>
                                                    <input placeholder="+65 ...." value={newContact.handphone} onChange={e => setNewContact({ ...newContact, handphone: e.target.value })} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', outline: 'none' }} />
                                                </div>
                                            </div>

                                            <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                                                <BusinessCardUpload
                                                    frontValue={newContact.business_card_url}
                                                    backValue={newContact.business_card_back_url}
                                                    onFrontChange={(url) => setNewContact(prev => ({ ...prev, business_card_url: url }))}
                                                    onBackChange={(url) => setNewContact(prev => ({ ...prev, business_card_back_url: url }))}
                                                    label="Contact Business Card"
                                                />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #dcfce7' }}>
                                                <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#15803d', textTransform: 'uppercase' }}>Financials (Partner)</h4>
                                                {(newPartner.types.includes('Customer') || newPartner.types.includes('Supplier')) ? (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                        {newPartner.types.includes('Customer') && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Cust. Credit Limit</label>
                                                                <input placeholder="Limit" value={newPartner.customerCredit} onChange={e => setNewPartner({ ...newPartner, customerCredit: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                            </div>
                                                        )}
                                                        {newPartner.types.includes('Supplier') && (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Supp. Credit Limit</label>
                                                                <input placeholder="Limit" value={newPartner.supplierCredit} onChange={e => setNewPartner({ ...newPartner, supplierCredit: e.target.value })} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Select 'Customer' or 'Supplier' category to enable credit fields.</div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                                            <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 28px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '10px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                                Cancel
                                            </button>
                                            <button type="submit" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
                                                Create Partner & Contact
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div style={{ marginTop: '16px' }}>
                                <PartnerDocuments
                                    partnerId={createdPartner?.id}
                                    partnerName={createdPartner?.name}
                                    initialFolderId={createdPartner?.gdrive_folder_id}
                                    initialDriveLink={createdPartner?.google_drive_link}
                                    onUpdate={(data) => {
                                        setCreatedPartner(prev => ({
                                            ...prev,
                                            gdrive_folder_id: data.id,
                                            google_drive_link: data.link
                                        }));
                                        loadPartners();
                                    }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setCreatedPartner(null);
                                            setModalTab('details');
                                        }}
                                        className="btn btn-primary"
                                    >
                                        Done & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Category Manager Modal */}
            {showCategoryMgr && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Manage Categories</h2>
                            <button onClick={() => setShowCategoryMgr(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X /></button>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {availableCategories.map(cat => (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontWeight: 500, color: '#334155' }}>{cat}</span>
                                    <button
                                        onClick={() => handlePurgeCategory(cat)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        title="Delete globally from all partners"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCategoryMgr(false)} className="btn btn-secondary">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

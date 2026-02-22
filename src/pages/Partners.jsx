import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Globe, Building2, Mail, Phone, Star, Filter, ChevronDown, CheckCircle2, Circle, X, UploadCloud, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { getPartners, deletePartner, savePartner } from '../lib/store';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina",
    "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
    "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana",
    "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
    "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
    "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
    "Guinea-Bissau", "Guyana", "Haiti", "Holy See", "Honduras", "Hungary", "Iceland", "India",
    "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho",
    "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia",
    "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia",
    "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
    "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea",
    "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama",
    "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
    "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
    "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
    "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
    "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
    "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago",
    "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
    "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Venezuela",
    "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

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

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [newPartner, setNewPartner] = useState({
        name: '', email1: '', phone1: '', weblink: '', country: '', city: '', address: '', notes: '', brand: '',
        types: [],
        rating: 0
    });
    const [customCategory, setCustomCategory] = useState('');

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        setLoading(true);
        const data = await getPartners(profile);
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setPartners(sorted);
        setLoading(false);
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
                info: newPartner.notes || ''
            };

            if (newPartner.city) {
                dataToSave.address = `${newPartner.city}, ${dataToSave.address}`;
            }

            if (newPartner.brand) {
                dataToSave.info += ` | Brands: ${newPartner.brand}`;
            }

            if (profile?.company_id) {
                dataToSave.company_id = profile.company_id;
            }

            await savePartner(dataToSave);
            setShowModal(false);
            loadPartners(); // reload the grid
            alert('Partner added successfully!');
        } catch (error) {
            console.error('Failed to save partner', error);
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
            (p.country && p.country.toLowerCase().includes(term)) ||
            (p.types && p.types.some(t => t?.toLowerCase().includes(term))) ||
            (p.brand && p.brand.toLowerCase().includes(term))
        );
        const matchesCountry = !selectedCountry || (p.country && p.country === selectedCountry);
        const matchesCategory = !selectedCategory || (p.types && p.types.includes(selectedCategory));

        return matchesSearch && matchesCountry && matchesCategory;
    });

    const paginatedPartners = filteredPartners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCountry, selectedCategory]);

    const defaultCategories = ['Partner', 'Spare Parts', 'Service', 'Calibration', 'Automation', 'Electrical', 'Mechanical', 'Instrumentation', 'Safety Equipment', 'Industrial Supplies'];
    const availableCategories = Array.from(new Set([...defaultCategories, ...partners.flatMap(p => p.types || [])])).filter(Boolean).sort();

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
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Partners</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage your global partner network</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current.click()} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Upload size={18} /> Add CSV
                    </button>
                    <button onClick={handleExportCSV} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Download size={18} /> Export
                    </button>
                    <button onClick={() => setShowModal(true)} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                        <Plus size={18} /> Add Partner
                    </button>
                </div>
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
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 16px', gap: '8px' }}>
                        <MapPin size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
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
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            style={{ appearance: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 500, padding: '10px 24px 10px 0', cursor: 'pointer', width: '100%', minWidth: '150px' }}
                        >
                            <option value="">All Categories</option>
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />
                    </div>
                </div>
            </div>

            {/* Results Grid Based on Partners.jsx list data */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading partners...</div>
            ) : filteredPartners.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No partners found.</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                    {paginatedPartners.map(res => (
                        <div key={res.id} style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }} onClick={() => navigate(`/partners/${res.id}`)}>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                    <Building2 size={24} />
                                </div>
                                <div style={{ flex: 1, paddingRight: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{res.name}</h3>
                                        {res.weblink && (
                                            <a href={res.weblink.startsWith('http') ? res.weblink : `https://${res.weblink}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: '#6366f1', display: 'flex', alignItems: 'center' }} title="Visit Website">
                                                <Globe size={16} />
                                            </a>
                                        )}
                                    </div>
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

                        <h2 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Add New Partner</h2>

                        <form onSubmit={handleSaveNewPartner} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc', marginBottom: '16px' }}>
                                <div style={{ width: '64px', height: '64px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Globe color="#6366f1" size={28} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 500, color: '#1e293b', display: 'block', marginBottom: '6px' }}>Company Website</label>
                                    <input placeholder="https://partner.com" value={newPartner.weblink} onChange={e => setNewPartner({ ...newPartner, weblink: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>Enter the primary website URL for the partner.</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Company Name *</label>
                                    <input required placeholder="Partner company name" value={newPartner.name} onChange={e => setNewPartner({ ...newPartner, name: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Email *</label>
                                    <input required type="email" placeholder="contact@partner.com" value={newPartner.email1} onChange={e => setNewPartner({ ...newPartner, email1: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Phone</label>
                                    <input placeholder="+1 234 567 8900" value={newPartner.phone1} onChange={e => setNewPartner({ ...newPartner, phone1: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Country *</label>
                                    <select
                                        required
                                        value={newPartner.country}
                                        onChange={e => setNewPartner({ ...newPartner, country: e.target.value })}
                                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', cursor: 'pointer' }}
                                    >
                                        <option value="" disabled>Select Country</option>
                                        {COUNTRIES.map(country => (
                                            <option key={country} value={country}>{country}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>City</label>
                                    <input placeholder="City" value={newPartner.city} onChange={e => setNewPartner({ ...newPartner, city: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Address</label>
                                <input placeholder="Full address" value={newPartner.address} onChange={e => setNewPartner({ ...newPartner, address: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Categories</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {Array.from(new Set([...defaultCategories, ...availableCategories, ...newPartner.types])).map(cat => (
                                        <div
                                            key={cat}
                                            onClick={() => handleCategoryToggle(cat)}
                                            style={{ padding: '6px 14px', borderRadius: '24px', border: newPartner.types.includes(cat) ? '1px solid #6366f1' : '1px solid #e2e8f0', background: newPartner.types.includes(cat) ? '#e0e7ff' : '#fff', color: newPartner.types.includes(cat) ? '#6366f1' : '#475569', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <input
                                        placeholder="Add new custom category"
                                        value={customCategory}
                                        onChange={e => setCustomCategory(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCategory())}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem' }}
                                    />
                                    <button type="button" onClick={handleAddCustomCategory} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#e2e8f0', color: '#475569', fontWeight: 500, cursor: 'pointer', fontSize: '0.85rem' }}>
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Brands Supported</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input placeholder="Add brand name" value={newPartner.brand} onChange={e => setNewPartner({ ...newPartner, brand: e.target.value })} style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} />
                                    <button type="button" style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff' }}><Plus size={16} /></button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569' }}>Notes</label>
                                <textarea rows="3" placeholder="Internal notes about this partner..." value={newPartner.notes} onChange={e => setNewPartner({ ...newPartner, notes: e.target.value })} style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ padding: '10px 24px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                                    Add Partner
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import React, { useState } from 'react';
import { Search, MapPin, Globe, Building2, Mail, Phone, Star, Filter, ChevronDown, CheckCircle2, Circle } from 'lucide-react';
import { savePartner } from '../../lib/store';
import { useAuth } from '../../contexts/AuthContext';

export default function UniversalFinder() {
    const { profile } = useAuth();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Using the exact mock data from the screenshot
    const initialResults = [
        {
            id: 1,
            name: 'Asia Pacific Engineering',
            location: 'Singapore, Singapore',
            rating: 5,
            email: 'sales@apengineering.sg',
            phone: '+65 6555 8900',
            website: 'Visit Website',
            tags: ['Mitsubishi', 'Omron', 'SMC', '+1'],
            sameCountry: true,
            selected: false
        },
        {
            id: 2,
            name: 'Global Parts Solutions',
            location: 'Houston, United States',
            rating: 5,
            email: 'sales@globalparts.com',
            phone: '+1 713 555 0100',
            website: 'Visit Website',
            tags: ['Siemens', 'ABB', 'Schneider', '+1'],
            sameCountry: false,
            selected: false
        },
        {
            id: 3,
            name: 'European Automation GmbH',
            location: 'Munich, Germany',
            rating: 5,
            email: 'info@euroautomation.de',
            phone: '+49 89 555 7890',
            website: 'Visit Website',
            tags: ['Siemens', 'Festo', 'Bosch Rexroth', '+1'],
            sameCountry: false,
            selected: false
        },
        {
            id: 4,
            name: 'Saudi Industrial Equipment',
            location: 'Dammam, Saudi Arabia',
            rating: 5,
            email: 'info@saudiindustrial.sa',
            phone: '+966 13 555 4567',
            website: 'Visit Website',
            tags: ['Draeger', 'MSA', 'Honeywell', '+1'],
            sameCountry: false,
            selected: false
        },
        {
            id: 5,
            name: 'Emirates Industrial Supplies',
            location: 'Dubai, UAE',
            rating: 5,
            email: 'inquiry@emiratesindustrial.ae',
            phone: '+971 4 555 1234',
            website: 'Visit Website',
            tags: ['Yokogawa', 'Honeywell', 'Emerson', '+1'],
            sameCountry: false,
            selected: false
        },
        {
            id: 6,
            name: 'TEST',
            location: ', SINGAPORE',
            rating: 0,
            email: 'KUMAR@CELRON.NET',
            phone: '97685891',
            website: '',
            tags: [],
            sameCountry: false,
            selected: false
        }
    ];

    const [results, setResults] = useState(initialResults);

    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        setTimeout(() => {
            setIsSearching(false);
        }, 1200);
    };

    const toggleSelect = (id) => {
        setResults(results.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    };

    const handleSaveSelected = async () => {
        const selected = results.filter(r => r.selected);
        if (selected.length === 0) return alert('Select at least one supplier to save.');

        try {
            for (const result of selected) {
                const newPartner = {
                    name: result.name,
                    country: result.location.split(', ').pop(), // hacky extract
                    types: ['Supplier'],
                    email1: result.email,
                    company_id: profile.company_id
                };
                await savePartner(newPartner);
            }
            alert(`Successfully saved ${selected.length} suppliers to Partners table!`);
            // unselect them
            setResults(results.map(r => ({ ...r, selected: false })));
        } catch (error) {
            console.error('Failed to save partner:', error);
            alert('Failed to save partners. Check console.');
        }
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Find Suppliers</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Search worldwide suppliers</p>
            </header>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, minWidth: '400px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#94a3b8' }}>
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 0', fontSize: '0.95rem', color: '#334155' }}
                        placeholder="Search suppliers worldwide (e.g., 'Siemens parts supplier Germany')..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit" disabled={isSearching} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer' }}>
                        <Globe size={16} /> {isSearching ? 'Searching...' : 'Search Web'}
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <span>Filter by brand...</span>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                        <MapPin size={16} color="#94a3b8" /> All Countries <ChevronDown size={14} />
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500 }}>
                        <Filter size={16} color="#94a3b8" /> All Categories <ChevronDown size={14} />
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {results.map(res => (
                    <div key={res.id} style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: res.selected ? '2px solid #6366f1' : '1px solid #e2e8f0', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

                        {res.sameCountry && (
                            <div style={{ position: 'absolute', top: '-10px', left: '24px', background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                Same Country
                            </div>
                        )}

                        <div onClick={() => toggleSelect(res.id)} style={{ position: 'absolute', top: '24px', right: '24px', cursor: 'pointer', color: res.selected ? '#6366f1' : '#cbd5e1' }}>
                            {res.selected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', marginTop: res.sameCountry ? '8px' : '0' }}>
                            <div style={{ width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                <Building2 size={24} />
                            </div>
                            <div style={{ flex: 1, paddingRight: '24px' }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{res.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                                    <MapPin size={14} /> {res.location}
                                </div>
                            </div>
                        </div>

                        {res.rating > 0 && (
                            <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={16} fill={i < res.rating ? "#fbbf24" : "transparent"} color={i < res.rating ? "#fbbf24" : "#e2e8f0"} />
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                                <Mail size={16} /> {res.email}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                                <Phone size={16} /> {res.phone}
                            </div>
                            {res.website && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '0.9rem', cursor: 'pointer' }}>
                                    <Globe size={16} /> {res.website}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {res.tags.map((tag, i) => (
                                <span key={i} style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '16px', fontWeight: 500 }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {results.some(r => r.selected) && (
                <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', padding: '16px 32px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 100 }}>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{results.filter(r => r.selected).length} Suppliers Selected</span>
                    <button onClick={handleSaveSelected} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 24px', borderRadius: '24px', fontWeight: 600, cursor: 'pointer' }}>
                        Save to Partners
                    </button>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Globe, Building2, Mail, Phone, Star, Filter, ChevronDown, CheckCircle2, Circle, Loader2, Save } from 'lucide-react';
import { savePartner, getBrands, getCategories } from '../../lib/store';
import { useAuth } from '../../contexts/AuthContext';
import { countries } from '../../utils/countries';

export default function UniversalFinder() {
    const { profile } = useAuth();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchId, setSearchId] = useState(null);

    // Filters
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [userLocation, setUserLocation] = useState(null);

    // Dropdown states
    const [showCountryDrop, setShowCountryDrop] = useState(false);
    const [showCategoryDrop, setShowCategoryDrop] = useState(false);
    const [showBrandDrop, setShowBrandDrop] = useState(false);

    useEffect(() => {
        loadFilters();
        getUserLocation();
    }, []);

    const loadFilters = async () => {
        try {
            const [b, c] = await Promise.all([getBrands(), getCategories()]);
            setBrands(b);
            setCategories(c);
        } catch (error) {
            console.error("Failed to load filters:", error);
        }
    };

    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => console.log("Location access denied")
            );
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setResults([]);
        setPage(1);

        // Combine filters into query for better intelligence
        let fullQuery = query;
        if (selectedBrand) fullQuery += ` ${selectedBrand}`;
        if (selectedCountry) fullQuery += ` in ${selectedCountry}`;
        if (selectedCategory) fullQuery += ` category ${selectedCategory}`;

        try {
            const resp = await fetch('/api/universal-finder/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: fullQuery,
                    userLat: userLocation?.lat,
                    userLng: userLocation?.lng,
                    userId: profile?.id
                })
            });
            const data = await resp.json();
            if (data.searchId) {
                setSearchId(data.searchId);
                fetchResults(data.searchId, 1);
            } else if (data.error) {
                alert(`Search Error: ${data.error}. Make sure Google API keys are set up in .env`);
            }
        } catch (error) {
            console.error("Search failed:", error);
            alert("Search failed. Check if backend server is running.");
        }
        setIsSearching(false);
    };

    const fetchResults = async (id, pageNum) => {
        setLoading(true);
        try {
            const resp = await fetch(`/api/universal-finder/results?searchId=${id}&page=${pageNum}`);
            const data = await resp.json();
            if (data.results) {
                setResults(prev => pageNum === 1 ? data.results : [...prev, ...data.results]);
                setTotalResults(data.total || 0);
            }
        } catch (error) {
            console.error("Failed to fetch results:", error);
        }
        setLoading(false);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchResults(searchId, nextPage);
    };

    const toggleSelect = (id) => {
        setResults(results.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
    };

    const handleSaveSelected = async () => {
        const selected = results.filter(r => r.selected);
        if (selected.length === 0) return;

        setLoading(true);
        try {
            for (const result of selected) {
                await fetch('/api/partners/from-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resultId: result.id })
                });
            }
            alert(`Successfully saved ${selected.length} suppliers to Partners table!`);
            setResults(results.map(r => ({ ...r, selected: false, saved_to_partner: r.selected ? true : r.saved_to_partner })));
        } catch (error) {
            console.error('Failed to save partner:', error);
            alert('Failed to save partners.');
        }
        setLoading(false);
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Find Suppliers</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Search worldwide suppliers</p>
                    </div>
                    {totalResults > 0 && (
                        <div style={{ background: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                            {totalResults} Results Found
                        </div>
                    )}
                </div>
            </header>

            {/* Combined Search & Filter Bar */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ flex: 1, display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px 12px', alignItems: 'center' }}>
                        <Search size={20} color="#94a3b8" />
                        <input
                            type="text"
                            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '12px', fontSize: '1rem', color: '#1e293b' }}
                            placeholder="Type brand, part name or company (e.g. 'Laeis Bucher spare parts')..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={isSearching || !query.trim()} style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '0 24px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
                        {isSearching ? <Search size={18} /> : <Globe size={18} />}
                        {isSearching ? 'Searching...' : 'Search Web'}
                    </button>
                </form>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Brand Filter */}
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => { setShowBrandDrop(!showBrandDrop); setShowCountryDrop(false); setShowCategoryDrop(false); }} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', minWidth: '160px' }}>
                            <Building2 size={16} color="#94a3b8" /> {selectedBrand || 'Filter by brand...'} <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
                        </div>
                        {showBrandDrop && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '200px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '250px', overflowY: 'auto' }}>
                                <div onClick={() => { setSelectedBrand(''); setShowBrandDrop(false); }} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>All Brands</div>
                                {brands?.map(b => (
                                    <div key={b.id} onClick={() => { setSelectedBrand(b.name); setShowBrandDrop(false); }} style={{ padding: '8px 16px', cursor: 'pointer' }}>{b.name}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Country Filter */}
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => { setShowCountryDrop(!showCountryDrop); setShowCategoryDrop(false); setShowBrandDrop(false); }} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', minWidth: '160px' }}>
                            <MapPin size={16} color="#94a3b8" /> {selectedCountry || 'All Countries'} <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
                        </div>
                        {showCountryDrop && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '200px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '250px', overflowY: 'auto' }}>
                                <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                    <input type="text" placeholder="Search country..." style={{ width: '100%', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} onClick={(e) => e.stopPropagation()} />
                                </div>
                                <div onClick={() => { setSelectedCountry(''); setShowCountryDrop(false); }} style={{ padding: '8px 16px', cursor: 'pointer' }}>All Countries</div>
                                {countries?.map(c => (
                                    <div key={c} onClick={() => { setSelectedCountry(c); setShowCountryDrop(false); }} style={{ padding: '8px 16px', cursor: 'pointer' }}>{c}</div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div style={{ position: 'relative' }}>
                        <div onClick={() => { setShowCategoryDrop(!showCategoryDrop); setShowCountryDrop(false); setShowBrandDrop(false); }} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', cursor: 'pointer', minWidth: '160px' }}>
                            <Filter size={16} color="#94a3b8" /> {selectedCategory || 'All Categories'} <ChevronDown size={14} style={{ marginLeft: 'auto' }} />
                        </div>
                        {showCategoryDrop && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '200px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '250px', overflowY: 'auto' }}>
                                <div onClick={() => { setSelectedCategory(''); setShowCategoryDrop(false); }} style={{ padding: '8px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>All Categories</div>
                                {categories?.map(c => (
                                    <div key={c.id} onClick={() => { setSelectedCategory(c.name); setShowCategoryDrop(false); }} style={{ padding: '8px 16px', cursor: 'pointer' }}>{c.name}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Grid or Empty States */}
            {results.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                    {results.map(res => (
                        <div key={res.id} style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: res.selected ? '2px solid #4f46e5' : '1px solid #e2e8f0', position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
                            {res.distance_km < 50 && (
                                <div style={{ position: 'absolute', top: '-10px', left: '24px', background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                                    Nearby Supplier
                                </div>
                            )}

                            <div onClick={() => !res.saved_to_partner && toggleSelect(res.id)} style={{ position: 'absolute', top: '24px', right: '24px', cursor: res.saved_to_partner ? 'default' : 'pointer', color: res.saved_to_partner ? '#10b981' : (res.selected ? '#4f46e5' : '#cbd5e1') }}>
                                {res.saved_to_partner ? <CheckCircle2 size={24} /> : (res.selected ? <CheckCircle2 size={24} /> : <Circle size={24} />)}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', marginTop: res.distance_km < 50 ? '8px' : '0' }}>
                                <div style={{ width: '48px', height: '48px', background: res.thumbnail_url ? '#f8fafc' : '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5', overflow: 'hidden' }}>
                                    {res.thumbnail_url ? <img src={res.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={24} />}
                                </div>
                                <div style={{ flex: 1, paddingRight: '24px' }}>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{res.supplier_name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                                        <MapPin size={14} /> {res.supplier_location || 'Worldwide'} {res.distance_km ? `(${res.distance_km.toFixed(1)} km)` : ''}
                                    </div>
                                </div>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.5rem' }}>
                                {res.snippet}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                {res.email && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                                        <Mail size={14} /> {res.email}
                                    </div>
                                )}
                                {res.phone && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                                        <Phone size={14} /> {res.phone}
                                    </div>
                                )}
                                {res.url && (
                                    <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4f46e5', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
                                        <Globe size={14} /> Visit Website
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '100px 32px', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                    <div style={{ color: '#e2e8f0', marginBottom: '20px' }}>
                        <Search size={64} style={{ margin: '0 auto' }} />
                    </div>
                    {isSearching ? (
                        <div style={{ color: '#64748b' }}>
                            <h3 style={{ margin: '0 0 8px 0' }}>Searching the web...</h3>
                            <p style={{ margin: 0 }}>This may take a few seconds as we extract supplier details.</p>
                        </div>
                    ) : query && !isSearching ? (
                        <div style={{ color: '#64748b' }}>
                            <h3 style={{ margin: '0 0 8px 0' }}>No suppliers found for "{query}"</h3>
                            <p style={{ margin: 0 }}>Try different keywords or check your filters.</p>
                        </div>
                    ) : (
                        <div style={{ color: '#64748b' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#475569' }}>Ready to Search</h3>
                            <p style={{ margin: 0 }}>Enter a part name, brand, or supplier to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {results.length > 0 && results.length < totalResults && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                    <button onClick={handleLoadMore} disabled={loading} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '12px 32px', borderRadius: '30px', color: '#475569', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        {loading ? <Search size={18} /> : <ChevronDown size={18} />}
                        {loading ? 'Loading...' : 'Load More Suppliers'}
                    </button>
                </div>
            )}

            {results.some(r => r.selected) && (
                <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', padding: '16px 32px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 100 }}>
                    <span style={{ color: '#fff', fontWeight: 500 }}>{results.filter(r => r.selected).length} Suppliers Selected</span>
                    <button onClick={handleSaveSelected} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '24px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={18} /> Save to Partners
                    </button>
                </div>
            )}
        </div>
    );
}

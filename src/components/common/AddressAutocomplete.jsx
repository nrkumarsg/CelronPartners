import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search } from 'lucide-react';

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = "Search address..." }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const searchAddress = async (q) => {
        if (q.length < 3) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // Using our new proxy endpoint
            const response = await fetch(`/api/research/geode?q=${encodeURIComponent(q)}`);
            const data = await response.json();
            setResults(data.features || []);
            setIsOpen(true);
        } catch (err) {
            console.error("Geocoding error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val);
        
        // Debounce search
        const timeoutId = setTimeout(() => searchAddress(val), 500);
        return () => clearTimeout(timeoutId);
    };

    const handleSelect = (feature) => {
        const { properties, geometry } = feature;
        const name = [
            properties.name,
            properties.street,
            properties.city,
            properties.state,
            properties.country
        ].filter(Boolean).join(', ');

        setQuery(name);
        setIsOpen(false);
        
        if (onSelect) {
            onSelect({
                name,
                city: properties.city || properties.town,
                postcode: properties.postcode,
                country: properties.country,
                lat: geometry.coordinates[1],
                lng: geometry.coordinates[0],
                full_properties: properties
            });
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="form-input"
                    value={query}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    style={{ paddingRight: '40px' }}
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                </div>
            </div>

            {isOpen && results.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    marginTop: '4px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    {results.map((r, i) => (
                        <div
                            key={i}
                            onClick={() => handleSelect(r)}
                            style={{
                                padding: '12px 16px',
                                borderBottom: i === results.length - 1 ? 'none' : '1px solid #f1f5f9',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <MapPin size={16} style={{ marginTop: '2px', color: '#6366f1' }} />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                                    {r.properties.name || r.properties.street || 'Unknown Location'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {[r.properties.city, r.properties.state, r.properties.country].filter(Boolean).join(', ')}
                                    {r.properties.postcode ? ` - ${r.properties.postcode}` : ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

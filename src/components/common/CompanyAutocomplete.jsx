import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, MapPin, X, Loader2 } from 'lucide-react';

const CompanyAutocomplete = ({ value, onChange, onSelect, className }) => {
    const [inputValue, setInputValue] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const timeoutRef = useRef(null);

    // Google API Key from env
    const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [sdkReady, setSdkReady] = useState(false);

    useEffect(() => {
        // Initialize SDK immediately on mount
        if (window.google && window.google.maps && window.google.maps.places) {
            setSdkReady(true);
        } else {
            loadGoogleSDK();
            // Poll for readiness
            const interval = setInterval(() => {
                if (window.google && window.google.maps && window.google.maps.places) {
                    setSdkReady(true);
                    clearInterval(interval);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, []);

    const [apiError, setApiError] = useState(null);

    const fetchSuggestions = async (input) => {
        if (!input || input.length < 2) {
            setSuggestions([]);
            setApiError(null);
            return;
        }

        if (!GOOGLE_API_KEY) {
            console.error('Missing Google API Key');
            return;
        }

        setLoading(true);
        setApiError(null);

        // Wait up to 3 seconds for SDK if not ready
        let ready = sdkReady;
        if (!ready) {
            for (let i = 0; i < 6; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                if (window.google && window.google.maps && window.google.maps.places) {
                    ready = true;
                    setSdkReady(true);
                    break;
                }
            }
        }

        if (!ready) {
            console.error('Google Maps SDK failed to load');
            setApiError('SDK Load Failed');
            setLoading(false);
            return;
        }

        try {
            const service = new window.google.maps.places.AutocompleteService();
            service.getPlacePredictions({ input, types: ['establishment'] }, (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    setSuggestions(predictions);
                    setApiError(null);
                } else {
                    if (status !== 'ZERO_RESULTS') {
                        console.warn('Place predictions error status:', status);
                        setApiError(status); // Store status like REQUEST_DENIED
                    } else {
                        setApiError(null);
                    }
                    setSuggestions([]);
                }
                setLoading(false);
            });
        } catch (error) {
            console.error('Autocomplete service error:', error);
            setApiError('Service Error');
            setLoading(false);
        }
    };

    const loadGoogleSDK = () => {
        if (document.getElementById('google-maps-sdk')) return;

        const script = document.createElement('script');
        script.id = 'google-maps-sdk';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            console.error('Failed to load Google Maps SDK script');
            setLoading(false);
        };
        document.head.appendChild(script);
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        onChange(val);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (val.length > 1) {
                fetchSuggestions(val);
                setShowDropdown(true);
            } else {
                setShowDropdown(false);
            }
        }, 300);
    };

    const handleSelect = async (suggestion) => {
        setInputValue(suggestion.description);
        setShowDropdown(false);
        setSuggestions([]);

        if (onSelect && window.google && window.google.maps && window.google.maps.places) {
            const service = new window.google.maps.places.PlacesService(document.createElement('div'));
            service.getDetails({ placeId: suggestion.place_id, fields: ['address_components', 'formatted_address', 'website', 'name', 'types'] }, (place, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                    onSelect(place);
                }
            });
        }
    };

    return (
        <div className="autocomplete-container" style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
            <div className="input-with-icon" style={{ position: 'relative' }}>
                <input
                    type="text"
                    className={`form-input ${className}`}
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Search company worldwide..."
                    autoComplete="off"
                />
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!GOOGLE_API_KEY && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>API Key Missing</span>}
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} color="#94a3b8" />}
                    {inputValue && (
                        <button
                            type="button"
                            onClick={() => { setInputValue(''); onChange(''); setShowDropdown(false); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
                        >
                            <X size={14} color="#94a3b8" />
                        </button>
                    )}
                </div>
            </div>

            {!sdkReady && !loading && inputValue.length > 1 && !apiError && (
                <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '4px' }}>
                    Connecting to Google Places...
                </div>
            )}

            {apiError && (
                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <X size={10} />
                    {apiError === 'REQUEST_DENIED' ? 'Google API Permission Denied (Check API restrictions / Billing)' : `API Error: ${apiError}`}
                </div>
            )}

            {showDropdown && suggestions.length > 0 && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '8px',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                    {suggestions.map((s) => (
                        <div
                            key={s.place_id}
                            className="suggestion-item"
                            onClick={() => handleSelect(s)}
                            style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                borderRadius: '8px',
                                transition: 'background 0.2s'
                            }}
                        >
                            <Building2 size={18} color="#6366f1" />
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.structured_formatting?.main_text || s.description}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={10} /> {s.structured_formatting?.secondary_text || ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CompanyAutocomplete;

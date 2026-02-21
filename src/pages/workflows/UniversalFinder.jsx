import React, { useState } from 'react';
import { Search, MapPin, ExternalLink, ShieldCheck, BookmarkPlus, Plus } from 'lucide-react';
import { savePartner } from '../../lib/store';
import { useAuth } from '../../contexts/AuthContext';

export default function UniversalFinder() {
    const { profile } = useAuth();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState([]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        // Mocking an AI / Google Search API integration for visual demo
        setTimeout(() => {
            setResults([
                { id: 1, name: 'Marine Spares Global Ltd', location: 'Singapore (2km away)', type: 'Supplier', rating: '4.8', contact: 'sales@marinespares.sg' },
                { id: 2, name: 'Oceanic Parts & Components', location: 'Singapore (15km away)', type: 'Supplier', rating: '4.5', contact: 'info@oceanicparts.com' },
                { id: 3, name: 'EuroShip Spares B.V.', location: 'Rotterdam, NL (Global)', type: 'Supplier', rating: '4.9', contact: 'sales@euroship.nl' }
            ]);
            setIsSearching(false);
        }, 1200);
    };

    const handleSaveAsPartner = async (result) => {
        try {
            const newPartner = {
                name: result.name,
                country: result.location,
                types: [result.type],
                email1: result.contact,
                company_id: profile.company_id
            };
            await savePartner(newPartner);
            alert(`Successfully saved ${result.name} to Partners table!`);
        } catch (error) {
            console.error('Failed to save partner:', error);
            alert('Failed to save partner. Check console.');
        }
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-content">
                    <h1 className="page-title">
                        <Search className="title-icon" /> Universal Finder
                    </h1>
                    <p className="page-description">Find global spare parts suppliers via AI and localized search</p>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '24px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Search Query (e.g., 'Turbocharger Rotors in Asia')</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter keywords, photo URL, or paste specs..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isSearching}>
                        {isSearching ? 'Searching World...' : 'Search Now'}
                    </button>
                    {/* Placeholder for Photo Search */}
                    <button type="button" className="btn btn-outline" title="Upload Photo to ID Spares (Coming Soon)">
                        <Plus size={16} /> Photo
                    </button>
                </form>
            </div>

            {results.length > 0 && (
                <div>
                    <h3 style={{ color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={20} color="#60a5fa" /> Search Results (Distance Based)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {results.map((res) => (
                            <div key={res.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {res.name}
                                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(96,165,250,0.1)', borderRadius: '12px' }}>★ {res.rating}</span>
                                    </h4>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {res.location}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ExternalLink size={14} /> {res.contact}</span>
                                    </div>
                                </div>
                                <button className="btn btn-outline" onClick={() => handleSaveAsPartner(res)}>
                                    <BookmarkPlus size={18} /> Save Partner
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// src/pages/UniversalFinder.jsx
import React, { useState } from 'react';
import SearchBar from '../components/UniversalFinder/SearchBar';
import ResultsList from '../components/UniversalFinder/ResultsList';
import { useNavigate } from 'react-router-dom';

export default function UniversalFinder() {
    const [searchId, setSearchId] = useState(null);
    const navigate = useNavigate();

    const handleSearch = async (term) => {
        // Get user's geolocation (optional)
        let userLat = null,
            userLng = null;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                // fire the backend request
                startSearch(term, userLat, userLng);
            }, () => {
                // fallback if permission denied
                startSearch(term, null, null);
            });
        } else {
            startSearch(term, null, null);
        }
    };

    const startSearch = async (term, lat, lng) => {
        try {
            const resp = await fetch(`/api/universal-finder/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: term, userLat: lat, userLng: lng }),
            });
            const data = await resp.json();
            if (data.searchId) {
                setSearchId(data.searchId);
                // navigate to results section (optional)
                navigate('#results');
            }
        } catch (e) {
            console.error('Search error', e);
            alert('Failed to run search');
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '24px' }}>Universal Finder – Global Spare‑Part Search</h1>
            <SearchBar onSearch={handleSearch} />
            {searchId && (
                <div id="results" style={{ marginTop: '32px' }}>
                    <ResultsList searchId={searchId} />
                </div>
            )}
        </div>
    );
}

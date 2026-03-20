// src/pages/UniversalFinder.jsx
import React, { useState } from 'react';
import SearchBar from '../components/UniversalFinder/SearchBar';
import ResultsList from '../components/UniversalFinder/ResultsList';
import AIChatInterface from '../components/UniversalFinder/AIChatInterface';
import { useNavigate } from 'react-router-dom';
import { runUniversalSearch } from '../lib/universalFinder';
import { useAuth } from '../contexts/AuthContext';
export default function UniversalFinder() {
    const [searchId, setSearchId] = useState(null);
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [loadingResults, setLoadingResults] = useState(false);

    const handleSearch = async (term) => {
        if (!profile?.id) return alert("Please log in to search");

        setLoadingResults(true);
        // Get user's geolocation (optional)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await startSearch(term, pos.coords.latitude, pos.coords.longitude);
            }, async () => {
                await startSearch(term, null, null);
            });
        } else {
            await startSearch(term, null, null);
        }
    };

    const startSearch = async (term, lat, lng) => {
        try {
            const resp = await fetch('/api/universal-finder/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: term,
                    userLat: lat,
                    userLng: lng,
                    userId: profile.id
                })
            });
            const { searchId: id } = await resp.json();

            if (id) {
                setSearchId(id);
                // Scroll to results
                setTimeout(() => {
                    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } catch (e) {
            console.error('Search error', e);
            alert('Failed to run search. Check console for details.');
        } finally {
            setLoadingResults(false);
        }
    };

    const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'search' or 'global'

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                    Universal Finder
                </h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Global Spare‑Part Search & AI Assistant</p>
            </header>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', justifyContent: 'center' }}>
                <button
                    onClick={() => setActiveTab('chat')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '14px',
                        border: 'none',
                        background: activeTab === 'chat' ? '#6366f1' : '#fff',
                        color: activeTab === 'chat' ? '#fff' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s'
                    }}
                >
                    💬 PartFinder AI
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '14px',
                        border: 'none',
                        background: activeTab === 'search' ? '#6366f1' : '#fff',
                        color: activeTab === 'search' ? '#fff' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s'
                    }}
                >
                    🌐 Worldwide Search
                </button>
                <button
                    onClick={() => setActiveTab('global')}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '14px',
                        border: 'none',
                        background: activeTab === 'global' ? '#6366f1' : '#fff',
                        color: activeTab === 'global' ? '#fff' : '#64748b',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s'
                    }}
                >
                    🗺️ Global Finder
                </button>
            </div>

            {activeTab === 'chat' ? (
                <AIChatInterface />
            ) : activeTab === 'global' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: '#fff9c4', border: '1px solid #fbc02d', padding: '12px 20px', borderRadius: '12px', color: '#827717', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚠️ <b>Note:</b> Login (Google/Email) may not work inside this view due to security restrictions.</span>
                        </div>
                        <a
                            href="https://global-parts-find.base44.app/Finder"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ background: '#6366f1', color: '#fff', padding: '6px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            Open in New Tab ↗
                        </a>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', height: '800px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                        <iframe
                            src="https://global-parts-find.base44.app/Finder"
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="Global Finder"
                        />
                    </div>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: '40px' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', color: '#1e293b' }}>Global Spare-Part Database</h2>
                        <SearchBar onSearch={handleSearch} />
                        {searchId && (
                            <div id="results" style={{ marginTop: '40px' }}>
                                <ResultsList searchId={searchId} companyId={profile?.company_id} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

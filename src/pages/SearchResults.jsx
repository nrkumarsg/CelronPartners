import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Briefcase, LayoutDashboard, Building2, Package, StickyNote, MessageSquare, Folder, ExternalLink, Loader2, ArrowRight } from 'lucide-react';
import { searchInternal, searchDrive } from '../lib/searchService';
import { useAuth } from '../contexts/AuthContext';

export default function SearchResults() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const { activeCompanyId } = useAuth();
    const navigate = useNavigate();
    
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (query) {
            handleSearch();
        }
    }, [query, activeCompanyId]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const [internal, drive] = await Promise.all([
                searchInternal(query, activeCompanyId),
                searchDrive(query, localStorage.getItem('google_access_token'))
            ]);
            setResults([...(internal.results || []), ...drive]);
        } catch (error) {
            console.error('Search page error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Job': return <Briefcase size={20} color="#6366f1" />;
            case 'Enquiry': return <LayoutDashboard size={20} color="#8b5cf6" />;
            case 'Partner': return <Building2 size={20} color="#94a3b8" />;
            case 'Catalog': return <Package size={20} color="#f59e0b" />;
            case 'Note': return <StickyNote size={20} color="#10b981" />;
            case 'Wall Activity': return <MessageSquare size={20} color="#ec4899" />;
            case 'File': return <Folder size={20} color="#3b82f6" />;
            default: return <Search size={20} />;
        }
    };

    return (
        <div className="animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Search Results</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Showing results for: <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>"{query}"</span>
                    </p>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Search size={20} color="var(--accent)" />
                    <span style={{ fontWeight: 600 }}>{results.length} results found</span>
                </div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
                    <Loader2 className="animate-spin" size={48} color="#6366f1" />
                    <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Searching across your workspace...</p>
                </div>
            ) : results.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '100px 20px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Search size={40} color="#94a3b8" />
                    </div>
                    <h2>No results found</h2>
                    <p style={{ color: '#64748b', maxWidth: '400px', margin: '12px auto' }}>
                        We couldn't find anything matching your search. Try different keywords or check your Google Drive connection.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {results.map((result, idx) => (
                        <div 
                            key={`${result.type}-${result.id}-${idx}`}
                            className="glass-panel"
                            style={{ 
                                padding: '20px 24px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '24px',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            onClick={() => {
                                if (result.isExternal) window.open(result.link, '_blank');
                                else navigate(result.link);
                            }}
                        >
                            <div style={{ 
                                width: '56px', 
                                height: '56px', 
                                background: '#f8fafc', 
                                borderRadius: '16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                border: '1px solid #e2e8f0'
                            }}>
                                {getTypeIcon(result.type)}
                            </div>
                            
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                        {result.type === 'File' ? 'Cloud File' : result.type}
                                    </span>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{result.label}</h3>
                                </div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{result.sublabel}</p>
                            </div>

                            <div style={{ color: '#94a3b8' }}>
                                {result.isExternal ? <ExternalLink size={20} /> : <ArrowRight size={20} />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

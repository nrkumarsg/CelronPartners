import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, BookOpen, ExternalLink, HelpCircle, FileText, Download, MessageSquare, Loader2 } from 'lucide-react';
import { getManuals } from '../../lib/manualsService';

export default function SmartAssistant() {
    const [manuals, setManuals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [impaBook, setImpaBook] = useState(null);

    useEffect(() => {
        const fetchManuals = async () => {
            const { data, error } = await getManuals();
            if (data) {
                setManuals(data.slice(0, 6)); // Show top 6 recent
                // Look for IMPA book specifically
                const foundImpa = data.find(m => m.title.toLowerCase().includes('impa'));
                if (foundImpa) setImpaBook(foundImpa);
            }
            setLoading(false);
        };
        fetchManuals();
    }, []);

    const handleLaunchNotebook = () => {
        window.open('https://notebooklm.google.com/', '_blank');
    };

    const handleDownload = (url) => {
        if (!url) return;
        window.open(url, '_blank');
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header Section */}
            <header style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{
                    display: 'inline-flex',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    borderRadius: '20px',
                    marginBottom: '24px',
                    boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                }}>
                    <Brain size={48} color="#fff" />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                    AI Document Assistant
                </h1>
                <p style={{ fontSize: '1.2rem', color: '#64748b', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
                    Harness the power of Google's NotebookLM to talk to your technical manuals,
                    IMPA books, and company documents in real-time.
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
                {/* Main Action Area */}
                <div className="glass-panel" style={{ padding: '40px', background: '#fff', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#f1f5f9',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px'
                    }}>
                        <Sparkles size={40} color="#6366f1" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '20px' }}>
                        Ready to start your session?
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '32px', maxWidth: '400px' }}>
                        Launch the AI Document Hub. You can upload any PDF from your Celron library or Google Drive to begin asking questions.
                    </p>

                    <button
                        onClick={handleLaunchNotebook}
                        className="btn btn-primary"
                        style={{
                            padding: '16px 40px',
                            borderRadius: '14px',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#6366f1',
                            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
                        }}
                    >
                        Launch NotebookLM <ExternalLink size={20} />
                    </button>

                    <div style={{ marginTop: '40px', display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                            <CheckIcon /> No Coding Required
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                            <CheckIcon /> PDF Support
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                            <CheckIcon /> Real-time Queries
                        </div>
                    </div>
                </div>

                {/* Sidebar Info/Guides */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* IMPA Section */}
                    <div className="glass-panel" style={{ padding: '24px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '12px' }}>
                                <BookOpen size={24} color="#1d4ed8" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e40af' }}>IMPA Book Knowledge</h3>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#1e40af', opacity: 0.8, marginBottom: '20px' }}>
                            {impaBook
                                ? "The Marine IMPA book is linked and ready. Download it below to feed it to the AI for instant sourcing help."
                                : "The Marine IMPA book is available in your digital archives. You can feed it to the AI for instant part identification and sourcing help."}
                        </p>
                        <button
                            onClick={() => impaBook ? handleDownload(impaBook.file_url) : window.location.href = '/manuals'}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                background: '#fff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={18} /> {impaBook ? "Get IMPA Source PDF" : "Search in Manuals Library"}
                        </button>
                    </div>

                    {/* Job History AI Section */}
                    <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, #f5f3ff 0%, #fff 100%)', border: '1px solid #ddd6fe' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: '#ede9fe', padding: '10px', borderRadius: '12px' }}>
                                <Brain size={24} color="#7c3aed" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#5b21b6' }}>Job History AI</h3>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#5b21b6', opacity: 0.8, marginBottom: '20px' }}>
                            Access your historical Zoho Marine Job Registry. Talk to the AI to find trends, old invoices, and vessel service histories.
                        </p>
                        <button
                            onClick={() => window.open('https://notebooklm.google.com/notebook/0ee30281-09bf-4d58-9bc6-7cfc804552bf', '_blank')}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                background: '#7c3aed',
                                border: 'none',
                                color: '#fff',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px rgba(124, 58, 237, 0.2)'
                            }}
                        >
                            <MessageSquare size={18} /> Chat with History AI
                        </button>
                    </div>

                    {/* How to Guide */}
                    <div className="glass-panel" style={{ padding: '24px', background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '12px' }}>
                                <HelpCircle size={24} color="#ef4444" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Simple Steps</h3>
                        </div>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <StepItem number="1" text="Launch NotebookLM using the main button or specific source icons." />
                            <StepItem number="2" text="The AI already contains your trained Zoho Job History and Manuals." />
                            <StepItem number="3" text="Ask specific questions like 'What was the last job for Vessel Ever Given?'" />
                            <StepItem number="4" text="Get instant answers based on real historical data." />
                        </ul>
                    </div>
                </div>
            </div>

            {/* Quick Access Manuals Section */}
            <div style={{ marginTop: '48px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={24} color="#6366f1" /> Quick Source Selection
                </h3>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                        <p>Loading your manual library...</p>
                    </div>
                ) : manuals.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px dashed #e2e8f0', color: '#64748b' }}>
                        <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p>No manuals found. Upload some to your library for AI context.</p>
                        <button onClick={() => window.location.href = '/manuals'} className="btn btn-secondary" style={{ marginTop: '12px' }}>Go to Manuals Library</button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {manuals.map((manual) => (
                            <div key={manual.id} className="glass-panel" style={{ padding: '20px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>Manual</span>
                                    <MessageSquare size={16} color="#94a3b8" />
                                </div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manual.title}</h4>
                                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '16px' }}>{manual.brand_make || 'Technical Document'}</p>
                                <button
                                    onClick={() => handleDownload(manual.file_url)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: 'transparent',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Download size={14} /> Download for AI
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function StepItem({ number, text }) {
    return (
        <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{
                background: '#f1f5f9',
                color: '#64748b',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800,
                flexShrink: 0,
                marginTop: '2px'
            }}>
                {number}
            </span>
            <span style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>{text}</span>
        </li>
    );
}

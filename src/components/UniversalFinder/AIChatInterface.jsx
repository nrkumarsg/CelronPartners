import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Info, History, Filter, Car, Cpu, Truck, Search } from 'lucide-react';
import { chatWithGemini } from '../../lib/geminiService';
import { useAuth } from '../../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

export default function AIChatInterface({ onSearchTrigger, searchId }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your Spare Parts Assistant. Upload a photo or type a part name/model to get started with high-accuracy identification.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const { profile } = useAuth();

    const handleSend = async () => {
        if (!input.trim() && !selectedImage) return;

        const userMessage = {
            role: 'user',
            text: input,
            image: imagePreview
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Prepare history for API
            const history = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.text }]
            }));

            // Call database-aware backend
            const resp = await fetch('/api/universal-finder/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: input || "Analyze this part photo",
                    history,
                    company_id: profile?.company_id,
                    searchId,
                    image: imagePreview,
                    system_prompt: `You are a Spare Parts Specialist. Your goal is to identify industrial part names, brands (make), and models from user text or photos. 
                    If you identify a specific part, respond with the details AND also return a JSON block at the end like this:
                    SEARCH_TRIGGER:{"query": "part name", "make": "brand", "model": "model number", "specs": "specifications"}
                    Keep the query concise for search engines.`
                })
            });

            const data = await resp.json();
            if (data.error) throw new Error(data.error);

            let cleanResponse = String(data.response || "");
            let searchData = null;

            if (cleanResponse.includes('SEARCH_TRIGGER:')) {
                try {
                    const parts = data.response.split('SEARCH_TRIGGER:');
                    cleanResponse = parts[0].trim();
                    const jsonStr = parts[1].trim();
                    searchData = JSON.parse(jsonStr);
                } catch (e) {
                    console.error("Failed to parse search trigger:", e);
                }
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: cleanResponse,
                searchData
            }]);

            setSelectedImage(null);
            setImagePreview(null);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I encountered an error: " + error.message }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: 'calc(100vh - 200px)',
            background: 'rgba(30, 41, 59, 0.03)',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
        }}>
            {/* Sidebar */}
            <div style={{
                width: '260px',
                background: '#1e293b',
                color: '#f8fafc',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '32px'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Cpu size={20} /> PartFinder AI
                    </h2>
                </div>

                <div>
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 600 }}>Quick Filters</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button onClick={() => setInput('Find suppliers for passenger vehicle spares')} style={sidebarButtonStyle}><Car size={16} /> Passenger Vehicles</button>
                        <button onClick={() => setInput('Find heavy machinery engine parts')} style={sidebarButtonStyle}><Truck size={16} /> Heavy Machinery</button>
                        <button onClick={() => setInput('Identify this electronic sensor')} style={sidebarButtonStyle}><Cpu size={16} /> Electronics & Sensors</button>
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 600 }}>Recent Searches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        <div onClick={() => setInput('Omron H3CR-A8')} style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'none'}>Omron H3CR-A8</div>
                        <div onClick={() => setInput('Siemens PLC S7-1200')} style={{ padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.target.style.background = 'none'}>Siemens PLC S7-1200</div>
                    </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <button
                        onClick={() => setMessages([{ role: 'assistant', text: 'Hello! I am your Spare Parts Assistant. Upload a photo or type a part name/model to get started with high-accuracy identification.' }])}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'none',
                            color: '#f8fafc',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <History size={16} /> New Chat
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>Spare Parts Assistant</div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 0 rgba(16, 185, 129, 0.4)', animation: 'pulse 2s infinite' }}></span>
                            Powered by Gemini 2.5 Flash
                            {searchId && <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700 }}>LIVE SEARCH CONTEXT</span>}
                        </div>
                    </div>
                    <button style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}><Info size={20} /></button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {msg.image && (
                                <img src={msg.image} alt="Uploaded" style={{ width: '200px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            )}
                            <div style={{
                                padding: '12px 18px',
                                borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                                background: msg.role === 'user' ? '#6366f1' : '#f1f5f9',
                                color: msg.role === 'user' ? '#fff' : '#1e293b',
                                fontSize: '0.95rem',
                                lineHeight: '1.6'
                            }}>
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>

                            {msg.searchData && (
                                <div style={{
                                    marginTop: '12px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Filter size={14} /> Intelligence Detected Parts:
                                    </div>
                                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{msg.searchData.query}</div>
                                        {msg.searchData.make && <div style={{ color: '#6366f1' }}>Brand: {msg.searchData.make}</div>}
                                        {msg.searchData.model && <div style={{ color: '#475569' }}>Model: {msg.searchData.model}</div>}
                                    </div>
                                    <button
                                        onClick={() => onSearchTrigger(msg.searchData)}
                                        style={{
                                            background: '#4f46e5',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Search size={16} /> Find Suppliers for this Part
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                            <Loader2 size={16} className="animate-spin" /> Analyzing part details...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0' }}>
                    {imagePreview && (
                        <div style={{ marginBottom: '12px', position: 'relative', display: 'inline-block' }}>
                            <img src={imagePreview} alt="Preview" style={{ height: '60px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                            <button
                                onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                                style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', borderRadius: '50%', border: 'none', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        background: '#f8fafc',
                        padding: '8px',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                padding: '10px',
                                color: '#64748b',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '10px',
                                transition: 'all 0.2s'
                            }}>
                            <ImageIcon size={20} />
                        </button>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        <input
                            type="text"
                            placeholder="Type part name, model, or ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.95rem'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || (!input.trim() && !selectedImage)}
                            style={{
                                padding: '10px 20px',
                                background: '#6366f1',
                                color: '#fff',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: loading ? 0.7 : 1
                            }}>
                            <Send size={18} /> Send
                        </button>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '12px' }}>
                        Artificial Intelligence can make mistakes. Always verify part numbers with technical documentation.
                    </div>
                </div>
            </div>
        </div>
    );
}

const sidebarButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: 'none',
    background: 'none',
    color: '#cbd5e1',
    fontSize: '0.9rem',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s'
};

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Share2, Plus, Search, ExternalLink, RefreshCw, Send, Paperclip, MoreVertical, Star, Inbox, Trash2, Globe, Youtube, Instagram, Twitter, Linkedin, Facebook } from 'lucide-react';
import { getCommunicationAccounts, getUnreadCounts } from '../lib/communicationService';

export default function MessagingHub() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('email'); // 'email', 'chat', 'social'
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});

    // Mock messages for UI demonstration
    const [mockMessages, setMockMessages] = useState([
        { id: 1, sender: 'John Doe', subject: 'Inquiry regarding Marine Spare Parts', excerpt: 'Hi, I would like to get a quote for the following parts...', time: '10:45 AM', account: 'Sales Email', isUnread: true },
        { id: 2, sender: 'Zoho Team', subject: 'Your weekly security report', excerpt: 'System scan completed. All services are running normally...', time: 'Yesterday', account: 'Work Email', isUnread: false },
        { id: 3, sender: 'Port Authority', subject: 'Vessel Arrival Notification', excerpt: 'The vessel MV GLORY is expected to dock at Port 4...', time: '8:22 AM', account: 'Sales Email', isUnread: true },
        { id: 4, sender: 'WhatsApp: Chris', subject: '', excerpt: 'Did you check the latest shipment for the Greek client?', time: '11:15 AM', account: 'WA: Business', isUnread: true, type: 'chat' },
    ]);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        const { data } = await getCommunicationAccounts();
        if (data) {
            setAccounts(data);
            const counts = await getUnreadCounts(data);
            setUnreadCounts(counts);
        }
        setLoading(false);
    };

    const getIcon = (provider) => {
        switch (provider.toLowerCase()) {
            case 'gmail': return <Globe size={18} color="#ea4335" />;
            case 'zoho': return <Globe size={18} color="#2563eb" />;
            case 'whatsapp': return <MessageSquare size={18} color="#25d366" />;
            case 'facebook': return <Facebook size={18} color="#1877f2" />;
            case 'instagram': return <Instagram size={18} color="#e4405f" />;
            case 'twitter': return <Twitter size={18} color="#1da1f2" />;
            case 'linkedin': return <Linkedin size={18} color="#0a66c2" />;
            case 'youtube': return <Youtube size={18} color="#ff0000" />;
            case 'tiktok': return <Globe size={18} color="#000000" />;
            default: return <Mail size={18} color="#64748b" />;
        }
    };

    const renderAccountSidebar = () => (
        <div style={{ width: '280px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Messaging Hub</h3>
            </div>

            <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                {/* Section Switcher */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', padding: '4px', background: '#f1f5f9', borderRadius: '8px' }}>
                    <button onClick={() => setActiveSection('email')} style={{ flex: 1, padding: '8px', border: 'none', background: activeSection === 'email' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: activeSection === 'email' ? '#1e293b' : '#64748b', cursor: 'pointer', boxShadow: activeSection === 'email' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Email</button>
                    <button onClick={() => setActiveSection('chat')} style={{ flex: 1, padding: '8px', border: 'none', background: activeSection === 'chat' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: activeSection === 'chat' ? '#1e293b' : '#64748b', cursor: 'pointer', boxShadow: activeSection === 'chat' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Chat</button>
                    <button onClick={() => setActiveSection('social')} style={{ flex: 1, padding: '8px', border: 'none', background: activeSection === 'social' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: activeSection === 'social' ? '#1e293b' : '#64748b', cursor: 'pointer', boxShadow: activeSection === 'social' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}>Social</button>
                </div>

                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
                ) : (
                    <div>
                        {accounts.filter(a => {
                            if (activeSection === 'email') return a.platform === 'email';
                            if (activeSection === 'chat') return a.platform === 'whatsapp' || a.provider === 'wechat' || a.provider === 'botim';
                            return a.platform === 'social';
                        }).map(account => (
                            <div
                                key={account.id}
                                onClick={() => setSelectedAccount(account)}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    marginBottom: '4px',
                                    cursor: 'pointer',
                                    background: selectedAccount?.id === account.id ? '#f1f5f9' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    {getIcon(account.provider)}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.account_label}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.email_address || account.provider}</div>
                                </div>
                                {unreadCounts[account.id] > 0 && (
                                    <div style={{ padding: '2px 6px', background: '#6366f1', color: '#fff', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700 }}>{unreadCounts[account.id]}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => window.location.href = '#/settings?tab=communications'}
                    style={{ width: '100%', padding: '10px', border: '1px dashed #cbd5e1', background: 'transparent', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <Plus size={16} /> Manage Accounts
                </button>
            </div>
        </div>
    );

    const renderMessageList = () => (
        <div style={{ width: '380px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: '#f1f5f9', borderRadius: '20px', gap: '8px' }}>
                    <Search size={16} color="#64748b" />
                    <input type="text" placeholder="Search in messages..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%' }} />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {mockMessages.filter(m => {
                    if (activeSection === 'email') return !m.type;
                    return m.type === 'chat';
                }).map(msg => (
                    <div
                        key={msg.id}
                        style={{
                            padding: '20px',
                            borderBottom: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            background: msg.isUnread ? '#fff' : 'transparent',
                            borderLeft: msg.isUnread ? '3px solid #6366f1' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: msg.isUnread ? 700 : 500, color: '#1e293b' }}>{msg.sender}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{msg.time}</span>
                        </div>
                        {msg.subject && <div style={{ fontSize: '0.8rem', fontWeight: msg.isUnread ? 600 : 400, color: '#475569', marginBottom: '4px' }}>{msg.subject}</div>}
                        <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.excerpt}</div>
                        <div style={{ marginTop: '8px', fontSize: '0.7rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={12} /> {msg.account}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderReadingPane = () => (
        <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}><RefreshCw size={18} /></button>
                    <button style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    <button style={{ border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}><Star size={18} /></button>
                </div>
                <div>
                    <button onClick={() => window.open(selectedAccount?.account_url || '#', '_blank')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExternalLink size={14} /> Open in {selectedAccount?.provider || 'Portal'}
                    </button>
                </div>
            </div>

            {/* Content Area (Mock) */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '24px' }}>Inquiry regarding Marine Spare Parts</h1>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>JD</div>
                        <div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>John Doe <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.85rem' }}>&lt;john.doe@example.com&gt;</span></div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>To: Sales Team &lt;sales@celron.net&gt; • 10:45 AM (2 hours ago)</div>
                        </div>
                    </div>

                    <div style={{ color: '#334155', lineHeight: 1.6, fontSize: '1rem' }}>
                        Dear Cel-Ron Team,<br /><br />
                        I hope this email finds you well.<br /><br />
                        We are currently looking for a specialized set of marine spare parts for an upcoming maintenance project on MV GLORY. Could you please provide a quotation for the following items:<br /><br />
                        1. Main Engine Piston Rings - 12 units<br />
                        2. Cylinder Liner O-rings - 24 units<br />
                        3. Fuel Injection Pump Spares - Kit<br /><br />
                        Please advise on the availability and delivery time to Port of Singapore.<br /><br />
                        Best Regards,<br />
                        John Doe
                    </div>
                </div>
            </div>

            {/* Quick Reply (Mock) */}
            <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <textarea placeholder="Type your reply here..." style={{ width: '100%', border: 'none', padding: '16px', outline: 'none', minHeight: '120px', resize: 'none', fontSize: '0.95rem' }}></textarea>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ padding: '8px', border: 'none', background: 'none', color: '#64748b', cursor: 'pointer' }}><Paperclip size={18} /></button>
                        </div>
                        <button style={{ padding: '8px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Send size={16} /> Send Reply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSocialDashboard = () => (
        <div style={{ flex: 1, background: '#f8fafc', padding: '40px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>Social Ecosystem</h1>
                    <p style={{ color: '#64748b', fontSize: '1rem' }}>Monitor and manage your company's presence across all social platforms.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {accounts.filter(a => a.platform === 'social').map(account => (
                        <div key={account.id} style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', transition: 'transform 0.2s', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {getIcon(account.provider)}
                                </div>
                                <button onClick={() => window.open(account.account_url, '_blank')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'transparent', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Visit Portal <ExternalLink size={12} />
                                </button>
                            </div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{account.account_label}</h3>
                            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>{account.provider.charAt(0).toUpperCase() + account.provider.slice(1)} Channel</p>

                            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{unreadCounts[account.id] || 0}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notifs</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>Live</div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#6366f1' }}>Sync</div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>API</div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div
                        onClick={() => window.location.href = '#/settings?tab=communications'}
                        style={{ background: 'transparent', borderRadius: '20px', padding: '24px', border: '2px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer', minHeight: '200px' }}
                    >
                        <Plus size={32} />
                        <span style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 600 }}>Add Social Account</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ height: 'calc(100vh - 70px)', display: 'flex', overflow: 'hidden', margin: '-32px -40px' }}>
            {renderAccountSidebar()}
            {activeSection !== 'social' ? (
                <>
                    {renderMessageList()}
                    {renderReadingPane()}
                </>
            ) : (
                renderSocialDashboard()
            )}
        </div>
    );
}

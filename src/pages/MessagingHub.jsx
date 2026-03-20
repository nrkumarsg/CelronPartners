import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, MessageSquare, Share2, Plus, Search, ExternalLink, RefreshCw, Send, Paperclip, MoreVertical, Star, Inbox, Trash2, Globe, Youtube, Instagram, Twitter, Linkedin, Facebook, X } from 'lucide-react';
import { getCommunicationAccounts, getUnreadCounts } from '../lib/communicationService';
import { fetchGmailThreads } from '../lib/googleAuthService';

export default function MessagingHub() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('email'); // 'email', 'chat', 'social'
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [realMessages, setRealMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isUnified, setIsUnified] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Mock messages for UI demonstration (used as fallback)
    const [mockMessages, setMockMessages] = useState([
        { id: 1, sender: 'John Doe', subject: 'Inquiry regarding Marine Spare Parts', excerpt: 'Hi, I would like to get a quote for the following parts...', time: '10:45 AM', account: 'Sales Email', isUnread: true },
        { id: 2, sender: 'Zoho Team', subject: 'Your weekly security report', excerpt: 'System scan completed. All services are running normally...', time: 'Yesterday', account: 'Work Email', isUnread: false },
        { id: 3, sender: 'Port Authority', subject: 'Vessel Arrival Notification', excerpt: 'The vessel MV GLORY is expected to dock at Port 4...', time: '8:22 AM', account: 'Sales Email', isUnread: true },
        { id: 4, sender: 'WhatsApp: Chris', subject: '', excerpt: 'Did you check the latest shipment for the Greek client?', time: '11:15 AM', account: 'WA: Business', isUnread: true, type: 'chat' },
    ]);

    const [tabs, setTabs] = useState([]); // Array of { id, type, label, provider }
    const [activeTabId, setActiveTabId] = useState(null);

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Sync selectedAccount/isUnified with tabs logic
    useEffect(() => {
        if (isUnified) {
            handleOpenTab({ id: 'unified', type: 'unified', label: 'Unified Inbox', provider: 'gmail' });
        } else if (selectedAccount) {
            handleOpenTab({
                id: selectedAccount.id,
                type: 'account',
                label: selectedAccount.account_label,
                provider: selectedAccount.provider,
                account: selectedAccount
            });
        }
    }, [selectedAccount, isUnified]);

    const handleOpenTab = (tab) => {
        setTabs(prev => {
            if (prev.find(t => t.id === tab.id)) return prev;
            return [...prev, tab];
        });
        setActiveTabId(tab.id);
    };

    const closeTab = (e, tabId) => {
        e.stopPropagation();
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);
        if (activeTabId === tabId) {
            if (newTabs.length > 0) setActiveTabId(newTabs[newTabs.length - 1].id);
            else setActiveTabId(null);
        }
    };

    const selectTab = (tab) => {
        setActiveTabId(tab.id);
        if (tab.type === 'unified') {
            setIsUnified(true);
            setSelectedAccount(null);
            setActiveSection('email');
        } else {
            setIsUnified(false);
            setSelectedAccount(tab.account);
            // Auto-switch section based on account
            if (tab.account.platform === 'email') setActiveSection('email');
            else if (['whatsapp', 'wechat', 'botim'].includes(tab.account.provider)) setActiveSection('chat');
            else setActiveSection('social');
        }
    };

    useEffect(() => {
        if (isUnified) {
            loadUnifiedMessages();
        } else if (selectedAccount?.provider?.toLowerCase() === 'gmail' && selectedAccount?.auth_data?.access_token) {
            loadRealMessages(selectedAccount.auth_data.access_token);
        } else {
            setRealMessages([]);
        }
    }, [selectedAccount, isUnified, accounts]);

    const loadRealMessages = async (token) => {
        setLoadingMessages(true);
        setStatusMessage('');
        try {
            const msgs = await fetchGmailThreads(token);
            setRealMessages(msgs);
            if (msgs.length === 0) setStatusMessage('No messages found in this Gmail account.');
            if (msgs.length > 0 && !selectedMessage) setSelectedMessage(msgs[0]);
        } catch (e) {
            console.error('MessagingHub load error:', e);
            setStatusMessage(e.message === 'AUTH_EXPIRED' ? 'Authentication expired.' : `Error: ${e.message}`);
            setRealMessages([]);
        }
        setLoadingMessages(false);
    };

    const loadUnifiedMessages = async () => {
        setLoadingMessages(true);
        try {
            const gmailAccounts = accounts.filter(a => a.provider?.toLowerCase() === 'gmail' && a.auth_data?.access_token);
            if (gmailAccounts.length === 0) {
                setRealMessages([]);
                setLoadingMessages(false);
                return;
            }
            const allMsgs = await Promise.all(gmailAccounts.map(async (acc) => {
                try {
                    const msgs = await fetchGmailThreads(acc.auth_data.access_token);
                    return msgs.map(m => ({ ...m, accountLabel: acc.account_label }));
                } catch (err) { return []; }
            }));
            const flattened = allMsgs.flat().sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
            setRealMessages(flattened);
            if (flattened.length > 0 && !selectedMessage) setSelectedMessage(flattened[0]);
        } catch (e) { console.error(e); }
        setLoadingMessages(false);
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const { data } = await getCommunicationAccounts();
            if (data && data.length > 0) {
                setAccounts(data);
                const counts = await getUnreadCounts(data);
                setUnreadCounts(counts);

                // Initial selection
                const gmailAccount = data.find(a => a.provider?.toLowerCase() === 'gmail');
                if (gmailAccount) {
                    setSelectedAccount(gmailAccount);
                    setIsUnified(false);
                } else {
                    setSelectedAccount(data[0]);
                }
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const getIcon = (provider, size = 18) => {
        switch (provider?.toLowerCase()) {
            case 'gmail': return <Globe size={size} color="#ea4335" />;
            case 'zoho': return <Globe size={size} color="#2563eb" />;
            case 'whatsapp': return <MessageSquare size={size} color="#25d366" />;
            case 'facebook': return <Facebook size={size} color="#1877f2" />;
            case 'instagram': return <Instagram size={size} color="#e4405f" />;
            case 'twitter': return <Twitter size={size} color="#1da1f2" />;
            case 'linkedin': return <Linkedin size={size} color="#0a66c2" />;
            case 'youtube': return <Youtube size={size} color="#ff0000" />;
            default: return <Mail size={size} color="#64748b" />;
        }
    };

    const renderTabBar = () => (
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '8px 12px 0 12px', borderBottom: '1px solid #e2e8f0', gap: '4px', overflowX: 'auto' }}>
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    onClick={() => selectTab(tab)}
                    style={{
                        padding: '8px 16px',
                        background: activeTabId === tab.id ? '#fff' : 'transparent',
                        border: '1px solid #e2e8f0',
                        borderBottom: activeTabId === tab.id ? '2px solid #fff' : '1px solid #e2e8f0',
                        marginBottom: '-1px',
                        borderRadius: '8px 8px 0 0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem',
                        fontWeight: activeTabId === tab.id ? 700 : 500,
                        color: activeTabId === tab.id ? '#1e293b' : '#64748b',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        zIndex: activeTabId === tab.id ? 1 : 0
                    }}
                >
                    {tab.type === 'unified' ? <Inbox size={14} /> : getIcon(tab.provider, 14)}
                    {tab.label}
                    <X
                        size={14}
                        style={{ marginLeft: '4px', opacity: 0.6 }}
                        onClick={(e) => closeTab(e, tab.id)}
                        onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.target.style.color = 'inherit'}
                    />
                </div>
            ))}
        </div>
    );

    const renderAccountSidebar = () => (
        <div style={{ width: '280px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Messaging Hub</h3>
            </div>

            <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', padding: '4px', background: '#f1f5f9', borderRadius: '8px' }}>
                    <button onClick={() => setActiveSection('email')} style={{ flex: 1, padding: '8px', border: 'none', background: activeSection === 'email' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: activeSection === 'email' ? '#1e293b' : '#64748b', cursor: 'pointer' }}>Email</button>
                    <button onClick={() => setActiveSection('chat')} style={{ flex: 1, padding: '8px', border: 'none', background: activeSection === 'chat' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: activeSection === 'chat' ? '#1e293b' : '#64748b', cursor: 'pointer' }}>Chat</button>
                    <button onClick={() => setActiveSection('social')} style={{ flex: 1, padding: '8px', border: 'none', background: activeSection === 'social' ? '#fff' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, color: activeSection === 'social' ? '#1e293b' : '#64748b', cursor: 'pointer' }}>Social</button>
                </div>

                {loading ? <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {activeSection === 'email' && accounts.some(a => a.provider?.toLowerCase() === 'gmail') && (
                            <div
                                onClick={() => { setIsUnified(true); setSelectedAccount(null); }}
                                style={{
                                    padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', cursor: 'pointer',
                                    background: isUnified ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#fff',
                                    color: isUnified ? '#fff' : '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', border: isUnified ? 'none' : '1px solid #e2e8f0'
                                }}
                            >
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isUnified ? 'rgba(255,255,255,0.2)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Inbox size={18} color={isUnified ? '#fff' : '#6366f1'} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Unified Inbox</div>
                                </div>
                            </div>
                        )}

                        {accounts.filter(a => {
                            if (activeSection === 'email') return a.platform === 'email';
                            if (activeSection === 'chat') return a.platform === 'whatsapp' || a.provider === 'wechat' || a.provider === 'botim';
                            return a.platform === 'social';
                        }).map(account => {
                            const isActive = !isUnified && selectedAccount?.id === account.id;
                            return (
                                <div
                                    key={account.id}
                                    onClick={() => { setSelectedAccount(account); setIsUnified(false); }}
                                    style={{
                                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                        background: isActive ? '#f1f5f9' : 'transparent', display: 'flex', alignItems: 'center', gap: '12px', border: isActive ? '1px solid #e2e8f0' : '1px solid transparent'
                                    }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                        {getIcon(account.provider)}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.account_label}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{unreadCounts[account.id] || 0} Notifications</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button onClick={() => navigate('/settings?tab=communications')} style={{ width: '100%', padding: '10px', border: '2px solid #1e293b', background: '#fff', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
                {loadingMessages ? <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Syncing live messages...</div> : (
                    (realMessages.length > 0 ? realMessages : ((selectedAccount || isUnified) ? [] : mockMessages.filter(m => activeSection === 'email' ? !m.type : m.type === 'chat'))).map(msg => (
                        <div key={msg.id} onClick={() => setSelectedMessage(msg)} style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: selectedMessage?.id === msg.id ? '#f1f5f9' : (msg.isUnread ? '#fff' : 'transparent'), borderLeft: msg.isUnread ? '3px solid #6366f1' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: msg.isUnread ? 700 : 500 }}>{msg.sender}</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{msg.time}</span>
                            </div>
                            {msg.subject && <div style={{ fontSize: '0.8rem', fontWeight: msg.isUnread ? 600 : 400, color: '#475569', marginBottom: '4px' }}>{msg.subject}</div>}
                            <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.excerpt}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderReadingPane = () => (
        <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => selectedAccount?.auth_data?.access_token && loadRealMessages(selectedAccount.auth_data.access_token)} disabled={loadingMessages} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><RefreshCw size={18} /></button>
                    <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                    <button style={{ border: 'none', background: 'none', cursor: 'pointer' }}><Star size={18} /></button>
                </div>
                <button onClick={() => window.open(selectedAccount?.account_url || '#', '_blank')} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ExternalLink size={14} /> Open {selectedAccount?.provider || 'Portal'}
                </button>
            </div>
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                {selectedAccount && !isUnified && !selectedAccount.auth_data?.access_token ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '24px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '20px', background: selectedAccount.provider === 'gmail' ? '#fef2f2' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Globe size={40} color={selectedAccount.provider === 'gmail' ? '#ea4335' : '#2563eb'} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{selectedAccount.provider === 'gmail' ? 'Google Authentication Required' : `${selectedAccount.provider.toUpperCase()} Portal Access`}</h2>
                            <p style={{ color: '#64748b', maxWidth: '400px' }}>{selectedAccount.provider === 'gmail' ? 'Connect your Google account to see live emails.' : 'Use the direct link to manage your messages.'}</p>
                        </div>
                        <button onClick={() => selectedAccount.provider === 'gmail' ? import('../lib/googleAuthService').then(m => m.connectGoogleAPI(selectedAccount.id)) : window.open(selectedAccount.account_url, '_blank')} style={{ padding: '12px 32px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            <ExternalLink size={18} /> {selectedAccount.provider === 'gmail' ? 'Connect Google' : `Open ${selectedAccount.account_label}`}
                        </button>
                    </div>
                ) : selectedMessage ? (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>{selectedMessage.subject || '(No Subject)'}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{selectedMessage.sender?.[0]?.toUpperCase()}</div>
                            <div>
                                <div style={{ fontWeight: 600 }}>{selectedMessage.sender}</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{selectedMessage.time}</div>
                            </div>
                        </div>
                        <div dangerouslySetInnerHTML={{ __html: selectedMessage.body || selectedMessage.excerpt }}></div>
                    </div>
                ) : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}><Inbox size={48} /><p>{statusMessage || 'Select a message to read.'}</p></div>}
            </div>
        </div>
    );

    const renderSocialDashboard = () => (
        <div style={{ flex: 1, background: '#f8fafc', padding: '40px', overflowY: 'auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '40px' }}>Social Ecosystem</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {accounts.filter(a => a.platform === 'social').map(account => (
                    <div key={account.id} style={{ background: '#fff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => selectTab({ id: account.id, type: 'account', label: account.account_label, provider: account.provider, account })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            {getIcon(account.provider, 24)}
                            <button onClick={(e) => { e.stopPropagation(); window.open(account.account_url, '_blank'); }} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'transparent', fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Visit Portal</button>
                        </div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700 }}>{account.account_label}</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>{account.provider} Account</p>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', margin: '-32px -40px', background: '#f1f5f9' }}>
            {renderTabBar()}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {renderAccountSidebar()}
                {activeSection !== 'social' ? (
                    <>
                        {renderMessageList()}
                        {renderReadingPane()}
                    </>
                ) : renderSocialDashboard()}
            </div>
        </div>
    );
}

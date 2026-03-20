import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, Printer, Upload, Download, Globe, CheckCircle2, UserCheck, UserPlus, User, MessageSquare, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import { getContacts, deleteContact, getPartners, saveContact } from '../lib/store';
import { connectGoogleAPI, fetchGoogleContacts } from '../lib/googleAuthService';
import Pagination from '../components/Pagination';

export default function ContactsDirectory() {
    const [contacts, setContacts] = useState([]);
    const [partners, setPartners] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Google Sync State
    const [googleContacts, setGoogleContacts] = useState([]); // Master list from Google
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedGoogleIds, setSelectedGoogleIds] = useState(new Set());
    const [syncSearchTerm, setSyncSearchTerm] = useState(''); // Modal search term
    const [importingInProgress, setImportingInProgress] = useState(false);

    useEffect(() => {
        loadData();
        checkGoogleCallback();
    }, []);

    const checkGoogleCallback = async () => {
        const token = sessionStorage.getItem('google_contacts_token');
        const expires = sessionStorage.getItem('google_contacts_expires');

        if (token && expires && new Date(expires) > new Date()) {
            setSyncing(true);
            setShowSyncModal(true);
            try {
                // Fetch up to 1000 from the service (which we updated)
                const fetched = await fetchGoogleContacts(token);
                setGoogleContacts(fetched);
                // We DON'T select all 5000 by default, too much! 
                // Let user select or search first.
                setSelectedGoogleIds(new Set());
            } catch (err) {
                console.error("Failed to fetch Google contacts", err);
            } finally {
                setSyncing(false);
            }
        } else {
            sessionStorage.removeItem('google_contacts_token');
            sessionStorage.removeItem('google_contacts_expires');
        }
    };

    const loadData = async () => {
        setLoading(true);
        const [cData, pData] = await Promise.all([getContacts(), getPartners()]);

        const pMap = {};
        const pList = pData.sort((a, b) => a.name.localeCompare(b.name));
        pData.forEach(p => { pMap[p.id] = p.name });
        setPartners(pMap);
        // Store the original list for the dropdown
        window._partnersList = pList;

        const sorted = cData.sort((a, b) => {
            const pA = pMap[a.partnerId] || '';
            const pB = pMap[b.partnerId] || '';
            return pA.localeCompare(pB);
        });

        setContacts(sorted);
        setLoading(false);
    };

    const handleSyncGoogle = () => {
        connectGoogleAPI('contacts_sync');
    };

    const handleImportGoogle = async () => {
        const toImport = googleContacts.filter(c => selectedGoogleIds.has(c.id));
        if (toImport.length === 0) return alert('No contacts selected');

        setImportingInProgress(true);
        let imported = 0;
        for (const c of toImport) {
            try {
                // Construct a detailed info block from various Google fields
                const details = [];
                if (c.company) details.push(`Company: ${c.company}`);
                if (c.department) details.push(`Dept: ${c.department}`);
                if (c.nickname) details.push(`Nickname: ${c.nickname}`);
                if (c.note) details.push(`Google Note: ${c.note}`);

                await saveContact({
                    name: c.name,
                    email: c.email,
                    handphone: c.phone, // Maps to Mobile field
                    post: c.post,
                    type: 'Other',
                    info: `[Google Sync] ${details.join(' | ')}`
                });
                imported++;
            } catch (err) {
                console.error("Error importing contact", err);
            }
        }

        alert(`Successfully imported ${imported} contacts!`);
        sessionStorage.removeItem('google_contacts_token');
        sessionStorage.removeItem('google_contacts_expires');
        setShowSyncModal(false);
        loadData();
        setImportingInProgress(false);
    };

    const toggleGoogleSelection = (id) => {
        const next = new Set(selectedGoogleIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedGoogleIds(next);
    };

    const selectAllVisible = () => {
        const next = new Set(selectedGoogleIds);
        filteredGoogleContacts.forEach(c => next.add(c.id));
        setSelectedGoogleIds(next);
    };

    const deselectAllVisible = () => {
        const next = new Set(selectedGoogleIds);
        filteredGoogleContacts.forEach(c => next.delete(c.id));
        setSelectedGoogleIds(next);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this contact?')) {
            await deleteContact(id);
            loadData();
        }
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function (results) {
                let imported = 0;
                for (const row of results.data) {
                    if (!row.name || !row.name.trim()) continue;
                    try {
                        const payload = { ...row, name: row.name.trim() };
                        if (row.id) payload.id = row.id;
                        await saveContact(payload);
                        imported++;
                    } catch (err) {
                        console.error("Error saving contact row", err);
                    }
                }
                alert(`Successfully imported ${imported} contacts`);
                loadData();
            },
            error: function () {
                alert('Error parsing CSV file');
                setLoading(false);
            }
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExportCSV = () => {
        const csvData = filteredContacts.map(c => ({
            id: c.id || '',
            name: c.name || '',
            partnerId: c.partnerId || '',
            partnerName: partners[c.partnerId] || '',
            post: c.post || '',
            email: c.email || '',
            handphone: c.handphone || ''
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'contacts_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredContacts = contacts.filter(c => {
        const matchesPartner = !selectedPartnerId || c.partnerId === selectedPartnerId;
        if (!searchTerm && !selectedPartnerId) return true;

        const term = searchTerm.toLowerCase();
        const partnerName = (partners[c.partnerId] || (c.info?.includes('[Google Sync]') ? 'google contact' : 'unknown partner')).toLowerCase();
        const cName = (c.name || '').toLowerCase();
        const cEmail = (c.email || '').toLowerCase();
        const cPhone = (c.handphone || '').toLowerCase();
        const cType = (c.type || '').toLowerCase();
        const cPost = (c.post || '').toLowerCase();
        const cInfo = (c.info || '').toLowerCase();

        const matchesSearch = !searchTerm || (
            cName.includes(term) ||
            cEmail.includes(term) ||
            cPhone.includes(term) ||
            cType.includes(term) ||
            cPost.includes(term) ||
            cInfo.includes(term) ||
            partnerName.includes(term)
        );

        return matchesSearch && matchesPartner;
    });

    // Real-time filtering for Modal
    const filteredGoogleContacts = googleContacts.filter(c => {
        if (!syncSearchTerm) return true;
        const term = syncSearchTerm.toLowerCase();
        return (
            c.name.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            c.phone.toLowerCase().includes(term) ||
            c.company.toLowerCase().includes(term) ||
            c.post.toLowerCase().includes(term)
        );
    });

    const paginatedContacts = filteredContacts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const formatWhatsApp = (phone) => {
        if (!phone) return '';
        // Remove everything except digits
        const digits = phone.replace(/\D/g, '');
        return `https://wa.me/${digits}`;
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Contacts Directory</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage all your partner contacts and individuals</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={handleSyncGoogle} style={{ background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Globe size={18} color="#4285F4" /> Sync Google
                    </button>
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current.click()} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Upload size={18} /> Add CSV
                    </button>
                    <button onClick={handleExportCSV} style={{ background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <Download size={18} /> Export
                    </button>
                    <button className="btn btn-secondary" onClick={() => window.print()} disabled={loading}>
                        <Printer size={18} /> Print
                    </button>
                    <button onClick={() => navigate('/contacts/new')} disabled={loading} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                        <Plus size={18} /> Add Contact
                    </button>
                </div>
            </header>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flex: 1, minWidth: '400px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: '#94a3b8' }}>
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px 0', fontSize: '0.95rem', color: '#334155' }}
                        placeholder="Search by name, email, company, or type (e.g. 'Purchase', 'Technical')..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 16px', gap: '8px', minWidth: '250px' }}>
                    <Globe size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                    <select
                        value={selectedPartnerId}
                        onChange={(e) => {
                            setSelectedPartnerId(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{ appearance: 'none', background: 'transparent', border: 'none', outline: 'none', color: '#475569', fontSize: '0.9rem', fontWeight: 500, padding: '10px 24px 10px 0', cursor: 'pointer', width: '100%' }}
                    >
                        <option value="">All Partner Companies</option>
                        {(window._partnersList || []).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '16px', pointerEvents: 'none' }} />
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Contact Name</th>
                                <th>Category</th>
                                <th>Linked Partner</th>
                                <th>Post</th>
                                <th>Email / Phone</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Loading internal data...
                                    </td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        No contacts found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedContacts.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '60px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: c.business_card_url ? 'none' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: c.business_card_url ? '1px solid #e2e8f0' : 'none', overflow: 'hidden', flexShrink: 0 }}>
                                                {c.business_card_url ? (
                                                    <img src={c.business_card_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <User size={16} />
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                background: '#f1f5f9',
                                                color: '#64748b',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                {c.type || 'Contact'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                            {partners[c.partnerId] || (c.info?.includes('[Google Sync]') ? 'Google Contact' : 'Unknown Partner')}
                                        </td>
                                        <td>{c.post || '-'}</td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{c.email || '-'}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.handphone || '-'}</div>
                                                {c.handphone && (
                                                    <a
                                                        href={formatWhatsApp(c.handphone)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ color: '#25d366', display: 'flex', alignItems: 'center', transition: 'transform 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                        title="Chat on WhatsApp"
                                                    >
                                                        <MessageSquare size={14} fill="#25d366" color="#fff" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }} className="hide-on-print">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => navigate(`/contacts/${c.id}`)}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => handleDelete(c.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredContacts.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredContacts.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Google Sync Modal (Updated with Search) */}
            {showSyncModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', height: '80vh', maxHeight: '800px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Import Google Contacts</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Showing {googleContacts.length} contacts</p>
                                </div>
                                <button onClick={() => setShowSyncModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '8px' }}>✕</button>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ flex: 1, display: 'flex', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '4px 12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                                        <Search size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '8px', fontSize: '0.95rem' }}
                                        placeholder="Search by name, phone or email..."
                                        value={syncSearchTerm}
                                        onChange={(e) => setSyncSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button onClick={selectAllVisible} style={{ whiteSpace: 'nowrap', padding: '10px 16px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <UserCheck size={16} /> Select All
                                </button>
                                <button onClick={deselectAllVisible} style={{ whiteSpace: 'nowrap', padding: '10px 16px', border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#e11d48', cursor: 'pointer' }}>
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#fcfcfc' }}>
                            {syncing ? (
                                <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                    <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #4285F4', borderRadius: '50%', margin: '0 auto 16px' }}></div>
                                    <p style={{ color: '#64748b' }}>Retrieving large contact list...</p>
                                </div>
                            ) : filteredGoogleContacts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>
                                    No matches found for "{syncSearchTerm}"
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                    {filteredGoogleContacts.map(gc => (
                                        <div
                                            key={gc.id}
                                            onClick={() => toggleGoogleSelection(gc.id)}
                                            style={{
                                                display: 'flex',
                                                padding: '12px 16px',
                                                borderRadius: '10px',
                                                border: '1px solid',
                                                borderColor: selectedGoogleIds.has(gc.id) ? '#4285F4' : '#e2e8f0',
                                                background: selectedGoogleIds.has(gc.id) ? '#f0f7ff' : '#fff',
                                                cursor: 'pointer',
                                                alignItems: 'center',
                                                gap: '12px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ color: selectedGoogleIds.has(gc.id) ? '#4285F4' : '#cbd5e1' }}>
                                                {selectedGoogleIds.has(gc.id) ? <CheckCircle2 size={24} fill="currentColor" color="#fff" /> : <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #e2e8f0' }} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{gc.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                                    {gc.phone || 'No Phone'} • {gc.email || 'No Email'}
                                                </div>
                                            </div>
                                            {(gc.company || gc.post) && (
                                                <div style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', color: '#94a3b8', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {gc.post || gc.company}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                <strong>{selectedGoogleIds.size}</strong> contacts selected to import
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setShowSyncModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                                <button
                                    onClick={handleImportGoogle}
                                    disabled={importingInProgress || selectedGoogleIds.size === 0}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#4285F4',
                                        color: '#fff',
                                        fontWeight: 600,
                                        cursor: importingInProgress ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(66, 133, 244, 0.2)'
                                    }}
                                >
                                    {importingInProgress ? (
                                        <>
                                            <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%' }}></div>
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Import to Database
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

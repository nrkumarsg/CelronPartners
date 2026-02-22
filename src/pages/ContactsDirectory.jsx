import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Printer, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { getContacts, deleteContact, getPartners, saveContact } from '../lib/store';
import Pagination from '../components/Pagination';

export default function ContactsDirectory() {
    const [contacts, setContacts] = useState([]);
    const [partners, setPartners] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [cData, pData] = await Promise.all([getContacts(), getPartners()]);

        // Create a lookup dictionary for fast performance while rendering
        const pMap = {};
        pData.forEach(p => { pMap[p.id] = p.name });
        setPartners(pMap);

        // Sort by partner name by default
        const sorted = cData.sort((a, b) => {
            const pA = pMap[a.partnerId] || '';
            const pB = pMap[b.partnerId] || '';
            return pA.localeCompare(pB);
        });

        setContacts(sorted);
        setLoading(false);
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
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const pName = partners[c.partnerId] ? partners[c.partnerId].toLowerCase() : '';
        return (
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.email && c.email.toLowerCase().includes(term)) ||
            (c.handphone && c.handphone.toLowerCase().includes(term)) ||
            (pName.includes(term))
        );
    });

    const paginatedContacts = filteredContacts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Contacts Directory</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage all your partner contacts and individuals</p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
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
                        placeholder="Search contacts by name, email, or partner..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Contact Name</th>
                                <th>Linked Partner</th>
                                <th>Post</th>
                                <th>Email / Phone</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Loading internal data...
                                    </td>
                                </tr>
                            ) : filteredContacts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        No contacts found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedContacts.map(c => (
                                    <tr key={c.id}>
                                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                                        <td style={{ color: 'var(--accent)', fontWeight: 500 }}>
                                            {partners[c.partnerId] || 'Unknown Partner'}
                                        </td>
                                        <td>{c.post || '-'}</td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{c.email || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.handphone || '-'}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }} className="hide-on-print">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => navigate(`/contacts/${c.id}`)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
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
        </div>
    );
}

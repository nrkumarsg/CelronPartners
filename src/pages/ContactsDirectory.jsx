import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { getContacts, deleteContact, getPartners } from '../lib/store';

export default function ContactsDirectory() {
    const [contacts, setContacts] = useState([]);
    const [partners, setPartners] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

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

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="page-title">Contacts Directory</h2>

                <div className="search-bar" style={{ maxWidth: '300px', margin: '0 auto 0 24px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={() => navigate('/contacts/new')} disabled={loading}>
                        <Plus size={18} />
                        Add Contact
                    </button>
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
                                filteredContacts.map(c => (
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
                                        <td style={{ textAlign: 'right' }}>
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
            </div>
        </div>
    );
}

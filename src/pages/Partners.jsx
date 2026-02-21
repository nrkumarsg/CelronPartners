import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Download, Upload, ExternalLink, Search, Printer } from 'lucide-react';
import Papa from 'papaparse';
import { getPartners, deletePartner, savePartner } from '../lib/store';
import Pagination from '../components/Pagination';

export default function Partners() {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        setLoading(true);
        const data = await getPartners();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setPartners(sorted);
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this partner and all related contacts?')) {
            await deletePartner(id);
            loadPartners();
        }
    };

    const handleExportCSV = () => {
        if (partners.length === 0) return alert('No data to export');

        // Flatten types array for CSV
        const exportData = partners.map(p => ({
            ...p,
            types: p.types ? p.types.join(';') : ''
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'partners_export.csv';
        link.click();
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
                    // Restore types array
                    const types = row.types ? row.types.split(';') : [];
                    const dataToSave = { ...row, types };
                    if (!dataToSave.id) delete dataToSave.id; // avoid empty string ids

                    try {
                        await savePartner(dataToSave);
                        imported++;
                    } catch (err) {
                        console.error("Error saving partner row", err);
                    }
                }
                alert(`Successfully imported ${imported} partners`);
                loadPartners();
            },
            error: function () {
                alert('Error parsing CSV file');
                setLoading(false);
            }
        });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredPartners = partners.filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.email1 && p.email1.toLowerCase().includes(term)) ||
            (p.phone1 && p.phone1.toLowerCase().includes(term)) ||
            (p.country && p.country.toLowerCase().includes(term)) ||
            (p.types && p.types.some(t => t.toLowerCase().includes(term))) ||
            (p.address && p.address.toLowerCase().includes(term))
        );
    });

    const paginatedPartners = filteredPartners.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="animate-fade-in">
            <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="page-title">Partners Directory</h2>

                <div className="search-bar" style={{ maxWidth: '300px', margin: '0 auto 0 24px' }}>
                    <Search size={18} color="var(--text-secondary)" />
                    <input
                        type="text"
                        placeholder="Search all fields..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => window.open('https://contacts.google.com/', '_blank')}
                        title="Open Google Contacts"
                        style={{ padding: '10px' }}
                    >
                        <ExternalLink size={18} />
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                    />
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                        <Upload size={18} />
                        Import CSV
                    </button>

                    <button className="btn btn-secondary" onClick={handleExportCSV} disabled={loading}>
                        <Download size={18} />
                        Export CSV
                    </button>

                    <button className="btn btn-secondary" onClick={() => window.print()} disabled={loading}>
                        <Printer size={18} />
                        Print
                    </button>

                    <button className="btn btn-primary" onClick={() => navigate('/partners/new')} disabled={loading}>
                        <Plus size={18} />
                        Add Partner
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Partner Name</th>
                                <th>Type</th>
                                <th>Email / Phone</th>
                                <th>Country</th>
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
                            ) : filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        No partners found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPartners.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                            {p.weblink && (
                                                <a href={p.weblink.startsWith('http') ? p.weblink : `https://${p.weblink}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="hide-on-print"
                                                    style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                    <ExternalLink size={12} /> Website
                                                </a>
                                            )}
                                        </td>
                                        <td>
                                            <div className="multi-select-container" style={{ marginBottom: 0 }}>
                                                {p.types?.map(t => (
                                                    <span key={t} className="tag" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{t}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{p.email1 || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.phone1 || '-'}</div>
                                        </td>
                                        <td>{p.country || '-'}</td>
                                        <td style={{ textAlign: 'right' }} className="hide-on-print">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => navigate(`/partners/${p.id}`)}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => handleDelete(p.id)}
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

                {!loading && filteredPartners.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredPartners.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
}

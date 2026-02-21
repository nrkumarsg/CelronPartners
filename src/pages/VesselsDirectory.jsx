import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Download, Upload, Search, Ship, Printer } from 'lucide-react';
import Papa from 'papaparse';
import { useVesselsStore } from '../lib/vesselsStore';
import Pagination from '../components/Pagination';

export default function VesselsDirectory() {
    const { vessels, loading, fetchVessels, deleteVessel, addVessel } = useVesselsStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchVessels();
    }, [fetchVessels]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this vessel?')) {
            await deleteVessel(id);
        }
    };

    const handleExportCSV = () => {
        if (vessels.length === 0) return alert('No data to export');

        // Prepare data for export without the rich text HTML content to avoid CSV bleeding issues
        const exportData = vessels.map(({ other_details, ...rest }) => rest);

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'vessels_export.csv';
        link.click();
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function (results) {
                let imported = 0;
                for (const row of results.data) {
                    const dataToSave = { ...row };
                    if (!dataToSave.id) delete dataToSave.id;

                    try {
                        const { success } = await addVessel(dataToSave);
                        if (success) imported++;
                    } catch (err) {
                        console.error("Error saving vessel row", err);
                    }
                }
                alert(`Successfully imported ${imported} vessels`);
                fetchVessels();
            },
            error: function () {
                alert('Error parsing CSV file');
            }
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredVessels = vessels.filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (v.vessel_name && v.vessel_name.toLowerCase().includes(term)) ||
            (v.imo_number && v.imo_number.toLowerCase().includes(term)) ||
            (v.vessel_type && v.vessel_type.toLowerCase().includes(term)) ||
            (v.vessel_management && v.vessel_management.toLowerCase().includes(term)) ||
            (v.vessel_owner && v.vessel_owner.toLowerCase().includes(term))
        );
    });

    const paginatedVessels = filteredVessels.slice(
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#e0e7ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                        <Ship size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>Vessels Directory</h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Manage fleets and individual vessel profiles</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                    />
                    <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                        <Upload size={18} /> Import CSV
                    </button>

                    <button className="btn btn-secondary" onClick={handleExportCSV} disabled={loading || vessels.length === 0}>
                        <Download size={18} /> Export CSV
                    </button>

                    <button className="btn btn-secondary" onClick={() => window.print()} disabled={loading}>
                        <Printer size={18} /> Print
                    </button>

                    <button onClick={() => navigate('/vessels/new')} disabled={loading} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)' }}>
                        <Plus size={18} /> Add Vessel
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
                        placeholder="Search vessels by name, IMO, type, or management..."
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
                                <th>Vessel Name</th>
                                <th>IMO Number</th>
                                <th>Vessel Type</th>
                                <th>Management / Owner</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        Loading vessels data...
                                    </td>
                                </tr>
                            ) : filteredVessels.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                                        No vessels found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                paginatedVessels.map(v => (
                                    <tr key={v.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{v.vessel_name}</div>
                                        </td>
                                        <td>{v.imo_number || '-'}</td>
                                        <td>{v.vessel_type || '-'}</td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem' }}>{v.vessel_management || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Owner: {v.vessel_owner || '-'}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }} className="hide-on-print">
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => navigate(`/vessels/${v.id}`)}
                                                    title="View / Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    style={{ padding: '6px' }}
                                                    onClick={() => handleDelete(v.id)}
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

                {!loading && filteredVessels.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={filteredVessels.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
}

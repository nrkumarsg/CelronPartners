import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, Download, Trash2, Edit2, MapPin } from 'lucide-react';
import { useWorkLocationsStore } from '../lib/workLocationsStore';
import Papa from 'papaparse';

export default function WorkLocationsDirectory() {
    const navigate = useNavigate();
    const { workLocations, loading, fetchWorkLocations, deleteWorkLocation, addWorkLocation } = useWorkLocationsStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        fetchWorkLocations();
    }, [fetchWorkLocations]);

    const filteredLocations = workLocations.filter(loc => {
        const searchStr = searchTerm.toLowerCase();
        return (
            (loc.location_name || '').toLowerCase().includes(searchStr) ||
            (loc.pincode || '').toLowerCase().includes(searchStr)
        );
    });

    const handleExportCSV = () => {
        if (workLocations.length === 0) {
            alert("No locations to export");
            return;
        }

        const csvData = workLocations.map(loc => ({
            'Location Name': loc.location_name,
            'Pincode': loc.pincode || '',
            'Other Details': loc.other_details ? loc.other_details.replace(/<[^>]*>?/gm, '') : '' // Strip HTML
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `work_locations_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                let successCount = 0;
                let errorCount = 0;

                for (const row of results.data) {
                    if (!row['Location Name']) {
                        errorCount++;
                        continue;
                    }

                    const newLoc = {
                        location_name: row['Location Name'].trim(),
                        pincode: row['Pincode'] ? row['Pincode'].trim() : null,
                        other_details: row['Other Details'] ? `<p>${row['Other Details'].trim()}</p>` : null,
                    };

                    const result = await addWorkLocation(newLoc);
                    if (result.success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                }

                setIsImporting(false);
                alert(`Import complete.\nSuccessfully added: ${successCount}\nFailed/Skipped: ${errorCount}`);
                // Refresh list
                fetchWorkLocations();
            },
            error: (error) => {
                console.error("Error parsing CSV:", error);
                alert("Error reading CSV file. Ensure it is formatted correctly.");
                setIsImporting(false);
            }
        });
        // Reset file input
        e.target.value = null;
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            await deleteWorkLocation(id);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                        <MapPin size={28} />
                    </div>
                    <div>
                        <h2 className="page-title">Work Locations</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage global branches and operational centers</p>
                    </div>
                </div>

                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={20} color="var(--text-secondary)" />
                        <input
                            type="text"
                            placeholder="Search locations or pincodes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* Hidden file input for CSV Import */}
                        <input
                            type="file"
                            accept=".csv"
                            id="csvImport"
                            style={{ display: 'none' }}
                            onChange={handleImportCSV}
                            disabled={isImporting}
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={() => document.getElementById('csvImport').click()}
                            disabled={isImporting}
                            title="Import CSV"
                        >
                            <Upload size={18} />
                            <span className="hide-on-mobile">{isImporting ? 'Importing...' : 'Import'}</span>
                        </button>
                        <button className="btn btn-secondary" onClick={handleExportCSV} title="Export CSV">
                            <Download size={18} />
                            <span className="hide-on-mobile">Export</span>
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/work-locations/new')}>
                            <Plus size={18} />
                            <span>Add Location</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Location Name</th>
                                <th>Pincode</th>
                                <th>Details</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                                        <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>Loading locations...</p>
                                    </td>
                                </tr>
                            ) : filteredLocations.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                        No work locations found. Try adjusting your search or add a new one.
                                    </td>
                                </tr>
                            ) : (
                                filteredLocations.map(loc => (
                                    <tr key={loc.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#eab308' }}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div style={{ fontWeight: 500 }}>{loc.location_name}</div>
                                            </div>
                                        </td>
                                        <td>{loc.pincode || '-'}</td>
                                        <td>
                                            {loc.other_details ? (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {loc.other_details.replace(/<[^>]*>?/gm, '')}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    className="action-btn"
                                                    onClick={() => navigate(`/work-locations/${loc.id}`)}
                                                    title="Edit Location"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDelete(loc.id, loc.location_name)}
                                                    title="Delete Location"
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

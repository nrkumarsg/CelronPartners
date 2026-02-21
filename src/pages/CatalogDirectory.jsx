import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Download,
    Printer,
    Upload,
    Filter,
    ChevronLeft,
    ChevronRight,
    Package,
    Wrench
} from 'lucide-react';
import { getCatalogItems, getAllCatalogItemsForExport } from '../lib/catalogService';
import Papa from 'papaparse';
import * as html2pdf from 'html2pdf.js';

const CatalogDirectory = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 50;

    useEffect(() => {
        fetchItems();
    }, [currentPage, searchQuery, typeFilter]);

    const fetchItems = async () => {
        setLoading(true);
        const { data, count, error } = await getCatalogItems(
            currentPage,
            itemsPerPage,
            { type: typeFilter },
            searchQuery
        );

        if (error) {
            console.error('Error fetching catalog items:', error);
            // Fallback for demo if no DB connection
            setItems([]);
            setTotalItems(0);
            setTotalPages(1);
        } else {
            setItems(data || []);
            setTotalItems(count || 0);
            setTotalPages(Math.ceil((count || 0) / itemsPerPage));
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to first page on search
        fetchItems();
    };

    const handleExportCSV = async () => {
        const { data, error } = await getAllCatalogItemsForExport();
        if (error || !data) {
            alert("Failed to export data");
            return;
        }

        const exportData = data.map(item => ({
            'Type': item.type,
            'Name': item.name,
            'Specification': item.specification,
            'Quantity Available': item.quantity,
            'Selling Price': item.selling_price,
            'Stored Location': item.stored_location
        }));

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `catalog_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Products & Services Catalog</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Manage your supply parts and services</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }} className="hide-on-print">
                    <button className="btn btn-secondary" onClick={handleExportCSV}>
                        <Download size={18} /> Export CSV
                    </button>
                    <button className="btn btn-secondary" onClick={handlePrint}>
                        <Printer size={18} /> Print
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/catalog/new')}>
                        <Plus size={18} /> Add New Item
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="hide-on-print">
                    <form onSubmit={handleSearch} className="search-bar">
                        <Search size={20} style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search by name, specification, location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>Search</button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                            <Filter size={16} /> Filter:
                        </div>
                        <select
                            className="form-select"
                            style={{ width: '180px', padding: '8px 12px' }}
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="">All Types</option>
                            <option value="Supply Part">Supply Parts</option>
                            <option value="Service">Services</option>
                        </select>
                    </div>
                </div>

                <div className="table-container printable-area">
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Item Name</th>
                                <th>Location</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Specification</th>
                                <th className="no-print">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8">Loading catalog...</td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8">
                                        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                                            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No items found</h3>
                                            <p style={{ marginBottom: '24px' }}>Get started by adding a new product or service.</p>
                                            <button className="btn btn-primary hide-on-print" onClick={() => navigate('/catalog/new')}>
                                                <Plus size={18} /> Add Item
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="table-row">
                                        <td>
                                            <span className="tag" style={{ background: item.type === 'Service' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: item.type === 'Service' ? '#059669' : '#2563eb' }}>
                                                {item.type === 'Service' ? <Wrench size={12} /> : <Package size={12} />}
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="font-medium">{item.name}</td>
                                        <td>{item.stored_location || '-'}</td>
                                        <td>{item.quantity !== null && item.quantity !== undefined ? item.quantity : '-'}</td>
                                        <td>{item.selling_price ? `$${item.selling_price}` : '-'}</td>
                                        <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.specification}>{item.specification || '-'}</td>
                                        <td className="hide-on-print">
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => navigate(`/catalog/${item.id}`)}
                                            >
                                                View / Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="pagination-container hide-on-print">
                        <div className="pagination-info">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                        </div>
                        <div className="pagination-controls">
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px' }}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <div className="pagination-pages">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(num => num === 1 || num === totalPages || Math.abs(num - currentPage) <= 1)
                                    .map((num, i, arr) => (
                                        <React.Fragment key={num}>
                                            {i > 0 && num - arr[i - 1] > 1 && <span style={{ padding: '0 8px', color: 'var(--text-secondary)' }}>...</span>}
                                            <button
                                                className={`pagination-page ${currentPage === num ? 'active' : ''}`}
                                                onClick={() => setCurrentPage(num)}
                                            >
                                                {num}
                                            </button>
                                        </React.Fragment>
                                    ))}
                            </div>
                            <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px' }}
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CatalogDirectory;

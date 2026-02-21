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
        <div className="directory-container">
            <div className="directory-header">
                <div>
                    <h1 className="directory-title">Products & Services Catalog</h1>
                    <p className="directory-subtitle">Manage your supply parts and services</p>
                </div>
                <div className="directory-actions no-print">
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

            <div className="directory-controls no-print">
                <form onSubmit={handleSearch} className="search-bar">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, specification, location..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary">Search</button>
                </form>

                <div className="filter-group">
                    <div className="filter-label">
                        <Filter size={16} /> Filter:
                    </div>
                    <select
                        className="filter-select"
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

            <div className="table-responsive printable-area">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Item Name</th>
                            <th>Location</th>
                            <th>Qty</th>
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
                                    <div className="empty-state">
                                        <Package size={48} className="empty-icon" />
                                        <h3>No items found</h3>
                                        <p>Get started by adding a new product or service.</p>
                                        <button className="btn btn-primary mt-4 no-print" onClick={() => navigate('/catalog/new')}>
                                            Add Item
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} className="table-row">
                                    <td>
                                        <span className={`status-badge ${item.type === 'Service' ? 'status-active' : 'status-pending'}`}>
                                            {item.type === 'Service' ? <Wrench size={12} className="mr-1" inline="true" /> : <Package size={12} className="mr-1" inline="true" />}
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="font-medium">{item.name}</td>
                                    <td>{item.stored_location || '-'}</td>
                                    <td>{item.quantity !== null && item.quantity !== undefined ? item.quantity : '-'}</td>
                                    <td className="truncate-cell" title={item.specification}>{item.specification || '-'}</td>
                                    <td className="no-print">
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
                <div className="pagination no-print">
                    <div className="pagination-info">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                    </div>
                    <div className="pagination-controls">
                        <button
                            className="pagination-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <div className="pagination-numbers">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(num => num === 1 || num === totalPages || Math.abs(num - currentPage) <= 1)
                                .map((num, i, arr) => (
                                    <React.Fragment key={num}>
                                        {i > 0 && num - arr[i - 1] > 1 && <span className="pagination-ellipsis">...</span>}
                                        <button
                                            className={`pagination-num ${currentPage === num ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(num)}
                                        >
                                            {num}
                                        </button>
                                    </React.Fragment>
                                ))}
                        </div>
                        <button
                            className="pagination-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogDirectory;

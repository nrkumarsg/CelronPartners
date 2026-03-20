import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Printer, CheckSquare, Square, Package, Search } from 'lucide-react';
import { getAllCatalogItemsForExport } from '../lib/catalogService';
import LabelPreview from '../components/LabelPreview';

const PrintLabels = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [selectedQuantities, setSelectedQuantities] = useState({}); // { itemId: quantity }
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [labelType, setLabelType] = useState('qr'); // 'qr' or 'barcode'
    const componentRef = useRef(null);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await getAllCatalogItemsForExport();
        if (!error && data) {
            setItems(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, []);


    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Catalog_Labels_${new Date().toISOString().split('T')[0]}`,
    });

    const toggleSelect = (item) => {
        const next = { ...selectedQuantities };
        if (next[item.id]) {
            delete next[item.id];
        } else {
            // Default to stock quantity (quantity) or 1 if stock is 0/missing
            next[item.id] = parseInt(item.quantity, 10) || 0;
            if (next[item.id] === 0) next[item.id] = 1;
        }
        setSelectedQuantities(next);
    };

    const handleQuantityChange = (id, val) => {
        const next = { ...selectedQuantities };
        const quantity = Math.max(0, parseInt(val, 10) || 0);
        if (quantity === 0) {
            delete next[id];
        } else {
            next[id] = quantity;
        }
        setSelectedQuantities(next);
    };

    const toggleAll = () => {
        const allFilteredIn = Object.keys(selectedQuantities).length === filteredItems.length && filteredItems.every(i => selectedQuantities[i.id]);

        if (allFilteredIn) {
            setSelectedQuantities({});
        } else {
            const next = {};
            filteredItems.forEach(i => {
                let qty = parseInt(i.quantity, 10) || 0;
                if (qty === 0) qty = 1;
                next[i.id] = selectedQuantities[i.id] || qty;
            });
            setSelectedQuantities(next);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const labelsToPrint = items.reduce((acc, item) => {
        const qty = selectedQuantities[item.id] || 0;
        for (let i = 0; i < qty; i++) {
            acc.push(item);
        }
        return acc;
    }, []);

    const totalSelectedCount = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/catalog')}
                        className="btn btn-secondary"
                        style={{ padding: '8px', minWidth: 'auto', borderRadius: '50%' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">Bulk Label Printing</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Select items to print 2" x 1" QR labels</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', marginRight: '8px' }}>
                        <button
                            className={`btn ${labelType === 'qr' ? 'btn-primary' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto', background: labelType === 'qr' ? '' : 'transparent', color: labelType === 'qr' ? '' : 'var(--text-secondary)', border: 'none' }}
                            onClick={() => setLabelType('qr')}
                        >
                            QR Code
                        </button>
                        <button
                            className={`btn ${labelType === 'barcode' ? 'btn-primary' : ''}`}
                            style={{ padding: '6px 12px', fontSize: '0.85rem', minWidth: 'auto', background: labelType === 'barcode' ? '' : 'transparent', color: labelType === 'barcode' ? '' : 'var(--text-secondary)', border: 'none' }}
                            onClick={() => setLabelType('barcode')}
                        >
                            1D Barcode
                        </button>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => handlePrint()}
                        disabled={totalSelectedCount === 0}
                    >
                        <Printer size={18} /> Print All ({totalSelectedCount})
                    </button>
                </div>
            </div>

            <div className="grid-list" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '24px', alignItems: 'start' }}>
                <div className="glass-panel">
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                        <div className="search-bar" style={{ flex: 1 }}>
                            <Search size={20} style={{ color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Filter items by name or barcode..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary" onClick={toggleAll}>
                            {Object.keys(selectedQuantities).length === filteredItems.length ? 'Deselect All' : 'Select All Filtered'}
                        </button>
                    </div>

                    <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>Item Name</th>
                                    <th>Barcode</th>
                                    <th style={{ width: '80px' }}>Stock</th>
                                    <th style={{ width: '100px' }}>Labels</th>
                                    <th>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-8">Loading items...</td></tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8">No matching items found</td></tr>
                                ) : (
                                    filteredItems.map(item => (
                                        <tr key={item.id} style={{ cursor: 'pointer' }}>
                                            <td onClick={() => toggleSelect(item)}>
                                                {selectedQuantities[item.id] ? (
                                                    <CheckSquare size={20} color="var(--accent)" />
                                                ) : (
                                                    <Square size={20} color="#cbd5e1" />
                                                )}
                                            </td>
                                            <td className="font-medium" onClick={() => toggleSelect(item)}>{item.name}</td>
                                            <td onClick={() => toggleSelect(item)}>{item.barcode || '-'}</td>
                                            <td onClick={() => toggleSelect(item)} style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.quantity || 0}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ padding: '4px 8px', width: '60px', height: '32px', borderColor: selectedQuantities[item.id] ? 'var(--accent)' : '' }}
                                                    value={selectedQuantities[item.id] || ''}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="0"
                                                    min="0"
                                                />
                                            </td>
                                            <td onClick={() => toggleSelect(item)}>{item.type}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel" style={{ position: 'sticky', top: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Print Preview</h3>
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '16px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {labelsToPrint.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                                <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <p>Select items and set quantities to see the preview</p>
                            </div>
                        ) : (
                            <div style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
                                <LabelPreview items={labelsToPrint.slice(0, 10)} labelType={labelType} />
                                {labelsToPrint.length > 10 && (
                                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                                        Previewing first 10 labels...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <p>• Sticker size: 2 x 1 inch</p>
                        <p>• Layout: 3 columns (A4/Letter sheet optimized)</p>
                        <p>• Format: {labelType === 'qr' ? 'QR Code' : '1D Barcode (Code 128)'}</p>
                    </div>
                </div>
            </div>

            {/* Hidden component for actual printing */}
            <div style={{ display: 'none' }}>
                <LabelPreview ref={componentRef} items={labelsToPrint} labelType={labelType} />
            </div>
        </div>
    );
};

export default PrintLabels;

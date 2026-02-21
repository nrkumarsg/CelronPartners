import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save,
    X,
    Trash2,
    ArrowLeft,
    Plus,
    Search as SearchIcon,
    Globe
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import {
    getCatalogItemById,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem
} from '../lib/catalogService';
import {
    getPurchaseHistoryByItemId,
    createPurchaseHistory,
    updatePurchaseHistory,
    deletePurchaseHistory
} from '../lib/purchaseHistoryService';
import { supabase } from '../lib/supabase';

const CatalogForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNewItem = id === 'new';

    const [loading, setLoading] = useState(!isNewItem);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'purchaseHistory'

    // Form State
    const [formData, setFormData] = useState({
        type: 'Supply Part',
        name: '',
        specification: '',
        quantity: '',
        stored_location: '',
        details: ''
    });

    // Purchase History State
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [partners, setPartners] = useState([]);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [editingPurchaseId, setEditingPurchaseId] = useState(null);
    const [purchaseFormData, setPurchaseFormData] = useState({
        supplier_id: '',
        last_purchase_price: '',
        purchase_date: new Date().toISOString().split('T')[0],
        details: ''
    });

    useEffect(() => {
        if (!isNewItem) {
            fetchItemData();
            fetchPurchaseHistory();
        }
        fetchPartners();
    }, [id]);

    const fetchItemData = async () => {
        setLoading(true);
        const { data, error } = await getCatalogItemById(id);
        if (!error && data) {
            setFormData({
                type: data.type || 'Supply Part',
                name: data.name || '',
                specification: data.specification || '',
                quantity: data.quantity !== null ? data.quantity : '',
                stored_location: data.stored_location || '',
                details: data.details || ''
            });
        } else {
            console.error('Failed to fetch item', error);
            // alert('Item not found or error loading data.');
            // navigate('/catalog');
        }
        setLoading(false);
    };

    const fetchPurchaseHistory = async () => {
        const { data, error } = await getPurchaseHistoryByItemId(id);
        if (!error && data) {
            setPurchaseHistory(data);
        }
    };

    const fetchPartners = async () => {
        // Assuming a generic partners table fetch here
        const { data } = await supabase.from('partners').select('id, name').order('name');
        if (data) setPartners(data);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDetailsChange = (content) => {
        setFormData(prev => ({ ...prev, details: content }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        // Convert empty string to null for quantity if needed by DB schema
        const dataToSave = {
            ...formData,
            quantity: formData.quantity === '' ? null : parseInt(formData.quantity, 10)
        };

        let result;
        if (isNewItem) {
            result = await createCatalogItem(dataToSave);
            if (!result.error && result.data) {
                navigate(`/catalog/${result.data.id}`);
            } else {
                alert('Failed to create item');
            }
        } else {
            result = await updateCatalogItem(id, dataToSave);
            if (!result.error) {
                alert('Item updated successfully');
            } else {
                alert('Failed to update item');
            }
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            setSaving(true);
            const { error } = await deleteCatalogItem(id);
            if (!error) {
                navigate('/catalog');
            } else {
                alert('Failed to delete item');
                setSaving(false);
            }
        }
    };

    const handleWebSearch = () => {
        if (!formData.name) {
            alert("Please enter a name first.");
            return;
        }
        const query = `${formData.name} ${formData.specification || ''}`.trim();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
    };

    // ----- Purchase History Handlers -----

    const handlePurchaseInputChange = (e) => {
        const { name, value } = e.target;
        setPurchaseFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePurchaseDetailsChange = (content) => {
        setPurchaseFormData(prev => ({ ...prev, details: content }));
    };

    const openNewPurchaseModal = () => {
        setPurchaseFormData({
            supplier_id: '',
            last_purchase_price: '',
            purchase_date: new Date().toISOString().split('T')[0],
            details: ''
        });
        setEditingPurchaseId(null);
        setShowPurchaseModal(true);
    };

    const openEditPurchaseModal = (purchase) => {
        setPurchaseFormData({
            supplier_id: purchase.supplier_id || '',
            last_purchase_price: purchase.last_purchase_price || '',
            purchase_date: purchase.purchase_date ? new Date(purchase.purchase_date).toISOString().split('T')[0] : '',
            details: purchase.details || ''
        });
        setEditingPurchaseId(purchase.id);
        setShowPurchaseModal(true);
    };

    const handleSavePurchase = async (e) => {
        e.preventDefault();

        const dataToSave = {
            ...purchaseFormData,
            item_id: id,
            last_purchase_price: purchaseFormData.last_purchase_price === '' ? null : parseFloat(purchaseFormData.last_purchase_price)
        };

        if (editingPurchaseId) {
            const { error } = await updatePurchaseHistory(editingPurchaseId, dataToSave);
            if (!error) {
                setShowPurchaseModal(false);
                fetchPurchaseHistory();
            } else {
                alert('Failed to update purchase history');
            }
        } else {
            const { error } = await createPurchaseHistory(dataToSave);
            if (!error) {
                setShowPurchaseModal(false);
                fetchPurchaseHistory();
            } else {
                alert('Failed to add purchase history');
            }
        }
    };

    const handleDeletePurchase = async (purchaseId) => {
        if (window.confirm('Delete this purchase record?')) {
            const { error } = await deletePurchaseHistory(purchaseId);
            if (!error) {
                fetchPurchaseHistory();
            }
        }
    };

    // -------------------------------------

    if (loading) {
        return <div className="text-center py-12">Loading item data...</div>;
    }

    // Quill Modules with image support
    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean']
        ],
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px', borderRadius: '50%' }}
                        onClick={() => navigate('/catalog')}
                        title="Back to Directory"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="page-title">
                            {isNewItem ? 'New Item' : `Editing: ${formData.name}`}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {isNewItem ? 'Add a new product or service to the catalog' : 'Update details and view purchase history'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    {!isNewItem && (
                        <button
                            className="btn btn-danger"
                            onClick={handleDelete}
                            disabled={saving}
                        >
                            <Trash2 size={18} /> Delete Form
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/catalog')}
                        disabled={saving}
                    >
                        <X size={18} /> Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                        style={{
                            padding: '12px 24px',
                            background: activeTab === 'details' ? '#ffffff' : 'transparent',
                            border: '1px solid',
                            borderColor: activeTab === 'details' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
                            borderRadius: '8px 8px 0 0',
                            fontWeight: activeTab === 'details' ? 600 : 500,
                            color: activeTab === 'details' ? 'var(--accent)' : 'var(--text-secondary)',
                            marginBottom: '-1px',
                            cursor: 'pointer'
                        }}
                        onClick={() => setActiveTab('details')}
                    >
                        Item Details
                    </button>
                    {!isNewItem && (
                        <button
                            style={{
                                padding: '12px 24px',
                                background: activeTab === 'purchaseHistory' ? '#ffffff' : 'transparent',
                                border: '1px solid',
                                borderColor: activeTab === 'purchaseHistory' ? 'var(--border-color) var(--border-color) transparent' : 'transparent',
                                borderRadius: '8px 8px 0 0',
                                fontWeight: activeTab === 'purchaseHistory' ? 600 : 500,
                                color: activeTab === 'purchaseHistory' ? 'var(--accent)' : 'var(--text-secondary)',
                                marginBottom: '-1px',
                                cursor: 'pointer'
                            }}
                            onClick={() => setActiveTab('purchaseHistory')}
                        >
                            Purchase History ({purchaseHistory.length})
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'details' && (
                <div className="glass-panel">
                    <form onSubmit={handleSave}>

                        <div className="grid-2">
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Type</label>
                                <select
                                    className="form-select"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                >
                                    <option value="Supply Part">Supply Part</option>
                                    <option value="Service">Service</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>Item Name *</label>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                        onClick={handleWebSearch}
                                        title="Search Web for this item"
                                    >
                                        <Globe size={14} /> Search Web
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g. Cummins KTA50 Fuel Injector"
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Specification</label>
                                <textarea
                                    className="form-textarea"
                                    name="specification"
                                    value={formData.specification}
                                    onChange={handleInputChange}
                                    rows="3"
                                    placeholder="Make, Model, Serial, Technical Specs..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Quantity Available</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleInputChange}
                                    placeholder="e.g. 5"
                                />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Leave empty for services.</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Stored Location</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="stored_location"
                                    value={formData.stored_location}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Warehouse A, Shelf 3"
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Additional Details & Photos</label>
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                                    <ReactQuill
                                        theme="snow"
                                        value={formData.details}
                                        onChange={handleDetailsChange}
                                        modules={quillModules}
                                        style={{ height: '300px', borderBottom: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <button type="submit" style={{ display: 'none' }}>Submit</button>
                    </form>
                </div>
            )}

            {activeTab === 'purchaseHistory' && !isNewItem && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Past Purchases</h3>
                        <button
                            className="btn btn-primary"
                            style={{ padding: '6px 16px', fontSize: '0.9rem' }}
                            onClick={openNewPurchaseModal}
                        >
                            <Plus size={16} /> Record Purchase
                        </button>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Price/pc</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
                                            No purchase history recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    purchaseHistory.map(purchase => (
                                        <tr key={purchase.id}>
                                            <td>{purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString() : '-'}</td>
                                            <td>{purchase.supplier?.name || 'Unknown Supplier'}</td>
                                            <td>{purchase.last_purchase_price ? `$${purchase.last_purchase_price}` : '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '16px' }}>
                                                    <button
                                                        style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                                        onClick={() => openEditPurchaseModal(purchase)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                                        onClick={() => handleDeletePurchase(purchase.id)}
                                                    >
                                                        Delete
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
            )}

            {/* Purchase Modal */}
            {showPurchaseModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '24px' }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                {editingPurchaseId ? 'Edit Purchase Record' : 'Add Purchase Record'}
                            </h3>
                            <button
                                onClick={() => setShowPurchaseModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            <form id="purchaseForm" onSubmit={handleSavePurchase}>
                                <div className="grid-2">
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Supplier *</label>
                                        <select
                                            className="form-select"
                                            name="supplier_id"
                                            value={purchaseFormData.supplier_id}
                                            onChange={handlePurchaseInputChange}
                                            required
                                        >
                                            <option value="">Select a supplier...</option>
                                            {partners.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Purchase Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            name="purchase_date"
                                            value={purchaseFormData.purchase_date}
                                            onChange={handlePurchaseInputChange}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Price per pc</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>$</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input"
                                                style={{ paddingLeft: '32px' }}
                                                name="last_purchase_price"
                                                value={purchaseFormData.last_purchase_price}
                                                onChange={handlePurchaseInputChange}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Purchase Details / Invoice Snippets</label>
                                        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                            <ReactQuill
                                                theme="snow"
                                                value={purchaseFormData.details}
                                                onChange={handlePurchaseDetailsChange}
                                                modules={quillModules}
                                                style={{ height: '200px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-primary)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowPurchaseModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="purchaseForm"
                                className="btn btn-primary"
                            >
                                Save Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default CatalogForm;

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
        <div className="form-container">
            <div className="form-header">
                <div className="flex items-center gap-4">
                    <button
                        className="btn btn-circular"
                        onClick={() => navigate('/catalog')}
                        title="Back to Directory"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="form-title">
                            {isNewItem ? 'New Item' : `Editing: ${formData.name}`}
                        </h1>
                        <p className="form-subtitle">
                            {isNewItem ? 'Add a new product or service to the catalog' : 'Update details and view purchase history'}
                        </p>
                    </div>
                </div>

                <div className="form-actions">
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

            <div className="tabs-container">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Item Details
                    </button>
                    {!isNewItem && (
                        <button
                            className={`tab ${activeTab === 'purchaseHistory' ? 'active' : ''}`}
                            onClick={() => setActiveTab('purchaseHistory')}
                        >
                            Purchase History ({purchaseHistory.length})
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'details' && (
                <div className="card form-card shadow-sm">
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">

                        <div className="form-group grid-col-span-2">
                            <div className="flex justify-between items-end">
                                <label className="form-label">Type</label>
                            </div>
                            <select
                                className="form-input"
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                            >
                                <option value="Supply Part">Supply Part</option>
                                <option value="Service">Service</option>
                            </select>
                        </div>

                        <div className="form-group grid-col-span-2 md:grid-cols-2">
                            <div className="flex justify-between items-end mb-1">
                                <label className="form-label mb-0">Item Name *</label>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary flex items-center gap-1"
                                    onClick={handleWebSearch}
                                    title="Search Web for this item"
                                >
                                    <Globe size={14} /> Search Web
                                </button>
                            </div>
                            <input
                                type="text"
                                className="form-input w-full"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g. Cummins KTA50 Fuel Injector"
                            />
                        </div>

                        <div className="form-group grid-col-span-2">
                            <label className="form-label">Specification</label>
                            <textarea
                                className="form-input"
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
                            <span className="text-xs text-slate-500 mt-1 block">Leave empty for services.</span>
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

                        <div className="form-group grid-col-span-2">
                            <label className="form-label">Additional Details & Photos</label>
                            <div className="quill-container border border-slate-300 rounded-md overflow-hidden pb-12 bg-white" style={{ minHeight: '300px' }}>
                                <ReactQuill
                                    theme="snow"
                                    value={formData.details}
                                    onChange={handleDetailsChange}
                                    modules={quillModules}
                                    style={{ height: '300px' }}
                                />
                            </div>
                        </div>

                        {/* Hidden submit button to allow Enter key submisison */}
                        <button type="submit" style={{ display: 'none' }}>Submit</button>
                    </form>
                </div>
            )}

            {activeTab === 'purchaseHistory' && !isNewItem && (
                <div className="card shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-slate-800">Past Purchases</h3>
                        <button
                            className="btn btn-primary btn-sm flex items-center gap-1"
                            onClick={openNewPurchaseModal}
                        >
                            <Plus size={16} /> Record Purchase
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="data-table">
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
                                        <td colSpan="4" className="text-center py-6 text-slate-500">
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
                                                <div className="flex gap-2">
                                                    <button
                                                        className="text-primary hover:text-primary-dark"
                                                        onClick={() => openEditPurchaseModal(purchase)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="text-red-500 hover:text-red-700"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
                            <h3 className="text-lg font-semibold text-slate-800">
                                {editingPurchaseId ? 'Edit Purchase Record' : 'Add Purchase Record'}
                            </h3>
                            <button
                                onClick={() => setShowPurchaseModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <form id="purchaseForm" onSubmit={handleSavePurchase} className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <div className="form-group grid-col-span-2">
                                    <label className="form-label">Supplier *</label>
                                    <select
                                        className="form-input"
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
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input pl-8"
                                            name="last_purchase_price"
                                            value={purchaseFormData.last_purchase_price}
                                            onChange={handlePurchaseInputChange}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="form-group grid-col-span-2">
                                    <label className="form-label">Purchase Details / Invoice Snippets</label>
                                    <div className="border border-slate-300 rounded-md overflow-hidden pb-12 bg-white" style={{ minHeight: '200px' }}>
                                        <ReactQuill
                                            theme="snow"
                                            value={purchaseFormData.details}
                                            onChange={handlePurchaseDetailsChange}
                                            modules={quillModules}
                                            style={{ height: '200px' }}
                                        />
                                    </div>
                                </div>

                            </form>
                        </div>

                        <div className="p-4 border-t bg-slate-50 rounded-b-lg flex justify-end gap-3 mt-auto">
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

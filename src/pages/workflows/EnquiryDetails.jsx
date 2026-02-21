import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getEnquiryById, updateEnquiry } from '../../lib/workflowService';
import { getPartners } from '../../lib/store';
import { getCatalogItems } from '../../lib/catalogService';
import DocumentManager from '../../components/workflows/DocumentManager';
import { ArrowLeft, Send, Ship, Mail, Phone, ExternalLink } from 'lucide-react';

export default function EnquiryDetails() {
    const { id } = useParams();
    const { profile } = useAuth();
    const [enquiry, setEnquiry] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form lookups
    const [suppliers, setSuppliers] = useState([]);
    const [catalog, setCatalog] = useState([]);

    // State to handle Float Quotations
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);

    useEffect(() => {
        if (profile?.company_id && id) {
            fetchDetails();
            fetchLookups();
        }
    }, [id, profile]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await getEnquiryById(profile.company_id, id);
            if (error) throw error;
            if (data) {
                setEnquiry(data);
                if (data.catalog_items) setSelectedItems(data.catalog_items);
            }
        } catch (error) {
            console.error('Error fetching enquiry details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLookups = async () => {
        try {
            const [suppliersData, catalogRes] = await Promise.all([
                getPartners(), // ideally filter by type: 'Supplier' but for demo we show all
                getCatalogItems(1, 100, {}, '')
            ]);

            // Filter only valid suppliers
            if (suppliersData) {
                const supps = suppliersData.filter(p => Array.isArray(p.types) && p.types.includes('Supplier'));
                setSuppliers(supps);
            }
            if (catalogRes.data) setCatalog(catalogRes.data);
        } catch {
            console.error("Failed to load lookups");
        }
    };

    const handleAddItem = (e) => {
        const item = catalog.find(c => c.id === e.target.value);
        if (item && !selectedItems.some(i => i.id === item.id)) {
            const updated = [...selectedItems, item];
            setSelectedItems(updated);
            updateEnquiry(id, { catalog_items: updated });
            setEnquiry({ ...enquiry, catalog_items: updated });
        }
    };

    const handleRemoveItem = (itemId) => {
        const updated = selectedItems.filter(i => i.id !== itemId);
        setSelectedItems(updated);
        updateEnquiry(id, { catalog_items: updated });
        setEnquiry({ ...enquiry, catalog_items: updated });
    };

    const handleToggleSupplier = (supplier) => {
        if (selectedSuppliers.some(s => s.id === supplier.id)) {
            setSelectedSuppliers(selectedSuppliers.filter(s => s.id !== supplier.id));
        } else {
            setSelectedSuppliers([...selectedSuppliers, supplier]);
        }
    };

    const handleFloatQuotation = () => {
        if (selectedSuppliers.length === 0) return alert("Select at least one supplier.");
        if (selectedItems.length === 0) return alert("Add at least one item from the catalog.");

        // Create the email template using Mailto
        const emails = selectedSuppliers.map(s => s.email1).filter(e => e).join(',');
        const subject = encodeURIComponent(`Request for Quotation: ${enquiry?.enquiry_no} - CELRON ENTERPRISES`);

        let itemRows = selectedItems.map((item, idx) => `${idx + 1}. ${item.name} (${item.specification || 'N/A'}) - QTY: __ `).join('\n');

        const body = encodeURIComponent(`Dear Supplier,\n\nWe are pleased to invite you to quote for the following items:\n\n${itemRows}\n\nPlease revert with your best price and lead time.\n\nThank you,\nCELRON ENTERPRISES PTE LTD`);

        window.open(`mailto:?bcc=${emails}&subject=${subject}&body=${body}`, '_blank');

        alert("Quotation Requests Floated! Awaiting responses.");
    };

    if (loading) return <div className="loading-state">Loading details...</div>;
    if (!enquiry) return <div className="page-container"><h2>Enquiry Not Found</h2></div>;

    return (
        <div className="page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <Link to="/workflows" className="btn btn-sm btn-outline" style={{ display: 'inline-flex', marginBottom: '16px', gap: '8px' }}>
                        <ArrowLeft size={16} /> Back to Board
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '12px' }}>
                            <Ship size={24} />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ color: '#60a5fa', margin: 0 }}>{enquiry.enquiry_no}</h1>
                            <p className="page-description" style={{ margin: 0, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{enquiry.type} Order</span>
                                • Source: {enquiry.source} • Status: <span style={{ color: '#f59e0b' }}>{enquiry.status}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left Column: Requirements & Suppliers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Catalog Items Required */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Required Items (Catalog)</h3>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <select className="form-control" onChange={handleAddItem} value="">
                                <option value="" disabled>-- Select items from Catalog to add --</option>
                                {catalog.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedItems.length === 0 ? <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>No items added yet</p> :
                                selectedItems.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Spec: {item.specification || 'N/A'}</div>
                                        </div>
                                        <button className="btn btn-sm btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleRemoveItem(item.id)}>Remove</button>
                                    </div>
                                ))
                            }
                        </div>
                    </div>

                    {/* Supplier Float Quotation Engine */}
                    <div className="card" style={{ borderColor: '#60a5fa' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title" style={{ color: '#60a5fa' }}>Float Quotation</h3>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
                            Select potential suppliers below to send a unified BCC email quoting the items above.
                        </p>

                        <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '12px' }}>
                            {suppliers.map(sup => (
                                <label key={sup.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedSuppliers.some(s => s.id === sup.id)}
                                        onChange={() => handleToggleSupplier(sup)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{sup.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Mail size={12} /> {sup.email1 || 'No email provided'}
                                            <span style={{ margin: '0 4px' }}>|</span>
                                            {sup.country || 'Unknown Location'}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={handleFloatQuotation} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6' }}>
                                <Send size={18} /> Send Quotation Requests  ({selectedSuppliers.length} suppliers)
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Column: Customer Details & Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel">
                        <h3 className="form-section-title" style={{ border: 'none', padding: 0, margin: '0 0 16px 0', fontSize: '1.05rem', color: '#fff' }}>Customer Info</h3>
                        {enquiry.partners ? (
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', color: '#e2e8f0' }}>{enquiry.partners.name}</h4>
                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {enquiry.contacts && <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> Contact: {enquiry.contacts.name}</span>}
                                    <Link to={`/partners/${enquiry.partner_id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', textDecoration: 'none', marginTop: '8px' }}>
                                        <ExternalLink size={14} /> View Partner Profile
                                    </Link>
                                </div>
                            </div>
                        ) : <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No customer linked.</span>}
                    </div>

                    {/* WhatsApp Wall / Document Manager imported as component */}
                    <DocumentManager referenceType="Enquiry" referenceId={id} />

                </div>
            </div>
        </div>
    );
}


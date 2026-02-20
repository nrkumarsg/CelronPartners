import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVesselsStore } from '../lib/vesselsStore';
import { ArrowLeft, Save, Trash2, Search, Ship } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function VesselForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const { vessels, fetchVessels, addVessel, updateVessel, deleteVessel } = useVesselsStore();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        vessel_name: '',
        imo_number: '',
        vessel_type: '',
        vessel_management: '',
        vessel_owner: '',
        other_details: ''
    });

    useEffect(() => {
        // Ensure store has data
        if (vessels.length === 0 && id && !isNew) {
            fetchVessels();
        }
    }, [id, isNew, fetchVessels, vessels.length]);

    useEffect(() => {
        if (id && !isNew) {
            const existingVessel = vessels.find(v => v.id === id);
            if (existingVessel) {
                setFormData(existingVessel);
            }
        }
    }, [id, isNew, vessels]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuillChange = (value) => {
        setFormData(prev => ({ ...prev, other_details: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        let result;
        const payload = { ...formData };
        if (payload.id === '' || !payload.id) {
            delete payload.id;
        }

        if (id && !isNew) {
            result = await updateVessel(id, payload);
        } else {
            result = await addVessel(payload);
        }

        if (result?.success) {
            navigate('/vessels');
        } else {
            alert('Error saving vessel:\n' + JSON.stringify(result?.error || 'Unknown Error further up'));
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this vessel? This action cannot be undone.')) {
            setLoading(true);
            const result = await deleteVessel(id);
            if (result?.success) {
                navigate('/vessels');
            } else {
                alert('Error deleting vessel.');
                setLoading(false);
            }
        }
    };

    const handleGoogleSearch = () => {
        if (!formData.vessel_name && !formData.imo_number) {
            alert("Please provide a Vessel Name or IMO Number to search.");
            return;
        }
        const query = `${formData.vessel_name || ''} ${formData.imo_number || ''}`.trim();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/vessels')}
                        style={{ marginBottom: '16px' }}
                    >
                        <ArrowLeft size={18} />
                        Back to Directory
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                            <Ship size={24} />
                        </div>
                        <h2 className="page-title">{id && !isNew ? 'Edit Vessel' : 'New Vessel Entry'}</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={handleGoogleSearch}
                        title="Search Vessel Name + IMO on Google"
                        disabled={!formData.vessel_name && !formData.imo_number}
                    >
                        <Search size={18} />
                        Vessel Search
                    </button>
                    {id && !isNew && (
                        <button
                            className="btn btn-danger"
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            <Trash2 size={18} />
                            Delete
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading || !formData.vessel_name}
                    >
                        <Save size={18} />
                        Save Entry
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        Vessel Information
                    </h3>

                    <div className="form-group">
                        <label className="form-label">Vessel Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            name="vessel_name"
                            value={formData.vessel_name}
                            onChange={handleChange}
                            placeholder="Enter vessel name"
                            required
                        />
                    </div>

                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">IMO Number</label>
                            <input
                                type="text"
                                className="form-input"
                                name="imo_number"
                                value={formData.imo_number}
                                onChange={handleChange}
                                placeholder="e.g. 9123456"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Vessel Type</label>
                            <input
                                type="text"
                                className="form-input"
                                name="vessel_type"
                                value={formData.vessel_type}
                                onChange={handleChange}
                                placeholder="e.g. Bulk Carrier, Tanker"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Vessel Management</label>
                            <input
                                type="text"
                                className="form-input"
                                name="vessel_management"
                                value={formData.vessel_management}
                                onChange={handleChange}
                                placeholder="Management company details"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Vessel Owner</label>
                            <input
                                type="text"
                                className="form-input"
                                name="vessel_owner"
                                value={formData.vessel_owner}
                                onChange={handleChange}
                                placeholder="Owner details"
                            />
                        </div>
                    </div>
                </div>

                <div className="glass-panel">
                    <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                        Other Details
                    </h3>
                    <div className="form-group">
                        <ReactQuill
                            theme="snow"
                            value={formData.other_details}
                            onChange={handleQuillChange}
                            style={{ height: '250px', marginBottom: '40px' }}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}

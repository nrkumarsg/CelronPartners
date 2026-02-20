import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkLocationsStore } from '../lib/workLocationsStore';
import { ArrowLeft, Save, Trash2, Search, MapPin } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function WorkLocationForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const { workLocations, fetchWorkLocations, addWorkLocation, updateWorkLocation, deleteWorkLocation } = useWorkLocationsStore();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        location_name: '',
        pincode: '',
        other_details: ''
    });

    useEffect(() => {
        if (workLocations.length === 0 && id && !isNew) {
            fetchWorkLocations();
        }
    }, [id, isNew, fetchWorkLocations, workLocations.length]);

    useEffect(() => {
        if (id && !isNew) {
            const existingLoc = workLocations.find(l => l.id === id);
            if (existingLoc) {
                setFormData(existingLoc);
            }
        }
    }, [id, isNew, workLocations]);

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

        const payload = { ...formData };
        if (payload.id === '' || !payload.id) {
            delete payload.id;
        }

        let result;
        if (id && !isNew) {
            result = await updateWorkLocation(id, payload);
        } else {
            result = await addWorkLocation(payload);
        }

        if (result?.success) {
            navigate('/work-locations');
        } else {
            alert('Error saving location:\n' + JSON.stringify(result?.error || 'Unknown Error'));
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this work location? This action cannot be undone.')) {
            setLoading(true);
            const result = await deleteWorkLocation(id);
            if (result?.success) {
                navigate('/work-locations');
            } else {
                alert('Error deleting location.');
                setLoading(false);
            }
        }
    };

    const handleGoogleSearch = () => {
        if (!formData.location_name && !formData.pincode) {
            alert("Please provide a Location Name or Pincode to search.");
            return;
        }
        const query = `${formData.location_name || ''} ${formData.pincode || ''}`.trim();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
    };

    // Construct Map Embed URL dynamically based on current form input
    const constructMapUrl = () => {
        const query = `${formData.location_name || ''} ${formData.pincode || ''}`.trim();
        if (!query) return null;
        return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
    };

    const mapUrl = constructMapUrl();

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/work-locations')}
                        style={{ marginBottom: '16px' }}
                    >
                        <ArrowLeft size={18} />
                        Back to Directory
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px' }}>
                            <MapPin size={24} />
                        </div>
                        <h2 className="page-title">{id && !isNew ? 'Edit Location' : 'New Work Location'}</h2>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={handleGoogleSearch}
                        title="Search Location + Pincode on Google"
                        disabled={!formData.location_name && !formData.pincode}
                    >
                        <Search size={18} />
                        Google Location Search
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
                        disabled={loading || !formData.location_name}
                    >
                        <Save size={18} />
                        Save Entry
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
                <div className="glass-panel form-section" style={{ gridColumn: '1 / -1' }}>
                    <h3 className="form-section-title">Core Location Data</h3>
                    <div className="form-grid">
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Location Name (City / Branch) *</label>
                            <input
                                type="text"
                                name="location_name"
                                value={formData.location_name}
                                onChange={handleChange}
                                placeholder="Enter location name"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Pincode / Zip Code</label>
                            <input
                                type="text"
                                name="pincode"
                                value={formData.pincode}
                                onChange={handleChange}
                                placeholder="e.g. 10001"
                            />
                        </div>
                    </div>
                </div>

                {/* Google Map Viewer */}
                <div className="glass-panel form-section" style={{ gridColumn: '1 / -1', padding: '24px' }}>
                    <h3 className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={18} color="#eab308" /> Location Viewer
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        The map will dynamically update based on the Location Name and Pincode entered above.
                    </p>
                    <div style={{ width: '100%', height: '350px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {mapUrl ? (
                            <iframe
                                title="Google Maps Location View"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                scrolling="no"
                                marginHeight="0"
                                marginWidth="0"
                                src={mapUrl}
                                style={{ border: 0 }}
                            ></iframe>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                                <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <div>Type a Location Name or Pincode<br />to generate map view</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="glass-panel form-section" style={{ gridColumn: '1 / -1' }}>
                    <h3 className="form-section-title">Other Details</h3>
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

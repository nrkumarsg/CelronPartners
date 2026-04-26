import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVesselsStore } from '../lib/vesselsStore';
import { uploadFile } from '../lib/store';
import { ArrowLeft, Save, Trash2, Search, Ship, Globe, Sparkles, Loader2, Check, RotateCcw, X, Info } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useAuth } from '../contexts/AuthContext';
import { researchVesselWithGemini } from '../lib/geminiService';
import { runUniversalSearch } from '../lib/universalFinder';
import { supabase } from '../lib/supabase';

export default function VesselForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const quillRef = useRef(null);
    const { vessels, fetchVessels, addVessel, updateVessel, deleteVessel } = useVesselsStore();

    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        vessel_name: '',
        imo_number: '',
        mmsi: '',
        vessel_type: '',
        vessel_management: '',
        vessel_owner: '',
        other_details: '',
        is_shared: false
    });

    const [isAiResearching, setIsAiResearching] = useState(false);
    const [aiPreview, setAiPreview] = useState(null);

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
            if (isNew) {
                navigate(`/vessel-tracking/${result.data.id}`);
            } else {
                navigate('/vessels');
            }
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

    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();
        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                try {
                    const url = await uploadFile('company_assets', `vessels/content/${id || 'temp'}`, file, { maxWidth: 1024 });
                    const quill = quillRef.current.getEditor();
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', url);
                } catch (error) {
                    console.error('Image upload failed:', error);
                }
            }
        };
    };

    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    };

    const handleAiResearch = async () => {
        if (!formData.vessel_name && !formData.imo_number && !formData.mmsi) {
            return alert('Please enter at least one field (Name, IMO, or MMSI) to research.');
        }

        setIsAiResearching(true);
        try {
            // 1. Gather live context using Universal Search
            let searchContext = '';
            try {
                const query = `${formData.vessel_name || ''} ${formData.imo_number || ''} ${formData.mmsi || ''}`.trim();
                const searchId = await runUniversalSearch({ 
                    query: `${query} vessel details`, 
                    userId: profile?.id || '00000000-0000-0000-0000-000000000000' 
                });
                
                const { data: results } = await supabase
                    .from('search_results')
                    .select('title, snippet, url')
                    .eq('search_id', searchId)
                    .limit(5);
                
                if (results && results.length > 0) {
                    searchContext = results.map(r => `[Maritime Data] ${r.title} (${r.url}): ${r.snippet}`).join('\n');
                }
            } catch (searchErr) {
                console.warn('[AI] Live search unavailable, using model intelligence only.');
            }

            // 2. Perform AI Research
            const result = await researchVesselWithGemini(
                formData.vessel_name, 
                formData.imo_number, 
                formData.mmsi, 
                searchContext
            );

            if (result) {
                setAiPreview(result);
            }
        } catch (err) {
            console.error('AI Research Error:', err);
            alert(`Error researching vessel: ${err.message}`);
        } finally {
            setIsAiResearching(false);
        }
    };

    const applyAiResults = () => {
        if (!aiPreview) return;
        setFormData(prev => ({
            ...prev,
            vessel_name: aiPreview.fields.vessel_name || prev.vessel_name,
            imo_number: aiPreview.fields.imo_number || prev.imo_number,
            mmsi: aiPreview.fields.mmsi || prev.mmsi,
            vessel_type: aiPreview.fields.vessel_type || prev.vessel_type,
            vessel_management: aiPreview.fields.vessel_management || prev.vessel_management,
            vessel_owner: aiPreview.fields.vessel_owner || prev.vessel_owner
        }));
        setAiPreview(null);
    };

    const handleReset = () => {
        if (window.confirm('Reset all fields to empty?')) {
            setFormData({
                vessel_name: '',
                imo_number: '',
                mmsi: '',
                vessel_type: '',
                vessel_management: '',
                vessel_owner: '',
                other_details: '',
                is_shared: false
            });
            setAiPreview(null);
        }
    };

    const handleGoogleSearch = () => {
        const { vessel_name, imo_number, mmsi } = formData;
        if (!vessel_name && !imo_number && !mmsi) {
            alert("Please provide a Vessel Name, IMO, or MMSI to search.");
            return;
        }
        const query = `${vessel_name || ''} ${imo_number || ''} ${mmsi || ''}`.trim();
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " vessel details")}`;
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
                        {profile?.role === 'superadmin' && (
                            <div style={{ marginLeft: '12px' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                                    <Globe size={14} /> GLOBAL
                                    <input 
                                        type="checkbox" 
                                        checked={formData.is_shared}
                                        onChange={e => setFormData(prev => ({ ...prev, is_shared: e.target.checked }))}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleReset}
                        title="Clear all fields"
                    >
                        <RotateCcw size={18} />
                        Reset
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleGoogleSearch}
                        title="Search Vessel Name + IMO + MMSI on Google"
                    >
                        <Search size={18} />
                        Web Search
                    </button>
                    {id && !isNew && (
                        <button
                            type="button"
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

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                
                {/* AI Research Banner */}
                <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiPreview ? '24px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ position: 'relative', width: '48px', height: '48px', background: 'var(--ai-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' }}>
                                <Sparkles size={24} />
                                {isAiResearching && <div className="ai-pulse" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '16px' }} />}
                            </div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4338ca', letterSpacing: '-0.02em' }}>Intelligent Vessel Research</div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Find IMO, MMSI, and Management data automatically</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleAiResearch}
                            disabled={isAiResearching || (!formData.vessel_name && !formData.imo_number && !formData.mmsi)}
                            className="btn"
                            style={{
                                background: isAiResearching ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '14px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: isAiResearching ? 'none' : '0 10px 20px rgba(99, 102, 241, 0.2)'
                            }}
                        >
                            {isAiResearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                            {isAiResearching ? 'Searching...' : 'Research with AI'}
                        </button>
                    </div>

                    {aiPreview && (
                        <div className="ai-card-premium animate-fade-in" style={{ padding: '28px', borderRadius: '20px', border: '1px solid #bae6fd', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderRadius: '24px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Research Results
                                    </div>
                                    <div style={{ padding: '6px 14px', background: aiPreview.confidence === 'high' ? '#dcfce7' : '#fef3c7', color: aiPreview.confidence === 'high' ? '#15803d' : '#92400e', borderRadius: '24px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {aiPreview.confidence} Confidence
                                    </div>
                                </div>
                                <button type="button" onClick={() => setAiPreview(null)} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', fontSize: '0.9rem', marginBottom: '28px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Vessel Name</div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{aiPreview.fields.vessel_name || '-'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>IMO Number</div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{aiPreview.fields.imo_number || '-'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>MMSI</div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{aiPreview.fields.mmsi || '-'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Vessel Type</div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{aiPreview.fields.vessel_type || '-'}</div>
                                </div>
                                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Management / Owner</div>
                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{aiPreview.fields.vessel_management || aiPreview.fields.vessel_owner || 'Unknown'}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button type="button" onClick={applyAiResults} className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981', height: '48px', borderRadius: '14px', fontSize: '1rem', fontWeight: 700 }}><Check size={20} /> Apply These Details</button>
                                <button type="button" onClick={() => setAiPreview(null)} className="btn btn-secondary" style={{ height: '48px', borderRadius: '14px', padding: '0 24px' }}><RotateCcw size={20} /> Reject</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-panel" style={{ borderRadius: '24px', padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#eef2ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Info size={20} color="#6366f1" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>Vessel Information</h3>
                    </div>

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
                            <label className="form-label">MMSI Number</label>
                            <input
                                type="text"
                                className="form-input"
                                name="mmsi"
                                value={formData.mmsi}
                                onChange={handleChange}
                                placeholder="e.g. 314658000"
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
                            ref={quillRef}
                            theme="snow"
                            value={formData.other_details}
                            onChange={handleQuillChange}
                            modules={modules}
                            style={{ height: '250px', marginBottom: '40px' }}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
}

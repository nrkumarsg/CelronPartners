import React, { useState } from 'react';
import { Ship, User, Users, MapPin, X, Save, Globe, Mail, Phone, Map, ExternalLink, Plus, Sparkles, Loader2, ChevronDown, Paperclip, FileCheck, Calculator, FileText, Search, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePartner } from '../../lib/store';
import { saveJobExpense } from '../../lib/jobExpenseService';
import BusinessCardUpload from '../common/BusinessCardUpload';
import { COUNTRIES, PARTNER_CATEGORIES } from '../../lib/constants';
import { smartSearchCompany, researchContactWithGemini, researchVesselWithGemini } from '../../lib/geminiService';
import { runUniversalSearch } from '../../lib/universalFinder';

// Generic Modal Base
export const Modal = ({ isOpen, onClose, title, children, icon: Icon }) => {
    if (!isOpen) return null;
    return (
        <div className="quick-modal-overlay">
            <div className="quick-modal-content">
                <div className="quick-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {Icon && <Icon size={20} className="text-accent" />}
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{title}</h3>
                    </div>
                    <button className="icon-btn-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="quick-modal-body">
                    {children}
                </div>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .quick-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    backdrop-filter: blur(4px);
                    padding: 20px;
                }
                .quick-modal-content {
                    background: #fff;
                    width: 100%;
                    max-width: 700px;
                    max-height: 90vh;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    animation: modal-slide-up 0.3s ease-out;
                }
                @keyframes modal-slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .quick-modal-header {
                    padding: 16px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #fff;
                    z-index: 10;
                }
                .quick-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }
                .icon-btn-close {
                    background: transparent;
                    border: none;
                    color: #64748b;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 6px;
                }
                .icon-btn-close:hover { background: #f1f5f9; color: #1e293b; }
                .text-accent { color: #6366f1; }
                .quick-form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                    padding-top: 16px;
                    border-top: 1px solid #e2e8f0;
                    background: #fff;
                }
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .full-width {
                    grid-column: 1 / -1;
                }
                .ai-pulse {
                    animation: ai-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes ai-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}} />
        </div>
    );
};

// Quick Partner Add
export const QuickPartnerAdd = ({ company_id, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        uen: '',
        types: ['Customer'],
        address: '',
        country: '',
        email1: '',
        phone1: '',
        weblink: '',
        customerCredit: '',
        supplierCredit: '',
        customerCreditTime: '',
        supplierCreditTime: '',
        city: '',
        pincode: '',
        brand: '',
        activity_summary: '',
        notes: '',
        business_card_url: '',
        business_card_back_url: ''
    });
    const [customCategory, setCustomCategory] = useState('');
    const [isAiResearching, setIsAiResearching] = useState(false);
    const [aiPreview, setAiPreview] = useState(null);

    const handleAiAutofill = async () => {
        if (!formData.name) return alert('Please enter a Company Name first.');
        
        setIsAiResearching(true);
        try {
            // 1. Gather live context using Google Custom Search (Separate quota, more reliable for free tier)
            let searchContext = '';
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const searchId = await runUniversalSearch({ 
                    query: formData.name, 
                    userId: user?.id || '00000000-0000-0000-0000-000000000000' 
                });
                
                const { data: results } = await supabase
                    .from('search_results')
                    .select('title, snippet, url')
                    .eq('search_id', searchId)
                    .limit(5);
                
                if (results && results.length > 0) {
                    searchContext = results.map(r => `[Web Data] ${r.title} (${r.url}): ${r.snippet}`).join('\n');
                }
            } catch (searchErr) {
                console.warn('[AI] Live search unavailable, using model intelligence only.');
            }

            // 2. Use the new Smart Search with the gathered context
            console.log('[AI Research] Company:', formData.name);
            console.log('[AI Research] Search Context Length:', searchContext?.length || 0);
            
            const result = await smartSearchCompany(formData.name, formData.weblink, searchContext);

            if (result) {
                setAiPreview({
                    uen: result.uen || '',
                    address: result.address || '',
                    country: result.country || '',
                    city: result.city || '',
                    pincode: result.postal_code || '',
                    email1: result.email || '',
                    phone1: result.phone || '',
                    website: result.website || '',
                    categories: result.categories || [],
                    brands: result.brands || '',
                    activity_summary: result.activity_summary || '',
                    confidence: result.confidence || 'low',
                    manual_verification_required: result.manual_verification_required,
                    extraInfo: `Categories: ${result.categories?.join(', ') || 'N/A'}. Brands: ${result.brands || 'N/A'}. Activity: ${result.activity_summary || 'N/A'}`
                });
            }
        } catch (err) {
            console.error('AI Research Error:', err);
            setAiPreview({
                error: err.message || 'Unknown Research Error',
                confidence: 'none',
                manual_verification_required: true
            });
        } finally {
            setIsAiResearching(false);
        }
    };

    const applyAiResults = () => {
        if (!aiPreview) return;
        setFormData(prev => ({
            ...prev,
            uen: aiPreview.uen || prev.uen,
            address: aiPreview.address || prev.address,
            country: aiPreview.country || prev.country,
            city: aiPreview.city || prev.city,
            pincode: aiPreview.pincode || prev.pincode,
            email1: aiPreview.email1 || prev.email1,
            phone1: aiPreview.phone1 || prev.phone1,
            weblink: aiPreview.website || prev.weblink,
            brand: aiPreview.brands || prev.brand,
            activity_summary: aiPreview.activity_summary || prev.activity_summary,
            notes: aiPreview.activity_summary ? `${prev.notes || ''}\n\n--- AI ACTIVITY SUMMARY ---\n${aiPreview.activity_summary}` : (prev.notes || '')
        }));
        setAiPreview(null);
    };

    const handleCategoryToggle = (cat) => {
        setFormData(prev => ({
            ...prev,
            types: prev.types.includes(cat)
                ? prev.types.filter(t => t !== cat)
                : [...prev.types, cat]
        }));
    };

    const handleAddCustomCategory = () => {
        if (customCategory.trim() && !formData.types.includes(customCategory.trim())) {
            setFormData(prev => ({
                ...prev,
                types: [...prev.types, customCategory.trim()]
            }));
            setCustomCategory('');
        }
    };
    const openWebsite = () => {
        const url = formData.weblink;
        if (url) {
            const path = url.startsWith('http') ? url : `https://${url}`;
            window.open(path, '_blank');
        } else {
            window.open('https://www.google.com', '_blank');
        }
    };

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Name is required');
        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                company_id
            };
            const { data, error } = await supabase.from('partners').insert([dataToSave]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert(`Failed to save partner: ${err.message || 'Check connection.'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #6366f1, #10b981)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>
                    <Users size={20} />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif", margin: 0 }}>Add New Customer</h2>
            </div>

            {/* AI Research Section */}
            <div className="glass-panel" style={{ marginBottom: '24px', padding: '16px', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative' }}>
                            <Sparkles size={18} color="#6366f1" />
                            {isAiResearching && <div className="ai-pulse" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '50%' }} />}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4338ca', letterSpacing: '0.02em' }}>Intelligent Auto-fill</span>
                    </div>
                    <button
                        onClick={handleAiAutofill}
                        disabled={isAiResearching || !formData.name}
                        className="btn"
                        style={{
                            background: isAiResearching ? '#f1f5f9' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: isAiResearching ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        {isAiResearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                        {isAiResearching ? 'Agent Researching...' : 'Research with AI'}
                    </button>
                </div>

                {/* AI Research Findings Card */}
                {(aiPreview || isAiResearching) && (
                    <div className="ai-card-premium animate-fade-in" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                        {isAiResearching && <div className="ai-scanning-line" />}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '4px 10px', background: aiPreview?.error ? '#fee2e2' : 'rgba(16, 185, 129, 0.1)', color: aiPreview?.error ? '#ef4444' : '#059669', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {aiPreview?.error ? 'Failure' : 'Research Findings'}
                                </div>
                                {aiPreview && !aiPreview.error && !isAiResearching && (
                                    <div style={{ padding: '4px 10px', background: aiPreview.confidence === 'high' ? '#dcfce7' : '#fef3c7', color: aiPreview.confidence === 'high' ? '#15803d' : '#92400e', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {aiPreview.confidence} Confidence
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setAiPreview(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                        </div>

                        {isAiResearching ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>Antigravity Research Agent is traversing data...</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Identifying UEN, Address, and authorized brands.</div>
                            </div>
                        ) : aiPreview?.error ? (
                            <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem' }}>
                                <strong>Research Loop Terminated:</strong><br/>
                                {aiPreview.error}
                                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#b91c1c' }}>
                                    Check your Google Cloud credentials or quota.
                                </div>
                            </div>
                        ) : aiPreview && (
                            <div style={{ fontSize: '0.85rem', color: '#334155', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>UEN:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{aiPreview.uen || '-'}</span></div>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Pincode:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{aiPreview.pincode || '-'}</span></div>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Email:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{aiPreview.email1 || '-'}</span></div>
                                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Phone:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{aiPreview.phone1 || '-'}</span></div>
                                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Website:</strong> <span style={{ color: '#4338ca', fontWeight: 600, textDecoration: 'underline' }}>{aiPreview.weblink || '-'}</span></div>
                                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Address:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{aiPreview.address || '-'}</span></div>
                                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Brands Represented:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{aiPreview.brands || '-'}</span></div>
                                
                                {aiPreview.activity_summary && (
                                    <div style={{ gridColumn: 'span 2', background: 'linear-gradient(to right, #f5f3ff, #ede9fe)', padding: '14px', borderRadius: '12px', border: '1px dashed #c7d2fe' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', marginBottom: '4px' }}>Business Activity Insight</div>
                                        <span style={{ fontSize: '0.85rem', color: '#4338ca', fontStyle: 'italic', lineHeight: 1.6 }}>"{aiPreview.activity_summary}"</span>
                                    </div>
                                )}

                                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px', marginTop: '4px' }}>
                                    <button onClick={applyAiResults} className="btn" style={{ flex: 1, background: '#10b981', color: 'white', fontWeight: 600 }}><Check size={16} /> Apply Results to Form</button>
                                    <button onClick={() => setAiPreview(null)} className="btn" style={{ background: '#f1f5f9', color: '#64748b' }}><RotateCcw size={16} /> Reject</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#ffffff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <Globe size={24} color="#6366f1" />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.02em' }}>Company Website</div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="premium-input"
                                value={formData.weblink}
                                onChange={(e) => setFormData({ ...formData, weblink: e.target.value })}
                                placeholder="https://company.com"
                                style={{ width: '100%', padding: '10px 14px', paddingRight: '60px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                            />
                            {formData.weblink && (
                                <a href={formData.weblink} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    Visit <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Company Name *</label>
                    <input
                        type="text"
                        className="premium-input"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter full legal name"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>UEN / Registration No</label>
                    <input
                        type="text"
                        className="premium-input"
                        name="uen"
                        value={formData.uen}
                        onChange={handleChange}
                        placeholder="e.g. 201436227C"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Email *</label>
                    <input
                        type="email"
                        className="premium-input"
                        name="email1"
                        value={formData.email1}
                        onChange={handleChange}
                        placeholder="sales@company.com"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Phone</label>
                    <input
                        type="text"
                        className="premium-input"
                        name="phone1"
                        value={formData.phone1}
                        onChange={handleChange}
                        placeholder="+65 6297 1011"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Country *</label>
                    <select
                        className="premium-input"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                        required
                    >
                        <option value="">Select Country</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="United Arab Emirates">UAE</option>
                        <option value="United Kingdom">UK</option>
                        <option value="United States">USA</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>City</label>
                    <input
                        type="text"
                        className="premium-input"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="City name"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>Pincode / Postal Code</label>
                    <input
                        type="text"
                        className="premium-input"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        placeholder="6-digit code"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>HQ Address</label>
                    <textarea
                        className="premium-input"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Full primary address"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', height: '80px', resize: 'vertical' }}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Partner', 'Spare Parts', 'Service', 'Calibration', 'Automation', 'Electrical', 'Mechanical', 'Instrumentation', 'Safety Equipment', 'Industrial Supplies', 'Supplier', 'Customer', 'Freelancer', 'Service Company'].map(cat => (
                        <div
                            key={cat}
                            className={`category-chip ${formData.types.includes(cat) ? 'active' : ''}`}
                            onClick={() => handleCategoryToggle(cat)}
                        >
                            {cat}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>Company Services / Activity</label>
                    <textarea
                        className="premium-input"
                        name="activity_summary"
                        value={formData.activity_summary}
                        onChange={handleChange}
                        placeholder="Describe services provided by the company"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', height: '100px', resize: 'vertical' }}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>Dealing Brands</label>
                    <textarea
                        className="premium-input"
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        placeholder="List brands represented or handled"
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', height: '80px', resize: 'vertical' }}
                    />
                </div>
            </div>

            {/* Conditional Credit Sections */}
            {(formData.types.includes('Customer') || formData.types.includes('Supplier')) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    {formData.types.includes('Customer') && (
                        <>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4338ca' }}>Customer Credit Limit</label>
                                <input className="premium-input" name="customerCredit" value={formData.customerCredit} onChange={handleChange} placeholder="e.g. 5000" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4338ca' }}>Customer Credit Term (Days)</label>
                                <input className="premium-input" name="customerCreditTime" value={formData.customerCreditTime} onChange={handleChange} placeholder="e.g. 30" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                        </>
                    )}
                    {formData.types.includes('Supplier') && (
                        <>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>Supplier Credit Limit</label>
                                <input className="premium-input" name="supplierCredit" value={formData.supplierCredit} onChange={handleChange} placeholder="e.g. 10000" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>Supplier Credit Term (Days)</label>
                                <input className="premium-input" name="supplierCreditTime" value={formData.supplierCreditTime} onChange={handleChange} placeholder="e.g. 60" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                        </>
                    )}
                </div>
            )}

            <div style={{ marginBottom: '24px', padding: '20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <BusinessCardUpload
                    frontValue={formData.business_card_url}
                    backValue={formData.business_card_back_url}
                    onFrontChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                    onBackChange={(url) => setFormData(prev => ({ ...prev, business_card_back_url: url }))}
                    label="Business Card Scan"
                />
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, height: '48px', borderRadius: '14px', fontSize: '1rem', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }}
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Create Customer Profile'}
                </button>
                <button
                    onClick={onCancel}
                    className="btn"
                    style={{ height: '48px', width: '48px', borderRadius: '14px', background: '#f1f5f9', color: '#64748b', padding: 0, border: 'none' }}
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export const QuickContactAdd = ({ company_id, partner_id, partners, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        partnerId: partner_id || '',
        post: '',
        phone: '',
        handphone: '',
        address: '',
        business_card_url: '',
        business_card_back_url: ''
    });
    const [loading, setLoading] = useState(false);
    const [isAiResearching, setIsAiResearching] = useState(false);

    const handleAiAutofill = async () => {
        if (!formData.name) return alert('Please enter a Contact Name first.');
        
        setIsAiResearching(true);
        try {
            let researchData;
            try {
                const partner = partners.find(p => p.id === formData.partnerId);
                researchData = await researchContactWithGemini(formData.name, partner?.name);
            } catch (geminiErr) {
                console.warn('Gemini Contact Research failed, falling back to edge function...', geminiErr);
                const { data, error } = await supabase.functions.invoke('research-contact', {
                    body: { name: formData.name, partnerId: formData.partnerId }
                });
                if (error) throw error;
                researchData = data;
            }

            if (researchData) {
                setFormData(prev => ({
                    ...prev,
                    ...researchData.fields
                }));
            }
        } catch (err) {
            console.error('AI Research Error:', err);
            alert('AI Research failed. Please fill manually or check contact name.');
        } finally {
            setIsAiResearching(false);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.name || !formData.partnerId) return alert('Name and Partner are required');
        setLoading(true);
        try {
            const { data, error } = await supabase.from('contacts').insert([{
                ...formData,
                company_id
            }]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert('Failed to save contact');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* AI Research Banner */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px 20px', 
                background: 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%)', 
                borderRadius: '12px',
                border: '1px solid #bae6fd'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={18} className={isAiResearching ? 'ai-pulse text-accent' : 'text-accent'} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0369a1' }}>
                        {isAiResearching ? 'AI is profiling contact...' : 'Contact Intelligence'}
                    </span>
                </div>
                <button 
                    type="button" 
                    onClick={handleAiAutofill}
                    disabled={isAiResearching || !formData.name}
                    style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        background: '#fff', 
                        border: '1px solid #bae6fd', 
                        color: '#0ea5e9', 
                        fontSize: '0.85rem', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    {isAiResearching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Profile with AI
                </button>
            </div>

            <div className="grid-2">
                <div className="form-item full-width">
                    <label>Customer / Partner *</label>
                    <select
                        className="form-select"
                        name="partnerId"
                        value={formData.partnerId}
                        onChange={handleChange}
                    >
                        <option value="">Select Partner...</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="form-item">
                    <label>Contact Name *</label>
                    <input
                        className="form-input"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. John Doe"
                        autoFocus
                    />
                </div>

                <div className="form-item">
                    <label>Post / Designation</label>
                    <input
                        className="form-input"
                        name="post"
                        value={formData.post}
                        onChange={handleChange}
                        placeholder="e.g. Purchasing Manager"
                    />
                </div>

                <div className="form-item">
                    <label><Mail size={14} /> Email Address</label>
                    <input
                        className="form-input"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                    />
                </div>

                <div className="form-item">
                    <label><Phone size={14} /> Office Phone</label>
                    <input
                        className="form-input"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+65 ...."
                    />
                </div>

                <div className="form-item">
                    <label><Phone size={14} /> Handphone / Mobile</label>
                    <input
                        className="form-input"
                        name="handphone"
                        value={formData.handphone}
                        onChange={handleChange}
                        placeholder="+65 ...."
                    />
                </div>

                <div className="form-item full-width">
                    <label>Contact Address (if different)</label>
                    <textarea
                        className="form-textarea"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter specific address if any..."
                        rows={2}
                    />
                </div>
            </div>

            <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px' }}>
                <BusinessCardUpload
                    frontValue={formData.business_card_url}
                    backValue={formData.business_card_back_url}
                    onFrontChange={(url) => setFormData(prev => ({ ...prev, business_card_url: url }))}
                    onBackChange={(url) => setFormData(prev => ({ ...prev, business_card_back_url: url }))}
                    label="Contact Business Card"
                />
            </div>

            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !formData.name || !formData.partnerId}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Contact'}
                </button>
            </div>
        </div>
    );
};

export const QuickVesselAdd = ({ company_id, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        vessel_name: '',
        imo_number: '',
        mmsi: '',
        vessel_type: '',
        vessel_management: '',
        vessel_owner: ''
    });
    const [loading, setLoading] = useState(false);
    const [isAiResearching, setIsAiResearching] = useState(false);

    const handleAiAutofill = async () => {
        if (!formData.vessel_name) return alert('Please enter a Vessel Name first.');
        
        setIsAiResearching(true);
        try {
            let researchData;
            try {
                researchData = await researchVesselWithGemini(formData.vessel_name);
            } catch (geminiErr) {
                console.warn('Gemini Vessel Research failed, falling back to edge function...', geminiErr);
                const { data, error } = await supabase.functions.invoke('research-vessel', {
                    body: { vesselName: formData.vessel_name }
                });
                if (error) throw error;
                researchData = data;
            }

            if (researchData) {
                setFormData(prev => ({
                    ...prev,
                    ...researchData.fields
                }));
            }
        } catch (err) {
            console.error('AI Research Error:', err);
            alert('AI Research failed. Please fill manually or check vessel name.');
        } finally {
            setIsAiResearching(false);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.vessel_name) return alert('Vessel Name is required');
        setLoading(true);
        try {
            const { data, error } = await supabase.from('vessels').insert([{
                ...formData,
                company_id
            }]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert('Failed to save vessel');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* AI Research Banner */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px 20px', 
                background: 'linear-gradient(90deg, #f0fdf4 0%, #dcfce7 100%)', 
                borderRadius: '12px',
                border: '1px solid #bbf7d0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={18} className={isAiResearching ? 'ai-pulse text-accent' : 'text-accent'} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#15803d' }}>
                        {isAiResearching ? 'AI is sourcing maritime data...' : 'Vessel Intelligence'}
                    </span>
                </div>
                <button 
                    type="button" 
                    onClick={handleAiAutofill}
                    disabled={isAiResearching || !formData.vessel_name}
                    style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        background: '#fff', 
                        border: '1px solid #bbf7d0', 
                        color: '#16a34a', 
                        fontSize: '0.85rem', 
                        fontWeight: 600, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    {isAiResearching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Source with AI
                </button>
            </div>

            <div className="form-item">
                <label>Vessel Name *</label>
                <input
                    className="form-input"
                    name="vessel_name"
                    value={formData.vessel_name}
                    onChange={handleChange}
                    placeholder="e.g. MS Galaxy"
                    autoFocus
                />
            </div>
            <div className="grid-2">
                <div className="form-item">
                    <label>IMO Number</label>
                    <input
                        className="form-input"
                        name="imo_number"
                        value={formData.imo_number}
                        onChange={handleChange}
                        placeholder="e.g. 9123456"
                    />
                </div>
                <div className="form-item">
                    <label>MMSI Number</label>
                    <input
                        className="form-input"
                        name="mmsi"
                        value={formData.mmsi}
                        onChange={handleChange}
                        placeholder="e.g. 314658000"
                    />
                </div>
            </div>
            <div className="form-item">
                <label>Vessel Type</label>
                <input
                    className="form-input"
                    name="vessel_type"
                    value={formData.vessel_type}
                    onChange={handleChange}
                    placeholder="e.g. Bulk Carrier"
                />
            </div>
            <div className="grid-2">
                <div className="form-item">
                    <label>Management</label>
                    <input
                        className="form-input"
                        name="vessel_management"
                        value={formData.vessel_management}
                        onChange={handleChange}
                        placeholder="Management Co."
                    />
                </div>
                <div className="form-item">
                    <label>Owner</label>
                    <input
                        className="form-input"
                        name="vessel_owner"
                        value={formData.vessel_owner}
                        onChange={handleChange}
                        placeholder="Owner Co."
                    />
                </div>
            </div>
            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !formData.vessel_name}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Vessel'}
                </button>
            </div>
        </div>
    );
};

export const QuickLocationAdd = ({ company_id, onSuccess, onCancel }) => {
    const [locationName, setLocationName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!locationName) return alert('Location Name is required');
        setLoading(true);
        try {
            const { data, error } = await supabase.from('work_locations').insert([{
                location_name: locationName,
                company_id
            }]).select();
            if (error) throw error;
            onSuccess(data[0]);
        } catch (err) {
            console.error(err);
            alert('Failed to save location');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="form-item">
                <label>Location Name *</label>
                <input
                    className="form-input"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="e.g. Port of Singapore"
                    autoFocus
                />
            </div>
            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !locationName}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Location'}
                </button>
            </div>
        </div>
    );
};

// Quick Expense Add
export const QuickExpenseAdd = ({ job_id, partners, expense, onSuccess, onCancel, onUploadBill }) => {
    const [formData, setFormData] = useState(expense || {
        job_id,
        supplier_id: '',
        invoice_no: '',
        invoice_date: new Date().toISOString().split('T')[0],
        description: '',
        unit_price: 0,
        quantity: 1,
        gst_rate: 9,
        gst_amount: 0,
        grand_total: 0,
        category: 'Material'
    });
    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Initial supplier name if editing
    React.useEffect(() => {
        if (expense?.supplier_id) {
            const s = partners.find(p => p.id === expense.supplier_id);
            if (s) setSupplierSearch(s.name);
        }
    }, [expense, partners]);

    const suppliers = partners.filter(p => 
        (p.types && p.types.includes('Supplier')) || 
        (p.category === 'Supplier') ||
        (p.name && p.name.toLowerCase().includes('supplier'))
    );

    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const handleSelectSupplier = (s) => {
        setFormData(prev => ({ ...prev, supplier_id: s.id }));
        setSupplierSearch(s.name);
        setShowSupplierDropdown(false);
    };

    const calculateTotals = (updated) => {
        const up = parseFloat(updated.unit_price) || 0;
        const qty = parseFloat(updated.quantity) || 0;
        const sub = up * qty;
        const rate = parseFloat(updated.gst_rate) || 0;
        const gst = sub * (rate / 100);
        return {
            ...updated,
            total_before_tax: sub,
            gst_amount: gst,
            grand_total: sub + gst
        };
    };

    const handleChange = (field, value) => {
        let updated = { ...formData, [field]: value };
        if (['unit_price', 'quantity', 'gst_rate'].includes(field)) {
            updated = calculateTotals(updated);
        }
        setFormData(updated);
    };

    const handleSave = async () => {
        if (!formData.supplier_id) return alert('Please select a supplier');
        if (!formData.description) return alert('Description is required');
        
        setLoading(true);
        try {
            const { data, error } = await saveJobExpense(formData);
            if (error) throw error;
            onSuccess(data);
        } catch (err) {
            console.error(err);
            alert('Failed to save expense: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await onUploadBill(file);
            if (url) {
                setFormData(prev => ({ ...prev, bill_url: url }));
            }
        } catch (err) {
            console.error('Bill upload failed:', err);
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="grid-2">
                <div className="form-item full-width" style={{ position: 'relative' }}>
                    <label>Supplier *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                className="form-input"
                                placeholder="Search supplier from database..."
                                value={supplierSearch}
                                onChange={(e) => {
                                    setSupplierSearch(e.target.value);
                                    setShowSupplierDropdown(true);
                                }}
                                onFocus={() => setShowSupplierDropdown(true)}
                                style={{ paddingRight: '32px' }}
                            />
                            {showSupplierDropdown && (
                                <div className="dropdown-content" style={{ 
                                    display: 'block', 
                                    width: '100%', 
                                    top: '100%', 
                                    position: 'absolute',
                                    zIndex: 100,
                                    background: '#fff',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    borderRadius: '8px',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    {filteredSuppliers.length > 0 ? filteredSuppliers.map(s => (
                                        <button 
                                            key={s.id} 
                                            type="button"
                                            onClick={() => handleSelectSupplier(s)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                textAlign: 'left',
                                                background: 'none',
                                                border: 'none',
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                            onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.target.style.background = 'none'}
                                        >
                                            {s.name}
                                        </button>
                                    )) : (
                                        <div style={{ padding: '12px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
                                            No suppliers matching "{supplierSearch}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-item">
                    <label>Invoice / Reference No</label>
                    <input 
                        className="form-input" 
                        value={formData.invoice_no} 
                        onChange={(e) => handleChange('invoice_no', e.target.value)} 
                        placeholder="e.g. INV-2024-001" 
                    />
                </div>
                <div className="form-item">
                    <label>Invoice Date</label>
                    <input 
                        className="form-input" 
                        type="date" 
                        value={formData.invoice_date} 
                        onChange={(e) => handleChange('invoice_date', e.target.value)} 
                    />
                </div>

                <div className="form-item full-width">
                    <label>Expense Description *</label>
                    <textarea 
                        className="form-textarea" 
                        value={formData.description} 
                        onChange={(e) => handleChange('description', e.target.value)} 
                        placeholder="Describe the material, service, or cost item..." 
                        rows={2} 
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                </div>

                <div className="form-item">
                    <label>Unit Price</label>
                    <input 
                        className="form-input" 
                        type="number" 
                        value={formData.unit_price} 
                        onChange={(e) => handleChange('unit_price', e.target.value)} 
                    />
                </div>
                <div className="form-item">
                    <label>Quantity / Units</label>
                    <input 
                        className="form-input" 
                        type="number" 
                        value={formData.quantity} 
                        onChange={(e) => handleChange('quantity', e.target.value)} 
                    />
                </div>

                <div className="form-item">
                    <label>GST Rate (%)</label>
                    <input 
                        className="form-input" 
                        type="number" 
                        value={formData.gst_rate} 
                        onChange={(e) => handleChange('gst_rate', e.target.value)} 
                    />
                </div>
                <div className="form-item">
                    <label>GST Amount</label>
                    <input 
                        className="form-input" 
                        type="number" 
                        value={parseFloat(formData.gst_amount).toFixed(2)} 
                        readOnly 
                        style={{ background: '#f8fafc', fontWeight: 600 }} 
                    />
                </div>
            </div>

            <div style={{ 
                padding: '24px', 
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Final Grand Total</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem', color: '#94a3b8' }}>SGD</span>
                        {formData.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <label className={`btn ${formData.bill_url ? 'btn-secondary' : 'btn-primary'}`} style={{ cursor: 'pointer', padding: '10px 20px', gap: '10px' }}>
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : (formData.bill_url ? <RefreshCw size={18} /> : <Upload size={18} />)}
                        {formData.bill_url ? 'Update Bill' : 'Upload Bill'}
                        <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                    </label>
                    {formData.bill_url && (
                        <a 
                            href={formData.bill_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ 
                                fontSize: '0.75rem', 
                                color: '#10b981', 
                                fontWeight: 700, 
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <FileCheck size={14} /> View Attached Bill
                        </a>
                    )}
                </div>
            </div>

            <div className="quick-form-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Discard Changes</button>
                <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSave} 
                    disabled={loading || !formData.supplier_id || !formData.description}
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', border: 'none' }}
                >
                    <Save size={18} /> {loading ? 'Saving Expense...' : (expense ? 'Update Expense Record' : 'Save Expense Record')}
                </button>
            </div>
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { Ship, User, Users, MapPin, X, Save, Globe, Mail, Phone, Map, ExternalLink, Plus, Sparkles, Loader2, RefreshCw, Upload, ChevronDown, Paperclip, FileCheck, Calculator, FileText, Search, Check, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { savePartner } from '../../lib/store';
import { saveJobExpense } from '../../lib/jobExpenseService';
import BusinessCardUpload from '../common/BusinessCardUpload';
import { COUNTRIES, PARTNER_CATEGORIES } from '../../lib/constants';
import { smartSearchCompany, researchContactWithGemini, researchVesselWithGemini, parseOCRBusinessCard } from '../../lib/geminiService';
import { runUniversalSearch } from '../../lib/universalFinder';
import { parseSupplierBillWithAi } from '../../lib/BillOcrService';
import RichTextEditor from '../common/RichTextEditor';
import CompanyAutocomplete from '../common/CompanyAutocomplete';
import PartnerDocuments from '../partners/PartnerDocuments';
import SmartOCRModal from '../common/SmartOCRModal';
import DriveScannerLinker from '../workflows/DriveScannerLinker';


// Generic Modal Base
export const Modal = ({ isOpen, onClose, title, children, icon: Icon, size = 'md' }) => {
    if (!isOpen) return null;
    const maxWidth = size === 'xl' ? '1300px' : size === 'lg' ? '1000px' : '700px';

    return (
        <div className="quick-modal-overlay">
            <div className="quick-modal-content" style={{ maxWidth }}>
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
export const QuickPartnerAdd = ({ company_id, initialData, onSuccess, onCancel, hideActions = false, onDataChange, title: propTitle, defaultType = 'Supplier' }) => {
    const [formData, setFormData] = useState(initialData || {
        name: '',
        uen: '',
        types: [defaultType],
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
    const [showOCRModal, setShowOCRModal] = useState(false);
    const [aiPreview, setAiPreview] = useState(null);
    const [aiStatus, setAiStatus] = useState('');
    const [isMapsResearching, setIsMapsResearching] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleCompanySelect = (place) => {
        const address = place.formatted_address || '';
        const name = place.name || '';
        const weblink = place.website || '';
        const phone = place.formatted_phone_number || '';

        let country = '';
        let city = '';
        let pincode = '';
        place.address_components?.forEach(c => {
            if (c.types.includes('country')) country = c.long_name;
            if (c.types.includes('locality')) city = c.long_name;
            if (c.types.includes('postal_code')) pincode = c.long_name;
        });

        const updated = {
            ...formData,
            name,
            address: address || formData.address,
            city: city || formData.city,
            pincode: pincode || formData.pincode,
            country: country || formData.country,
            weblink: weblink || formData.weblink,
            phone1: phone || formData.phone1
        };
        setFormData(updated);
        if (onDataChange) onDataChange(updated);
    };

    const handleGoogleMapsResearch = async () => {
        if (!formData.name) return alert('Please enter a Company Name first.');
        
        setIsMapsResearching(true);
        setAiStatus('🛰️ Connecting to Google Maps...');
        
        // Timeout handling
        const timeoutId = setTimeout(() => {
            if (isMapsResearching) {
                setIsMapsResearching(false);
                setAiStatus('');
                alert('Google Maps research timed out. Please try again or check your connection.');
            }
        }, 15000);

        try {
            if (!window.google || !window.google.maps || !window.google.maps.places) {
                throw new Error('Google Maps SDK not loaded');
            }

            const service = new window.google.maps.places.PlacesService(document.createElement('div'));
            
            service.findPlaceFromQuery({
                query: formData.name,
                fields: ['name', 'formatted_address', 'place_id', 'website', 'formatted_phone_number', 'address_components', 'types']
            }, (results, status) => {
                clearTimeout(timeoutId);
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                    setAiStatus('📍 Retrieving location intelligence...');
                    service.getDetails({ 
                        placeId: results[0].place_id, 
                        fields: ['name', 'formatted_address', 'website', 'formatted_phone_number', 'address_components', 'types'] 
                    }, async (place, detailsStatus) => {
                        if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK) {
                            const mapsData = {
                                uen: '',
                                address: place.formatted_address || '',
                                phone1: place.formatted_phone_number || '',
                                website: place.website || '',
                                country: '',
                                city: '',
                                pincode: ''
                            };

                            place.address_components?.forEach(c => {
                                if (c.types.includes('country')) mapsData.country = c.long_name;
                                if (c.types.includes('locality')) mapsData.city = c.long_name;
                                if (c.types.includes('postal_code')) mapsData.pincode = c.long_name;
                            });

                            const previewData = {
                                ...mapsData,
                                categories: place.types || [],
                                brands: '',
                                activity_summary: `Found via Google Maps: ${place.name}`,
                                confidence: 95,
                                manual_verification_required: false,
                                source: 'Google Maps (Verified Location)'
                            };

                            setAiPreview(previewData);
                            
                            setFormData(prev => ({
                                ...prev,
                                address: mapsData.address || prev.address,
                                phone1: mapsData.phone1 || prev.phone1,
                                weblink: mapsData.website || prev.weblink,
                                country: mapsData.country || prev.country,
                                city: mapsData.city || prev.city,
                                pincode: mapsData.pincode || prev.pincode
                            }));

                            if (place.website || formData.name) {
                                setAiStatus('🤖 AI background enrichment for UEN & Brands...');
                                smartSearchCompany(formData.name, place.website, `Verified Website: ${place.website}`)
                                    .then(aiResult => {
                                        if (aiResult && aiResult.uen) {
                                            setAiPreview(prev => ({
                                                ...prev,
                                                uen: aiResult.uen || prev.uen,
                                                brands: aiResult.brands || prev.brands,
                                                activity_summary: aiResult.activity_summary || prev.activity_summary,
                                                email1: aiResult.email || prev.email1,
                                                confidence: 100,
                                                source: 'Google Maps + AI Intelligence'
                                            }));
                                        }
                                        setIsMapsResearching(false);
                                        setAiStatus('');
                                    })
                                    .catch(aiErr => {
                                        console.warn('Background AI enrichment failed:', aiErr);
                                        setIsMapsResearching(false);
                                        setAiStatus('');
                                    });
                            } else {
                                setIsMapsResearching(false);
                                setAiStatus('');
                            }
                        } else {
                            alert('No details found for this company on Google Maps.');
                            setIsMapsResearching(false);
                            setAiStatus('');
                        }
                    });
                } else {
                    alert('Company not found on Google Maps.');
                    setIsMapsResearching(false);
                    setAiStatus('');
                }
            });
        } catch (err) {
            clearTimeout(timeoutId);
            console.error('Maps Research Error:', err);
            alert(`Maps Research failed: ${err.message}`);
            setIsMapsResearching(false);
            setAiStatus('');
        }
    };


    const handleOCR = async (text) => {
        if (!text) return;
        setIsAiResearching(true);
        try {
            const result = await parseOCRBusinessCard(text);
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || result.company_name || '',
                    email1: prev.email1 || result.email || '',
                    phone1: prev.phone1 || result.phone || '',
                    weblink: prev.weblink || result.website || '',
                    address: prev.address || result.address || '',
                    activity_summary: prev.activity_summary || result.services || '',
                    brand: prev.brand || result.brands || '',
                    notes: (prev.notes || '') + `\n\n--- OCR EXTRACTED TEXT ---\n${text}`
                }));
            }
        } catch (err) {
            console.error('OCR Parsing failed', err);
        } finally {
            setIsAiResearching(false);
        }
    };

    const handleAiAutofill = async () => {
        if (!formData.name) return alert('Please enter a Company Name first.');
        
        setIsAiResearching(true);
        setAiStatus('🔍 Deep web search for UEN & Registries...');
        try {
            // 1. Gather live context with better queries
            const queries = [
                formData.name,
                `${formData.name} Singapore UEN`,
                `${formData.name} official website contact`
            ];
            
            let searchContext = '';
            try {
                const { data: { user } } = await supabase.auth.getUser();
                // Perform multiple searches or at least one very good one
                const searchId = await runUniversalSearch({ 
                    query: queries[1], // Focus on UEN search
                    userId: user?.id || '00000000-0000-0000-0000-000000000000',
                    skipAi: true
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
                console.warn('[AI] Live search unavailable.');
            }

            setAiStatus('📊 Extracting company intelligence...');
            
            // 2. Use the new Smart Search with the gathered context
            const result = await smartSearchCompany(formData.name, formData.weblink, searchContext);

            if (result.confidence < 50 || !result.uen) {
                setAiStatus('🛡️ Low confidence detected. Attempting Google Maps fallback...');
                // Automatically try Google Maps if AI is uncertain
                try {
                    const service = new window.google.maps.places.PlacesService(document.createElement('div'));
                    service.findPlaceFromQuery({
                        query: formData.name,
                        fields: ['name', 'formatted_address', 'place_id', 'website', 'formatted_phone_number', 'address_components', 'types']
                    }, (results, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
                            service.getDetails({ 
                                placeId: results[0].place_id, 
                                fields: ['name', 'formatted_address', 'website', 'formatted_phone_number', 'address_components', 'types'] 
                            }, (place, detailsStatus) => {
                                if (detailsStatus === window.google.maps.places.PlacesServiceStatus.OK) {
                                    // Merge AI result with Maps result
                                    const merged = {
                                        ...result,
                                        address: result.address || place.formatted_address || '',
                                        phone: result.phone || place.formatted_phone_number || '',
                                        website: result.website || place.website || '',
                                        source: 'AI + Google Maps'
                                    };
                                    
                                    // Fill in address components from Maps if missing
                                    place.address_components?.forEach(c => {
                                        if (c.types.includes('country') && !merged.country) merged.country = c.long_name;
                                        if (c.types.includes('locality') && !merged.postal_code) merged.city = c.long_name;
                                        if (c.types.includes('postal_code') && !merged.postal_code) merged.postal_code = c.long_name;
                                    });

                                    setAiPreview({
                                        uen: merged.uen || '',
                                        address: merged.address || '',
                                        country: merged.country || '',
                                        city: merged.city || '',
                                        pincode: merged.postal_code || '',
                                        email1: merged.email || '',
                                        phone1: merged.phone || '',
                                        website: merged.website || '',
                                        categories: merged.categories || [],
                                        brands: merged.brands || '',
                                        activity_summary: merged.activity_summary || `Verified via Google Maps: ${place.name}`,
                                        confidence: Math.max(merged.confidence, 85),
                                        manual_verification_required: merged.manual_verification_required,
                                        source: merged.source
                                    });
                                }
                            });
                        }
                    });
                } catch (mapsErr) {
                    console.warn('Maps fallback failed:', mapsErr);
                }
            }

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
                    confidence: result.confidence,
                    manual_verification_required: result.manual_verification_required,
                    extraInfo: `Categories: ${result.categories?.join(', ') || 'N/A'}. Brands: ${result.brands || 'N/A'}.`
                });
            }
        } catch (err) {
            console.error('AI Research Error:', err);
            setAiPreview({
                error: err.message || 'Unknown Research Error',
                confidence: 0,
                manual_verification_required: true
            });
        } finally {
            setIsAiResearching(false);
            setAiStatus('');
        }
    };

    const applyAiResults = () => {
        if (!aiPreview) return;
        const updated = {
            ...formData,
            uen: aiPreview.uen || formData.uen,
            address: aiPreview.address || formData.address,
            country: aiPreview.country || formData.country,
            city: aiPreview.city || formData.city,
            pincode: aiPreview.pincode || formData.pincode,
            email1: aiPreview.email1 || formData.email1,
            phone1: aiPreview.phone1 || formData.phone1,
            weblink: aiPreview.website || formData.weblink,
            brand: aiPreview.brands || formData.brand,
            activity_summary: aiPreview.activity_summary || formData.activity_summary,
            notes: aiPreview.activity_summary ? `${formData.notes || ''}\n\n--- AI ACTIVITY SUMMARY ---\n${aiPreview.activity_summary}` : (formData.notes || '')
        };
        setFormData(updated);
        if (onDataChange) onDataChange(updated);
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
        const updated = { ...formData, [name]: value };
        setFormData(updated);
        if (onDataChange) onDataChange(updated);
    };

    const handleSave = async () => {
        if (!formData.name) return alert('Name is required');
        setLoading(true);
        try {
            const isExisting = !!formData.id;
            const dataToSave = {
                ...formData,
                company_id
            };
            // Sanitize payload to remove joined columns that don't belong to the 'partners' table
            delete dataToSave.contacts;

            const { data, error } = isExisting 
                ? await supabase.from('partners').update(dataToSave).eq('id', formData.id).select()
                : await supabase.from('partners').insert([dataToSave]).select();
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif", margin: 0 }}>{propTitle || (initialData ? 'Edit Customer Details' : 'Add New Customer')}</h2>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleAiAutofill}
                            disabled={isAiResearching || isMapsResearching || !formData.name}
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
                            {isAiResearching ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            {isAiResearching ? 'AI Researching...' : 'Research with AI'}
                        </button>
                        <button
                            onClick={handleGoogleMapsResearch}
                            disabled={isAiResearching || isMapsResearching || !formData.name}
                            className="btn"
                            style={{
                                background: isMapsResearching ? '#f1f5f9' : '#fff',
                                color: '#1e293b',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {isMapsResearching ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} color="#ef4444" />}
                            {isMapsResearching ? 'Mapping...' : 'Search Google Maps'}
                        </button>
                    </div>
                </div>

                {/* AI Research Findings Card */}
                {(aiPreview || isAiResearching) && (
                    <div className="ai-card-premium animate-fade-in" style={{ padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                        {isAiResearching && <div className="ai-scanning-line" />}
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '4px 10px', background: aiPreview?.error ? '#fee2e2' : 'rgba(16, 185, 129, 0.1)', color: aiPreview?.error ? '#ef4444' : '#059669', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {aiPreview?.error ? 'Failure' : (aiPreview?.source || 'Research Findings')}
                                </div>
                                {aiPreview && !aiPreview.error && !isAiResearching && (
                                    <div style={{ 
                                        padding: '4px 10px', 
                                        background: aiPreview.confidence > 80 ? '#dcfce7' : aiPreview.confidence > 50 ? '#fef3c7' : '#fee2e2', 
                                        color: aiPreview.confidence > 80 ? '#15803d' : aiPreview.confidence > 50 ? '#92400e' : '#ef4444', 
                                        borderRadius: '20px', 
                                        fontSize: '0.7rem', 
                                        fontWeight: 800, 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.05em' 
                                    }}>
                                        {aiPreview.confidence}% Confidence
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setAiPreview(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={16} /></button>
                        </div>

                        {isAiResearching ? (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <div style={{ fontSize: '1rem', color: '#6366f1', fontWeight: 700, marginBottom: '8px' }}>{aiStatus}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Traversing SGP registries and global industrial data...</div>
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
                                <div style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}><strong>Website:</strong> <span style={{ color: '#4338ca', fontWeight: 600, textDecoration: 'underline' }}>{aiPreview.website || '-'}</span></div>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', margin: 0 }}>Company Name *</label>
                        {formData.name && (
                            <a 
                                href={`https://www.google.com/search?q=${encodeURIComponent(formData.name)}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                Search <Search size={12} />
                            </a>
                        )}
                    </div>
                    <CompanyAutocomplete
                        value={formData.name}
                        onChange={(val) => {
                            const updated = { ...formData, name: val };
                            setFormData(updated);
                            if (onDataChange) onDataChange(updated);
                        }}
                        onSelect={handleCompanySelect}
                        placeholder="Enter company name..."
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

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b' }}>HQ Address</label>
                    <textarea
                        className="premium-input"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Full primary address"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', height: '60px', resize: 'vertical' }}
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
                        {COUNTRIES.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
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
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleChange}
                        placeholder="6-digit code"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none' }}
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

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.02em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Company Website</span>
                        <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent(formData.weblink || formData.name || '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: '#6366f1', textTransform: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            Search <Search size={12} />
                        </a>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="premium-input"
                            value={formData.weblink}
                            onChange={(e) => {
                                const updated = { ...formData, weblink: e.target.value };
                                setFormData(updated);
                                if (onDataChange) onDataChange(updated);
                            }}
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

            <div style={{ marginBottom: '32px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '12px' }}>Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Principal', 'International Supplier', 'Local Supplier', 'Freelancer', 'Service Company', 'Spare Parts', 'Service', 'Calibration', 'Automation', 'Electrical', 'Mechanical', 'Instrumentation', 'Safety Equipment', 'Industrial Supplies', 'Supplier', 'Customer'].map(cat => (
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
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4338ca' }}>Customer Credit Limit (SGD)</label>
                                <input className="premium-input" name="customerCredit" value={formData.customerCredit} onChange={handleChange} placeholder="e.g. 5000" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4338ca' }}>Customer Credit Terms (Days)</label>
                                <input className="premium-input" name="customerCreditTime" type="number" value={formData.customerCreditTime} onChange={handleChange} placeholder="e.g. 30" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                        </>
                    )}
                    {formData.types.includes('Supplier') && (
                        <>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>Supplier Credit Limit (SGD)</label>
                                <input className="premium-input" name="supplierCredit" value={formData.supplierCredit} onChange={handleChange} placeholder="e.g. 10000" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669' }}>Supplier Credit Terms (Days)</label>
                                <input className="premium-input" name="supplierCreditTime" type="number" value={formData.supplierCreditTime} onChange={handleChange} placeholder="e.g. 60" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #e2e8f0' }} />
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
                    onOCR={handleOCR}
                    onSmartOCR={() => setShowOCRModal(true)}
                    label="Business Card Scan (Auto-fills Form)"
                />
                
                <SmartOCRModal 
                    isOpen={showOCRModal}
                    onClose={() => setShowOCRModal(false)}
                    onApply={(res) => {
                        if (res.structured) {
                            setFormData(prev => ({
                                ...prev,
                                name: prev.name || res.structured.company_name || '',
                                uen: prev.uen || res.structured.uen || '',
                                email1: prev.email1 || res.structured.email || '',
                                phone1: prev.phone1 || res.structured.phone || res.structured.mobile || '',
                                address: prev.address || res.structured.address || '',
                                weblink: prev.weblink || res.structured.website || '',
                                notes: (prev.notes || '') + '\n\n' + (res.rawText || '')
                            }));
                        } else if (res.rawText) {
                            handleOCR(res.rawText);
                        }
                    }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>Notes & Business Profile</label>
                <RichTextEditor 
                    value={formData.notes || ''} 
                    onChange={(val) => setFormData(prev => ({ ...prev, notes: val }))} 
                    placeholder="Enter additional profile details, research notes, etc..."
                    height="150px"
                />
            </div>

            {!hideActions && (
                <div style={{ display: 'flex', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ flex: 1, height: '48px', borderRadius: '14px', fontSize: '1rem', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }}
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (initialData ? `Update ${defaultType} Profile` : `Create ${defaultType} Profile`)}
                    </button>
                    <button
                        onClick={onCancel}
                        className="btn"
                        style={{ height: '48px', width: '48px', borderRadius: '14px', background: '#f1f5f9', color: '#64748b', padding: 0, border: 'none' }}
                    >
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export const QuickContactAdd = ({ company_id, partner_id, partners, initialData, onSuccess, onCancel, hideActions = false, onDataChange }) => {
    const [formData, setFormData] = useState(initialData || {
        name: '',
        email: '',
        partnerId: partner_id || '',
        post: '',
        phone: '',
        handphone: '',
        address: '',
        business_card_url: '',
        business_card_back_url: '',
        department: ''
    });
    const [loading, setLoading] = useState(false);
    const [isAiResearching, setIsAiResearching] = useState(false);
    const [showOCRModal, setShowOCRModal] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleOCR = async (text) => {
        if (!text) return;
        setIsAiResearching(true);
        try {
            const result = await parseOCRBusinessCard(text);
            if (result) {
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || result.person_name || '',
                    email: prev.email || result.email || '',
                    handphone: prev.handphone || result.mobile || result.phone || '',
                    post: prev.post || result.designation || '',
                    department: prev.department || result.department || '',
                    address: prev.address || result.address || ''
                }));
            }
        } catch (err) {
            console.error('OCR Parsing failed', err);
        } finally {
            setIsAiResearching(false);
        }
    };

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
        const updated = { ...formData, [name]: value };
        setFormData(updated);
        if (onDataChange) onDataChange(updated);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.partnerId) return alert('Name and Partner are required');
        setLoading(true);
        try {
            const isExisting = !!formData.id;
            const { data, error } = isExisting
                ? await supabase.from('contacts').update({ ...formData }).eq('id', formData.id).select()
                : await supabase.from('contacts').insert([{ ...formData, company_id }]).select();
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
                    <label>Department</label>
                    <input
                        className="form-input"
                        name="department"
                        value={formData.department || ''}
                        onChange={handleChange}
                        placeholder="e.g. Sales, Technical"
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
                    onOCR={handleOCR}
                    onSmartOCR={() => setShowOCRModal(true)}
                    label="Contact Business Card (Auto-fills Fields)"
                />

                <SmartOCRModal 
                    isOpen={showOCRModal}
                    onClose={() => setShowOCRModal(false)}
                    title="Smart Contact OCR"
                    onApply={(res) => {
                        if (res.structured) {
                            setFormData(prev => ({
                                ...prev,
                                name: prev.name || res.structured.person_name || '',
                                email: prev.email || res.structured.email || '',
                                handphone: prev.handphone || res.structured.mobile || res.structured.phone || '',
                                post: prev.post || res.structured.designation || '',
                                department: prev.department || res.structured.department || '',
                                address: prev.address || res.structured.address || ''
                            }));
                        } else if (res.rawText) {
                            handleOCR(res.rawText);
                        }
                    }}
                />
            </div>

            {!hideActions && (
                <div className="quick-form-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={loading || !formData.name || !formData.partnerId}>
                        <Save size={18} /> {loading ? 'Saving...' : 'Save Contact'}
                    </button>
                </div>
            )}
        </div>
    );
};

// NEW: Combined Partner & Contact Dual Add
export const QuickPartnerContactDualAdd = ({ company_id, initialPartner, initialContact, partners, onSuccess, onCancel, title, defaultType = 'Supplier' }) => {
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'documents'
    const [partnerData, setPartnerData] = useState(initialPartner || {
        name: '',
        uen: '',
        types: ['Supplier'],
        address: '',
        country: '',
        email1: '',
        phone1: '',
        weblink: '',
        city: '',
        pincode: '',
        brand: '',
        activity_summary: '',
        notes: '',
        business_card_url: '',
        business_card_back_url: ''
    });
    const [contactData, setContactData] = useState(initialContact || {
        name: '', email: '', handphone: '', type: 'Main', department: '', post: ''
    });
    const [loading, setLoading] = useState(false);
    const [existingContacts, setExistingContacts] = useState([]);

    useEffect(() => {
        if (initialPartner) setPartnerData(initialPartner);
    }, [initialPartner]);

    useEffect(() => {
        if (initialContact) setContactData(initialContact);
    }, [initialContact]);

    useEffect(() => {
        if (!partnerData.name) {
            setExistingContacts([]);
            return;
        }
        const match = (partners || []).find(p => p.name.toLowerCase() === partnerData.name.trim().toLowerCase());
        if (match) {
            supabase.from('contacts').select('*').eq('partnerId', match.id)
                .then(({ data }) => setExistingContacts(data || []));
        } else {
            setExistingContacts([]);
        }
    }, [partnerData.name, partners]);

    const handleSaveAll = async () => {
        if (!partnerData.name) return alert('Partner Name is required');
        setLoading(true);
        try {
            // 1. Save Partner
            const isPartnerExisting = !!partnerData.id;
            
            // Sanitize payload
            const partnerPayload = { ...partnerData, company_id };
            delete partnerPayload.contacts;

            const { data: pData, error: pError } = isPartnerExisting 
                ? await supabase.from('partners').update(partnerPayload).eq('id', partnerData.id).select()
                : await supabase.from('partners').insert([partnerPayload]).select();
            
            if (pError) throw pError;
            const savedPartner = pData[0];

            // 2. Save Contact if name is provided
            let savedContact = null;
            if (contactData.name) {
                const isContactExisting = !!contactData.id;
                const { data: cData, error: cError } = isContactExisting
                    ? await supabase.from('contacts').update({ ...contactData, partnerId: savedPartner.id }).eq('id', contactData.id).select()
                    : await supabase.from('contacts').insert([{ ...contactData, partnerId: savedPartner.id, company_id }]).select();
                
                if (cError) throw cError;
                savedContact = cData[0];
            }

            onSuccess({ partner: savedPartner, contact: savedContact });
        } catch (err) {
            console.error('Dual Save Error:', err);
            alert(`Failed to save: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', padding: '0 4px' }}>
                <button 
                    onClick={() => setActiveTab('details')}
                    style={{
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'details' ? '3px solid #6366f1' : '3px solid transparent',
                        color: activeTab === 'details' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'details' ? 700 : 500,
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        transition: 'all 0.2s'
                    }}
                >
                    1. Partner Details
                </button>
                <button 
                    onClick={() => setActiveTab('documents')}
                    disabled={!partnerData.name}
                    style={{
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'documents' ? '3px solid #6366f1' : '3px solid transparent',
                        color: activeTab === 'documents' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'documents' ? 700 : 500,
                        cursor: partnerData.name ? 'pointer' : 'not-allowed',
                        fontSize: '0.95rem',
                        opacity: partnerData.name ? 1 : 0.5,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                    title={!partnerData.name ? 'Enter partner name first to enable documents' : ''}
                >
                    2. Documents & Verification
                    {partnerData.gdrive_folder_id && <Check size={14} color="#10b981" />}
                </button>
            </div>

            {activeTab === 'details' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1.2fr 1fr', 
                        gap: '32px', 
                        alignItems: 'start'
                    }}>
                        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: '32px' }}>
                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1' }}>
                                <div style={{ background: '#e0e7ff', p: '6px', borderRadius: '8px' }}><Users size={18} /></div>
                                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>STEP 1: PARTNER INFORMATION</span>
                            </div>
                            <QuickPartnerAdd 
                                company_id={company_id} 
                                initialData={partnerData} 
                                hideActions={true} 
                                onDataChange={setPartnerData} 
                                title={title}
                                defaultType={defaultType}
                            />
                        </div>
                        <div>
                            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                                <div style={{ background: '#d1fae5', p: '6px', borderRadius: '8px' }}><User size={18} /></div>
                                <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>STEP 2: PRIMARY CONTACT (OPTIONAL)</span>
                            </div>

                            {existingContacts.length > 0 && (
                                <div style={{ 
                                    marginBottom: '20px', 
                                    padding: '12px', 
                                    background: '#f0fdf4', 
                                    border: '1px solid #bbf7d0', 
                                    borderRadius: '10px',
                                    maxHeight: '150px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', marginBottom: '8px', fontSize: '0.8rem' }}>
                                        <Users size={14} />
                                        <span style={{ fontWeight: 700 }}>{existingContacts.length} Contacts already linked</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {existingContacts.map(c => (
                                            <div key={c.id} style={{ fontSize: '0.7rem', color: '#14532d', padding: '4px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #dcfce7' }}>
                                                {c.name} ({c.post || 'Contact'})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <QuickContactAdd 
                                company_id={company_id} 
                                partner_id={partnerData.id} 
                                partners={partners} 
                                initialData={contactData} 
                                hideActions={true} 
                                onDataChange={setContactData} 
                            />

                            {/* Financials Section as per Image */}
                            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', marginBottom: '12px' }}>
                                    <Calculator size={16} />
                                    <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Financials (Partner)</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px', fontStyle: 'italic' }}>
                                    Select 'Customer' or 'Supplier' category to enable credit fields.
                                </p>
                                {(partnerData.types?.includes('Customer') || partnerData.types?.includes('Supplier')) ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {partnerData.types.includes('Customer') && (
                                            <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6366f1', marginBottom: '4px' }}>CUST. LIMIT</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{partnerData.customerCredit || 'Not Set'}</div>
                                            </div>
                                        )}
                                        {partnerData.types.includes('Supplier') && (
                                            <div style={{ padding: '10px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669', marginBottom: '4px' }}>SUPP. LIMIT</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{partnerData.supplierCredit || 'Not Set'}</div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ height: '40px', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8' }}>
                                        No Financial Categories Selected
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: '12px', 
                        paddingTop: '24px', 
                        borderTop: '2px solid #f1f5f9',
                        background: '#fff',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 20
                    }}>
                        <button className="btn btn-secondary" onClick={onCancel} style={{ padding: '12px 24px', borderRadius: '12px' }}>Cancel</button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleSaveAll} 
                            disabled={loading || !partnerData.name}
                            style={{ 
                                padding: '12px 32px', 
                                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                border: 'none',
                                fontWeight: 700,
                                borderRadius: '12px'
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                            {loading ? 'Saving Everything...' : (partnerData.id ? 'Update Partner & Contact' : 'Create Partner & Contact')}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ minHeight: '400px' }}>
                    <PartnerDocuments
                        partnerId={partnerData.id}
                        partnerName={partnerData.name}
                        initialFolderId={partnerData.gdrive_folder_id}
                        initialDriveLink={partnerData.google_drive_link}
                        onUpdate={(res) => setPartnerData(prev => ({ 
                            ...prev, 
                            gdrive_folder_id: res.id, 
                            google_drive_link: res.link 
                        }))}
                    />
                </div>
            )}
        </div>
    );
};

// Quick Vessel Add
export const QuickVesselAdd = ({ company_id, initialData, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState(initialData || {
        vessel_name: '',
        imo_number: '',
        vessel_type: '',
        vessel_management: '',
        vessel_owner: '',
        mmsi: ''
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
            const isExisting = !!formData.id;
            
            // Sanitize payload to only include valid columns
            const payload = {
                vessel_name: formData.vessel_name,
                imo_number: formData.imo_number,
                vessel_type: formData.vessel_type,
                vessel_management: formData.vessel_management,
                vessel_owner: formData.vessel_owner,
                mmsi: formData.mmsi,
                company_id: company_id
            };

            const { data, error } = isExisting
                ? await supabase.from('vessels').update(payload).eq('id', formData.id).select()
                : await supabase.from('vessels').insert([payload]).select();
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

export const QuickWorkLocationAdd = ({ company_id, initialData, onSuccess, onCancel }) => {
    const [locationName, setLocationName] = useState(initialData?.location_name || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!locationName) return alert('Location Name is required');
        setLoading(true);
        try {
            const isExisting = !!initialData?.id;
            const { data, error } = isExisting
                ? await supabase.from('work_locations').update({ location_name: locationName }).eq('id', initialData.id).select()
                : await supabase.from('work_locations').insert([{
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
export const QuickExpenseAdd = ({ job_id, partners, jobs, expense, onSuccess, onCancel, onUploadBill, company_id }) => {
    const [formData, setFormData] = useState(expense || {
        job_id: job_id || '',
        job_no: '',
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

    // Initial job if editing or provided
    React.useEffect(() => {
        if (formData.job_id && jobs) {
            const j = jobs.find(job => job.id === formData.job_id);
            if (j) setFormData(prev => ({ ...prev, job_no: j.document_no }));
        }
    }, [formData.job_id, jobs]);

    const handleSelectJob = (job) => {
        setFormData(prev => ({ ...prev, job_id: job.id, job_no: job.document_no }));
    };

    const [supplierSearch, setSupplierSearch] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiStatus, setAiStatus] = useState('');

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

    const handleEditSupplier = () => {
        if (!formData.supplier_id) return;
        const s = partners.find(p => p.id === formData.supplier_id);
        if (s) {
            setEditModal({ isOpen: true, type: 'partner_id', initialData: s });
        }
    };

    const [editModal, setEditModal] = useState({ isOpen: false, type: null, initialData: null });
    const handleEditSuccess = (updated) => {
        setEditModal({ isOpen: false, type: null, initialData: null });
        onSuccess && typeof onSuccess === 'function' ? null : window.location.reload(); // Refresh to get new data if needed
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

    const handleScannerLink = (url, name) => {
        setFormData(prev => ({ 
            ...prev, 
            bill_url: url,
            notes: (prev.notes || '') + `\n[Linked from Celron Scanner: ${name}]`
        }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setIsAiProcessing(true);
        setAiStatus('📤 Uploading bill to cloud...');
        try {
            const url = await onUploadBill(file);
            if (url) {
                setFormData(prev => ({ ...prev, bill_url: url }));
                
                // Trigger AI OCR
                setAiStatus('🤖 Gemini AI is reading your bill...');
                
                // Convert file to base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const base64 = reader.result.split(',')[1];
                        const result = await parseSupplierBillWithAi(base64);
                        
                        if (result) {
                            // Find supplier if possible
                            let supplierId = formData.supplier_id;
                            if (!supplierId && result.supplier_name) {
                                const matched = partners.find(p => 
                                    p.name.toLowerCase().includes(result.supplier_name.toLowerCase()) ||
                                    (result.uen && p.registration_no === result.uen)
                                );
                                if (matched) {
                                    supplierId = matched.id;
                                    setSupplierSearch(matched.name);
                                }
                            }

                            setFormData(prev => calculateTotals({
                                ...prev,
                                supplier_id: supplierId,
                                invoice_no: result.invoice_no || prev.invoice_no,
                                invoice_date: result.invoice_date || prev.invoice_date,
                                description: result.supplier_name ? `Bill from ${result.supplier_name}` : prev.description,
                                unit_price: result.subtotal || prev.unit_price,
                                quantity: 1,
                                gst_amount: result.gst_amount || prev.gst_amount,
                                grand_total: result.total_amount || prev.grand_total,
                                notes: `AI Extraction Source: ${result.supplier_name || 'Unknown'}. UEN: ${result.uen || 'N/A'}`
                            }));
                            setAiStatus('✅ Bill parsed successfully!');
                            setTimeout(() => setAiStatus(''), 3000);
                        }
                    } catch (aiErr) {
                        console.error('AI OCR failed:', aiErr);
                        setAiStatus('⚠️ AI parsing failed, but file uploaded.');
                    } finally {
                        setIsAiProcessing(false);
                    }
                };
                reader.readAsDataURL(file);
            }
        } catch (err) {
            console.error('Bill upload failed:', err);
            alert('Upload failed: ' + err.message);
            setIsAiProcessing(false);
            setAiStatus('');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="grid-2">
                <div className="form-item full-width" style={{ position: 'relative' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Supplier *</span>
                        {formData.supplier_id && (
                            <button 
                                onClick={handleEditSupplier}
                                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}
                            >
                                <Pencil size={12} /> Edit Supplier
                            </button>
                        )}
                    </label>
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
                    <label>Job No (Optional)</label>
                    <select 
                        className="form-select"
                        value={formData.job_id}
                        onChange={(e) => {
                            const selected = jobs?.find(j => j.id === e.target.value);
                            handleSelectJob(selected || { id: '', document_no: '' });
                        }}
                    >
                        <option value="">No Job Linked</option>
                        {jobs?.map(j => <option key={j.id} value={j.id}>{j.document_no}</option>)}
                    </select>
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
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <DriveScannerLinker 
                            selectedLink={formData.bill_url} 
                            onLinkSelected={handleScannerLink} 
                            onClear={() => setFormData(prev => ({ ...prev, bill_url: '' }))}
                            label="Scan Repository"
                        />
                        <div style={{ width: '1px', height: '40px', background: '#e2e8f0', margin: '0 5px' }} />
                        <label className={`btn ${formData.bill_url ? 'btn-secondary' : 'btn-primary'}`} style={{ cursor: 'pointer', padding: '10px 20px', gap: '10px', height: '44px', display: 'flex', alignItems: 'center' }}>
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : (formData.bill_url ? <RefreshCw size={18} /> : <Upload size={18} />)}
                            {formData.bill_url ? 'Update Bill' : 'Upload Bill'}
                            <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>
                    {aiStatus && (
                        <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, animation: 'pulse 2s infinite' }}>
                            {aiStatus}
                        </div>
                    )}
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

            {/* Nested Modal for Editing Supplier */}
            {editModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '24px' }}>
                    <div style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', background: 'white', borderRadius: '16px', padding: '32px', overflowY: 'auto', position: 'relative' }}>
                        <button onClick={() => setEditModal({ isOpen: false, type: null })} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        <QuickPartnerContactDualAdd 
                            company_id={company_id} 
                            initialPartner={editModal.initialData} 
                            partners={partners}
                            onSuccess={handleEditSuccess} 
                            onCancel={() => setEditModal({ isOpen: false, type: null })} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// Quick Form Add
export const QuickFormAdd = ({ company_id, initialData, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState(initialData || {
        title: '',
        form_type: 'PDF',
        author_company: '',
        info: '',
        file_url: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!formData.title) return alert('Form Title is required');
        setLoading(true);
        try {
            const { saveForm } = await import('../../lib/formsService');
            const { data, error } = await saveForm({
                ...formData,
                company_id
            });
            if (error) throw error;
            onSuccess(data);
        } catch (err) {
            console.error(err);
            alert('Failed to save form');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-item">
                <label>Form Title *</label>
                <input
                    className="form-input"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Site Audit Checklist"
                    autoFocus
                />
            </div>
            <div className="grid-2">
                <div className="form-item">
                    <label>Form Type</label>
                    <select
                        className="form-select"
                        value={formData.form_type}
                        onChange={e => setFormData({ ...formData, form_type: e.target.value })}
                    >
                        <option value="PDF">PDF Document</option>
                        <option value="DOCX">Word Document</option>
                        <option value="XLSX">Excel Spreadsheet</option>
                        <option value="LINK">External Link</option>
                    </select>
                </div>
                <div className="form-item">
                    <label>Issuer / Department</label>
                    <input
                        className="form-input"
                        value={formData.author_company}
                        onChange={e => setFormData({ ...formData, author_company: e.target.value })}
                        placeholder="e.g. Operations"
                    />
                </div>
            </div>
            <div className="form-item">
                <label>Template Link (Google Drive / Web)</label>
                <input
                    className="form-input"
                    value={formData.file_url}
                    onChange={e => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                />
            </div>
            <div className="form-item">
                <label>Instructions / Info</label>
                <textarea
                    className="form-textarea"
                    value={formData.info}
                    onChange={e => setFormData({ ...formData, info: e.target.value })}
                    placeholder="Add brief instructions for this form..."
                    rows={3}
                />
            </div>
            <div className="quick-form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading || !formData.title}>
                    <Save size={18} /> {loading ? 'Saving...' : 'Save Template'}
                </button>
            </div>
        </div>
    );
};

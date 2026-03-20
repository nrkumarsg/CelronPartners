// src/components/UniversalFinder/SearchBar.jsx
import React, { useState, useRef } from 'react';
import { Search, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { extractTermsFromImage } from '../../lib/geminiService';

export default function SearchBar({ onSearch, advancedMode = false }) {
    const [term, setTerm] = useState('');
    const [brand, setBrand] = useState('');
    const [country, setCountry] = useState('');
    const [category, setCategory] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const fileInputRef = useRef(null);

    const triggerSearch = () => {
        if (!term.trim()) return;
        onSearch(term.trim(), { brand, country, category });
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') {
            triggerSearch();
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            setImagePreview(base64);

            setIsExtracting(true);
            try {
                const extractedQuery = await extractTermsFromImage(base64);
                setTerm(extractedQuery);
                // Optionally auto-trigger search
                // onSearch(extractedQuery);
            } catch (err) {
                console.error("Extraction error:", err);
                alert("Could not identify part from photo. Please type manually.");
            } finally {
                setIsExtracting(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const clearImage = () => {
        setImagePreview(null);
        setTerm('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div style={{ position: 'relative' }}>
            {imagePreview && (
                <div style={{
                    position: 'absolute',
                    top: '-70px',
                    left: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#fff',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    zIndex: 10
                }}>
                    <img src={imagePreview} alt="Preview" style={{ height: '40px', width: '40px', objectCover: 'cover', borderRadius: '6px' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#1e293b' }}>
                        {isExtracting ? 'Analyzing photo...' : 'Photo identified'}
                    </div>
                    <button onClick={clearImage} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="flex gap-2 items-center mb-4">
                <div style={{ position: 'relative', flex: 1 }}>
                    <input
                        className="w-full p-3 pl-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        placeholder={isExtracting ? "Extracting model number..." : "Search spares worldwide..."}
                        value={term}
                        disabled={isExtracting}
                        onChange={(e) => setTerm(e.target.value)}
                        onKeyDown={handleKey}
                    />
                    <Search
                        size={18}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                    />
                </div>

                <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Search by Photo"
                    className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-600"
                >
                    {isExtracting ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                </button>

                <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                />

                <button
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-semibold shadow-md transition disabled:opacity-50"
                    disabled={isExtracting || !term.trim()}
                    onClick={triggerSearch}
                >
                    Search
                </button>
            </div>

            {advancedMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                        <input
                            className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            placeholder="Filter by brand..."
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                        />
                    </div>
                    <select
                        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white text-gray-600"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                    >
                        <option value="">All Countries</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="United Arab Emirates">UAE</option>
                        <option value="Saudi Arabia">Saudi Arabia</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">USA</option>
                        <option value="Germany">Germany</option>
                        <option value="China">China</option>
                        <option value="India">India</option>
                    </select>
                    <select
                        className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white text-gray-600"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        <option value="Automation">Automation & Sensors</option>
                        <option value="Electrical">Electrical Spares</option>
                        <option value="Engines">Engine Parts</option>
                        <option value="Pumps">Pumps & Valves</option>
                        <option value="Electronics">Marine Electronics</option>
                        <option value="Safety">Safety Equipment</option>
                    </select>
                </div>
            )}
        </div>
    );
}

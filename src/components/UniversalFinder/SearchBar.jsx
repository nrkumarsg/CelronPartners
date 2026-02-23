// src/components/UniversalFinder/SearchBar.jsx
import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchBar({ onSearch }) {
    const [term, setTerm] = useState('');

    const handleKey = (e) => {
        if (e.key === 'Enter' && term.trim()) {
            onSearch(term.trim());
        }
    };

    return (
        <div className="flex gap-2 items-center mb-4">
            <input
                className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search spares worldwide..."
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={handleKey}
            />
            <button
                className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                onClick={() => term.trim() && onSearch(term.trim())}
            >
                <Search size={16} /> Search
            </button>
        </div>
    );
}

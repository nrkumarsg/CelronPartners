// src/components/UniversalFinder/ResultCard.jsx
import React from 'react';
import { CheckCircle, Save } from 'lucide-react';

export default function ResultCard({ result, onSave }) {
    const {
        title,
        url,
        thumbnail_url,
        supplier_name,
        distance_km,
        saved_to_partner,
    } = result;

    return (
        <div className="p-4 border rounded hover:shadow-lg transition flex gap-4 items-start">
            {thumbnail_url && (
                <img src={thumbnail_url} alt={title} className="w-24 h-24 object-cover rounded" />
            )}
            <div className="flex-1">
                <h3 className="font-medium text-lg">{title}</h3>
                {supplier_name && (
                    <p className="text-sm text-gray-600">
                        {supplier_name}{distance_km ? ` • ${distance_km.toFixed(1)} km` : ''}
                    </p>
                )}
                <div className="mt-2 flex gap-2 items-center">
                    <a href={url} target="_blank" rel="noopener" className="text-indigo-600 underline">
                        Visit Site
                    </a>
                    <button
                        disabled={saved_to_partner}
                        className={`flex items-center gap-1 px-2 py-1 rounded ${saved_to_partner ? 'bg-gray-300 text-gray-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
                        onClick={() => onSave(result)}
                    >
                        {saved_to_partner ? <CheckCircle size={14} /> : <Save size={14} />}
                        {saved_to_partner ? 'Saved' : 'Save to Partners'}
                    </button>
                </div>
            </div>
        </div>
    );
}

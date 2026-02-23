// src/components/UniversalFinder/ResultsList.jsx
import React, { useEffect, useState } from 'react';
import ResultCard from './ResultCard';
import { Loader2 } from 'lucide-react';

export default function ResultsList({ searchId }) {
    const [results, setResults] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const pageSize = 20;

    const fetchResults = async (pageNum) => {
        setLoading(true);
        try {
            const resp = await fetch(`/api/universal-finder/results?searchId=${searchId}&page=${pageNum}&pageSize=${pageSize}`);
            const data = await resp.json();
            setResults(data.results);
            setTotal(data.total);
            setPage(pageNum);
        } catch (e) {
            console.error('Failed to fetch results', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (searchId) fetchResults(1);
    }, [searchId]);

    const totalPages = Math.ceil(total / pageSize);

    const handleSave = async (result) => {
        try {
            await fetch('/api/partners/from-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resultId: result.id }),
            });
            // Optimistically update UI
            setResults((prev) =>
                prev.map((r) => (r.id === result.id ? { ...r, saved_to_partner: true } : r))
            );
        } catch (e) {
            console.error('Save error', e);
            alert('Failed to save partner');
        }
    };

    return (
        <div>
            {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={32} /></div>
            ) : (
                <div className="space-y-4">
                    {results.map((r) => (
                        <ResultCard key={r.id} result={r} onSave={handleSave} />
                    ))}
                </div>
            )}
            {/* Pagination Controls */}
            <div className="flex justify-center mt-6 space-x-2">
                <button
                    disabled={page <= 1 || loading}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    onClick={() => fetchResults(page - 1)}
                >
                    Prev
                </button>
                <span className="px-3 py-1">Page {page} of {totalPages}</span>
                <button
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                    onClick={() => fetchResults(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

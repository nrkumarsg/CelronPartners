// src/components/UniversalFinder/ResultsList.jsx
import React, { useEffect, useState } from 'react';
import ResultCard from './ResultCard';
import { Loader2 } from 'lucide-react';

export default function ResultsList({ searchId, companyId }) {
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
                body: JSON.stringify({ resultId: result.id, company_id: companyId }),
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
        <div className="pb-12">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                    <p className="text-slate-500 font-medium font-outfit">Searching for the best suppliers worldwide...</p>
                </div>
            ) : results.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {results.map((r) => (
                        <ResultCard key={r.id} result={r} onSave={handleSave} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400">No suppliers found for this search. Try Broadening your terms.</p>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center mt-12 gap-3">
                    <button
                        disabled={page <= 1 || loading}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
                        onClick={() => fetchResults(page - 1)}
                        aria-label="Previous page"
                    >
                        &lt;
                    </button>

                    {[...Array(totalPages)].map((_, i) => (
                        <button
                            key={i + 1}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all shadow-sm ${page === i + 1
                                ? 'bg-indigo-600 text-white border border-indigo-600'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            onClick={() => fetchResults(i + 1)}
                        >
                            {i + 1}
                        </button>
                    ))}

                    <button
                        disabled={page >= totalPages || loading}
                        className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
                        onClick={() => fetchResults(page + 1)}
                        aria-label="Next page"
                    >
                        &gt;
                    </button>
                </div>
            )}
        </div>
    );
}

import React from 'react';
import { CheckCircle, Save, Globe, Mail, Phone, MapPin, Building2, ExternalLink } from 'lucide-react';

export default function ResultCard({ result, onSave }) {
    const {
        title,
        url,
        thumbnail_url,
        supplier_name,
        distance_km,
        saved_to_partner,
        email,
        phone,
        supplier_location,
        address,
        snippet,
        notes
    } = result;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Visual Section */}
                <div className="w-full lg:w-48 h-48 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                    {thumbnail_url ? (
                        <img src={thumbnail_url} alt={title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                        <Building2 size={48} className="text-slate-300" />
                    )}
                </div>

                {/* Content Section */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                                {supplier_name || "Unknown Supplier"}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                                <MapPin size={14} className="text-rose-500" />
                                {supplier_location || "Worldwide"}
                                {distance_km && (
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold">
                                        {distance_km.toFixed(1)} km away
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                disabled={saved_to_partner}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${saved_to_partner
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm'
                                    }`}
                                onClick={() => onSave(result)}
                            >
                                {saved_to_partner ? <CheckCircle size={16} /> : <Save size={16} />}
                                {saved_to_partner ? 'Partner Saved' : 'Save Partner'}
                            </button>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all border border-slate-100"
                                title="Visit Website"
                            >
                                <ExternalLink size={20} />
                            </a>
                        </div>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-2">
                        {snippet || notes || "Industrial distributor specializing in marine spare parts and global logistics solutions."}
                    </p>

                    {/* Contact Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0">
                                <Mail size={14} className="text-indigo-500" />
                            </div>
                            <span className="truncate">{email || "Contact for info"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0">
                                <Phone size={14} className="text-emerald-500" />
                            </div>
                            <span className="truncate">{phone || "Request callback"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 md:col-span-2 lg:col-span-1">
                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200 shrink-0">
                                <Building2 size={14} className="text-amber-500" />
                            </div>
                            <span className="truncate">{address || supplier_location || "Regional Distribution Center"}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

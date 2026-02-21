import React, { useState, useEffect } from 'react';
import { Search, Users, DollarSign, Activity, FileSpreadsheet, Ship, MapPin } from 'lucide-react';
import { getPartners, getContacts } from '../lib/store';
import { supabase } from '../lib/supabase';
import StageReminders from '../components/dashboard/StageReminders';

export default function Dashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        totalPartners: 0,
        customers: 0,
        suppliers: 0,
        totalContacts: 0,
        totalVessels: 0,
        totalLocations: 0
    });

    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            const p = await getPartners();
            const c = await getContacts();
            setPartners(p);

            let customers = 0;
            let suppliers = 0;
            p.forEach(pt => {
                if (pt.types?.includes('Customer') || pt.types?.includes('Customer Related')) customers++;
                if (pt.types?.includes('Supplier') || pt.types?.includes('Supplier Related')) suppliers++;
            });

            const { count: vesselsCount } = await supabase.from('vessels').select('*', { count: 'exact', head: true });
            const { count: locationsCount } = await supabase.from('work_locations').select('*', { count: 'exact', head: true });

            setStats({
                totalPartners: p.length,
                customers,
                suppliers,
                totalContacts: c.length,
                totalVessels: vesselsCount || 0,
                totalLocations: locationsCount || 0
            });
            setLoading(false);
        }
        loadData();
    }, []);

    const filteredPartners = partners.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email1?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Dashboard</h2>
                <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 12px', width: '100%', maxWidth: '350px' }}>
                    <Search size={18} color="#94a3b8" />
                    <input
                        type="text"
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '10px 0', marginLeft: '8px', fontSize: '0.95rem', color: '#334155' }}
                        placeholder="Global Search Partners..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Total Partners</span>
                        <Users size={20} color="var(--accent)" />
                    </div>
                    <div className="stat-value">{loading ? '...' : stats.totalPartners}</div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Customers</span>
                        <DollarSign size={20} color="#4ade80" />
                    </div>
                    <div className="stat-value">{loading ? '...' : stats.customers}</div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Suppliers</span>
                        <Activity size={20} color="#facc15" />
                    </div>
                    <div className="stat-value">{loading ? '...' : stats.suppliers}</div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Total Contacts</span>
                        <FileSpreadsheet size={20} color="#c084fc" />
                    </div>
                    <div className="stat-value">{loading ? '...' : stats.totalContacts}</div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Total Vessels</span>
                        <Ship size={20} color="#3b82f6" />
                    </div>
                    <div className="stat-value">{loading ? '...' : stats.totalVessels}</div>
                </div>

                <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Work Locations</span>
                        <MapPin size={20} color="#f97316" />
                    </div>
                    <div className="stat-value">{loading ? '...' : stats.totalLocations}</div>
                </div>
            </div>

            {/* AI Workflow Action Reminders */}
            {!searchTerm && <StageReminders />}

            {searchTerm && (
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '16px' }}>Search Results ({filteredPartners.length})</h3>
                    {filteredPartners.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredPartners.map(p => (
                                <div key={p.id} style={{ padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{p.name}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{p.email1 || 'No email provided'} • {p.types?.join(', ') || 'No Type'}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)' }}>No partners found matching "{searchTerm}"</p>
                    )}
                </div>
            )}

            {!searchTerm && (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                        <Users size={32} color="var(--accent)" />
                    </div>
                    <h3 style={{ marginBottom: '8px', fontSize: '1.2rem' }}>Welcome to the SaaS Partners Module</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto', marginBottom: '24px' }}>
                        This dashboard gives you a high-level overview of your business partners. Use the sidebar to manage full partner details and contacts.
                    </p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => window.open('https://contacts.google.com/', '_blank')}
                    >
                        <FileSpreadsheet size={18} />
                        Open Google Contacts
                    </button>
                </div>
            )}
        </div>
    );
}

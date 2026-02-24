import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getEnquiries, getJobs } from '../lib/workflowService';
import { getDocumentSettings } from '../lib/store';
import { ExternalLink, Database, Search, Filter, ChevronDown, Folder, Briefcase, FileText } from 'lucide-react';

export default function StorageDirectory() {
    const { profile } = useAuth();
    const [enquiries, setEnquiries] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('enquiries');

    useEffect(() => {
        if (profile) {
            if (profile.company_id) {
                fetchData();
            } else {
                setLoading(false);
            }
        }
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [enqRes, jobsRes, settingsData] = await Promise.all([
                getEnquiries(profile.company_id),
                getJobs(profile.company_id),
                getDocumentSettings()
            ]);
            if (enqRes.data) setEnquiries(enqRes.data);
            if (jobsRes.data) setJobs(jobsRes.data);
            if (settingsData) setSettings(settingsData);
        } catch (error) {
            console.error('Error fetching storage data:', error);
        } finally {
            setLoading(false);
        }
    };

    const openRootFolder = () => {
        if (settings?.google_drive_folder_id) {
            window.open(`https://drive.google.com/drive/folders/${settings.google_drive_folder_id}`, '_blank');
        } else {
            alert('Google Drive Root Folder ID is not configured in Settings.');
        }
    };

    const openFolder = (link) => {
        if (link) {
            window.open(link, '_blank');
        } else {
            alert('No storage link available for this item.');
        }
    };

    const items = activeTab === 'enquiries' ? enquiries : jobs;

    if (loading) return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#64748b' }}>Loading Storage Module...</p>
        </div>
    );

    return (
        <div style={{ background: '#f8fafc', minHeight: '100%', padding: '32px', color: '#334155', borderRadius: '16px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Document Storage</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Integrated Google Drive access for all your files</p>
                </div>
                <button
                    onClick={openRootFolder}
                    style={{
                        background: '#6366f1',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
                    }}
                >
                    <Folder size={18} /> Open Root Directory (CELRON2026)
                </button>
            </header>

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('enquiries')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 0',
                        borderBottom: activeTab === 'enquiries' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'enquiries' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'enquiries' ? 600 : 500,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <FileText size={18} /> Enquiries Storage
                </button>
                <button
                    onClick={() => setActiveTab('jobs')}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '12px 0',
                        borderBottom: activeTab === 'jobs' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'jobs' ? '#6366f1' : '#64748b',
                        fontWeight: activeTab === 'jobs' ? 600 : 500,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Briefcase size={18} /> Orders/Jobs Storage
                </button>
            </div>

            {/* Main Table Container */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', minWidth: '400px' }}>
                        <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
                        <input type="text" placeholder="Search storage locations..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: '#334155' }} />
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Reference</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Entity / Partner</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                            <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: 500, fontSize: '0.9rem', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No storage records found.</td></tr>
                        ) : (
                            items.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: 600, color: '#1e293b' }}>
                                        {activeTab === 'enquiries' ? item.enquiry_no : item.job_no}
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#475569' }}>
                                        {activeTab === 'enquiries' ? item.partners?.name : item.enquiries?.partners?.name || 'Customer'}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            background: item.google_drive_link ? '#dcfce7' : '#f1f5f9',
                                            color: item.google_drive_link ? '#166534' : '#64748b',
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            fontSize: '0.8rem',
                                            fontWeight: 500
                                        }}>
                                            {item.google_drive_link ? 'Linked' : 'No Folder'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => openFolder(item.google_drive_link)}
                                            disabled={!item.google_drive_link}
                                            style={{
                                                background: item.google_drive_link ? '#ecfdf5' : 'transparent',
                                                color: item.google_drive_link ? '#059669' : '#cbd5e1',
                                                border: `1px solid ${item.google_drive_link ? '#d1fae5' : '#e2e8f0'}`,
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.85rem',
                                                cursor: item.google_drive_link ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: 500,
                                                marginLeft: 'auto'
                                            }}
                                        >
                                            <ExternalLink size={14} /> Open in Drive
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getEnquiries, getJobs } from '../../lib/workflowService';
import { Bell, AlertCircle, ArrowRight, Clock, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StageReminders() {
    const { profile } = useAuth();
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.company_id) {
            fetchReminders();
        }
    }, [profile]);

    const fetchReminders = async () => {
        setLoading(true);
        try {
            const [enqRes, jobRes] = await Promise.all([
                getEnquiries(profile.company_id),
                getJobs(profile.company_id)
            ]);

            const newReminders = [];

            // Stage Logic for Enquiries
            if (enqRes.data) {
                enqRes.data.forEach(enq => {
                    if (enq.status !== 'Converted') {
                        if (!enq.catalog_items || enq.catalog_items.length === 0) {
                            newReminders.push({
                                id: `enq-req-${enq.id}`,
                                type: 'warning',
                                title: `${enq.enquiry_no} missing requirement items!`,
                                actionText: 'Review Enquiry',
                                link: `/workflows/enquiry/${enq.id}`,
                                icon: <AlertCircle size={18} color="#f59e0b" />
                            });
                        } else {
                            newReminders.push({
                                id: `enq-float-${enq.id}`,
                                type: 'action',
                                title: `Float Quotation needed for ${enq.enquiry_no}`,
                                actionText: 'Float Quotation',
                                link: `/workflows/enquiry/${enq.id}`,
                                icon: <Clock size={18} color="#60a5fa" />
                            });
                        }
                    }
                });
            }

            // Stage Logic for Jobs (POs)
            if (jobRes.data) {
                jobRes.data.forEach(job => {
                    if (job.status === 'Active') {
                        newReminders.push({
                            id: `job-inv-${job.id}`,
                            type: 'action',
                            title: `Job ${job.job_no} requires Delivery/Invoicing`,
                            actionText: 'Process Job',
                            link: `/workflows`, // Assuming workflow board handles jobs for now
                            icon: <FileText size={18} color="#34d399" />
                        });
                    }
                });
            }

            setReminders(newReminders);
        } catch (error) {
            console.error('Error fetching reminders:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading Stage Reminders...</div>;

    if (reminders.length === 0) {
        return (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '32px 20px', borderLeft: '4px solid #10b981' }}>
                <CheckCircle size={32} color="#10b981" style={{ marginBottom: '16px' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>All Caught Up!</h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>There are no pending actions in your workflow stages.</p>
            </div>
        );
    }

    return (
        <div className="glass-panel" style={{ borderTop: '4px solid #f59e0b', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Bell size={24} color="#f59e0b" />
                <h3 className="form-section-title" style={{ margin: 0, padding: 0, border: 'none' }}>Stage-wise Action Reminders</h3>
                <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                    {reminders.length} Pending
                </span>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                Automated alerts driving you to the next workflow stage (Enquiry ➜ Quotation ➜ PO ➜ Delivery ➜ Invoice).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reminders.map(rem => (
                    <div key={rem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                                {rem.icon}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '1rem' }}>{rem.title}</h4>
                            </div>
                        </div>
                        {rem.link ? (
                            <Link to={rem.link} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {rem.actionText} <ArrowRight size={14} />
                            </Link>
                        ) : (
                            <button className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {rem.actionText} <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

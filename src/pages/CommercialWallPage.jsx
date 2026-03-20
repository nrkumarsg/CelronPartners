import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import CommunicationWall from '../components/common/CommunicationWall';
import { MessageSquare } from 'lucide-react';

export default function CommercialWallPage() {
    const { profile } = useAuth();

    return (
        <div className="animate-fade-in" style={{ padding: '0 0 32px 0' }}>
            <header className="page-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className="page-title">Commercial Wall</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                        Chronological business log for notes, commercial matters, and file uploads.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <MessageSquare size={20} color="#6366f1" />
                    <span style={{ fontWeight: 600, color: '#475569' }}>Company-wide Stream</span>
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '0', height: 'calc(100vh - 240px)', minHeight: '600px', overflow: 'hidden' }}>
                <CommunicationWall 
                    referenceType="Company"
                    referenceId={profile?.company_id}
                    title="Daily Commercial Log"
                />
            </div>

            <div style={{ marginTop: '24px', padding: '20px', background: '#eff6ff', borderRadius: '16px', border: '1px solid #dbeafe', color: '#1e40af' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 700 }}>Quick Tip</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    Posts here are saved to the <strong>Commercial Log</strong>. For project-specific notes, use the "Wall" inside any <strong>Active Job</strong> or the <strong>Corporate Vault</strong> categories.
                </p>
            </div>
        </div>
    );
}

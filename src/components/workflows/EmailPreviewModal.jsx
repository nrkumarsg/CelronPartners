import React from 'react';
import { X, Send, Mail, FileText } from 'lucide-react';

export default function EmailPreviewModal({ isOpen, onClose, onConfirm, data }) {
    if (!isOpen) return null;

    const { emails, subject, body } = data;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: '#fff',
                width: '100%',
                maxWidth: '700px',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ padding: '24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: '#eef2ff', padding: '10px', borderRadius: '12px' }}>
                            <Mail size={20} color="#6366f1" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Confirm Email Draft</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Review the RFQ content before sending to suppliers</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '60vh' }}>
                    <div className="preview-field">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>BCC (Suppliers)</label>
                        <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', color: '#1e293b', fontWeight: 500 }}>
                            {emails}
                        </div>
                    </div>

                    <div className="preview-field">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Subject Line</label>
                        <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>
                            {decodeURIComponent(subject)}
                        </div>
                    </div>

                    <div className="preview-field">
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Email Body</label>
                        <div style={{ 
                            background: '#f8fafc', 
                            padding: '20px', 
                            borderRadius: '16px', 
                            fontSize: '0.95rem', 
                            color: '#334155', 
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            border: '1px solid #f1f5f9'
                        }}>
                            {decodeURIComponent(body)}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} className="btn" style={{ background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontWeight: 600, padding: '10px 24px', borderRadius: '12px' }}>Edit Selection</button>
                    <button onClick={onConfirm} className="btn" style={{ background: '#6366f1', color: '#fff', border: 'none', fontWeight: 700, padding: '10px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
                        <Send size={18} /> Launch Email Client
                    </button>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
            `}} />
        </div>
    );
}

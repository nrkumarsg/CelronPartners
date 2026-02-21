import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <div className="glass-panel" style={{ textAlign: 'center', maxWidth: '400px', padding: '40px' }}>
                <ShieldAlert size={64} style={{ color: 'var(--danger)', margin: '0 auto 20px' }} />
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '8px' }}>Access Denied</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                    You do not have permission to view this page or your account is pending approval. Please contact your administrator.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft size={18} /> Return to Dashboard
                </button>
            </div>
        </div>
    );
};

export default Unauthorized;

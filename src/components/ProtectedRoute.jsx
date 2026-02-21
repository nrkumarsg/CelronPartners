import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, requiredModule }) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading your workspace...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // Not logged in
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!profile) {
        // Logged in but profile hasn't loaded yet? Wait.
        return null;
    }

    if (profile.status === 'pending') {
        // Account not approved yet
        return <Navigate to="/unauthorized" replace />;
    }

    if (profile.status === 'blocked') {
        // Account blocked
        return <Navigate to="/unauthorized" replace />;
    }

    // Role-based Access Control logic
    if (requiredModule) {
        // Superadmin bypasses module checks
        if (profile.role === 'superadmin') {
            return children;
        }

        const modules = profile.accessible_modules || [];
        if (!modules.includes(requiredModule)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;

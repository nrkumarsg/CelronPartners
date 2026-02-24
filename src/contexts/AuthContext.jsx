import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/userService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const defaultDemoProfile = (user) => ({
        id: user.id,
        email: user.email,
        role: 'superadmin',
        status: 'active',
        company_id: '8431cd0b-7449-44a5-8213-2a8680d09ebe', // Cel-Ron Demo Company
        accessible_modules: ['partners', 'contacts', 'vessels', 'work-locations', 'catalog', 'reports', 'settings', 'workflows', 'universal-finder', 'storage-directory']
    });

    useEffect(() => {
        let mounted = true;

        async function initializeAuth() {
            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth Timeout')), 10000)
                );

                console.log('Auth: initializeAuth starting...');
                const { data: { session }, error } = await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise
                ]);

                if (error) console.error('Auth: getSession error:', error);

                if (session?.user && mounted) {
                    console.log('Auth: session found for', session.user.email);
                    setUser(session.user);

                    const profileTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile Timeout')), 5000)
                    );

                    let profileData;
                    try {
                        console.log('Auth: fetching profile...');
                        const { data } = await Promise.race([
                            getProfile(session.user.id),
                            profileTimeout
                        ]);
                        profileData = data;
                    } catch (pErr) {
                        console.error('Auth: profile fetch timeout or error', pErr);
                    }

                    if (!profileData) {
                        console.log('Auth: using fallback demo profile');
                        profileData = defaultDemoProfile(session.user);
                    }
                    if (mounted) setProfile(profileData);
                } else if (mounted) {
                    console.log('Auth: no session');
                    setUser(null);
                    setProfile(null);
                }
            } catch (err) {
                console.error('Auth: initialization error:', err);
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) {
                    console.log('Auth: loading set to false');
                    setLoading(false);
                }
            }
        }

        initializeAuth();

        // 2. Setup auth listener for changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth: onAuthStateChange event:', event);
            if (!mounted) return;

            if (session?.user) {
                setUser(session.user);

                const profileTimeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Profile Timeout')), 5000)
                );

                let profileData;
                try {
                    const { data } = await Promise.race([
                        getProfile(session.user.id),
                        profileTimeout
                    ]);
                    profileData = data;
                } catch (pErr) {
                    console.error('Auth: profile fetch timeout', pErr);
                }

                if (!profileData) profileData = defaultDemoProfile(session.user);
                if (mounted) setProfile(profileData);
            } else {
                setUser(null);
                setProfile(null);
            }
            if (mounted) {
                console.log('Auth: loading set to false from callback');
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        loading,
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        }),
        updatePassword: (newPassword) => supabase.auth.updateUser({ password: newPassword }),
        refreshProfile: async () => {
            if (user) {
                const { data } = await getProfile(user.id);
                setProfile(data);
            }
        }
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: 'var(--bg-primary)',
                    fontFamily: 'Inter, system-ui, sans-serif'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="animate-spin" style={{ fontSize: '24px', marginBottom: '12px' }}>Loading CELRON HUB...</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Preparing your workspace</div>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

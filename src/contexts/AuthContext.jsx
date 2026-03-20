import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/userService';
import { getMyCompanies } from '../lib/companyService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [activeCompanyId, setActiveCompanyId] = useState(null);

    const defaultDemoProfile = (user) => ({
        id: user.id || 'demo-user',
        email: user?.email || 'demo@celron.ae',
        role: 'superadmin',
        status: 'active',
        company_id: '8431cd0b-7449-44a5-8213-2a8680d09ebe',
        accessible_modules: ['partners', 'contacts', 'vessels', 'work-locations', 'catalog', 'reports', 'settings', 'workflows', 'universal-finder', 'storage-directory']
    });

    const initializeAuth = async () => {
        // 1. Try to load from "Stale" cache for instant UI
        const cachedProfile = localStorage.getItem('auth_cached_profile');
        const cachedCompanies = localStorage.getItem('auth_cached_companies');
        if (cachedProfile && cachedCompanies) {
            try {
                setProfile(JSON.parse(cachedProfile));
                setCompanies(JSON.parse(cachedCompanies));
                // If we have cached data, we can potentially lower the 'loading' flag early
                // but we'll wait for the session check to be safe.
            } catch (e) { /* ignore corrupt cache */ }
        }

        const safetyTimer = setTimeout(() => {
            if (loading) {
                console.warn('Auth: Safety timeout reached. Forcing dashboard access.');
                setLoading(false);
            }
        }, 12000); // 12 seconds - very safe fallback for flaky environments

        try {
            console.log('Auth: initializeAuth starting...');
            // Fast session check with shorter timeout
            const sessionResp = await Promise.race([
                supabase.auth.getSession(),
                new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: new Error('Timeout') }), 10000))
            ]);

            const session = sessionResp?.data?.session;

            if (session?.user) {
                console.log('Auth: Session found for', session.user.email);
                setUser(session.user);
                await refreshProfileData(session.user);
            } else {
                console.log('Auth: No session or timeout.');
                // Try to use cached data if available to avoid "0" counts on flaky connection
                if (!cachedProfile) {
                    setLoading(false);
                } else {
                    // We have cache, but no session. We'll wait a bit more for onAuthStateChange
                    // but allow the app to show "something" if it was already logged in.
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error('Auth: initialization error:', err);
            setLoading(false);
        } finally {
            clearTimeout(safetyTimer);
        }
    };

    const refreshProfileData = async (currUser) => {
        if (!currUser) {
            setLoading(false);
            return;
        }

        try {
            // Parallel fetch vs tight timeout
            const fetchPromise = Promise.allSettled([
                getProfile(currUser.id),
                getMyCompanies(currUser.id)
            ]);

            const profileAndComps = await Promise.race([
                fetchPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Profile Timeout')), 15000))
            ]);

            let profileData = profileAndComps[0].status === 'fulfilled' ? profileAndComps[0].value.data : null;
            const myComps = profileAndComps[1].status === 'fulfilled' ? profileAndComps[1].value.data : [];

            if (!profileData) {
                const existing = localStorage.getItem('auth_cached_profile');
                profileData = existing ? JSON.parse(existing) : defaultDemoProfile(currUser);
            }

            setProfile(profileData);
            setCompanies(myComps || []);

            // Cache for next time
            localStorage.setItem('auth_cached_profile', JSON.stringify(profileData));
            localStorage.setItem('auth_cached_companies', JSON.stringify(myComps || []));

            const storedCompany = localStorage.getItem('active_company_id');
            const defaultCompany = (storedCompany && myComps?.some(c => c.id === storedCompany))
                ? storedCompany : (myComps?.[0]?.id || profileData.company_id);
            setActiveCompanyId(defaultCompany);
        } catch (err) {
            console.warn('Auth: Profile refresh lazy-load/fallback used', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth: onAuthStateChange event:', event);

            if (session?.user) {
                if (user?.id !== session.user.id) {
                    setUser(session.user);
                    await refreshProfileData(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setCompanies([]);
                setActiveCompanyId(null);
                localStorage.removeItem('auth_cached_profile');
                localStorage.removeItem('auth_cached_companies');
                setLoading(false);
            } else if (!session) {
                setLoading(false);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const activeCompany = companies.find(c => c.id === activeCompanyId) ||
        profile?.company ||
        { name: 'CELRON HUB', logo_url: '/logo.png' };

    const value = {
        user,
        profile: profile ? { ...profile, company_id: activeCompanyId } : null,
        loading,
        companies,
        activeCompanyId,
        activeCompany,
        switchCompany: (companyId) => {
            setActiveCompanyId(companyId);
            localStorage.setItem('active_company_id', companyId);
        },
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => {
            localStorage.removeItem('active_company_id');
            return supabase.auth.signOut();
        },
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
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#f8fafc',
                    color: '#334155'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ border: '4px solid #f3f4f6', borderTop: '4px solid #4f46e5', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0' }}>CELRON HUB</h2>
                        <p style={{ margin: 0, color: '#64748b' }}>Preparing your workspace...</p>
                        <button
                            onClick={() => setLoading(false)}
                            style={{ marginTop: '24px', background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Take too long? Skip to Dashboard
                        </button>
                    </div>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/userService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const defaultDemoProfile = (user) => ({
            id: user.id,
            email: user.email,
            role: 'superadmin',
            status: 'active',
            accessible_modules: ['partners', 'contacts', 'vessels', 'work-locations', 'catalog', 'reports', 'settings']
        });

        async function initializeAuth() {
            try {
                // 1. Initial session fetch
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Supabase getSession error:', error);
                }

                if (session?.user && mounted) {
                    setUser(session.user);
                    let { data: profileData } = await getProfile(session.user.id);
                    // Fallback for Demo without triggers
                    if (!profileData) profileData = defaultDemoProfile(session.user);
                    if (mounted) setProfile(profileData);
                } else if (mounted) {
                    setUser(null);
                    setProfile(null);
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        initializeAuth();

        // 2. Setup auth listener for changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (session?.user) {
                setUser(session.user);
                let { data: profileData } = await getProfile(session.user.id);
                // Fallback for Demo without triggers
                if (!profileData) profileData = defaultDemoProfile(session.user);
                if (mounted) setProfile(profileData);
            } else {
                setUser(null);
                setProfile(null);
            }
            if (mounted) setLoading(false);
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
            {!loading && children}
        </AuthContext.Provider>
    );
};

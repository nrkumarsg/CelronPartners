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
        // Fetch current session on mount
        const getSessionAndProfile = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (session?.user) {
                setUser(session.user);
                const { data: profileData } = await getProfile(session.user.id);
                setProfile(profileData);
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        };

        getSessionAndProfile();

        // Listen for auth changes (login, logout)
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                const { data: profileData } = await getProfile(session.user.id);
                setProfile(profileData);
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            if (authListener && authListener.subscription) {
                authListener.subscription.unsubscribe();
            }
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

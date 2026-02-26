import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function OAuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            // Extract tokens from URL hash (Implicit Flow)
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);

            const accessToken = params.get('access_token');
            const state = params.get('state'); // This contains our accountId
            const expiresIn = params.get('expires_in');

            if (accessToken && state) {
                try {
                    // Update the communication account with the auth data
                    const { error } = await supabase
                        .from('communication_accounts')
                        .update({
                            auth_data: {
                                access_token: accessToken,
                                expires_at: new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString(),
                                // Note: Implicit flow doesn't provide refresh tokens. 
                                // For production, use 'code' flow and exchange for refresh token on backend.
                            }
                        })
                        .eq('id', state);

                    if (error) throw error;

                    alert('Gmail API Connected Successfully!');
                    navigate('/settings?tab=communications');
                } catch (err) {
                    console.error('Callback error:', err);
                    alert('Failed to save authentication data');
                    navigate('/settings');
                }
            } else {
                navigate('/settings');
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%' }}></div>
            <p style={{ color: '#64748b' }}>Completing Google Authentication...</p>
        </div>
    );
}

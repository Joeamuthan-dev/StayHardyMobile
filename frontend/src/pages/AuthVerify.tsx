import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

/**
 * AuthVerify handles the /auth/verify route on the web.
 * It extracts tokens from various URL formats, establishes a session,
 * and then redirects to Login.
 */
const AuthVerify: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const getTokenParams = () => {
    // 1. Try hash first
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      return new URLSearchParams(hash.substring(hash.indexOf('access_token')));
    }
    // 2. Try search params
    const search = window.location.search;
    if (search.includes('access_token')) {
      return new URLSearchParams(search.substring(1));
    }
    // 3. Try full URL string parsing
    const fullUrl = window.location.href;
    if (fullUrl.includes('access_token')) {
      const tokenPart = fullUrl.split('access_token')[1];
      return new URLSearchParams('access_token' + tokenPart);
    }
    return null;
  };

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const params = getTokenParams();
        const accessToken = params?.get('access_token');
        const refreshToken = params?.get('refresh_token');

        if (accessToken) {
          console.log('[AuthVerify] Valid token detected. Setting session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) throw sessionError;

          console.log('[AuthVerify] Session established. Redirecting to Login...');
          await supabase.auth.signOut({ scope: 'local' });
          
          navigate('/login', { 
            replace: true, 
            state: { emailVerified: true } 
          });
          return;
        }

        const supabaseError = params?.get('error_description');
        if (supabaseError) {
          setError(supabaseError.replace(/\+/g, ' '));
          return;
        }

        setError('No valid verification token found. Please request a new link.');
      } catch (err: any) {
        console.error('[AuthVerify] Verification failed:', err);
        setError(err?.message || 'Verification failed. Please try again.');
      }
    };

    handleVerification();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', background: '#000', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      {!error ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(0,230,118,0.2)',
            borderTop: '3px solid #00E676', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px',
          }}/>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Activating your account...</p>
        </div>
      ) : (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '20px', padding: '24px', textAlign: 'center', maxWidth: '400px',
        }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
          <p style={{ color: '#EF4444', fontWeight: '600', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => navigate('/login', { replace: true })}
            style={{ width: '100%', height: '48px', background: '#00E676', border: 'none', borderRadius: '12px', color: '#000', fontWeight: '800', cursor: 'pointer' }}
          >
            Back to Login
          </button>
        </div>
      )}
      <style>{` @keyframes spin { to { transform: rotate(360deg); } } `}</style>
    </div>
  );
};

export default AuthVerify;

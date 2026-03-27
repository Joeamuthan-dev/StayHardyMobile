import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { hashPin } from '../utils/pinUtils';
import { padPinForAuth } from '../utils/pinUtils';

const ResetPin: React.FC = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // New verification state
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'verified' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const extractAndVerifyToken = async () => {
      try {
        console.log('[ResetPin] Starting manual token extraction...');
        const hashPart = window.location.hash;
        
        let tokenString = '';
        
        // Method 1: Try to extract from hash (Supabase usually puts it here)
        if (hashPart.includes('access_token')) {
          // If using HashRouter, hash might look like #/reset-pin?access_token=...
          // or just #access_token=... if redirect was weird
          if (hashPart.includes('?')) {
            tokenString = hashPart.split('?')[1];
          } else {
            // Might be #access_token=...
            tokenString = hashPart.substring(1);
          }
        }
        
        // Method 2: Check window.location.search as fallback
        if (!tokenString && window.location.search.includes('access_token')) {
          tokenString = window.location.search.substring(1);
        }
        
        if (tokenString) {
          console.log('[ResetPin] Token string found. Parsing parameters...');
          const params = new URLSearchParams(tokenString);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');
          
          if (accessToken && type === 'recovery') {
            console.log('[ResetPin] Valid recovery token detected. Authenticating session...');
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('[ResetPin] setSession error:', sessionError);
              setVerificationStatus('error');
              setErrorMessage('Reset link is invalid or expired. Please request a new one.');
              return;
            }
            
            if (data.session) {
              console.log('[ResetPin] Session verified successfully.');
              setVerificationStatus('verified');
              return;
            }
          }
        }
        
        // Method 3: Fallback listener for onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
              console.log('[ResetPin] Event PASSWORD_RECOVERY detected via listener.');
              setVerificationStatus('verified');
            }
          }
        );
        
        // Safety timeout (3 seconds)
        const timeout = setTimeout(() => {
          setVerificationStatus(prev => {
            if (prev === 'verifying') {
              console.warn('[ResetPin] Verification timeout exceeded.');
              setErrorMessage('Could not verify reset link. Please request a new one.');
              return 'error';
            }
            return prev;
          });
        }, 5000); // 5 seconds for slower networks
        
        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
        
      } catch (err) {
        console.error('[ResetPin] unexpected error:', err);
        setVerificationStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    };
    
    extractAndVerifyToken();
  }, []);

  const handleResetPIN = async () => {
    if (verificationStatus !== 'verified') return;
    
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Get current user (guaranteed to be authenticated if verified)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expired. Please request a new reset link.');

      // 2. Update Supabase Auth password (padded PIN)
      const paddedPin = padPinForAuth(pin);
      const { error: updateError } = await supabase.auth.updateUser({
        password: paddedPin,
      });
      if (updateError) throw updateError;

      // 3. Update PIN hash in public.users
      const hashedPin = await hashPin(pin);
      const { error: dbError } = await supabase
        .from('users')
        .update({ pin: hashedPin })
        .eq('id', user.id);
      if (dbError) throw dbError;

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);

    } catch (err: any) {
      setError(err?.message || 'Update failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPINInput = (value: string, placeholder: string) => (
    <div style={{ marginBottom: '20px', width: '100%' }}>
      <p style={{
        fontSize: '11px',
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '10px',
        textAlign: 'center',
      }}>
        {placeholder}
      </p>
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: '#0A0A0A',
            border: value[i]
              ? '1px solid rgba(0,230,118,0.5)'
              : '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#FFFFFF',
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            boxShadow: value[i]
              ? '0 0 12px rgba(0,230,118,0.2)'
              : 'inset 0 2px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
          }}>
            {value[i] ? '●' : ''}
          </div>
        ))}
      </div>
    </div>
  );

  const pinsMatch = pin.length === 4 && confirmPin.length === 4 && pin === confirmPin;
  const showMatchError = confirmPin.length === 4 && pin !== confirmPin;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 24px',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      boxSizing: 'border-box',
    }}>
      {success ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '40px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '24px',
            color: '#FFFFFF',
            margin: '0 0 12px 0',
          }}>
            PIN Updated!
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: '1.6',
          }}>
            Your PIN has been reset successfully. Redirecting to login...
          </p>
        </div>
      ) : (
        <>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(0,230,118,0.1)',
            border: '1px solid rgba(0,230,118,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 0 24px rgba(0,230,118,0.15)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24"
              fill="none" stroke="#00E676" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '32px',
            color: '#ffffff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
            textAlign: 'center',
          }}>
            Reset your PIN
          </h1>

          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: '15px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 40px 0',
            lineHeight: '1.6',
            textAlign: 'center',
          }}>
            Choose a new 4-digit PIN for your vault.
          </p>

          {verificationStatus === 'verifying' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '40px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '3px solid rgba(0,230,118,0.2)',
                borderTop: '3px solid #00E676',
                animation: 'spin 0.8s linear infinite',
              }}/>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.3)',
                textAlign: 'center',
              }}>
                Verifying your reset link...
              </p>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '32px',
              textAlign: 'center',
              width: '100%'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#EF4444',
                fontWeight: '500',
                margin: 0
              }}>
                {errorMessage || 'Verification failed.'}
              </p>
              <button 
                onClick={() => navigate('/forgot-pin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  marginTop: '12px',
                  cursor: 'pointer'
                }}
              >
                Request a new link
              </button>
            </div>
          )}

          {verificationStatus === 'verified' && (
            <>
              {/* PIN input containers */}
              <div style={{ width: '100%', position: 'relative' }}>
                {renderPINInput(pin, 'New PIN')}
                <input
                  type="number"
                  inputMode="numeric"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', zIndex: 10
                  }}
                />
              </div>

              <div style={{ width: '100%', position: 'relative', marginTop: '10px' }}>
                {renderPINInput(confirmPin, 'Confirm new PIN')}
                <input
                  type="number"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer', zIndex: 10
                  }}
                />
                
                {showMatchError && (
                  <p style={{
                    fontSize: '12px',
                    color: '#EF4444',
                    marginTop: '-15px',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    PINs don't match
                  </p>
                )}
              </div>

              {/* Submit Error */}
              {error && (
                <p style={{
                  fontSize: '13px',
                  color: '#EF4444',
                  margin: '16px 0',
                  fontWeight: '500',
                  textAlign: 'center',
                }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleResetPIN}
                disabled={loading || !pinsMatch}
                style={{
                  width: '100%',
                  height: '56px',
                  borderRadius: '16px',
                  border: 'none',
                  background: !pinsMatch || loading ? 'rgba(0,230,118,0.3)' : '#00E676',
                  color: '#000000',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: '800',
                  fontSize: '15px',
                  letterSpacing: '0.05em',
                  cursor: !pinsMatch || loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: pinsMatch && !loading ? '0 0 24px rgba(0,230,118,0.3)' : 'none',
                  transition: 'all 0.2s ease',
                  marginTop: '16px',
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000',
                      animation: 'spin 0.8s linear infinite',
                    }}/>
                    Updating...
                  </>
                ) : (
                  'Update PIN'
                )}
              </button>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ResetPin;

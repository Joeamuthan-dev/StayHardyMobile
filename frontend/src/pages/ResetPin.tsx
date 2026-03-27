import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { hashPin } from '../utils/pinUtils';
import { padPinForAuth } from '../utils/pinUtils';

type VerificationStatus = 'verifying' | 'verified' | 'error' | 'success';

const ResetPin: React.FC = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Verification states
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const extractAndVerifyToken = async () => {
      try {
        // Step 1: Parse URL hash
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));

        // Step 2: Check for error FIRST
        const error = params.get('error');
        const errorCode = params.get('error_code');
        const errorDescription = params.get('error_description');
        
        if (error) {
          const message = errorCode === 'otp_expired'
            ? 'This reset link has expired. Please request a new one.'
            : errorDescription?.replace(/\+/g, ' ')
              || 'Invalid reset link. Please request a new one.';
          console.error('[ResetPIN] Recovery error:', { error, errorCode, message });
          setStatus('error');
          setErrorMessage(message);
          return;
        }

        // Step 3: Extract success token
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        console.log('[ResetPIN] URL hash parsing:', { hasToken: !!accessToken, type });
        
        if (accessToken && type === 'recovery') {
          console.log('[ResetPIN] Valid recovery token detected. Authenticating session...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (sessionError || !data.session) {
            console.error('[ResetPIN] setSession error:', sessionError);
            setStatus('error');
            setErrorMessage('Reset link is invalid or expired.');
            return;
          }
          
          console.log('[ResetPIN] Session verified successfully.');
          setStatus('verified');
          return;
        }
        
        // Fallback: listen for PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' && session) {
            console.log('[ResetPIN] PASSWORD_RECOVERY event detected via listener.');
            setStatus('verified');
          }
        });
        
        // Safety timeout — never hang forever (4 seconds)
        const timeout = setTimeout(() => {
          setStatus(prev => {
            if (prev === 'verifying') {
              console.warn('[ResetPIN] Verification timeout exceeded.');
              setErrorMessage('Could not verify reset link. Please request a new one.');
              return 'error';
            }
            return prev;
          });
        }, 4000);
        
        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
        
      } catch (err) {
        console.error('[ResetPIN] Unexpected extraction error:', err);
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    };
    
    extractAndVerifyToken();
  }, []);

  const handleResetPIN = async () => {
    if (status !== 'verified') return;
    
    if (pin.length !== 4) {
      setSubmitError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setSubmitError("PINs don't match.");
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      // Step 5: Submit handler
      const paddedPin = padPinForAuth(pin); // Should be 'SH' + pin
      const hashedPin = await hashPin(pin); // SHA-256
      
      // Update Supabase Auth password
      const { error: updateError } = await supabase.auth.updateUser({
        password: paddedPin
      });
      
      if (updateError) throw updateError;
      
      // Update public.users pin hash
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('users')
          .update({ pin: hashedPin })
          .eq('id', session.user.id);
      }
      
      // Success
      setStatus('success');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (err: any) {
      console.error('[ResetPIN] Update failed:', err);
      setSubmitError(err?.message || 'Update failed. Please try again.');
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
      {status === 'success' ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '40px',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '28px',
            color: '#FFFFFF',
            margin: '0 0 12px 0',
          }}>
            PIN Updated Successfully!
          </h2>
          <p style={{
            fontSize: '15px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: '1.6',
          }}>
            Redirecting to login...
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

          {/* STATE: verifying */}
          {status === 'verifying' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '60px',
              gap: '16px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '3px solid rgba(0,230,118,0.2)',
                borderTop: '3px solid #00E676',
                animation: 'spin 0.8s linear infinite',
              }}/>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
              }}>
                Verifying your reset link...
              </p>
            </div>
          )}

          {/* STATE: error */}
          {status === 'error' && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '20px',
              padding: '24px',
              marginTop: '40px',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
              <p style={{
                fontSize: '15px',
                color: '#EF4444',
                fontWeight: '600',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}>
                {errorMessage || 'Verification failed.'}
              </p>
              <button 
                onClick={() => navigate('/forgot-pin', { replace: true })}
                style={{
                  width: '100%',
                  height: '48px',
                  background: '#00E676',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '800',
                  fontFamily: 'Syne, sans-serif',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0,230,118,0.2)'
                }}
              >
                Request New Link
              </button>
            </div>
          )}

          {/* STATE: verified */}
          {status === 'verified' && (
            <>
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
              {submitError && (
                <p style={{
                  fontSize: '13px',
                  color: '#EF4444',
                  margin: '16px 0',
                  fontWeight: '500',
                  textAlign: 'center',
                }}>
                  {submitError}
                </p>
              )}

              {/* Submit Button */}
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

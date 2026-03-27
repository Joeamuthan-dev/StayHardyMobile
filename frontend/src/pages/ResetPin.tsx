import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { hashPin } from '../utils/pinUtils';
import { padPinForAuth } from '../utils/pinUtils';

const ResetPIN: React.FC = () => {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase automatically handles the token from URL
    // and sets the session — we just need to wait for it
    const { data: authListener } =
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setSessionReady(true);
        }
      });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleResetPIN = async () => {
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Try again.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must contain only numbers.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Update Supabase Auth password (padded PIN)
      const paddedPin = padPinForAuth(pin);
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: paddedPin,
        });
      if (updateError) throw updateError;

      // 2. Get current user
      const { data: { user } } =
        await supabase.auth.getUser();
      if (!user) throw new Error('Session expired.');

      // 3. Update PIN hash in public.users
      const hashedPin = await hashPin(pin);
      const { error: dbError } = await supabase
        .from('users')
        .update({ pin: hashedPin })
        .eq('id', user.id);
      if (dbError) throw dbError;

      setSuccess(true);

      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);

    } catch (err: any) {
      setError(
        err?.message ||
        'Reset failed. The link may have expired. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // PIN input renderer (4 digit boxes)
  const renderPINInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string
  ) => (
    <div style={{ marginBottom: '20px' }}>
      <p style={{
        fontSize: '11px',
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '10px',
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
      {/* Hidden input for keyboard */}
      <input
        type="number"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
          onChange(v);
        }}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
        }}
      />
    </div>
  );

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
        /* Success state */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '40px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>
            ✅
          </div>
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
            Your PIN has been reset successfully.
            Redirecting to login...
          </p>
        </div>
      ) : (
        <>
          {/* Icon */}
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

          {!sessionReady && (
            <p style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              Verifying your reset link...
            </p>
          )}

          {/* New PIN input */}
          <div
            onClick={() => {
              const input = document.getElementById('pin-input-1');
              if (input) input.focus();
            }}
            style={{ width: '100%', position: 'relative' }}
          >
            {renderPINInput(pin, setPin, 'New PIN')}
            <input
              id="pin-input-1"
              type="number"
              inputMode="numeric"
              value={pin}
              onChange={e => {
                const v = e.target.value
                  .replace(/\D/g, '').slice(0, 4);
                setPin(v);
              }}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Confirm PIN input */}
          <div
            onClick={() => {
              const input = document.getElementById('pin-input-2');
              if (input) input.focus();
            }}
            style={{ width: '100%', position: 'relative' }}
          >
            {renderPINInput(
              confirmPin, setConfirmPin, 'Confirm new PIN'
            )}
            <input
              id="pin-input-2"
              type="number"
              inputMode="numeric"
              value={confirmPin}
              onChange={e => {
                const v = e.target.value
                  .replace(/\D/g, '').slice(0, 4);
                setConfirmPin(v);
              }}
              style={{
                position: 'absolute',
                top: 0, left: 0,
                width: '100%', height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontSize: '13px',
              color: '#EF4444',
              margin: '-8px 0 16px 0',
              fontWeight: '500',
              textAlign: 'center',
            }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleResetPIN}
            disabled={
              loading ||
              !sessionReady ||
              pin.length !== 4 ||
              confirmPin.length !== 4
            }
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              border: 'none',
              background:
                loading || !sessionReady ||
                pin.length !== 4 || confirmPin.length !== 4
                  ? 'rgba(0,230,118,0.3)'
                  : '#00E676',
              color: '#000000',
              fontFamily: 'Syne, sans-serif',
              fontWeight: '800',
              fontSize: '15px',
              letterSpacing: '0.05em',
              cursor:
                loading || !sessionReady ||
                pin.length !== 4 || confirmPin.length !== 4
                  ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow:
                !loading && sessionReady &&
                pin.length === 4 && confirmPin.length === 4
                  ? '0 0 24px rgba(0,230,118,0.3)'
                  : 'none',
              transition: 'all 0.2s ease',
              marginTop: '8px',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2.5px solid rgba(0,0,0,0.3)',
                  borderTop: '2.5px solid #000',
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ResetPIN;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; // Based on research, src/supabase.ts is the canonical export

const ForgotPIN: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendReset = async () => {
    if (!email.trim()) {
      setError('Enter your registered email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: 'https://stayhardy.com/auth/reset',
        });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 24px',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 24px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
      boxSizing: 'border-box',
    }}>

      {/* Back button */}
      <button
        onClick={() => navigate('/login')}
        style={{
          alignSelf: 'flex-start',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          marginBottom: '40px',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

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

      {!sent ? (
        <>
          {/* Heading */}
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '32px',
            color: '#ffffff',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
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
          }}>
            Enter your registered email. We'll send you
            a secure link to reset your PIN.
          </p>

          {/* Email input */}
          <div style={{
            background: '#0A0A0A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '12px',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendReset()}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '15px',
                fontWeight: '500',
                color: '#FFFFFF',
                caretColor: '#00E676',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontSize: '13px',
              color: '#EF4444',
              margin: '0 0 16px 0',
              fontWeight: '500',
            }}>
              {error}
            </p>
          )}

          {/* Submit button */}
          <button
            onClick={handleSendReset}
            disabled={loading}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              border: 'none',
              background: loading
                ? 'rgba(0,230,118,0.4)'
                : '#00E676',
              color: '#000000',
              fontFamily: 'Syne, sans-serif',
              fontWeight: '800',
              fontSize: '15px',
              letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: loading
                ? 'none'
                : '0 0 24px rgba(0,230,118,0.3)',
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
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </>
      ) : (
        /* Success state */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          paddingTop: '20px',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
          }}>
            📬
          </div>

          <h2 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: '800',
            fontSize: '24px',
            color: '#FFFFFF',
            margin: '0 0 12px 0',
          }}>
            Check your inbox
          </h2>

          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: '1.6',
            margin: '0 0 32px 0',
          }}>
            We sent a reset link to{' '}
            <span style={{ color: '#00E676', fontWeight: '600' }}>
              {email}
            </span>
            {'. '}
            Click the link in the email to set a new PIN.
          </p>

          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.25)',
            marginBottom: '32px',
          }}>
            Didn't receive it? Check your spam folder
            or try again.
          </p>

          <button
            onClick={() => setSent(false)}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px 24px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            Try a different email
          </button>

          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#00E676',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
            }}
          >
            Back to Login
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ForgotPIN;

// src/pages/VerifyEmail.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, RefreshCw } from 'lucide-react';
import { storage } from '../utils/storage';
import { supabase } from '../supabase';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const loadEmail = async () => {
      const value = await storage.get('pending_verification_email');
      if (value) setEmail(value);
    };
    loadEmail();
  }, []);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setIsResending(true);
    setResendMessage('');
    setResendError('');

    console.log('[VerifyEmail] Attempting resend to:', email);

    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'https://stayhardy.com/auth/verify'
        }
      });

      // Log full details — stringify so it shows in Android logcat
      console.log('[VerifyEmail] Resend data:', JSON.stringify(data));
      console.log('[VerifyEmail] Resend error:', JSON.stringify(error));

      if (error) {
        console.error('[VerifyEmail] Error code:', error.status);
        console.error('[VerifyEmail] Error message:', error.message);
        console.error('[VerifyEmail] Error details:', JSON.stringify(error));
        setResendError(`Failed: ${error.message}`);
      } else {
        console.log('[VerifyEmail] Resend SUCCESS — data:', JSON.stringify(data));
        setResendMessage("Mail sent again. Check your inbox, soldier.");
        setCooldown(60);
      }

    } catch (err: any) {
      console.error('[VerifyEmail] CAUGHT ERROR:', err?.message || JSON.stringify(err));
      setResendError(`Error: ${err?.message || 'Unknown error'}`);
    }

    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 relative selection:bg-[#00E676] selection:text-black">

      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-[#0A0A0A] border border-[#00E676]/20
                      flex items-center justify-center mb-8
                      shadow-[0_0_30px_rgba(0,230,118,0.1)]">
        <Mail size={36} className="text-[#00E676]" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h1 className="text-white font-extrabold text-3xl tracking-tight
                     text-center mb-3">
        Check Your Inbox.
      </h1>

      {/* Subtitle */}
      <p className="text-white/40 text-sm text-center leading-relaxed mb-2 px-4">
        Activation mail deployed to
      </p>
      <p className="text-[#00E676] text-sm font-medium text-center mb-8 tracking-wide">
        {email || 'your email address'}
      </p>

      {/* Instruction */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl px-6 py-5 mb-8 w-full max-w-sm">
        <p className="text-white/50 text-xs text-center leading-relaxed tracking-wide">
          Click the activation link in the email to unlock your account.
          The app will open automatically once verified.
        </p>
      </div>

      {/* Spam warning — prominent */}
      <div style={{
        width: '100%', maxWidth: '360px',
        background: 'rgba(251,191,36,0.08)',
        border: '1px solid rgba(251,191,36,0.35)',
        borderRadius: '14px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex', alignItems: 'flex-start', gap: '10px',
      }}>
        <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>⚠️</span>
        <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: 'rgba(251,191,36,0.9)', fontWeight: 600 }}>
          Can't find the email?{' '}
          <span style={{ color: '#FCD34D', fontWeight: 800, textDecoration: 'underline' }}>
            Check your Spam / Junk folder.
          </span>
          {' '}Gmail and other providers often filter activation emails.
        </p>
      </div>

      <button
        onClick={handleResend}
        disabled={isResending || cooldown > 0}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl
                   border border-[#00E676]/30 bg-[#00E676]/5
                   text-[#00E676] text-sm font-medium
                   active:scale-95 transition-all duration-150
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RefreshCw
          size={14}
          strokeWidth={2}
          className={isResending ? 'animate-spin' : ''}
        />
        {isResending
          ? 'Sending...'
          : cooldown > 0
          ? `Resend in ${cooldown}s`
          : 'Resend Activation Mail'
        }
      </button>

      {/* Feedback messages */}
      {resendMessage && (
        <p className="text-[#00E676] text-xs tracking-wide mt-4 text-center">
          {resendMessage}
        </p>
      )}
      {resendError && (
        <p className="text-red-400 text-xs tracking-wide mt-4 text-center">
          {resendError}
        </p>
      )}

      {/* Back to login */}
      <p className="text-white/20 text-xs text-center mt-10">
        Wrong email?{' '}
        <span
          onClick={() => navigate('/signup')}
          className="text-[#00E676]/60 cursor-pointer hover:underline"
        >
          Go back and re-register.
        </span>
      </p>

      {/* Login link fix */}
      <div className="mt-8 text-center">
        <p className="text-white/20 text-xs mb-2">
          Already activated your account?
        </p>
        <button
          onClick={() => navigate('/login')}
          className="text-[#00E676] text-sm font-medium
                     tracking-wide active:opacity-70
                     transition-opacity"
        >
          Go to Sign In →
        </button>
      </div>

    </div>
  );
}

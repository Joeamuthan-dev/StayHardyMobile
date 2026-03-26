// src/pages/SignUp.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { storage } from '../utils/storage';
import { supabase } from '../supabase';
import { hashPin } from '../utils/pinUtils';

export default function SignUp() {
  const navigate = useNavigate();
  
  // STATE VARIABLES
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const pinInputRef = useRef<HTMLInputElement>(null);
  const confirmPinInputRef = useRef<HTMLInputElement>(null);

  // Diagnostic check for Supabase connectivity
  useEffect(() => {
    const checkSupabaseConfig = async () => {
      try {
        // Test basic Supabase connectivity
        const { data, error } = await supabase.auth.getSession();
        console.log('[SignUp] Supabase session check:', JSON.stringify(data));
        console.log('[SignUp] Supabase session error:', JSON.stringify(error));

        // Log the Supabase URL being used
        console.log('[SignUp] Supabase URL:', 
          import.meta.env.VITE_SUPABASE_URL || 'NOT SET');

      } catch (err: any) {
        console.error('[SignUp] Supabase config check failed:', err?.message);
      }
    };
    checkSupabaseConfig();
  }, []);

  // Prevent keyboard auto-trigger on mount
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  // Direct Resend API fallback if Supabase SMTP fails
  const sendActivationEmailDirect = async (
    userEmail: string,
    userName: string
  ) => {
    try {
      const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

      if (!RESEND_API_KEY) {
        console.warn('[SignUp] VITE_RESEND_API_KEY not set — skipping direct send');
        return;
      }

      console.log('[SignUp] Attempting direct Resend API call...');

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'StayHardy <noreply@stayhardy.com>',
          to: [userEmail],
          subject: 'Welcome to Stay Hardy — Activate Your Account',
          xml: null, // Ensure clear body
          html: `
            <div style="background:#000000;padding:40px;font-family:sans-serif;">
              <h1 style="color:#00E676;font-size:32px;margin-bottom:8px;">
                STAY HARDY
              </h1>
              <p style="color:#ffffff;font-size:12px;
                        letter-spacing:0.2em;margin-bottom:32px;">
                THE 1% STARTS HERE.
              </p>
              <h2 style="color:#ffffff;font-size:20px;margin-bottom:16px;">
                Welcome, ${userName}.
              </h2>
              <p style="color:rgba(255,255,255,0.6);font-size:14px;
                        line-height:1.7;margin-bottom:32px;">
                Your account is ready. One last step — activate it
                by clicking the button below.
              </p>
              <a href="https://stayhardy.com/auth/verify"
                 style="display:inline-block;background:#00E676;
                        color:#000000;font-weight:700;font-size:14px;
                        padding:16px 32px;border-radius:12px;
                        text-decoration:none;letter-spacing:0.05em;">
                ACTIVATE MY ACCOUNT
              </a>
              <p style="color:rgba(255,255,255,0.3);font-size:12px;
                        margin-top:32px;">
                If you didn't sign up for Stay Hardy, ignore this email.
              </p>
            </div>
          `,
        }),
      });

      const result = await response.json();
      console.log('[SignUp] Direct Resend result:', JSON.stringify(result));

      if (response.ok) {
        console.log('[SignUp] ✅ Direct email sent successfully');
      } else {
        console.error('[SignUp] ❌ Direct email failed:', JSON.stringify(result));
      }

    } catch (err: any) {
      console.error('[SignUp] Direct Resend exception:', err?.message);
    }
  };

  const handleSignUp = async () => {
    // VALIDATION
    if (!fullName.trim()) {
      setErrorMessage("A soldier without a name? Fill this in.");
      return;
    }
    if (!isValidEmail(email)) {
      setErrorMessage("That doesn't look like a valid command. Check your email.");
      return;
    }
    if (pin.length < 4) {
      setErrorMessage("Your PIN must be exactly 4 digits. No shortcuts.");
      return;
    }
    if (pin !== confirmPin) {
      setErrorMessage("PINs don't match. Eyes on the target.");
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      /**
       * STEP 1 — CHECK EMAIL IN public.users TABLE
       */
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error('[SignUp] Email check error:', JSON.stringify(checkError));
        // Non-fatal — continue with signup attempt
      }

      if (existingUser) {
        // Email already registered — show branded message
        setIsLoading(false);
        setErrorMessage("This soldier already has a post. Sign in instead.");
        return; // STOP — do not proceed to signUp()
      }

      /**
       * SUPABASE SIGN UP CALL with FULL LOGGING
       */
      console.log('[SignUp] Starting signup for:', email.trim().toLowerCase());
      console.log('[SignUp] emailRedirectTo: https://stayhardy.com/auth/verify');

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: pin + '_secure_pin', // Salted PIN as per project security standard
        options: {
          emailRedirectTo: 'https://stayhardy.com/auth/verify',
          data: {
            full_name: fullName.trim(),
          }
        }
      });

      console.log('[SignUp] Raw response data:', JSON.stringify(data));
      console.log('[SignUp] Raw response error:', JSON.stringify(error));

      if (data?.user) {
        console.log('[SignUp] User ID:', data.user.id);
        console.log('[SignUp] User email:', data.user.email);
        console.log('[SignUp] Email confirmed at:', data.user.email_confirmed_at);
        console.log('[SignUp] Confirmation sent at:', data.user.confirmation_sent_at);
        console.log('[SignUp] Identities:', JSON.stringify(data.user.identities));
      }

      if (error) {
        console.error('[SignUp] Auth error status:', error.status);
        console.error('[SignUp] Auth error message:', error.message);
        console.error('[SignUp] Auth error full:', JSON.stringify(error));

        setIsLoading(false);

        if (
          error.message?.toLowerCase().includes('already registered') ||
          error.message?.toLowerCase().includes('already exists') ||
          error.message?.toLowerCase().includes('user already') ||
          error.message?.toLowerCase().includes('email address is already') ||
          error.status === 422
        ) {
          setErrorMessage("This soldier already has a post. Sign in instead.");
        } else if (
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('fetch')
        ) {
          setErrorMessage("The system is down. Even machines need rest. Try again.");
        } else if (
          error.message?.toLowerCase().includes('invalid email')
        ) {
          setErrorMessage("That doesn't look like a valid command. Check your email.");
        } else {
          setErrorMessage("Recruitment failed. Check your details and try again.");
          console.error('[SignUp] Unhandled error:', JSON.stringify(error));
        }
        return;
      }

      // CRITICAL CHECK: If user exists but identities array is empty
      // this means the email is already registered
      if (data?.user && data.user.identities?.length === 0) {
        console.warn('[SignUp] User exists but identities empty — duplicate email');
        setIsLoading(false);
        setErrorMessage("This soldier already has a post. Sign in instead.");
        return;
      }

      // Check if confirmation email was scheduled
      if (data?.user?.confirmation_sent_at) {
        console.log('[SignUp] ✅ Confirmation email scheduled at:', 
          data.user.confirmation_sent_at);
      } else {
        console.warn('[SignUp] ⚠️ confirmation_sent_at is null — email may not send');
      }

      /**
       * PROFILE INSERT (Always HASH on new registration)
       */
      if (data.user) {
        // ENFORCE BCRYPT HASHING BEFORE INSERT
        const hashedPin = await hashPin(pin);
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            name: fullName.trim(),
            pin: hashedPin,
            status: 'online',
            created_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('Profile insert error (Non-fatal):', profileError);
        }

        // FALLBACK: Calling direct Resend API fallback if enabled
        sendActivationEmailDirect(
          email.trim().toLowerCase(),
          fullName.trim()
        );
      }

      setIsLoading(false);

      /**
       * SUCCESS FLOW — REDIRECT TO VERIFICATION PENDING
       */
      await storage.set('pending_verification_email', email.trim().toLowerCase());
      
      // We clear the user_session to ensure they MUST verify before home entry
      await storage.remove('user_session');

      // Navigate to verification briefing
      navigate('/verify-email');

    } catch (err: any) {
      console.error('[SignUp] CAUGHT EXCEPTION:', err?.message);
      console.error('[SignUp] Full exception:', JSON.stringify(err));
      setIsLoading(false);
      setErrorMessage("Recruitment failed. Check your details and try again.");
    }
  };

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(val);
    if (val.length === 4) {
      pinInputRef.current?.blur();
    }
  };

  const handleConfirmPinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setConfirmPin(val);
    if (val.length === 4) {
      confirmPinInputRef.current?.blur();
    }
  };

  const isFormValid = 
    fullName.trim() !== '' && 
    isValidEmail(email) && 
    pin.length === 4 && 
    confirmPin.length === 4 && 
    pin === confirmPin && 
    !isLoading;

  const pinDotStyle = {
    background: '#0A0A0A',
    boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.8), inset -2px -2px 4px rgba(255,255,255,0.04), 0 1px 0 rgba(255,255,255,0.06)'
  };

  return (
    <div className="signup-page-root min-h-screen bg-black flex flex-col items-center px-6 selection:bg-[#00E676] selection:text-black relative overflow-y-auto pb-12">
      
      {/* 1. BACK BUTTON */}
      <button
        onClick={() => navigate('/login')}
        className="absolute top-12 left-5 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:bg-white/10 active:scale-95 transition-all duration-100 z-20"
      >
        <ChevronLeft size={28} className="text-white" strokeWidth={2} />
      </button>

      {/* 2. BRANDING BLOCK */}
      <div className="flex flex-col items-center justify-center mt-24 mb-8">
        <h1 className="text-white font-extrabold text-5xl tracking-tight text-center leading-none mb-3">
          STAY HARDY
        </h1>
        <p className="text-[#00E676] text-sm font-medium tracking-[0.2em] uppercase text-center">
          The 1% starts here.
        </p>
      </div>

      {/* 3. FORM CARD */}
      <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/5 rounded-3xl px-6 py-8 mx-auto space-y-6">
        
        {/* FULL NAME */}
        <div className="space-y-2">
          <label className="text-white/60 text-sm font-medium ml-1">Full Name</label>
          <input
            type="text"
            autoFocus={false}
            autoComplete="name"
            placeholder="Your name, soldier"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:border-[#00E676]/50 focus:outline-none transition-all text-sm"
          />
        </div>

        {/* EMAIL ADDRESS */}
        <div className="space-y-2">
          <label className="text-white/60 text-sm font-medium ml-1">Email Address</label>
          <input
            type="email"
            autoFocus={false}
            autoComplete="off"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:border-[#00E676]/50 focus:outline-none transition-all text-sm"
          />
        </div>

        {/* CREATE PIN */}
        <div className="space-y-1">
          <label className="text-white/60 text-sm font-medium ml-1">Create Your PIN</label>
          <p className="text-white/25 text-xs ml-1 mb-4">4-digit code. Remember it.</p>
          
          <div 
            className="relative flex gap-5 justify-center items-center py-2"
            onClick={() => {
              pinInputRef.current?.focus();
            }}
          >
            <input
              ref={pinInputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus={false}
              maxLength={4}
              value={pin}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              onChange={handlePinInput}
            />
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={pinDotStyle}
              >
                {pin.length > idx && (
                  <div className="w-5 h-5 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.6)] animate-in zoom-in duration-200" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CONFIRM PIN */}
        <div className="space-y-1">
          <label className="text-white/60 text-sm font-medium ml-1">Confirm Your PIN</label>
          <p className="text-white/25 text-xs ml-1 mb-4">Enter it again to confirm.</p>
          
          <div 
            className="relative flex gap-5 justify-center items-center py-2"
            onClick={() => {
              confirmPinInputRef.current?.focus();
            }}
          >
            <input
              ref={confirmPinInputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus={false}
              maxLength={4}
              value={confirmPin}
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
              onChange={handleConfirmPinInput}
            />
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                style={pinDotStyle}
              >
                {confirmPin.length > idx && (
                  <div className="w-5 h-5 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.6)] animate-in zoom-in duration-200" />
                )}
              </div>
            ))}
          </div>
          
          {confirmPin.length === 4 && (
            <p className={`${pin === confirmPin ? 'text-[#00E676]' : 'text-red-400'} text-xs text-center mt-3 tracking-wide font-medium`}>
              {pin === confirmPin ? "PINs match. You're cleared." : "PINs don't match. Stay focused."}
            </p>
          )}
        </div>

        {/* 4. SIGN UP BUTTON */}
        <button
          onClick={handleSignUp}
          disabled={!isFormValid || isLoading}
          className={`w-full py-4 rounded-2xl bg-[#00E676] text-black font-black uppercase text-lg tracking-wide shadow-[0_0_24px_rgba(0,230,118,0.35)] transition-all duration-150 mt-6 ${!isFormValid || isLoading ? 'opacity-40 cursor-not-allowed' : 'opacity-100 active:scale-95'}`}
        >
          {isLoading ? 'Enlisting...' : 'Sign Up'}
        </button>

        {/* ERROR DISPLAY */}
        {errorMessage && (
          <div className="mt-3 text-center">
            <p className="text-red-400 text-xs tracking-wide font-medium mb-2">
              {errorMessage}
            </p>
            {errorMessage.includes('already has a post') && (
              <button
                onClick={() => navigate('/login')}
                className="text-[#00E676] text-xs font-medium tracking-wide underline underline-offset-2 active:opacity-70 transition-opacity"
              >
                Take me to Sign In →
              </button>
            )}
          </div>
        )}

        {/* 5. BOTTOM LINK */}
        <p className="text-white/40 text-sm text-center mt-6">
          Already a member?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-[#00E676] font-bold cursor-pointer hover:underline"
          >
            Sign In
          </span>
        </p>

      </div>
    </div>
  );
}

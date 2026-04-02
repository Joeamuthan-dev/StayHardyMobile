// src/pages/SignUp.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { storage } from '../utils/storage';
import { supabase } from '../supabase';
import { hashPin, padPinForAuth } from '../utils/pinUtils';

export default function SignUp() {
  const navigate = useNavigate();
  
  // STATE VARIABLES
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // STATE FOR SCENARIO HANDLING
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [showGoToLogin, setShowGoToLogin] = useState(false);
  
  const [pinFocused, setPinFocused] = useState(false);
  const [confirmPinFocused, setConfirmPinFocused] = useState(false);

  const pinInputRef = useRef<HTMLInputElement>(null);
  const confirmPinInputRef = useRef<HTMLInputElement>(null);

  // Prevent keyboard auto-trigger on mount
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleResend = async () => {
    setIsResending(true);
    setResendSuccess('');

    const targetEmail = email.trim().toLowerCase();

    const { error: resendError } =
      await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: 'https://stayhardy.com/auth/verify'
        }
      });

    setIsResending(false);

    if (resendError) {
      console.error('[Resend] Error:', JSON.stringify(resendError));
      setErrorMessage("Resend failed. The system resists. Try again.");
    } else {
      await storage.set('pending_verification_email', targetEmail);
      setResendSuccess("Activation mail redeployed. Check your inbox, soldier.");
      setShowResend(false);
      setTimeout(() => navigate('/verify-email'), 1500);
    }
  };

  const handleSignUp = async () => {
    // ─── VALIDATION ───────────────────────
    if (!fullName.trim()) {
      setErrorMessage("A soldier without a name? Fill this in.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
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

    // ─── RESET STATE ──────────────────────
    setIsLoading(true);
    setErrorMessage('');
    setShowResend(false);
    setShowGoToLogin(false);
    setResendSuccess('');

    try {
      // ─── ATTEMPT SIGNUP (uses PADDED pin for auth) ─────────────────
      // Start hashing PIN in parallel with signUp — pin is already known
      const hashPinPromise = hashPin(pin);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: padPinForAuth(pin),
        options: {
          emailRedirectTo: 'https://stayhardy.com/auth/verify',
          data: {
            name: fullName.trim(),
          }
        }
      });

      console.log('[SignUp] Error:', JSON.stringify(authError));
      console.log('[SignUp] User:', authData?.user?.id);
      console.log('[SignUp] Identities:', JSON.stringify(authData?.user?.identities));
      console.log('[SignUp] Confirmed at:', authData?.user?.email_confirmed_at);

      // ─── HANDLE ERRORS ────────────────────
      if (authError) {
        setIsLoading(false);

        const msg = authError.message?.toLowerCase() || '';
        const code = (authError as any).code?.toLowerCase() || '';

        // Weak password (should not happen with padding)
        if (code === 'weak_password' || msg.includes('weak_password') || msg.includes('at least')) {
          setErrorMessage("PIN too weak. Please try a different PIN.");
          return;
        }

        // Rate limited
        if (msg.includes('rate limit') || msg.includes('too many')) {
          setErrorMessage("Too many attempts. Wait a moment, soldier.");
          return;
        }

        // Generic error
        setErrorMessage("Recruitment failed. Check your details and try again.");
        console.error('[SignUp] Unhandled:', authError.message);
        return;
      }

      if (!authData?.user) {
        setIsLoading(false);
        setErrorMessage("Recruitment failed. Try again.");
        return;
      }

      // ─── CHECK IF ALREADY REGISTERED ──────
      // Supabase returns user with empty identities when email already exists with confirmation on
      if (authData.user.identities && authData.user.identities.length === 0) {
        setIsLoading(false);

        // Email exists — check if confirmed by trying to login
        const { error: checkError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: padPinForAuth(pin),
        });

        if (!checkError) {
          // Login worked = activated account
          // Sign out immediately — they should use login page
          void supabase.auth.signOut();
          setErrorMessage("This soldier already has a post. Sign in instead.");
          setShowGoToLogin(true);
        } else {
          const errMsg = checkError.message?.toLowerCase() || '';
          if (errMsg.includes('not confirmed') || errMsg.includes('email not confirmed')) {
            // Exists but not confirmed
            setErrorMessage("Your account exists but isn't activated yet. Check your inbox or resend below.");
            setShowResend(true);
            await storage.set('pending_verification_email', email.trim().toLowerCase());
          } else {
            // Exists but wrong PIN entered
            setErrorMessage("This soldier already has a post. Sign in instead.");
            setShowGoToLogin(true);
          }
        }
        return;
      }

      // ─── NEW USER SUCCESS ──────────────────
      // Insert profile into public.users — NON-FATAL, run in background
      const userId = authData.user.id;
      const userEmail = email.trim().toLowerCase();
      const userName = fullName.trim();
      void hashPinPromise.then((hashedPin) =>
        supabase.from('users').insert({
          id: userId,
          email: userEmail,
          name: userName,
          pin: hashedPin,
          created_at: new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.error('[SignUp] Profile insert failed:', error.message);
          else console.log('[SignUp] Profile created ✅');
        })
      ).catch((hashErr: any) => {
        console.error('[SignUp] Hash error:', hashErr?.message);
      });

      // ─── STEP 4: SAVE PENDING + NAVIGATE ───
      setIsLoading(false);
      void storage.set('pending_verification_email', email.trim().toLowerCase());
      void storage.remove('user_session');
      navigate('/verify-email');
    } catch (err: any) {
      console.error('[SignUp] Caught exception:', err?.message);
      setIsLoading(false);
      setErrorMessage("Recruitment failed. Try again.");
    }
  };

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(val);
    if (val.length === 4) pinInputRef.current?.blur();
  };

  const handleConfirmPinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setConfirmPin(val);
    if (val.length === 4) confirmPinInputRef.current?.blur();
  };

  const isFormValid = 
    fullName.trim() !== '' && 
    isValidEmail(email) && 
    pin.length === 4 && 
    confirmPin.length === 4 && 
    pin === confirmPin && 
    !isLoading;

  const pinDotStyle = (focused: boolean, filledLen: number, idx: number) => {
    const isFilled = filledLen > idx;
    const isActive = focused && idx === filledLen;
    return {
      width: '56px', height: '56px', borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0A0A0A',
      border: isActive ? '2px solid rgba(255,255,255,0.85)' : isFilled ? '2px solid rgba(0,230,118,0.5)' : '2px solid rgba(255,255,255,0.1)',
      boxShadow: isActive ? '0 0 0 3px rgba(255,255,255,0.12), inset 0 4px 10px rgba(0,0,0,0.8)' : 'inset 0 4px 10px rgba(0,0,0,0.8)',
      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    };
  };

  return (
    <div className="signup-page-root min-h-screen bg-black flex flex-col items-center px-6 selection:bg-[#00E676] selection:text-black relative overflow-y-auto pb-12">
      <style>{`@keyframes pinCursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      
      {/* 1. BACK BUTTON */}
      <button
        onClick={() => navigate('/login')}
        className="absolute top-12 left-5 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center active:bg-white/10 active:scale-95 transition-all duration-100 z-20"
      >
        <ChevronLeft size={28} className="text-white" strokeWidth={2} />
      </button>

      {/* 2. BRANDING BLOCK */}
      <div className="flex flex-col items-center justify-center mt-24 mb-8">
        <h1 className="text-white font-extrabold text-5xl tracking-tight text-center leading-none mb-3">STAY HARDY</h1>
        <p className="text-[#00E676] text-sm font-medium tracking-[0.2em] uppercase text-center">The 1% starts here.</p>
      </div>

      {/* 3. FORM CARD */}
      <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/5 rounded-3xl px-6 py-8 mx-auto space-y-6">
        
        <div className="space-y-2">
          <label className="text-white/60 text-sm font-medium ml-1">Full Name</label>
          <input
            type="text"
            placeholder="Your name, soldier"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:border-[#00E676]/50 focus:outline-none transition-all text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-white/60 text-sm font-medium ml-1">Email Address</label>
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:border-[#00E676]/50 focus:outline-none transition-all text-sm"
          />
        </div>

        {/* PIN INPUTS */}
        <div className="space-y-1">
          <label className="text-white/60 text-sm font-medium ml-1">Create Your PIN</label>
          <div className="relative flex gap-5 justify-center items-center py-2" onClick={() => pinInputRef.current?.focus()}>
            <input ref={pinInputRef} type="tel" inputMode="numeric" value={pin} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} onChange={handlePinInput} onFocus={() => setPinFocused(true)} onBlur={() => setPinFocused(false)} />
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} style={pinDotStyle(pinFocused, pin.length, idx)}>
                {pin.length > idx && <div className="w-5 h-5 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.6)] animate-in zoom-in duration-200" />}
                {pinFocused && idx === pin.length && <div style={{ width: '2px', height: '20px', background: 'rgba(255,255,255,0.7)', borderRadius: '1px', animation: 'pinCursor 1s ease-in-out infinite' }} />}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-white/60 text-sm font-medium ml-1">Confirm Your PIN</label>
          <div className="relative flex gap-5 justify-center items-center py-2" onClick={() => confirmPinInputRef.current?.focus()}>
            <input ref={confirmPinInputRef} type="tel" inputMode="numeric" value={confirmPin} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} onChange={handleConfirmPinInput} onFocus={() => setConfirmPinFocused(true)} onBlur={() => setConfirmPinFocused(false)} />
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} style={pinDotStyle(confirmPinFocused, confirmPin.length, idx)}>
                {confirmPin.length > idx && <div className="w-5 h-5 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.6)] animate-in zoom-in duration-200" />}
                {confirmPinFocused && idx === confirmPin.length && <div style={{ width: '2px', height: '20px', background: 'rgba(255,255,255,0.7)', borderRadius: '1px', animation: 'pinCursor 1s ease-in-out infinite' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* SIGN UP BUTTON */}
        <button
          onClick={handleSignUp}
          disabled={!isFormValid || isLoading}
          className={`w-full py-4 rounded-2xl bg-[#00E676] text-black font-black uppercase text-lg tracking-wide shadow-[0_0_24px_rgba(0,230,118,0.35)] transition-all duration-150 mt-6 ${!isFormValid || isLoading ? 'opacity-40 cursor-not-allowed' : 'opacity-100 active:scale-95'}`}
        >
          {isLoading ? 'Enlisting...' : 'Sign Up'}
        </button>

        {/* ERROR UI BLOCK */}
        {errorMessage && (
          <div className="mt-4 text-center">
            <p className="text-red-400 text-xs tracking-wide font-medium mb-3 leading-relaxed px-2">
              {errorMessage}
            </p>

            {/* Go to login — SignUp only */}
            {showGoToLogin && (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-2xl bg-[#00E676] text-black font-bold text-sm uppercase tracking-wide active:scale-95 transition-all duration-150 shadow-[0_0_20px_rgba(0,230,118,0.35)]"
              >
                Take Me to Sign In →
              </button>
            )}

            {/* Resend button */}
            {showResend && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full py-4 rounded-2xl bg-[#00E676] text-black font-bold text-sm uppercase tracking-wide active:scale-95 transition-all duration-150 shadow-[0_0_20px_rgba(0,230,118,0.35)] disabled:opacity-40"
                >
                  {isResending ? 'Deploying Mail...' : 'Resend Activation Mail →'}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3 rounded-2xl border border-white/10 text-white/50 text-sm active:scale-95 transition-all duration-150"
                >
                  Try Sign In Instead
                </button>
              </div>
            )}

            {resendSuccess && (
              <p className="text-[#00E676] text-xs tracking-wide mt-3 font-medium">
                {resendSuccess}
              </p>
            )}
          </div>
        )}

        <p className="text-white/40 text-sm text-center mt-6">
          Already a member?{' '}
          <span onClick={() => navigate('/login')} className="text-[#00E676] font-bold cursor-pointer hover:underline">Sign In</span>
        </p>

      </div>
    </div>
  );
}

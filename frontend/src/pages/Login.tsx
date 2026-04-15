// src/pages/Login.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { storage } from '../utils/storage';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { processSyncQueue } from '../lib/syncQueue';
import { hashPin, padPinForAuth } from '../utils/pinUtils';

const Login: React.FC = () => {
  const { setCurrentUser, markLoginComplete } = useAuth();
  const { setLoading: _setGlobalLoading } = useLoading(); void _setGlobalLoading;
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(''); 
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // STATE FOR SCENARIO HANDLING
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  const [pinFocused, setPinFocused] = useState(false);

  // PIN Ref for focus management
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Disable Auto-Focus Keyboard Pop on mount
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  // Initialize credentials from storage
  useEffect(() => {
    const initRemembered = async () => {
      try {
        const { value: e } = await SecureStoragePlugin.get({ key: 'saved_email' }).catch(() => ({ value: null }));
        if (e) {
          setRememberMe(true);
          setEmail(e);
        } else {
          const e = await storage.get('saved_email').catch(() => null);
          if (e) {
            setRememberMe(true);
            setEmail(e);
          }
        }
      } catch (err) {
        console.warn('Credential retrieval failed:', err);
      }
    };
    initRemembered();
  }, []);

  // Sync state with auth context
  // If user somehow has valid session on login page
  // redirect them to home
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } =
        await supabase.auth.getSession();
      if (session) {
        navigate('/home', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

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

  const handleLogin = async () => {
    // ─── VALIDATION ───────────────────────
    if (!email.trim()) {
      setErrorMessage("That doesn't look like a valid command. Check your email.");
      return;
    }

    if (pin.length < 4) {
      setErrorMessage("Your PIN is your vault key. Enter it.");
      return;
    }

    // ─── RESET STATE ──────────────────────
    setIsLoading(true);
    setErrorMessage('');
    setShowResend(false);
    setResendSuccess('');

    try {
      // ─── ATTEMPT LOGIN (uses PADDED pin for auth) ────────────
      // Let Supabase Auth decide everything
      // auth.users is the source of truth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: padPinForAuth(pin),
      });

      console.log('[Login] Error:', JSON.stringify(authError));
      console.log('[Login] Error msg:', authError?.message);
      console.log('[Login] Error code:', (authError as any)?.code);
      console.log('[Login] Error status:', authError?.status);
      console.log('[Login] User:', authData?.user?.id);

      // ─── HANDLE ERRORS ────────────────────
      if (authError) {
        setIsLoading(false);

        const msg = authError.message?.toLowerCase() || '';
        const code = (authError as any).code?.toLowerCase() || '';

        // NOT VERIFIED — show resend
        if (
          msg.includes('email not confirmed') ||
          msg.includes('not confirmed') ||
          msg.includes('confirmation') ||
          msg.includes('unconfirmed') ||
          code === 'email_not_confirmed'
        ) {
          setErrorMessage("Your account isn't activated yet, soldier. Resend the activation mail below.");
          setShowResend(true);
          await storage.set('pending_verification_email', email.trim().toLowerCase());
          return;
        }

        // WRONG PIN or USER NOT FOUND
        if (
          msg.includes('invalid login') ||
          msg.includes('invalid credentials') ||
          msg.includes('user not found') ||
          msg.includes('no user') ||
          authError.status === 400
        ) {
          setErrorMessage("Wrong code. The 1% don't give up — try again.");
          return;
        }

        // NETWORK ERROR
        if (msg.includes('network') || msg.includes('fetch')) {
          setErrorMessage("The system is down. Even machines need rest. Try again.");
          return;
        }

        setErrorMessage("Access denied. Your credentials didn't make the cut.");
        return;
      }

      // ─── LOGIN SUCCESS ─────────────────────
      if (!authData?.user) {
        setIsLoading(false);
        setErrorMessage("Access denied. Your credentials didn't make the cut.");
        return;
      }

      console.log('[Login] Success ✅', authData.user.email);
      const cleanEmail = email.trim().toLowerCase();

      // PART 1: OPTIMISTIC CONTEXT & NAV
      // Set a minimal user object in context immediately using authData only
      setCurrentUser({
        id: authData.user.id,
        email: cleanEmail,
        name: authData.user.user_metadata?.name || cleanEmail.split('@')[0],
        isPro: false,
        role: 'user',
        avatarUrl: null,
      } as any);
      markLoginComplete();

      // Navigate to home immediately
      setIsLoading(false);
      navigate('/home', { replace: true });

      // PART 2: BACKGROUND SYNC (non-awaited async IIFE)
      (async () => {
        try {
          // 1. Fetch user record from public.users
          const { data: userRecord } = await supabase
            .from('users')
            .select('pin, id, name, is_pro, role, avatar_url')
            .eq('email', cleanEmail)
            .maybeSingle();

          // 2. Fix NULL pin
          if (userRecord && !userRecord.pin) {
            const hashedPin = await hashPin(pin);
            await supabase.from('users').update({ pin: hashedPin }).eq('id', userRecord.id);
            console.log('[Login] Fixed NULL pin silently ✅');
          }

          // 3. Create missing profile
          if (!userRecord) {
            const hashedPin = await hashPin(pin);
            await supabase.from('users').insert({
              id: authData.user.id,
              email: cleanEmail,
              name: authData.user.user_metadata?.name || 'Hardy Soldier',
              pin: hashedPin,
              created_at: new Date().toISOString(),
            });
            console.log('[Login] Created missing profile ✅');
          }

          // 4. Update context with definitive database data
          const cleanUser = {
            id: authData.user.id,
            name: userRecord?.name || authData.user.user_metadata?.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            isPro: userRecord?.is_pro === true,
            role: userRecord?.role || 'user',
            avatarUrl: userRecord?.avatar_url,
          };

          setCurrentUser(cleanUser as any);

          // 5. Write multiple storage caches
          await storage.set('cached_user_profile_' + cleanUser.id, JSON.stringify({
            user_id: cleanUser.id,
            user_name: cleanUser.name,
            user_email: cleanUser.email,
            user_avatar_url: cleanUser.avatarUrl,
            pro_member: cleanUser.isPro,
            role: cleanUser.role,
            cached_at: Date.now(),
          }));
          await storage.set('cached_user_role_' + cleanUser.id, cleanUser.isPro ? 'pro' : 'basic');
          localStorage.setItem('cached_user_id', cleanUser.id);
          localStorage.setItem('cached_is_pro', String(cleanUser.isPro));

          // 6. Clear pending verification & save session
          await storage.remove('pending_verification_email');
          await storage.set('user_session', cleanEmail);

          // 7. Save remember me credentials
          if (rememberMe) {
            await SecureStoragePlugin.set({ key: 'saved_email', value: cleanEmail }).catch(() => {});
            await SecureStoragePlugin.set({ key: 'saved_pin', value: pin }).catch(() => {});
          }

          // 8. Process sync queue
          await processSyncQueue().catch(console.error);
        } catch (err: any) {
          console.error('[Login] Background profile sync failed:', err?.message);
        }
      })();

    } catch (err: any) {
      console.error('[Login] Caught exception:', err?.message);
      setIsLoading(false);
      setErrorMessage("The system is down. Even machines need rest. Try again.");
    }
  };

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 4) {
      setPin(val);
      if (val.length >= 4) {
        pinInputRef.current?.blur();
      }
    }
  };

  const handlePinDotPress = () => {
    if (pinInputRef.current) {
      pinInputRef.current.focus();
    }
  };

  const handleBack = () => {
    navigate('/onboarding', { replace: true });
  };

  const isFormValid = email.length > 0 && pin.length === 4;

  return (
    <div className="login-page-root fixed inset-0 bg-black flex flex-col items-center px-6 selection:bg-[#00E676] selection:text-black overflow-hidden" style={{ touchAction: 'none' }}>
      <style>{`@keyframes pinCursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      
      {/* BACK BUTTON (TOP LEFT) */}
      <div 
        onClick={handleBack}
        className="absolute top-12 left-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10 active:scale-95 transition-all duration-100 cursor-pointer"
      >
        <ChevronLeft size={28} className="text-white" strokeWidth={2} />
      </div>

      {/* BRANDING HEADER */}
      <div className="flex flex-col items-center justify-center mt-36 mb-10">
        <h1 className="text-white font-extrabold text-5xl tracking-tight text-center leading-none mb-3">
          STAY HARDY
        </h1>
        <p className="text-[#00E676] text-sm font-medium tracking-[0.2em] uppercase text-center">
          The 1% starts here.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-6">
          {/* EMAIL INPUT */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 tracking-widest uppercase ml-1">Email Address</label>
            <input 
              type="email" 
              autoFocus={false}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-[#00E676] focus:ring-1 focus:ring-[#00E676] outline-none transition-all placeholder:text-white/20"
              placeholder="name@domain.com"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>

          {/* PIN DOTS (HIDDEN INPUT TRIGGER) */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-white/40 tracking-widest uppercase text-center block">
              Security PIN
            </label>
            <div 
              className="relative flex gap-6 justify-center items-center py-4 cursor-pointer" 
              onClick={handlePinDotPress}
            >
              <input
                ref={pinInputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus={false}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                value={pin}
                onChange={handlePinInput}
                onFocus={() => setPinFocused(true)}
                onBlur={() => setPinFocused(false)}
              />
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                const isActive = pinFocused && index === pin.length;
                return (
                  <div
                    key={index}
                    onClick={handlePinDotPress}
                    style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#0A0A0A',
                      border: isActive ? '2px solid rgba(255,255,255,0.85)' : isFilled ? '2px solid rgba(0,230,118,0.5)' : '2px solid rgba(255,255,255,0.1)',
                      boxShadow: isActive ? '0 0 0 3px rgba(255,255,255,0.12), inset 0 4px 10px rgba(0,0,0,0.8)' : 'inset 0 4px 10px rgba(0,0,0,0.8)',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {isFilled && (
                      <div className="w-4 h-4 rounded-full bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.6)] animate-in zoom-in duration-200" />
                    )}
                    {isActive && !isFilled && (
                      <div style={{ width: '2px', height: '20px', background: 'rgba(255,255,255,0.7)', borderRadius: '1px', animation: 'pinCursor 1s ease-in-out infinite' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTON */}
        <button 
          onClick={handleLogin}
          disabled={isLoading || !isFormValid}
          className="w-full bg-[#00E676] text-black font-black uppercase h-14 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.4)] active:scale-95 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Unlocking the Vault...' : "Let's Start"}
          <svg width="20" height="20" viewBox="0 0 24 24" className="fill-none stroke-black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => navigate('/forgot-pin')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '16px',
            padding: '8px',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            fontFamily: 'Syne, sans-serif',
            display: 'block',
            width: '100%',
            textAlign: 'center',
          }}
        >
          Forgot PIN?
        </button>

        {/* ERROR UI BLOCK */}
        {errorMessage && (
          <div className="mt-4 text-center">
            <p className="text-red-400 text-xs tracking-wide font-medium mb-3 leading-relaxed px-2">
              {errorMessage}
            </p>

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

        {/* SIGN UP LINK */}
        <div className="text-center pt-2">
          <p className="text-white/30 text-sm font-medium">
            New here?{' '}
            <span 
              onClick={() => navigate('/signup')} 
              className="text-[#00E676] font-black cursor-pointer hover:underline"
            >
              Sign Up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

// src/pages/Login.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { storage } from '../utils/storage';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { processSyncQueue } from '../lib/syncQueue';
import { isHashed, hashPin, verifyPin } from '../utils/pinUtils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login: React.FC = () => {
  const { user, loading: authLoading, setCurrentUser, markLoginComplete } = useAuth();
  const { setLoading } = useLoading();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // PIN
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showResendOption, setShowResendOption] = useState(false);

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
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/home');
    }
  }, [user, authLoading, navigate]);

  /**
   * SILENT PIN MIGRATION
   * Detects plain text PINs and hashes them in the background.
   */
  const runSilentPinMigration = async (
    userEmail: string,
    plainPin: string
  ): Promise<void> => {
    try {
      // Fetch current PIN from public.users
      const { data: userRecord, error: fetchError } = await supabase
        .from('users')
        .select('pin')
        .eq('email', userEmail)
        .single();

      if (fetchError || !userRecord) return; // Silent fail
      if (isHashed(userRecord.pin)) return; // Already migrated
      if (userRecord.pin !== plainPin) return; // Mismatch - don't touch it

      // Hash the plain text PIN
      const hashedPin = await hashPin(plainPin);

      // Silently update the record
      await supabase
        .from('users')
        .update({ pin: hashedPin })
        .eq('email', userEmail);

      console.log('Silent PIN migration successful for operative:', userEmail);
    } catch (err) {
      // Critical: Never disrupt the user flow for migration errors
      console.error('Silent PIN migration error:', err);
    }
  };

  const handleResendFromLogin = async () => {
    const pendingEmail = await storage.get('pending_verification_email');
    const targetEmail = pendingEmail || email.trim().toLowerCase();

    if (!targetEmail || !EMAIL_REGEX.test(targetEmail)) {
      setError("We need an email address to resend the activation mail.");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: 'stayhardy://auth/verify'
      }
    });

    if (!error) {
      setError('');
      setSuccessMessage("Activation mail redeployed. Check your inbox.");
      setTimeout(() => navigate('/verify-email'), 2000);
    } else {
      setError("Resend failed. Try again in a moment.");
    }
  };

  const handleLogin = useCallback(async () => {
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    setShowResendOption(false);

    try {
      const cleanEmail = email?.trim()?.toLowerCase();
      const cleanPIN = password.trim();

      // EMAIL VALIDATION ERRORS
      if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
        setError("That doesn't look like a valid command. Check your email.");
        setIsSubmitting(false);
        return;
      }

      // PIN ERRORS
      if (cleanPIN.length === 0) {
        setError("Your PIN is your vault key. Enter it.");
        setIsSubmitting(false);
        return;
      }
      if (cleanPIN.length !== 4) {
        setError("Wrong code. The 1% don't give up — try again.");
        setIsSubmitting(false);
        return;
      }

      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      // AUTHENTICATION / SERVER ERRORS: User not found
      if (dbError || !dbUser) {
        setError("We don't recognize this soldier. Check your email or sign up.");
        setIsSubmitting(false);
        return;
      }

      /**
       * HYBRID PIN VERIFICATION (Plain Text or Bcrypt)
       */
      const dbPin = dbUser.pin?.toString()?.trim() || '';
      let isPinValid = false;

      if (isHashed(dbPin)) {
        // Use bcrypt comparison for migrated accounts
        isPinValid = await verifyPin(cleanPIN, dbPin);
      } else {
        // Direct comparison for legacy plain text accounts
        isPinValid = dbPin === cleanPIN;
      }

      if (!isPinValid) {
        setError("Wrong code. The 1% don't give up — try again.");
        setIsSubmitting(false);
        return;
      }

      // Supabase Authentication with salted PIN (matches original logic)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPIN + '_secure_pin',
      });
      
      // SUPABASE ERROR HANDLING
      if (authError) {
        const msg = authError.message?.toLowerCase() || '';

        // UNVERIFIED ACCOUNT HANDLING
        if (msg.includes('email not confirmed') || msg.includes('not confirmed') || msg.includes('confirmation')) {
          await storage.set('pending_verification_email', cleanEmail);
          setError("Account not activated yet. Check your mail, soldier.");
          setTimeout(() => setShowResendOption(true), 2000);
          setIsSubmitting(false);
          return;
        }

        if (msg.includes('invalid login') || msg.includes('incorrect')) {
          setError("Access denied. Your credentials didn't make the cut.");
        } else if (msg.includes('user not found') || msg.includes('no user')) {
          setError("We don't recognize this soldier. Check your email or sign up.");
        } else if (msg.includes('network') || msg.includes('fetch')) {
          setError("The system is down. Even machines need rest. Try again.");
        } else {
          setError("Access denied. Your credentials didn't make the cut.");
        }
        setIsSubmitting(false);
        return;
      }

      setLoading(true);
      const cleanUser = {
        id: dbUser.id,
        name: dbUser.name || cleanEmail.split('@')[0],
        email: dbUser.email,
        isPro: dbUser.is_pro === true,
        role: dbUser.role || 'user',
        avatarUrl: dbUser.avatar_url,
      };

      if (rememberMe) {
        await SecureStoragePlugin.set({ key: 'saved_email', value: cleanEmail }).catch(() => {});
        await SecureStoragePlugin.set({ key: 'saved_pin', value: cleanPIN }).catch(() => {});
      }

      setCurrentUser(cleanUser as any);
      markLoginComplete();

      /**
       * SILENT MIGRATION TRIGGER (Fire and Forget)
       * Use fire and forget to satisfy premium transition speed requirements.
       */
      if (authData.user && !isHashed(dbPin)) {
        runSilentPinMigration(cleanEmail, cleanPIN);
      }

      await processSyncQueue().catch(console.error);
      
      // Navigate to Home Dashboard
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError("The system is down. Even machines need rest. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, rememberMe, setCurrentUser, markLoginComplete, setLoading, navigate]);

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 4) {
      setPassword(val);
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

  const isFormValid = email.length > 0 && password.length === 4;

  return (
    <div className="login-page-root min-h-screen bg-black flex flex-col items-center px-6 selection:bg-[#00E676] selection:text-black relative overflow-hidden">
      
      {/* BACK BUTTON (TOP LEFT) */}
      <div 
        onClick={handleBack}
        className="absolute top-12 left-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 active:bg-white/10 active:scale-95 transition-all duration-100 cursor-pointer"
      >
        <ChevronLeft size={28} className="text-white" strokeWidth={2} />
      </div>

      {/* BRANDING HEADER */}
      <div className="flex flex-col items-center justify-center mt-24 mb-10">
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
                value={password}
                onChange={handlePinInput}
              />
              {[0, 1, 2, 3].map((index) => {
                const isFilled = password.length > index;
                return (
                  <div 
                    key={index}
                    onClick={handlePinDotPress}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all bg-[#0A0A0A] border border-white/10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]"
                  >
                    {isFilled && (
                      <div className="w-4 h-4 rounded-full bg-[#00E676] shadow-[0_0_10px_rgba(0,230,118,0.6)] animate-in zoom-in duration-200" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ERROR MESSAGE DISPLAY STYLING */}
        {error && (
          <p className={`${error.includes('soldier') || error.includes('work') ? 'text-[#00E676]' : 'text-red-400'} text-xs tracking-wide mt-2 text-center font-medium`}>
            {error}
          </p>
        )}

        {/* SUCCESS MESSAGE DISPLAY STYLING */}
        {successMessage && (
          <p className="text-[#00E676] text-xs tracking-wide mt-2 text-center font-medium">
            {successMessage}
          </p>
        )}

        {/* UNVERIFIED ACCOUNT HANDLING: RESEND OPTION */}
        {showResendOption && (
          <div className="mt-3 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
            <p className="text-white/30 text-xs mb-2">
              Didn't get the activation mail?
            </p>
            <button
              onClick={handleResendFromLogin}
              className="text-[#00E676] text-xs font-bold uppercase tracking-widest underline underline-offset-4 decoration-[#00E676]/30 active:opacity-70 transition-all"
            >
              Resend Activation Mail
            </button>
          </div>
        )}

        {/* PRIMARY ACTION BUTTON */}
        <button 
          onClick={handleLogin}
          disabled={isSubmitting || !isFormValid}
          className="w-full bg-[#00E676] text-black font-black uppercase h-14 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,230,118,0.4)] active:scale-95 transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Unlocking' : "Let's Start"}
          <svg width="20" height="20" viewBox="0 0 24 24" className="fill-none stroke-black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </button>

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

import React, { useState, useRef } from 'react';

import gsap from 'gsap';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '../supabase';


import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  readBiometricPayload,
  loginWithBiometricSession,
  getWelcomeFirstNameFromPayload,
  hidePushAndBiometricOnAndroid,
} from '../lib/biometricAuth';
import AuthSplash from '../components/AuthSplash';

import { isOwnerAdminEmail, resolveUserRole, isAdminHubUser } from '../config/adminOwner';
import { consumeAccountDeletedToastFlag } from '../lib/accountDeletion';

/** Supabase confirmation email redirect — custom scheme on native, same-origin on web. */
function getEmailConfirmRedirectUrl(): string {
  if (typeof window === 'undefined') return 'https://stayhardy.com/login';
  return Capacitor.isNativePlatform() ? 'stayhardy://login' : `${window.location.origin}/login`;
}

const TreeGraphic = ({ isBloomed }: { isBloomed: boolean }) => {
  return (
    <div className="tree-image-container" style={{ 
      width: '100%', 
      height: '100%', 
      position: 'absolute', 
      inset: 0, 
      display: 'flex', 
      alignItems: 'flex-end', 
      justifyContent: 'center',
      paddingBottom: '20px',
      pointerEvents: 'none'
    }}>
      <img 
        src="/images/tree-full.png" 
        alt="Productivity Tree"
        style={{
          width: '90%',
          height: 'auto',
          maxWidth: '350px',
          position: 'absolute',
          bottom: '20px',
          filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.5))',
          transition: 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isBloomed ? 'scale(1) translateY(0)' : 'scale(0.1) translateY(100px)',
          opacity: isBloomed ? 1 : 0,
          transformOrigin: 'bottom center',
          WebkitMaskImage: 'url(/images/tree-full-mask.png)',
          maskImage: 'url(/images/tree-full-mask.png)',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat'
        }}
      />
    </div>
  );
};

const LOGIN_QUOTES = [
  "The only easy day was yesterday. StayHardy.",
  "Discipline is doing what needs to be done. #StayHardy",
  "Don't wish for it. Work for it. StayHardy.",
  "Your future self is thanking you for starting today. StayHardy.",
  "Consistency is the bridge between goals and accomplishment. StayHardy.",
  "Excuses don't build empires. Action does. StayHardy.",
  "Find your limits, then crush them. #StayHardy",
  "The grind never sleeps. Neither does your potential. StayHardy.",
  "Motivation gets you started. Discipline keeps you going. StayHardy.",
  "Success isn't owned, it's leased. And rent is due every day. StayHardy.",
  "Work while they sleep. Learn while they party. StayHardy.",
  "A goal without a plan is just a wish. StayHardy.",
  "Focus on the process, and the results will follow. StayHardy.",
  "Hard work beats talent when talent doesn't work hard. #StayHardy",
  "You are one login away from a better day. StayHardy.",
  "Master your tasks, master your life. StayHardy.",
  "The best way to predict the future is to create it. StayHardy.",
  "Don't stop when you're tired. Stop when you're done. StayHardy.",
  "Small steps lead to big destinations. StayHardy.",
  "Rise, grind, and StayHardy.",
  "Your discipline determines your destiny. StayHardy.",
  "The difference between who you are and what you do. StayHardy.",
  "Productivity is deliberate. Success is inevitable. StayHardy.",
  "Make today count. Your tasks are waiting. StayHardy.",
  "Stay thirsty for progress. #StayHardy",
  "No shortcuts. No excuses. Just StayHardy.",
  "Turn your 'shoulds' into 'musts'. StayHardy.",
  "Win the morning, win the day. StayHardy.",
  "Your potential is endless. Your time is not. StayHardy.",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BLOCKED_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  'yopmail.com',
  'trashmail.com',
  'maildrop.cc',
  '10minutemail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'spambox.us',
  'throwaway.email',
]);

const WEAK_PINS = new Set([
  '1234', '2345', '3456', '4567', '5678', '6789', '0123', '9876',
  '8765', '7654', '6543', '5432', '4321',
]);

function isUserAlreadyExistsError(err: { message?: string; code?: string }): boolean {
  if (err.code === 'user_already_exists') return true;
  const msg = (err.message || '').toLowerCase();
  if (msg.includes('user already registered')) return true;
  if (msg.includes('already registered')) return true;
  if (msg.includes('already been registered')) return true;
  return false;
}

function validateSignupEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Please enter your email address';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
  const domain = trimmed.split('@')[1]?.toLowerCase();
  if (domain && BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return 'Please use a real email address';
  }
  return null;
}

function validateSignupPin(pin: string): string | null {
  if (!pin || pin.trim() === '') return 'Please create a 4-digit PIN';
  if (!/^\d{4}$/.test(pin)) return 'PIN must be exactly 4 numbers';
  if (/^(\d)\1{3}$/.test(pin)) return 'PIN too simple. Avoid 1111, 2222 etc.';
  if (WEAK_PINS.has(pin)) return 'PIN too simple. Try something stronger';
  return null;
}

/** Login must send exactly 4 digits; Auth password is `${pin}_secure_pin`. */
function validateLoginPin(pin: string): string | null {
  if (!pin || pin.trim() === '') return 'Please enter your 4-digit PIN';
  if (!/^\d{4}$/.test(pin)) return 'PIN must be exactly 4 numbers';
  return null;
}

function isInvalidCredentialsAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; code?: string };
  if (e.code === 'invalid_credentials') return true;
  const m = (e.message || '').toLowerCase();
  return m.includes('invalid login') || m.includes('invalid credentials');
}

const NETWORK_UNREACHABLE_MSG =
  "Can't reach the server. Check Wi‑Fi or mobile data and try again.";

/** True transport/DNS failures — not wrong password (those rarely include these substrings). */
function isLikelyNetworkError(err: unknown): boolean {
  const m = String((err as Error)?.message ?? err ?? '').toLowerCase();
  return (
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('connect') ||
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('load failed') ||
    m.includes('internet') ||
    m.includes('offline') ||
    m.includes('timeout') ||
    m.includes('aborted') ||
    m.includes('econnrefused') ||
    m.includes('name not resolved')
  );
}

function loginCatchMessage(err: unknown): string {
  if (isLikelyNetworkError(err)) {
    return NETWORK_UNREACHABLE_MSG;
  }
  if (isInvalidCredentialsAuthError(err)) {
    return 'Email or PIN is incorrect. Please check and try again.';
  }
  const m = String((err as { message?: string })?.message ?? '').toLowerCase();
  if (m.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes.';
  }
  if (m.includes('not confirmed') || m.includes('email not confirmed')) {
    return 'Please confirm your email before logging in. Check your inbox.';
  }
  return 'Email or PIN is incorrect. Please check and try again.';
}

type SignupSubview = 'form' | 'not_verified' | 'already_active';

interface LoginProps {
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const { user, loading: authLoading, setCurrentUser, markLoginComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pinUpdatedBanner, setPinUpdatedBanner] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isPulled, setIsPulled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('remembered_email'));
  const [loginQuote, setLoginQuote] = useState('');

  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  const [biometricHidden, setBiometricHidden] = useState(false);
  const [isBiometricSubmitting, setIsBiometricSubmitting] = useState(false);
  const [bioToast, setBioToast] = useState<string | null>(null);
  const [signupSubview, setSignupSubview] = useState<SignupSubview>('form');
  const [pendingSignupEmail, setPendingSignupEmail] = useState('');
  const [emailFieldError, setEmailFieldError] = useState('');
  const [pinFieldError, setPinFieldError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const pin0Ref = useRef<any>(null);
  const pin1Ref = useRef<any>(null);
  const pin2Ref = useRef<any>(null);
  const pin3Ref = useRef<any>(null);
  const pinRefs = [pin0Ref, pin1Ref, pin2Ref, pin3Ref];

  const handlePinChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
    if (digit && index === 3) {
      pinRefs[3].current?.blur();
    }
  };

  const handlePinKeyDown = (index: number, e: any) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
      const newDigits = [...pinDigits];
      newDigits[index - 1] = '';
      setPinDigits(newDigits);
    }
  };
  const [signupToast, setSignupToast] = useState<string | null>(null);
  const [goodbyeToast, setGoodbyeToast] = useState<string | null>(null);
  const [emailVerifiedBanner, setEmailVerifiedBanner] = useState(false);

  const BIO_FAIL_KEY = 'stayhardy_biometric_fail_count';
  const prevIsLoginRef = React.useRef(true);

  React.useEffect(() => {
    const st = location.state as {
      pinUpdated?: boolean;
      prefilledEmail?: string;
      emailVerified?: boolean;
    } | null;
    if (st?.pinUpdated) setPinUpdatedBanner(true);
    if (st?.emailVerified) setEmailVerifiedBanner(true);

    if (st?.pinUpdated || st?.emailVerified) {
      navigate(location.pathname, {
        replace: true,
        state: st.prefilledEmail ? { prefilledEmail: st.prefilledEmail } : {},
      });
      return;
    }
    if (st?.prefilledEmail && isLogin) {
      setEmail(st.prefilledEmail);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, isLogin]);

  React.useEffect(() => {
    if (!emailVerifiedBanner) return;
    const t = window.setTimeout(() => setEmailVerifiedBanner(false), 5000);
    return () => window.clearTimeout(t);
  }, [emailVerifiedBanner]);

  // Redirect instantly if user is already logged in
  React.useEffect(() => {
    if (user && !authLoading) {
      if (isAdminHubUser(user)) navigate('/admin');
      else navigate('/home');
    }
  }, [user, authLoading, navigate]);



  React.useEffect(() => {
    if (!bioToast) return;
    const t = window.setTimeout(() => setBioToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [bioToast]);

  React.useEffect(() => {
    if (!signupToast) return;
    const t = window.setTimeout(() => setSignupToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [signupToast]);

  React.useEffect(() => {
    if (consumeAccountDeletedToastFlag()) {
      setGoodbyeToast('Your account has been permanently deleted. We\'re sorry to see you go. 👋');
    }
  }, []);

  React.useEffect(() => {
    if (!goodbyeToast) return;
    const t = window.setTimeout(() => setGoodbyeToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [goodbyeToast]);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setInterval(() => setResendCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendCooldown]);

  React.useEffect(() => {
    if (!isLogin && prevIsLoginRef.current) {
      setEmail('');
      setPassword('');
      setName('');
      setSignupSubview('form');
      setEmailFieldError('');
      setPinFieldError('');
      setError('');
    }
    prevIsLoginRef.current = isLogin;
  }, [isLogin]);

  React.useEffect(() => {
    if (!isLogin || !isPulled) {
      setShowBiometricLogin(false);
      return;
    }
    if (hidePushAndBiometricOnAndroid()) {
      setShowBiometricLogin(false);
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      setShowBiometricLogin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const fails = parseInt(sessionStorage.getItem(BIO_FAIL_KEY) || '0', 10);
      if (fails >= 5) {
        if (!cancelled) {
          setBiometricHidden(true);
          setShowBiometricLogin(false);
        }
        return;
      }
      const payload = await readBiometricPayload();
      if (!cancelled) {
        setShowBiometricLogin(!!payload && payload.biometric_login_enabled === true);
        setBiometricHidden(fails >= 5);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLogin, isPulled]);

  React.useEffect(() => {
    const hadLightMode = document.documentElement.classList.contains('light-mode');
    if (hadLightMode) {
      document.documentElement.classList.remove('light-mode');
    }

    const savedEmail = localStorage.getItem('remembered_email');
    const savedPin = localStorage.getItem('remembered_pin');
    if (savedEmail) setEmail(savedEmail);
    if (savedPin) setPassword(savedPin);

    setLoginQuote(LOGIN_QUOTES[Math.floor(Math.random() * LOGIN_QUOTES.length)]);

    return () => {
      if (hadLightMode) {
        document.documentElement.classList.add('light-mode');
      }
    };
  }, []);

  if (user && !authLoading) {
    return <AuthSplash />;
  }



  const handlePullRope = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const nextIsOn = !isPulled;
    
    if (nextIsOn) {
      // Pick a new random quote that isn't the same as the current one
      setLoginQuote(prev => {
        const otherQuotes = LOGIN_QUOTES.filter((q) => q !== prev);
        return otherQuotes[Math.floor(Math.random() * otherQuotes.length)];
      });
      gsap.to('.login-page-root', { backgroundColor: "#09090b", duration: 0.6 });
    } else {
      gsap.to('.login-page-root', { backgroundColor: "#000000", duration: 0.6 });
    }
    
    document.body.setAttribute("data-on", nextIsOn.toString());
    document.documentElement.style.setProperty("--on", nextIsOn ? "1" : "0");

    setTimeout(() => {
      setIsPulled(nextIsOn);
      setIsAnimating(false);
    }, 400);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailFieldError('');
    setPinFieldError('');

    if (!isLogin) {
      const ve = validateSignupEmail(email);
      if (ve) {
        setEmailFieldError(ve);
        return;
      }
      const vp = validateSignupPin(password);
      if (vp) {
        setPinFieldError(vp);
        return;
      }
    } else {
      const ve = validateSignupEmail(email);
      if (ve) {
        setEmailFieldError(ve);
        return;
      }
      const vp = validateLoginPin(password);
      if (vp) {
        setPinFieldError(vp);
        return;
      }
    }

    setIsSubmitting(true);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      if (isLogin) {
        await handleLogin();
        return;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedEmail,
          options: {
            data: {
              name: name,
            },
            emailRedirectTo: getEmailConfirmRedirectUrl(),
          },
        });

        if (signUpError) {
          if (isUserAlreadyExistsError(signUpError)) {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password: trimmedEmail,
            });

            if (!signInError) {
              await supabase.auth.signOut();
              setPendingSignupEmail(trimmedEmail);
              setSignupSubview('already_active');
              setIsSubmitting(false);
              return;
            }

            const sim = (signInError.message || '').toLowerCase();
            if (
              sim.includes('email not confirmed') ||
              sim.includes('not confirmed')
            ) {
              setPendingSignupEmail(trimmedEmail);
              setSignupSubview('not_verified');
              setIsSubmitting(false);
              return;
            }

            if (
              sim.includes('invalid login') ||
              sim.includes('invalid credentials')
            ) {
              setError('An account with this email already exists. Please log in instead.');
              setIsSubmitting(false);
              return;
            }

            setError(signInError.message || 'Could not verify account status.');
            setIsSubmitting(false);
            return;
          }
          throw signUpError;
        }

        if (data.user) {
          const { error: syncError } = await supabase.from('users').upsert({
            id: data.user.id,
            name,
            email: trimmedEmail,
            pin: password,
            role: resolveUserRole(trimmedEmail),
            created_at: new Date().toISOString()
          });
          
          if (syncError) console.error('Database sync error:', syncError);
        }

        if (data.session) {
          if (isOwnerAdminEmail(trimmedEmail)) {
            navigate('/admin');
          } else {
            navigate('/lifetime-access');
          }
        } else {
          setError('Signup successful! Please check your email to confirm your account and then Log In.');
          setIsLogin(true);
          setIsSubmitting(false);
        }
      }
    } catch (err: unknown) {
      console.error('Auth Error Details:', err);
      setIsSubmitting(false);
      setError(loginCatchMessage(err));
    }
  };

  const handleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const cleanEmail = email?.trim()?.toLowerCase();
      const cleanPIN = pinDigits.join('').trim();

      if (!cleanEmail) {
        setError('Please enter your email');
        return;
      }
      if (!cleanPIN || cleanPIN.length !== 4) {
        setError('Please enter your 4-digit PIN');
        return;
      }

      console.log('LOGIN ATTEMPT:', cleanEmail);

      const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('id, name, email, pin, role, is_pro, avatar_url, email_confirmed, status, pro_purchase_date')
        .ilike('email', cleanEmail)
        .maybeSingle();

      console.log('=== DB QUERY RESULT ===');
      console.log('Error:', dbError);
      console.log('Error message:', dbError?.message);
      console.log('Error code:', dbError?.code);
      console.log('Error details:', dbError?.details);
      console.log('Error hint:', dbError?.hint);
      console.log('Data:', dbUser);
      console.log('======================');
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? 'EXISTS ✅' : 'MISSING ❌');
      console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'EXISTS ✅' : 'MISSING ❌');

      console.log('Email entered:', cleanEmail);
      console.log('DB user found:', !!dbUser);
      console.log('DB PIN:', dbUser?.pin);
      console.log('Entered PIN:', cleanPIN);
      console.log('PIN match:', dbUser?.pin?.toString()?.trim() === cleanPIN);

      if (dbError || !dbUser) {
        setError('Email or PIN is incorrect');
        return;
      }

      if (dbUser.pin?.toString()?.trim() !== cleanPIN) {
        setError('Email or PIN is incorrect');
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanEmail,
      });
      console.log('Supabase Auth attempt:', !!authData, authError?.message);

      const cleanUser = {
        id: dbUser.id,
        name: dbUser.name || cleanEmail.split('@')[0],
        email: dbUser.email,
        isPro: dbUser.is_pro === true,
        role: dbUser.role || 'user',
        avatarUrl: dbUser.avatar_url || null,
        email_confirmed: dbUser.email_confirmed,
        status: dbUser.status,
        proPurchaseDate: dbUser.pro_purchase_date || null,
      };

      try {
        await Preferences.set({ key: 'stayhardy_last_login_at', value: Date.now().toString() });
        await Preferences.set({ key: 'last_cache_reset', value: new Date().toDateString() });
      } catch {
        // non-critical
      }

      console.log('=== SAVE LOGIN DEBUG ===');
      console.log('rememberMe toggle:', rememberMe);
      console.log('email to save:', cleanEmail);
      console.log('pin to save:', cleanPIN);

      if (rememberMe) {
        try {
          localStorage.setItem('remembered_email', cleanEmail);
          localStorage.setItem('remembered_pin', cleanPIN);
          
          await Preferences.set({ key: 'saved_email', value: cleanEmail });
          await Preferences.set({ key: 'saved_pin', value: cleanPIN });
          await Preferences.set({ key: 'save_login_enabled', value: 'true' });

          // VERIFY it was saved:
          const check = await Preferences.get({ key: 'save_login_enabled' });
          const checkEmail = await Preferences.get({ key: 'saved_email' });
          console.log('Saved enabled check:', check.value);
          console.log('Saved email check:', checkEmail.value);
          console.log('CREDENTIALS SAVED ✅');
        } catch (e: any) {
          console.error('SAVE FAILED ❌:', e.message || e);
        }
      } else {
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_pin');

        await Preferences.remove({ key: 'saved_email' });
        await Preferences.remove({ key: 'saved_pin' });
        await Preferences.set({ key: 'save_login_enabled', value: 'false' });
        console.log('Login not saved');
      }

      setCurrentUser(cleanUser);
      markLoginComplete();

      sessionStorage.removeItem(BIO_FAIL_KEY);
      navigate('/home');
    } catch (err: unknown) {
      console.error('Login error:', (err as Error)?.message || err);
      if (isLikelyNetworkError(err)) {
        setError('Cannot reach server. Check your internet and try again.');
      } else {
        setError('Email or PIN is incorrect');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    const em = pendingSignupEmail.trim();
    if (!em) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: em,
      options: { emailRedirectTo: getEmailConfirmRedirectUrl() },
    });
    if (!error) {
      setSignupToast('Verification email sent! Check your inbox. 📬');
      setResendCooldown(60);
    } else {
      setError(isLikelyNetworkError(error) ? NETWORK_UNREACHABLE_MSG : error.message);
    }
  };

  const backToSignupForm = () => {
    setSignupSubview('form');
    setEmail('');
    setPassword('');
    setName('');
    setEmailFieldError('');
    setPinFieldError('');
    setError('');
  };

  const goToLoginFromSignupExist = () => {
    const em = pendingSignupEmail;
    setIsLogin(true);
    setEmail(em);
    setPassword('');
    setName('');
    setSignupSubview('form');
    setError('');
    navigate('/login', { replace: true, state: { prefilledEmail: em } });
  };

  const handleBiometricLogin = async () => {
    if (isBiometricSubmitting || !isPulled) return;
    setIsBiometricSubmitting(true);
    setBioToast(null);
    const payload = await readBiometricPayload();
    const welcomeName = getWelcomeFirstNameFromPayload(payload);

    try {
      const result = await loginWithBiometricSession();
      if (!result.ok) {
        const fails = parseInt(sessionStorage.getItem(BIO_FAIL_KEY) || '0', 10) + 1;
        sessionStorage.setItem(BIO_FAIL_KEY, String(fails));
        if (fails >= 5) {
          setBiometricHidden(true);
          setShowBiometricLogin(false);
          setBioToast('Too many attempts. Please use your PIN.');
        } else if (result.reason === 'verify_failed') {
          setBioToast('Biometric failed. Use your PIN to log in.');
        } else {
          setBioToast('Biometric failed. Use your PIN to log in.');
        }
        return;
      }

      sessionStorage.removeItem(BIO_FAIL_KEY);
      setBioToast(`Welcome back, ${welcomeName}!`);

      const { data: { session } } = await supabase.auth.getSession();
      const em = session?.user?.email ?? '';
      if (isOwnerAdminEmail(em)) {
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } finally {
      setIsBiometricSubmitting(false);
    }
  };


  if (isLogin) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px', overflowY: 'auto' }}>
        {onBack && (
          <div
            onClick={onBack}
            style={{
              position: 'absolute',
              top: '52px',
              left: '20px',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
          </div>
        )}
        <style>{`
          @keyframes brandGlow {
            0%,100% { text-shadow: 0 0 20px rgba(0, 232, 122,0.4), 0 0 40px rgba(0, 232, 122,0.2); }
            50% { text-shadow: 0 0 30px rgba(0, 232, 122,0.8), 0 0 60px rgba(0, 232, 122,0.4), 0 0 90px rgba(0, 232, 122,0.15); }
          }
          @keyframes inputFocus {
            from { box-shadow: none }
            to { box-shadow: 0 0 0 1px #00E87A, 0 0 12px rgba(0, 232, 122,0.3) }
          }
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>

        <div style={{ height: '80px' }}/>

        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#00E87A', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px 0', textAlign: 'center', animation: 'brandGlow 3s ease-in-out infinite', fontStyle: 'normal' }}>
          STAY HARDY
        </h1>

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', margin: '0 0 48px 0', textAlign: 'center', fontWeight: '500' }}>
          The 1% starts here.
        </p>

        <div style={{ width: '100%', marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
            EMAIL ADDRESS
          </p>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ width: '100%', height: '56px', background: '#000000', border: '1.5px solid #00E87A', borderRadius: '14px', padding: '0 48px 0 16px', fontSize: '15px', color: '#FFFFFF', outline: 'none', boxSizing: 'border-box', fontWeight: '500', boxShadow: '0 0 0 0 rgba(0, 232, 122,0)', transition: 'box-shadow 0.2s' }}
              onFocus={(e) => { e.target.style.boxShadow = '0 0 12px rgba(0, 232, 122,0.3)' }}
              onBlur={(e) => { e.target.style.boxShadow = '0 0 0 0 rgba(0, 232, 122,0)' }}
            />
            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4 4 8-8" stroke={email.includes('@') ? '#00E87A' : 'rgba(0, 232, 122,0.25)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', margin: '0 0 8px 0', textTransform: 'uppercase' }}>
            4-DIGIT PIN
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', width: '100%' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ position: 'relative', height: '64px' }}>
                <div style={{ position: 'absolute', inset: 0, background: '#000000', border: `1.5px solid ${pinDigits[i] ? '#00E87A' : 'rgba(0,232,122,0.35)'}`, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', boxShadow: pinDigits[i] ? '0 0 10px rgba(0,232,122,0.2)' : 'none' }}>
                  {pinDigits[i] && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00E87A', boxShadow: '0 0 8px rgba(0,232,122,0.6)' }}/>
                  )}
                </div>
                <input
                  ref={pinRefs[i]}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={pinDigits[i]}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  onClick={() => pinRefs[i].current?.focus()}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: '24px', color: 'transparent', caretColor: 'transparent', zIndex: 3, cursor: 'text', WebkitTapHighlightColor: 'transparent' }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '100%', background: '#000000', border: '1.5px solid rgba(0, 232, 122,0.3)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', cursor: 'pointer' }}
          onClick={() => setRememberMe(!rememberMe)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={rememberMe ? '#00E87A' : 'rgba(0, 232, 122,0.35)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 2px 0' }}>Save Login</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Stay signed in on this device</p>
          </div>
          <div style={{ width: '48px', height: '28px', borderRadius: '14px', background: rememberMe ? '#00E87A' : 'rgba(255,255,255,0.1)', border: rememberMe ? 'none' : '1.5px solid rgba(0, 232, 122,0.2)', position: 'relative', transition: 'all 0.25s ease', boxShadow: rememberMe ? '0 0 12px rgba(0, 232, 122,0.4)' : 'none', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '4px', left: rememberMe ? '24px' : '4px', width: '20px', height: '20px', borderRadius: '50%', background: rememberMe ? '#000000' : '#FFFFFF', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}/>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#EF4444', textAlign: 'center', margin: '0 0 16px 0', fontWeight: '500' }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={isSubmitting}
          style={{ width: '100%', height: '56px', background: isSubmitting ? 'rgba(0, 232, 122,0.6)' : '#00E87A', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '900', color: '#000000', cursor: isSubmitting ? 'not-allowed' : 'pointer', letterSpacing: '0.04em', marginBottom: '32px', boxShadow: isSubmitting ? 'none' : '0 0 24px rgba(0, 232, 122,0.35)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {isSubmitting ? (
            <>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #000', borderTop: '2px solid transparent', animation: 'spin 0.8s linear infinite' }}/>
              Signing in...
            </>
          ) : (
            'Log In →'
          )}
        </button>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: '0 0 40px 0' }}>
          Don't have an account?{' '}
          <span
            onClick={() => { setIsLogin(false); setError(''); }}
            style={{ color: '#00E87A', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(0, 232, 122,0.3)' }}
          >
            Sign Up
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className={`login-page-root ${isPulled ? 'is-pulled' : ''}`} style={{ background: '#000000', alignItems: 'center', transition: 'all 0.5s ease', position: 'relative' }}>
      {onBack && (
        <div
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '52px',
            left: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
        </div>
      )}
      {/* ── Initial Minimal View (Branding & Tagline) ── */}
      {!isPulled && (
        <div className="login-minimal-header" style={{
          textAlign: 'center',
          zIndex: 1000,
          animation: 'fadeIn 1s ease-out',
          marginBottom: '2rem',
          marginTop: '15vh'
        }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 900, color: '#10b981', margin: 0, letterSpacing: '-0.04em' }}>StayHardy</h1>
          <p style={{ color: 'rgba(16, 185, 129, 0.4)', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.2em', marginTop: '1rem', textTransform: 'uppercase' }}>Consistency Builds Success</p>
        </div>
      )}

      {/* Desktop: Left hero panel with tree */}
      <div className={`login-hero-panel ${isPulled ? 'revealed' : ''}`}>
        {isPulled && (
          <>
            <div className="aurora-bg">
              <div className="aurora-gradient-1"></div>
              <div className="aurora-gradient-2"></div>
            </div>
            <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.04em', marginBottom: '1rem' }}>StayHardy</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto', minHeight: '3.5em' }}>
                {loginQuote}
              </p>
            </div>
            <div className="tree-container" style={{ flex: 1, maxHeight: '480px', position: 'relative', width: '100%' }}>
              <TreeGraphic isBloomed={isPulled} />
            </div>
            <div style={{ position: 'relative', zIndex: 10, padding: '2rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {['📋 Task Master', '🔥 Daily Grind', '🏆 Stay Hard'].map(tag => (
                  <span key={tag} style={{ 
                    background: 'rgba(16,185,129,0.1)', 
                    color: '#10b981', 
                    padding: '0.4rem 0.875rem', 
                    borderRadius: '999px', 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    border: '1px solid rgba(16,185,129,0.2)'
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Form panel */}
      <div className={`login-form-panel ${isPulled ? 'revealed' : ''}`} style={{ 
        display: 'flex', 
        flexDirection: 'column',
        background: isPulled ? undefined : 'transparent'
      }}>
        {isPulled && (
          <div className="aurora-bg">
            <div className="aurora-gradient-1"></div>
            <div className="aurora-gradient-2"></div>
          </div>
        )}


        {/* Pull rope */}
        <div className="login-rope-area" style={{ flexShrink: 0, marginTop: isPulled ? '1rem' : '0' }}>
          <div className={`pull-rope-container ${isPulled ? 'pulled' : ''}`} style={{ position: 'relative', height: isPulled ? '14vh' : '20vh', minHeight: '100px', right: 'auto', top: 'auto', left: 'auto', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={`pull-rope-line ${isAnimating ? 'animate-pull-toggle' : ''}`} style={{ height: '100%' }}></div>
            <div 
              className={`pull-rope-handle ${isAnimating ? 'animate-pull-handle-toggle' : ''}`}
              onClick={handlePullRope}
            >
              <div className="pull-rope-inner"></div>
              {!isPulled && !isAnimating && (
                <div className="pull-rope-guideline" style={{ top: '120%', whiteSpace: 'nowrap' }}>
                  Tap the rope. Lock in
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`auth-title slide-up-fade ${isPulled ? 'visible' : ''}`} style={{ textAlign: 'center', marginBottom: '1rem', flexShrink: 0 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.025em', margin: 0, color: '#10b981' }}>{isLogin ? 'StayHardy' : 'Join Us'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Consistency Builds Success
          </p>
        </div>

        {pinUpdatedBanner && (
          <div
            className={`slide-up-fade ${isPulled ? 'visible' : ''}`}
            role="status"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#6ee7b7',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: '1px solid rgba(16, 185, 129, 0.35)',
              width: '100%',
              flexShrink: 0,
            }}
          >
            PIN updated successfully. Please log in with your new PIN.
          </div>
        )}

        {emailVerifiedBanner && (
          <div
            className={`slide-up-fade ${isPulled ? 'visible' : ''}`}
            role="status"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              background: 'rgba(0,232,122,0.1)',
              border: '1px solid rgba(0,232,122,0.25)',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '16px',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <span aria-hidden style={{ fontSize: '16px', lineHeight: 1.2 }}>
              ✅
            </span>
            <span
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '13px',
                color: '#00E87A',
                lineHeight: 1.45,
              }}
            >
              Email verified successfully! Log in with your email and PIN.
            </span>
          </div>
        )}

        {error && (
          <div 
            className={`slide-up-fade ${isPulled ? 'visible' : ''}`} 
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#f87171', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.75rem', 
              marginBottom: '1rem', 
              fontSize: '0.8rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              width: '100%',
              flexShrink: 0
            }}
          >
            {error}
          </div>
        )}

        {(isLogin || signupSubview === 'form') && (
        <form 
          className={`slide-up-fade ${isPulled ? 'visible' : ''}`} 
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }} 
          onSubmit={handleSubmit}
        >
          {!isLogin && signupSubview === 'form' && (
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>FULL NAME</label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontSize: '18px' }}>person</span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Alex Johnson" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isPulled && !isLogin}
                  disabled={!isPulled}
                  style={{ paddingLeft: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          )}

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontSize: '18px' }}>mail</span>
              <input 
                type="email" 
                className="form-input" 
                placeholder={isLogin ? 'alex@example.com' : 'Enter your email address'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailFieldError('');
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="email"
                required={isPulled}
                disabled={!isPulled}
                style={{ paddingLeft: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}
              />
            </div>
            {emailFieldError && (
              <p
                style={{
                  color: '#EF4444',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: '11px',
                  margin: '4px 0 0 0',
                  animation: 'fadeIn 0.2s ease-out',
                }}
              >
                {emailFieldError}
              </p>
            )}
          </div>
          
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em' }}>4-DIGIT PIN</label>
            <div className="pin-input-container" style={{ gap: '0.5rem' }}>
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  id={`pin-${index}`}
                  type="password"
                  inputMode="numeric"
                  className="form-input pin-box"
                  maxLength={1}
                  placeholder=""
                  value={password[index] || ''}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  required={isPulled && index === 0}
                  disabled={!isPulled}
                  style={{ 
                    textAlign: 'center', 
                    fontSize: '1.2rem', 
                    fontWeight: '900', 
                    padding: 0, 
                    height: '3.5rem', 
                    width: '100%',
                    borderRadius: '0.75rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                />
              ))}
            </div>
            {pinFieldError && (
              <p
                style={{
                  color: '#EF4444',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  fontSize: '11px',
                  margin: '4px 0 0 0',
                  animation: 'fadeIn 0.2s ease-out',
                }}
              >
                {pinFieldError}
              </p>
            )}
          </div>

          {isLogin && (
            <div
              onClick={() => setRememberMe(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: rememberMe ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${rememberMe ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '1rem',
                padding: '0.875rem 1.125rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
            >
              {/* Custom big checkbox */}
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                border: `2px solid ${rememberMe ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                background: rememberMe ? '#10b981' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}>
                {rememberMe && (
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#022c22', fontVariationSettings: "'FILL' 1" }}>check</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: rememberMe ? 'var(--text-main)' : '#94a3b8' }}>Save Login</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>Stay signed in on this device</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: rememberMe ? '#10b981' : '#334155' }}>
                {rememberMe ? 'lock' : 'lock_open'}
              </span>
            </div>
          )}


          <button 
            type="submit" 
            className="glow-btn-primary" 
            style={{ 
              marginTop: '0.5rem', 
              height: '3.5rem', 
              borderRadius: '1rem', 
              minHeight: '3.5rem', 
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: isSubmitting || !isPulled ? 0.6 : 1,
              cursor: isSubmitting || !isPulled ? 'not-allowed' : 'pointer'
            }} 
            disabled={!isPulled || isSubmitting}
          >
            {isSubmitting && !isLogin ? (
              <>
                <span
                  aria-hidden
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 600 }}>
                  Creating account...
                </span>
              </>
            ) : (
              <>
                <span>{isSubmitting ? 'Syncing...' : isLogin ? 'Log In' : 'Sign Up'}</span>
                {!isSubmitting && <span className="material-symbols-outlined">arrow_forward</span>}
              </>
            )}
          </button>
        </form>
        )}

        {!isLogin && signupSubview === 'not_verified' && isPulled && (
          <div
            className={`slide-up-fade ${isPulled ? 'visible' : ''}`}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: '#00E87A' }}
              aria-hidden
            >
              mail
            </span>
            <h2
              style={{
                fontFamily: "'Syne', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: '#ffffff',
                margin: 0,
              }}
            >
              Account not activated yet
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '13px',
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
                maxWidth: '320px',
              }}
            >
              You signed up with {pendingSignupEmail} but haven&apos;t verified it yet. Check your inbox for the activation email or resend it below.
            </p>
            <span
              style={{
                background: 'rgba(0,232,122,0.08)',
                border: '1px solid rgba(0,232,122,0.2)',
                color: '#00E87A',
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '10px',
                wordBreak: 'break-all',
              }}
            >
              {pendingSignupEmail}
            </span>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || !isPulled}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #00E87A, #00C563)',
                color: '#000000',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: '15px',
                cursor: resendCooldown > 0 || !isPulled ? 'not-allowed' : 'pointer',
                opacity: resendCooldown > 0 || !isPulled ? 0.55 : 1,
              }}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
            </button>
            <button
              type="button"
              onClick={backToSignupForm}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Try a different email → Back to Sign Up
            </button>
          </div>
        )}

        {!isLogin && signupSubview === 'already_active' && isPulled && (
          <div
            className={`slide-up-fade ${isPulled ? 'visible' : ''}`}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
              flexShrink: 0,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: '#00E87A' }}
              aria-hidden
            >
              check_circle
            </span>
            <h2
              style={{
                fontFamily: "'Syne', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: '20px',
                color: '#ffffff',
                margin: 0,
              }}
            >
              Account already exists!
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '13px',
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
                maxWidth: '320px',
              }}
            >
              Great news — you already have an active StayHardy account with this email. Just head to login and sign in with your PIN.
            </p>
            <span
              style={{
                background: 'rgba(0,232,122,0.08)',
                border: '1px solid rgba(0,232,122,0.2)',
                color: '#00E87A',
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '10px',
                wordBreak: 'break-all',
              }}
            >
              {pendingSignupEmail}
            </span>
            <button
              type="button"
              onClick={goToLoginFromSignupExist}
              disabled={!isPulled}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #00E87A, #00C563)',
                color: '#000000',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: '15px',
                cursor: !isPulled ? 'not-allowed' : 'pointer',
                opacity: !isPulled ? 0.55 : 1,
              }}
            >
              Go to Login →
            </button>
            <button
              type="button"
              onClick={backToSignupForm}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.35)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Use a different email → Back to Sign Up
            </button>
          </div>
        )}

        {isLogin && showBiometricLogin && !biometricHidden && (
          <div
            className={`slide-up-fade ${isPulled ? 'visible' : ''} biometric-login-block`}
            style={{
              width: '100%',
              marginTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
              animation: 'biometricFadeIn 0.45s ease-out',
            }}
          >
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={!isPulled || isBiometricSubmitting}
              style={{
                width: '100%',
                maxWidth: '280px',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: '2px solid rgba(0, 232, 122, 0.45)',
                background: 'rgba(8, 12, 10, 0.95)',
                color: '#e2e8f0',
                cursor: !isPulled || isBiometricSubmitting ? 'not-allowed' : 'pointer',
                opacity: !isPulled || isBiometricSubmitting ? 0.55 : 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.35rem',
                boxShadow: '0 0 28px rgba(0, 232, 122, 0.12)',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '48px',
                  color: '#00E87A',
                  filter: 'drop-shadow(0 0 12px rgba(0, 232, 122, 0.35))',
                }}
              >
                fingerprint
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(148, 163, 184, 0.95)', letterSpacing: '0.04em' }}>
                Use Biometric
              </span>
            </button>
          </div>
        )}

        {isLogin && biometricHidden && isPulled && Capacitor.isNativePlatform() && !hidePushAndBiometricOnAndroid() && (
          <p
            className={`slide-up-fade ${isPulled ? 'visible' : ''}`}
            style={{
              width: '100%',
              marginTop: '0.75rem',
              fontSize: '0.75rem',
              color: '#94a3b8',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            Too many attempts. Please use your PIN.
          </p>
        )}

        {/* ── Submission Loading Overlay ── */}
        {bioToast && (
          <div
            role="status"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 'max(1rem, env(safe-area-inset-bottom))',
              transform: 'translateX(-50%)',
              zIndex: 1100,
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              background: 'rgba(15, 23, 42, 0.92)',
              color: '#e2e8f0',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              maxWidth: 'min(90vw, 320px)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {bioToast}
          </div>
        )}

        {signupToast && (
          <div
            role="status"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 'max(4.5rem, calc(env(safe-area-inset-bottom) + 3rem))',
              transform: 'translateX(-50%)',
              zIndex: 1100,
              padding: '0.5rem 1rem',
              borderRadius: '999px',
              background: 'rgba(15, 23, 42, 0.92)',
              color: '#e2e8f0',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              maxWidth: 'min(90vw, 320px)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {signupToast}
          </div>
        )}

        {goodbyeToast && (
          <div
            role="status"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 'max(1rem, env(safe-area-inset-bottom))',
              transform: 'translateX(-50%)',
              zIndex: 1100,
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              background: 'rgba(71, 85, 105, 0.92)',
              color: '#e2e8f0',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: "'DM Sans', system-ui, sans-serif",
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              maxWidth: 'min(92vw, 340px)',
              textAlign: 'center',
              pointerEvents: 'none',
              lineHeight: 1.45,
            }}
          >
            {goodbyeToast}
          </div>
        )}

        {isSubmitting && isLogin && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(16, 185, 129, 0.1)',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em' }}>
              StayHard — Grinding…
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Syncing your boards...</p>
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}


        <div className={`auth-links slide-up-fade ${isPulled ? 'visible' : ''}`} style={{ width: '100%', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!isLogin && signupSubview !== 'form') {
                setIsLogin(true);
                setEmail(pendingSignupEmail);
                setPassword('');
                setName('');
                setSignupSubview('form');
                setEmailFieldError('');
                setPinFieldError('');
                setError('');
                return;
              }
              if (!isLogin) {
                setSignupSubview('form');
              }
              setIsLogin(!isLogin);
              setError('');
            }}
            style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', opacity: 0.8 }}
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span style={{ color: 'var(--primary)' }}>{isLogin ? 'Sign Up' : 'Log In'}</span>
          </a>
          
          {/* 
          {isLogin && (
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); navigate('/forgot-pin'); }}
              style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none' }}
            >
              Forgot your PIN?
            </a>
          )}
          */}
        </div>
        <style>{`
          @keyframes biometricFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Login;

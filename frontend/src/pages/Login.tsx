import React, { useState } from 'react';

import gsap from 'gsap';
import { supabase } from '../supabase';


import { useAuth } from '../context/AuthContext';

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

const Login: React.FC = () => {
  const { user, loading: authLoading } = useAuth(); // Connect useAuth
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isPulled, setIsPulled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect instantly if user is already logged in
  React.useEffect(() => {
    if (user && !authLoading) {
      if (user.role === 'admin') window.location.href = '/admin';
      else window.location.href = '/home';
    }
  }, [user, authLoading]);


  if (user && !authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', flexDirection: 'column', gap: '1rem' }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(16, 185, 129, 0.1)',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ color: '#10b981', fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
          StayHard — Grinding…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }


  const [rememberMe, setRememberMe] = useState(localStorage.getItem('remembered_email') ? true : false);

  const [loginQuote, setLoginQuote] = useState('');

  const loginQuotes = [
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
    "Your potential is endless. Your time is not. StayHardy."
  ];

  React.useEffect(() => {
    // Force dark mode for login page
    const hadLightMode = document.documentElement.classList.contains('light-mode');
    if (hadLightMode) {
      document.documentElement.classList.remove('light-mode');
    }

    const savedEmail = localStorage.getItem('remembered_email');
    const savedPin = localStorage.getItem('remembered_pin');
    if (savedEmail) setEmail(savedEmail);
    if (savedPin) setPassword(savedPin);
    
    // Pick a random quote
    setLoginQuote(loginQuotes[Math.floor(Math.random() * loginQuotes.length)]);

    return () => {
      // Restore light mode on exit if it was active
      if (hadLightMode) {
        document.documentElement.classList.add('light-mode');
      }
    };
  }, []);

  const handlePullRope = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    const nextIsOn = !isPulled;
    
    if (nextIsOn) {
      // Pick a new random quote that isn't the same as the current one
      setLoginQuote(prev => {
        const otherQuotes = loginQuotes.filter(q => q !== prev);
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

  const handlePinChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value.length > 1) {
      const pasted = value.replace(/[^0-9]/g, '').slice(0, 4);
      setPassword(pasted);
      if (pasted.length === 4) {
        document.getElementById(`pin-3`)?.focus();
      } else if (pasted.length > 0) {
        document.getElementById(`pin-${pasted.length}`)?.focus();
      }
      return;
    }

    if (!/^[0-9]*$/.test(value)) return;

    const newPassword = password.split('');
    newPassword[index] = value;
    const finalPassword = newPassword.join('');
    setPassword(finalPassword);

    if (value !== '' && index < 3) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !password[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true); // START SUBMISSION

    const supabasePassword = password + "_secure_pin";

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: supabasePassword,
        });

        if (signInError) throw signInError;

        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
          localStorage.setItem('remembered_pin', password);
        } else {
          localStorage.removeItem('remembered_email');
          localStorage.removeItem('remembered_pin');
        }

        const role = email.toLowerCase().trim() === 'joe@gmail.com' ? 'admin' : 'user';
        if (role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/home';
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: supabasePassword,
          options: {
            data: {
              name: name,
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: syncError } = await supabase.from('users').upsert({
            id: data.user.id,
            name,
            email,
            pin: password,
            role: email.toLowerCase().trim() === 'joe@gmail.com' ? 'admin' : 'user',
            created_at: new Date().toISOString()
          });
          
          if (syncError) console.error('Database sync error:', syncError);
        }

        if (data.session) {
          window.location.href = '/home';
        } else {
          setError('Signup successful! Please check your email to confirm your account and then Log In.');
          setIsLogin(true); // Switch to login view
          setIsSubmitting(false); // Enable manual retry on signup wait screen
        }
      }
    } catch (err: any) {
      console.error('Auth Error Details:', err);
      setIsSubmitting(false); // RESET ON ERROR
      if (err.message === 'Invalid login credentials') {
        setError('Invalid email or PIN. Please try again.');
      } else if (err.message.includes('rate limit')) {
        setError('Too many attempts. Please wait a few minutes.');
      } else {
        const msg = err.message || err.error_description;
        setError(typeof msg === 'string' && msg.trim() !== '{}' && msg.trim() !== '' ? msg : 'Authentication failed');
      }
    }
  };


  return (
    <div className={`login-page-root ${isPulled ? 'is-pulled' : ''}`} style={{ background: '#000000', alignItems: 'center', transition: 'all 0.5s ease' }}>
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

        <form 
          className={`slide-up-fade ${isPulled ? 'visible' : ''}`} 
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }} 
          onSubmit={handleSubmit}
        >
          {!isLogin && (
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
                placeholder="alex@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={isPulled}
                disabled={!isPulled}
                style={{ paddingLeft: '3rem', height: '3rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}
              />
            </div>
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
                  maxLength={4}
                  value={password[index] || ''}
                  onChange={(e) => handlePinChange(index, e)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
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
              opacity: isSubmitting || !isPulled ? 0.6 : 1,
              cursor: isSubmitting || !isPulled ? 'not-allowed' : 'pointer'
            }} 
            disabled={!isPulled || isSubmitting}
          >
            <span>{isSubmitting ? 'Syncing...' : isLogin ? 'Log In' : 'Sign Up'}</span>
            {!isSubmitting && <span className="material-symbols-outlined">arrow_forward</span>}
          </button>
        </form>

        {/* ── Submission Loading Overlay ── */}
        {isSubmitting && (
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
            onClick={(e) => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}
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
      </div>
    </div>
  );
};

export default Login;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { Eye, EyeOff, Lock, CheckCircle2, Timer } from 'lucide-react';
import { padPinForAuth, hashPin } from '../utils/pinUtils';

type PageState = 'loading' | 'error' | 'recovery' | 'success';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State
  const [pageState, setPageState] = useState<PageState>('loading');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Extract params
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');

  useEffect(() => {
    const initReset = async () => {
      // 1. CHECK FOR ERROR FIRST
      if (error || errorCode) {
        console.error('[ResetPassword] Error detected:', { error, errorCode, errorDescription });
        setPageState('error');
        return;
      }

      // 2. CHECK FOR RECOVERY TOKEN
      if (accessToken && type === 'recovery') {
        console.log('[ResetPassword] Recovery token detected. Setting session...');
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('[ResetPassword] Session error:', sessionError);
            setPageState('error');
            return;
          }

          setPageState('recovery');
        } catch (err) {
          console.error('[ResetPassword] Unexpected error during session set:', err);
          setPageState('error');
        }
        return;
      }

      // 3. FALLBACK: UNKNOWN STATE
      console.warn('[ResetPassword] No tokens or errors found.');
      setPageState('error');
    };

    initReset();
  }, [accessToken, refreshToken, type, error, errorCode, errorDescription]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setErrorText('PIN must be at least 4 digits.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorText("Passwords don't match.");
      return;
    }

    setLoading(true);
    setErrorText(null);

    try {
      // Padded PIN for auth consistency
      const paddedPin = padPinForAuth(newPassword);
      
      // 1. Update Supabase Auth password
      const { error: updateError } = await supabase.auth.updateUser({
        password: paddedPin,
      });

      if (updateError) throw updateError;

      // 2. Update public.users profile (hash the raw PIN)
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const hashedPin = await hashPin(newPassword);
        await supabase
          .from('users')
          .update({ pin: hashedPin })
          .eq('id', user.id);
      }

      setPageState('success');
    } catch (err: any) {
      console.error('[ResetPassword] Update failed:', err);
      setErrorText(err?.message || 'Failed to update. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER HELPERS ---

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#00E676]/20 border-t-[#00E676] animate-spin" />
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 selection:bg-[#00E676] selection:text-black">
        <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Timer className="text-red-500" size={32} />
          </div>
          <h2 className="text-white font-[Syne] font-extrabold text-2xl mb-3 tracking-tight">Link Expired</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8 px-2">
            This reset link has expired or already been used. Links are only valid for 1 hour.
          </p>
          <button
            onClick={() => navigate('/forgot-pin')}
            className="w-full py-4 bg-[#00E676] text-black font-[Syne] font-black uppercase text-sm tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,230,118,0.3)] active:scale-95 transition-all mb-4"
          >
            Request New Link
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-white/40 text-xs font-medium hover:text-white transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 selection:bg-[#00E676] selection:text-black">
        <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="w-16 h-16 bg-[#00E676]/10 border border-[#00E676]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-[#00E676]" size={32} />
          </div>
          <h2 className="text-white font-[Syne] font-extrabold text-2xl mb-3 tracking-tight">Password Updated</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-8 px-2">
            You're good to go, soldier. Your new access credentials are now active.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-[#00E676] text-black font-[Syne] font-black uppercase text-sm tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,230,118,0.3)] active:scale-95 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 selection:bg-[#00E676] selection:text-black">
      <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/5 rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#00E676]/10 border border-[#00E676]/20 rounded-2xl flex items-center justify-center mb-6">
            <Lock className="text-[#00E676]" size={32} />
          </div>
          <h1 className="text-white font-[Syne] font-extrabold text-3xl mb-2 tracking-tight">Set New PIN</h1>
          <p className="text-white/40 text-sm text-center">Secure your vault with a new 4-digit PIN.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-white/30 text-[10px] font-bold uppercase tracking-widest ml-1">New PIN</label>
            <div className="relative group">
              <input
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#121212] border border-white/5 rounded-2xl px-5 py-4 text-white text-lg font-bold tracking-[0.5em] focus:border-[#00E676]/50 focus:outline-none transition-all"
                placeholder="••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-white/30 text-[10px] font-bold uppercase tracking-widest ml-1">Confirm PIN</label>
            <div className="relative group">
              <input
                type={showConfirm ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#121212] border border-white/5 rounded-2xl px-5 py-4 text-white text-lg font-bold tracking-[0.5em] focus:border-[#00E676]/50 focus:outline-none transition-all"
                placeholder="••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorText && (
            <p className="text-red-500 text-xs font-medium text-center animate-in fade-in slide-in-from-top-1">
              {errorText}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || newPassword.length < 4 || newPassword !== confirmPassword}
            className="w-full py-5 bg-[#00E676] text-black font-[Syne] font-black uppercase text-sm tracking-wider rounded-2xl shadow-[0_0_20px_rgba(0,230,118,0.3)] disabled:opacity-30 disabled:shadow-none active:scale-95 transition-all duration-200 mt-2"
          >
            {loading ? 'Updating...' : 'Update PIN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

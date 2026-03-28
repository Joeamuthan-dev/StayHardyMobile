// src/pages/Settings.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';

import { isNative } from '../utils/platform';
import { storage } from '../utils/storage';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { 
  Camera, Zap, ChevronRight,
  Lock, Trash2, LogOut,
  MessageSquare, Heart, Megaphone, RotateCcw
} from 'lucide-react';
import { supabase } from '../supabase';
import { hashPin, padPinForAuth } from '../utils/pinUtils';

import { ProductivityService } from '../lib/ProductivityService';
import SupportModal from '../components/SupportModal';
import { RevenueCatService } from '../services/revenuecat';

import {
  invokeDeleteUserAccount,
  wipeLocalDataAfterAccountDeletion,
  setAccountDeletedToastFlag,
} from '../lib/accountDeletion';
import { CacheManager } from '../lib/smartCacheManager';

const SESS_START_KEY = 'stayhardy_sess_started';




// --- REDESIGN HELPERS ---

const SettingsRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  upgrade?: boolean;
}> = ({ icon, title, subtitle, right, onClick, danger = false, upgrade = false }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      background: upgrade
        ? 'linear-gradient(135deg, rgba(0,230,118,0.08), transparent)'
        : 'transparent',
      border: 'none',
      borderBottom: upgrade ? 'none' : '1px solid rgba(255,255,255,0.04)',
      cursor: onClick ? 'pointer' : 'default',
      textAlign: 'left',
      WebkitTapHighlightColor: 'transparent',
      transition: 'background 0.15s ease',
      outline: 'none',
    }}
  >
    {/* Left Icon */}
    <div style={{
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: danger
        ? 'rgba(239,68,68,0.1)'
        : upgrade
          ? 'rgba(0,230,118,0.1)'
          : 'rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: danger ? '#EF4444' : upgrade ? '#00E676' : 'rgba(255,255,255,0.6)',
    }}>
      {icon}
    </div>

    {/* Content block */}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      flex: 1,
      minWidth: 0,
    }}>
      <span style={{
        fontSize: '14px',
        fontWeight: '500',
        color: danger
          ? 'rgba(239,68,68,0.85)'
          : upgrade
            ? '#00E676'
            : '#FFFFFF',
        display: 'block',
      }}>
        {title}
      </span>
      {subtitle && (
        <span style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.35)',
          display: 'block',
        }}>
          {subtitle}
        </span>
      )}
    </div>

    {/* Right element */}
    {right !== undefined ? (
      <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
        {right}
      </div>
    ) : onClick ? (
      <ChevronRight
        size={16}
        color={danger ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.2)'}
        style={{ flexShrink: 0, marginLeft: 'auto' }}
      />
    ) : null}
  </button>
);

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <p style={{
    fontSize: '11px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    margin: '28px 0 8px 4px',
    padding: '0 4px',
  }}>
    {label}
  </p>
);

const MembershipBadge: React.FC<{ email: string; isPro: boolean }> = ({ email, isPro }) => {
  const isAdmin = email === import.meta.env.VITE_ADMIN_EMAIL;
  if (isAdmin) return (
    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
      ADMIN
    </span>
  );
  if (isPro) return (
    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(0,230,118,0.3)', background: 'rgba(0,230,118,0.15)', color: '#00E676' }}>
      PRO
    </span>
  );
  return (
    <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '9px', fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
      BASIC
    </span>
  );
};

// --- MAIN COMPONENT ---

const Settings: React.FC = () => {
  const { user, logout, setCurrentUser, refreshUserProfile } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  const isProUser = isPro || isAdmin;

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'pro' | 'basic'>('basic');
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentPin, setCurrentPin] = useState(['', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState<{ show: boolean; type: 'tasks' | 'habits' | 'goals' | '' }>({ show: false, type: '' });
  const [showDeleteStep1Modal, setShowDeleteStep1Modal] = useState(false);
  const [showDeleteFinalModal, setShowDeleteFinalModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);


  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);


  const _handleUpdatePin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');

    const currentPinStr = currentPin.join('');
    const pinStr = newPin.join('');
    const confirmPinStr = confirmPin.join('');

    const isFourDigits = (s: string) => /^\d{4}$/.test(s);
    if (!isFourDigits(currentPinStr)) return setPinError('Current PIN must be 4 digits.');
    if (!isFourDigits(pinStr)) return setPinError('New PIN must be 4 digits.');
    if (pinStr !== confirmPinStr) return setPinError('New PINs do not match.');
    if (!user?.id || !user?.email) return setPinError('Not signed in.');

    setIsUpdatingPin(true);
    try {
      // Step 1: Verify current PIN via Supabase Auth (same as Login)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: padPinForAuth(currentPinStr),
      });
      if (authError) {
        setIsUpdatingPin(false);
        return setPinError('Incorrect current PIN.');
      }

      // Step 2: Update Supabase Auth password
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: padPinForAuth(pinStr),
      });
      if (updateAuthError) throw updateAuthError;

      // Step 3: Update users table with hashed new PIN
      const hashedPin = await hashPin(pinStr);
      const { error: dbError } = await supabase
        .from('users')
        .update({ pin: hashedPin })
        .eq('id', user.id);
      if (dbError) throw dbError;

      // Step 4: Success — close modal, show toast, force logout
      setShowPinModal(false);
      resetPinModalFields();
      setNotificationToast('PIN updated! Please log in again.');
      setTimeout(forceLogoutAfterPinChange, 1500);
    } catch (err: any) {
      setPinError(err?.message || 'Update failed. Please try again.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const email = session.user.email || '';
      setUserEmail(email);

      const { data: userRecord } = await supabase
        .from('users')
        .select('name,created_at')
        .eq('email', email)
        .maybeSingle();

      if (userRecord?.name) {
        setUserName(userRecord.name);
      } else {
        setUserName(email.split('@')[0]);
      }

      const createdAt = userRecord?.created_at || session.user.created_at;
      if (createdAt) {
        const date = new Date(createdAt);
        const formatted = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        setMemberSince(formatted);
      }

      if (email === import.meta.env.VITE_ADMIN_EMAIL) {
        setUserRole('admin');
      } else {
        const role = session.user.user_metadata?.role || 'basic';
        setUserRole(role as 'pro' | 'basic');
      }
    };
    loadProfile();
  }, []);



  useEffect(() => {
    if (!sessionStorage.getItem(SESS_START_KEY)) {
      sessionStorage.setItem(SESS_START_KEY, new Date().toISOString());
    }
  }, []);



  useEffect(() => {
    if (!notificationToast) return;
    const t = setTimeout(() => setNotificationToast(null), 3200);
    return () => clearTimeout(t);
  }, [notificationToast]);

  useEffect(() => {
    let cancelled = false;
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled || error || !data) return;
      setAnnouncements(data);
      const lastSeen = await storage.get('announcements_last_seen');
      if (cancelled) return;
      if (lastSeen) {
        const lastSeenTs = Number.parseInt(lastSeen, 10);
        const unread = data.filter((a) => new Date(a.created_at).getTime() > lastSeenTs).length;
        setUnreadCount(unread);
      } else {
        setUnreadCount(data.length);
      }
    };
    void fetchAnnouncements();
    return () => { cancelled = true; };
  }, []);





  const handleResetData = async () => {
    if (!user?.id || !showConfirmReset.type) return;
    const uid = user.id;
    try {
      if (showConfirmReset.type === 'tasks') {
        await supabase.from('tasks').delete().eq('userId', uid);
        localStorage.removeItem(`stayhardy_tasks_${uid}`);
      } else if (showConfirmReset.type === 'habits') {
        await supabase.from('routines').delete().eq('user_id', uid);
        await supabase.from('routine_logs').delete().eq('user_id', uid);
        localStorage.removeItem(`stayhardy_routines_${uid}`);
      } else if (showConfirmReset.type === 'goals') {
        await supabase.from('goals').delete().eq('user_id', uid);
        localStorage.removeItem(`stayhardy_goals_${uid}`);
      }
      await ProductivityService.recalculate(uid);
      window.dispatchEvent(new CustomEvent('stayhardy_refresh'));
      setShowConfirmReset({ show: false, type: '' });
      setNotificationToast(`${showConfirmReset.type.charAt(0).toUpperCase() + showConfirmReset.type.slice(1)} reset.`);
    } catch { setNotificationToast('Reset failed.'); }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await storage.remove('save_login_enabled');
      await storage.remove('saved_email');
      await storage.remove('saved_pin');
      await logout();
      window.location.href = '/';
    } catch { setIsLoggingOut(false); }
  };

  const forceLogoutAfterPinChange = async () => {
    try {
      const keys = ['user_profile', 'user_pin', 'app_pin', 'stayhardy_last_login_at', 'remembered_email', 'login_timestamp', 'supabase.auth.token'];
      for (const k of keys) { try { await storage.remove(k); } catch {} }
      try { await CacheManager.clearAll(); } catch {}
      await supabase.auth.signOut();
      await logout();
      navigate('/login', { replace: true, state: { pinUpdated: true } });
    } catch { navigate('/login', { replace: true, state: { pinUpdated: true } }); }
  };

  const resetPinModalFields = () => {
    setCurrentPin(['', '', '', '']);
    setNewPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setPinError('');
  };

  const handleUpdatePhoto = async () => {
    try {
      if (!user?.id) return;
      const image = await CapacitorCamera.getPhoto({ quality: 80, allowEditing: true, resultType: CameraResultType.Base64, source: CameraSource.Prompt, width: 400, height: 400 });
      if (!image.base64String) return;
      setIsUploading(true);
      const base64 = image.base64String;
      const byteChars = atob(base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      const filePath = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage.from('profile-images').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
      await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id);
      setCurrentUser({ ...user, avatarUrl });
      setNotificationToast('Profile photo updated ✅');
    } catch (err: any) { if (!err.message?.includes('cancel')) alert('Error: ' + err.message); }
    finally { setIsUploading(false); }
  };

  // --- COMPATIBILITY MAPPING ---
  const userProfile = {
    user_name: userName,
    user_email: userEmail,
    user_avatar_url: user?.avatarUrl,
    pro_member: userRole === 'pro' || userRole === 'admin'
  };

  // --- TOGGLE COMPONENTS ---


  return (
    <div className={`page-shell set-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .set-premium-page { 
          background: #000000; 
          min-height: 100dvh; 
          font-family: 'DM Sans', system-ui, sans-serif; 
          padding: calc(env(safe-area-inset-top, 0px) + 60px) 16px calc(110px + env(safe-area-inset-bottom, 0px)); 
          overflow-y: auto; 
        }
        .set-switch { 
          position: relative; 
          width: 50px; 
          height: 28px; 
          border-radius: 999px; 
          border: none; 
          cursor: pointer; 
          background: rgba(255,255,255,0.1); 
          transition: background 0.2s; 
          flex-shrink: 0;
        }
        .set-switch[data-on="1"] { background: #00E676; }
        .set-switch-knob { 
          position: absolute; 
          top: 3px; 
          left: 3px; 
          width: 22px; 
          height: 22px; 
          border-radius: 50%; 
          background: #fff; 
          transition: left 0.2s; 
        }
        .set-switch[data-on="1"] .set-switch-knob { left: 25px; }
        .set-switch-spin { font-size: 16px; color: #FFFFFF; opacity: 0.6; }
        @keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rotating { animation: rotating 0.8s linear infinite; }
        
        .section-container {
          background: #0D0D0D;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .sp-toast {
          position: fixed;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          color: #000;
          padding: 12px 24px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          z-index: 10001;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          white-space: nowrap;
        }

        .glass-card {
          background: rgba(20, 20, 20, 0.8);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
      `}</style>

      {/* Profile Card — Redesigned */}
      <div style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        margin: '0 0 4px 0',
        background: isProUser
          ? 'linear-gradient(135deg, #0B1A12 0%, #0D0D0D 50%, #0A1410 100%)'
          : 'linear-gradient(135deg, #111111 0%, #0D0D0D 100%)',
        border: isProUser
          ? '1px solid rgba(0,230,118,0.2)'
          : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isProUser
          ? '0 0 60px rgba(0,230,118,0.07), 0 20px 40px rgba(0,0,0,0.5)'
          : '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Decorative glow blob top-left */}
        <div style={{
          position: 'absolute', top: '-30px', left: '-20px',
          width: '140px', height: '140px',
          background: isProUser
            ? 'radial-gradient(circle, rgba(0,230,118,0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Decorative dots pattern top-right */}
        <svg style={{ position: 'absolute', top: 0, right: 0, opacity: 0.06, pointerEvents: 'none' }}
          width="80" height="80" viewBox="0 0 80 80">
          {[0,1,2,3].map(row => [0,1,2,3].map(col => (
            <circle key={`${row}-${col}`} cx={10 + col * 20} cy={10 + row * 20} r="1.5" fill="white"/>
          )))}
        </svg>

        {/* Main content */}
        <div style={{ padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

            {/* Avatar */}
            <div
              onClick={handleUpdatePhoto}
              style={{ position: 'relative', flexShrink: 0, cursor: 'pointer', width: '72px', height: '72px' }}
            >
              {isUploading && (
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', zIndex: 2,
                }}>
                  <Megaphone size={20} className="rotating" style={{ color: '#00E676' }} />
                </div>
              )}
              {userProfile?.user_avatar_url ? (
                <img
                  src={userProfile.user_avatar_url}
                  alt="Profile"
                  style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    objectFit: 'cover', display: 'block',
                    boxShadow: isProUser
                      ? '0 0 0 2px #00E676, 0 0 16px rgba(0,230,118,0.3)'
                      : '0 0 0 2px rgba(255,255,255,0.15)',
                  }}
                />
              ) : (
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a2e1e, #0d0d0d)',
                  boxShadow: isProUser
                    ? '0 0 0 2px #00E676, 0 0 16px rgba(0,230,118,0.3)'
                    : '0 0 0 2px rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: '800',
                  fontSize: '26px', color: '#00E676',
                }}>
                  {(userProfile?.user_name || userProfile?.user_email || 'S').charAt(0).toUpperCase()}
                </div>
              )}

              {/* Camera badge */}
              <div style={{
                position: 'absolute', bottom: '1px', right: '1px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#00E676', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0D0D0D',
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}>
                <Camera size={11} color="#000000" />
              </div>
            </div>

            {/* Info block */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name + Badge inline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '17px', fontWeight: '800', color: '#FFFFFF',
                  fontFamily: 'Syne, sans-serif',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: '160px',
                }}>
                  {userProfile?.user_name || 'Soldier'}
                </span>
                <MembershipBadge
                  email={userProfile?.user_email || user?.email || ''}
                  isPro={isProUser}
                />
              </div>

              {/* Email */}
              <span style={{
                fontSize: '11.5px', color: 'rgba(255,255,255,0.35)',
                display: 'block', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {userProfile?.user_email || user?.email || ''}
              </span>

              {/* Member since */}
              {memberSince && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '7px' }}>
                  <div style={{ width: '14px', height: '1px', background: 'rgba(255,255,255,0.12)' }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
                    Since {memberSince}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div style={{
          height: '2px',
          background: isProUser
            ? 'linear-gradient(90deg, transparent, #00E676 40%, rgba(0,230,118,0.3) 100%)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)',
        }} />
      </div>

      {/* Account Section */}
      <SectionHeader label="Account" />
      <div className="section-container">
        <SettingsRow
          icon={<Lock size={16} />}
          title="Change Access PIN"
          subtitle="Keep your vault secure"
          onClick={() => { resetPinModalFields(); setShowPinModal(true); }}
        />
      </div>



      {/* Premium Section */}
      <SectionHeader label="Premium" />
      <div className="section-container">
        {!isProUser && (
          <SettingsRow
            icon={<Zap size={16} />}
            title="Upgrade to Pro"
            subtitle="Just ₹1 per day · Go Pro"
            onClick={() => navigate('/paywall')}
            upgrade={true}
          />
        )}
        {isNative && userRole !== 'admin' && (
          <SettingsRow
            icon={<RotateCcw size={16} />}
            title="Restore Purchases"
            subtitle="Recover your Pro access"
            onClick={async () => { 
              setIsRestoring(true); 
              try { 
                const info = await RevenueCatService.restorePurchases(); 
                if (!!info?.entitlements.active['StayHardy Pro']) { 
                  await refreshUserProfile(); 
                  setNotificationToast('Purchases restored ✅'); 
                } else setNotificationToast('No active purchases.'); 
              } catch { setNotificationToast('Restore failed.'); } 
              finally { setIsRestoring(false); } 
            }}
            right={isRestoring ? <RotateCcw size={16} className="rotating text-[#00E676]" /> : undefined}
          />
        )}
      </div>

      {/* Support Section */}
      <SectionHeader label="Support" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* News & Updates Highlighted Row */}
        <button
          onClick={async () => { 
            navigate('/updates'); 
            await storage.set('announcements_last_seen', Date.now().toString()); 
            setUnreadCount(0); 
          }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            background: 'rgba(0,230,118,0.06)',
            border: '1px solid rgba(0,230,118,0.15)',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 0.15s ease',
            outline: 'none',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(0,230,118,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#00E676',
          }}>
            <Megaphone size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#00E676', display: 'block' }}>
              News & Updates
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>
              {announcements.length > 0 ? `${announcements.length} announcements` : "No updates yet"}
            </span>
          </div>
          {unreadCount > 0 ? (
            <span style={{ 
              background: 'rgba(0,230,118,0.2)', 
              color: '#00E676', 
              padding: '4px 10px', 
              borderRadius: '20px', 
              fontSize: '11px', 
              fontWeight: '700' 
            }}>
              {unreadCount} NEW
            </span>
          ) : (
            <ChevronRight size={16} color="#00E676" style={{ flexShrink: 0, marginLeft: 'auto', opacity: 0.4 }} />
          )}
        </button>

        {/* Send Feedback Highlighted Row */}
        <button
          onClick={() => navigate('/feedback')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            background: 'rgba(99,102,241,0.06)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 0.15s ease',
            outline: 'none',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(99,102,241,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#6366F1',
          }}>
            <MessageSquare size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#6366F1', display: 'block' }}>
              Send Feedback
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>
              Report issues or suggest ideas
            </span>
          </div>
          <ChevronRight size={16} color="#6366F1" style={{ flexShrink: 0, marginLeft: 'auto', opacity: 0.4 }} />
        </button>

        {/* Support the Mission Highlighted Row */}
        <button
          onClick={() => setShowSupportModal(true)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '14px 16px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background 0.15s ease',
            outline: 'none',
          }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(245,158,11,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#F59E0B',
          }}>
            <Heart size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#F59E0B', display: 'block' }}>
              Support the Mission
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: 'block' }}>
              Help us grow Stay Hardy
            </span>
          </div>
          <ChevronRight size={16} color="#F59E0B" style={{ flexShrink: 0, marginLeft: 'auto', opacity: 0.4 }} />
        </button>
      </div>

      {/* Danger Zone Section */}
      <SectionHeader label="Danger Zone" />
      <div className="section-container">
        {(() => {
          const isAdmin =
            userProfile?.user_email === import.meta.env.VITE_ADMIN_EMAIL
            || user?.email === import.meta.env.VITE_ADMIN_EMAIL;
          const isProOrAdmin = userProfile.pro_member || isAdmin;

          return isProOrAdmin ? (
            <SettingsRow
              icon={<RotateCcw size={16} />}
              title="Reset Habits"
              subtitle="Clear all habit logs (Irreversible)"
              onClick={() => setShowConfirmReset({ show: true, type: 'habits' })}
              danger={true}
            />
          ) : null;
        })()}

        <SettingsRow
          icon={<Trash2 size={16} />}
          title="Delete My Account"
          subtitle="Wipe all data from the vault"
          onClick={() => setShowDeleteStep1Modal(true)}
          danger={true}
        />
      </div>

      {/* Logout Button */}
      <div style={{ marginTop: '40px' }}>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '16px',
            borderRadius: '16px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#FF6B6B',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.1s ease',
            outline: 'none',
          }}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isLoggingOut ? (
            <RotateCcw size={18} className="rotating" />
          ) : (
            <LogOut size={18} />
          )}
          {isLoggingOut ? 'SIGNING OUT...' : 'LOGOUT'}
        </button>
        
        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.15)',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.05em',
          marginTop: '20px',
          textTransform: 'uppercase'
        }}>
          Stay Hardy v8.2.0 · Command Center
        </p>
      </div>

      {/* MODALS (Existing logic untouched) */}
      {showConfirmReset.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Are you sure?</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>This will permanently clear your {showConfirmReset.type}. This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowConfirmReset({ show: false, type: '' })} style={{ flex: 1, padding: '12px', borderRadius: '12px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '700' }}>Cancel</button>
              <button onClick={handleResetData} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#EF4444', color: '#fff', border: 'none', fontWeight: '800' }}>Yes, Reset</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteStep1Modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Delete Account?</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '24px' }}>All your data will be wiped from our servers forever. Access to your Pro subscription will be lost.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowDeleteStep1Modal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '700' }}>Cancel</button>
              <button onClick={() => { setShowDeleteStep1Modal(false); setShowDeleteFinalModal(true); }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#EF4444', color: '#fff', border: 'none', fontWeight: '800' }}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteFinalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2.5rem 2rem', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <Trash2 size={48} color="#EF4444" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: '900', marginBottom: '12px' }}>Final Warning</h2>
            <p style={{ color: '#EF4444', fontSize: '13px', fontWeight: '700', marginBottom: '32px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>This is irreversible.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={async () => {
                  setIsDeletingAccount(true);
                  try {
                    await invokeDeleteUserAccount({});
                    setAccountDeletedToastFlag();
                    await wipeLocalDataAfterAccountDeletion(user?.id ?? '');
                    await logout();
                    navigate('/');
                  } catch {
                    setIsDeletingAccount(false);
                    setNotificationToast('Deletion failed. Please try again.');
                  }
                }}
                disabled={isDeletingAccount}
                style={{ width: '100%', padding: '16px', borderRadius: '14px', background: isDeletingAccount ? 'rgba(239,68,68,0.5)' : '#EF4444', color: '#fff', border: 'none', fontWeight: '900', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: isDeletingAccount ? 'not-allowed' : 'pointer' }}
              >
                {isDeletingAccount ? (
                  <>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid #fff', animation: 'rotating 0.8s linear infinite' }} />
                    Deleting...
                  </>
                ) : (
                  'DELETE MY ACCOUNT NOW'
                )}
              </button>
              <button onClick={() => setShowDeleteFinalModal(false)} style={{ width: '100%', padding: '16px', borderRadius: '14px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', fontWeight: '700', fontSize: '14px' }}>
                Wait, take me back
              </button>
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
            <h2 style={{ color: '#fff', textAlign: 'center', fontSize: '20px', fontWeight: '800', marginBottom: '24px' }}>Update Access PIN</h2>
            <form onSubmit={_handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', paddingLeft: '4px' }}>Current PIN</label>
                <input type="password" maxLength={4} inputMode="numeric" value={currentPin.join('')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').split('').slice(0, 4); const n = [...currentPin]; v.forEach((x, i) => n[i] = x); for(let i=v.length; i<4; i++) n[i] = ''; setCurrentPin(n); }} placeholder="••••" style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', paddingLeft: '4px' }}>New PIN</label>
                <input type="password" maxLength={4} inputMode="numeric" value={newPin.join('')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').split('').slice(0, 4); const n = [...newPin]; v.forEach((x, i) => n[i] = x); for(let i=v.length; i<4; i++) n[i] = ''; setNewPin(n); }} placeholder="••••" style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', paddingLeft: '4px' }}>Confirm New PIN</label>
                <input type="password" maxLength={4} inputMode="numeric" value={confirmPin.join('')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').split('').slice(0, 4); const n = [...confirmPin]; v.forEach((x, i) => n[i] = x); for(let i=v.length; i<4; i++) n[i] = ''; setConfirmPin(n); }} placeholder="••••" style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', outline: 'none' }} />
              </div>
              
              {pinError && <p style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', marginTop: '4px' }}>{pinError}</p>}
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '700' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={
                    isUpdatingPin ||
                    currentPin.join('').length !== 4 ||
                    newPin.join('').length !== 4 ||
                    confirmPin.join('').length !== 4 ||
                    newPin.join('') !== confirmPin.join('')
                  }
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    background: (isUpdatingPin || currentPin.join('').length !== 4 || newPin.join('').length !== 4 || confirmPin.join('').length !== 4 || newPin.join('') !== confirmPin.join('')) ? 'rgba(0,230,118,0.3)' : '#00E676',
                    color: '#000',
                    border: 'none',
                    fontWeight: '900'
                  }}
                >
                  {isUpdatingPin ? 'Updating...' : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
      {notificationToast && <div className="sp-toast">{notificationToast}</div>}
      {isDeletingAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <RotateCcw size={32} className="rotating" style={{ color: '#EF4444', marginBottom: '16px' }} />
          <p style={{ color: '#EF4444', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Wiping Data Vault...</p>
        </div>
      )}
    </div>
  );
};

export default Settings;

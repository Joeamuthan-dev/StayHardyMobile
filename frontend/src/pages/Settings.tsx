// src/pages/Settings.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { isNative } from '../utils/platform';
import { storage } from '../utils/storage';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { User, Camera, Zap } from 'lucide-react';
import { supabase } from '../supabase';
import { saveUserProfileCache } from '../lib/userProfileCache';
import { ProductivityService } from '../lib/ProductivityService';
import SupportModal from '../components/SupportModal';
import { RevenueCatService } from '../services/revenuecat';
import {
  isPushSupportedNative,
  enablePushNotificationsAndGetToken,
  isPushPermissionDenied,
  pushLog,
} from '../lib/pushNotifications';
import {
  isBiometricNative,
  hidePushAndBiometricOnAndroid,
  shouldShowBiometricToggle,
  enableBiometricLoginForCurrentUser,
  disableBiometricLoginForCurrentUser,
  clearBiometricOnPinChange,
  showBiometricsNotEnrolledAlert,
} from '../lib/biometricAuth';
import {
  invokeDeleteUserAccount,
} from '../lib/accountDeletion';
import { CacheManager } from '../lib/smartCacheManager';

const SESS_START_KEY = 'stayhardy_sess_started';

function prefsCachePushKey(userId: string) {
  return `stayhardy_pref_push_${userId}`;
}
function prefsCacheBiometricKey(userId: string) {
  return `stayhardy_pref_biometric_${userId}`;
}
function readCachedBool(key: string): boolean | null {
  const v = localStorage.getItem(key);
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
}
function writeCachedBool(key: string, on: boolean) {
  localStorage.setItem(key, on ? '1' : '0');
}

const Settings: React.FC = () => {
  const { user, logout, setCurrentUser, refreshUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
  const [proPrice, setProPrice] = useState(199);
  const [originalPrice, setOriginalPrice] = useState(999);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);
  const [pushPrefsLoading, setPushPrefsLoading] = useState(true);
  const [biometricRowVisible, setBiometricRowVisible] = useState(false);
  const [pushToggleBusy, setPushToggleBusy] = useState(false);
  const [biometricToggleBusy, setBiometricToggleBusy] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pushFetchSeqRef = useRef(0);
  const [prefsResumeTick, setPrefsResumeTick] = useState(0);

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
    if (!user?.id) return setPinError('Not signed in.');
    setIsUpdatingPin(true);
    try {
      const { data: dbUser } = await supabase.from('users').select('pin').eq('id', user.id).single();
      if (!dbUser || (dbUser.pin || '').trim() !== currentPinStr.trim()) return setPinError('Incorrect current PIN.');
      await supabase.from('users').update({ pin: pinStr.trim() }).eq('id', user.id);
      await clearBiometricOnPinChange(user.id);
      setNotificationToast('PIN updated successfully!');
      setShowPinModal(false);
      resetPinModalFields();
      setTimeout(forceLogoutAfterPinChange, 1500);
    } catch { setPinError('Update failed.'); }
    finally { setIsUpdatingPin(false); }
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

      if (email === 'joeamuthan2@gmail.com') {
        setUserRole('admin');
      } else {
        const role = session.user.user_metadata?.role || 'basic';
        setUserRole(role as 'pro' | 'basic');
      }
    };
    loadProfile();
  }, []);

  const fetchProPrice = async () => {
    try {
      const value = await storage.get('app_settings');
      if (value) {
        const cached = JSON.parse(value);
        const data = cached?.data;
        if (data?.pro_price) {
          setProPrice(data.pro_price);
          setOriginalPrice(data.pro_original_price || 999);
          return;
        }
      }
      const { data } = await supabase.from('app_settings').select('pro_price, pro_original_price').single();
      if (data) {
        setProPrice(data.pro_price || 199);
        setOriginalPrice(data.pro_original_price || 999);
      }
    } catch {
      setProPrice(199);
      setOriginalPrice(999);
    }
  };

  useEffect(() => {
    fetchProPrice();
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem(SESS_START_KEY)) {
      sessionStorage.setItem(SESS_START_KEY, new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    if (!isNative) return undefined;
    let handle: { remove: () => Promise<void> } | undefined;
    void App.addListener('resume', () => {
      setPrefsResumeTick((t) => t + 1);
    }).then((h) => {
      handle = h;
    });
    return () => { void handle?.remove(); };
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

  useEffect(() => {
    if (!user?.id) {
      setPushPrefsLoading(false);
      return;
    }
    if (hidePushAndBiometricOnAndroid()) {
      setPushPrefsLoading(false);
      return;
    }

    const pushCached = readCachedBool(prefsCachePushKey(user.id));
    const bioCached = readCachedBool(prefsCacheBiometricKey(user.id));
    if (pushCached !== null) setPushNotificationsEnabled(pushCached);
    if (bioCached !== null) setBiometricLoginEnabled(bioCached);

    const seq = ++pushFetchSeqRef.current;
    let cancelled = false;
    (async () => {
      setPushPrefsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('push_notifications_enabled, biometric_login_enabled')
        .eq('id', user.id)
        .single();
      if (cancelled || seq !== pushFetchSeqRef.current) {
        setPushPrefsLoading(false);
        return;
      }
      if (error) console.error('Load profile preferences:', error);
      const pushOn = !!data?.push_notifications_enabled;
      const bioOn = !!data?.biometric_login_enabled;
      setPushNotificationsEnabled(pushOn);
      setBiometricLoginEnabled(bioOn);
      writeCachedBool(prefsCachePushKey(user.id), pushOn);
      writeCachedBool(prefsCacheBiometricKey(user.id), bioOn);
      setPushPrefsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id, location.pathname, prefsResumeTick]);

  useEffect(() => {
    if (!user?.id) {
      setBiometricRowVisible(false);
      return;
    }
    if (hidePushAndBiometricOnAndroid()) {
      setBiometricRowVisible(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!isBiometricNative()) {
        if (!cancelled) setBiometricRowVisible(false);
        return;
      }
      const ok = await shouldShowBiometricToggle();
      if (!cancelled) setBiometricRowVisible(ok);
    })();
    return () => { cancelled = true; };
  }, [user?.id, location.pathname, prefsResumeTick]);

  const handleBiometricToggle = async () => {
    if (!user?.id || biometricToggleBusy || pushPrefsLoading) return;
    if (biometricLoginEnabled) {
      pushFetchSeqRef.current += 1;
      setBiometricToggleBusy(true);
      try {
        const result = await disableBiometricLoginForCurrentUser(user.id);
        if (!result.ok) {
          setNotificationToast(result.reason === 'verify_failed' ? 'Biometric verification failed' : 'Could not disable biometric login');
          return;
        }
        setBiometricLoginEnabled(false);
        writeCachedBool(prefsCacheBiometricKey(user.id), false);
        void saveUserProfileCache(user, { biometric_enabled: false, push_notifications_enabled: pushNotificationsEnabled });
        setNotificationToast('Biometric login disabled');
      } finally { setBiometricToggleBusy(false); }
      return;
    }
    const avail = await shouldShowBiometricToggle();
    if (!avail) { showBiometricsNotEnrolledAlert(); return; }
    pushFetchSeqRef.current += 1;
    setBiometricToggleBusy(true);
    try {
      const result = await enableBiometricLoginForCurrentUser({ id: user.id, email: user.email, name: user.name });
      if (!result.ok) {
        if (result.reason === 'not_enrolled') showBiometricsNotEnrolledAlert();
        else setNotificationToast('Biometric login update failed');
        return;
      }
      setBiometricLoginEnabled(true);
      writeCachedBool(prefsCacheBiometricKey(user.id), true);
      void saveUserProfileCache(user, { biometric_enabled: true, push_notifications_enabled: pushNotificationsEnabled });
      setNotificationToast('Biometric login enabled');
    } finally { setBiometricToggleBusy(false); }
  };

  const handlePushToggle = async () => {
    if (!user?.id || pushToggleBusy || pushPrefsLoading) return;
    if (pushNotificationsEnabled) {
      pushFetchSeqRef.current += 1;
      pushLog('0. toggle tapped: DISABLE');
      setPushToggleBusy(true);
      try {
        const { error } = await supabase.from('users').update({ push_notifications_enabled: false }).eq('id', user.id);
        if (error) { setNotificationToast('Could not update notification settings'); return; }
        setPushNotificationsEnabled(false);
        writeCachedBool(prefsCachePushKey(user.id), false);
        void saveUserProfileCache(user, { push_notifications_enabled: false, biometric_enabled: biometricLoginEnabled });
        setNotificationToast('Notifications disabled');
      } finally { setPushToggleBusy(false); }
      return;
    }
    if (!isPushSupportedNative()) { setNotificationToast('Push notifications available in mobile app.'); return; }
    if (await isPushPermissionDenied()) { window.alert('Notifications Blocked\n\nPlease enable in device settings.'); return; }
    pushFetchSeqRef.current += 1;
    setPushToggleBusy(true);
    try {
      const result = await enablePushNotificationsAndGetToken();
      if (!result.ok) { setNotificationToast('Could not register device.'); return; }
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error: upErr } = await supabase.from('users').update({
        push_token: result.token,
        push_token_updated_at: new Date().toISOString(),
        push_timezone: tz,
        push_notifications_enabled: true,
      }).eq('id', user.id);
      if (upErr) { setNotificationToast('Failed to save preference.'); return; }
      setPushNotificationsEnabled(true);
      writeCachedBool(prefsCachePushKey(user.id), true);
      void saveUserProfileCache(user, { push_notifications_enabled: true, biometric_enabled: biometricLoginEnabled });
      setNotificationToast('Notifications enabled');
    } catch { setNotificationToast('Something went wrong.'); }
    finally { setPushToggleBusy(false); }
  };

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

  const pushSwitch = (
    <button type="button" role="switch" aria-checked={pushNotificationsEnabled} disabled={pushPrefsLoading || pushToggleBusy} onClick={(e) => { e.stopPropagation(); void handlePushToggle(); }} className="set-switch" data-on={pushNotificationsEnabled ? '1' : '0'}>
      {!pushToggleBusy && <span className="set-switch-knob" />}
      {pushToggleBusy && <span className="material-symbols-outlined rotating set-switch-spin">sync</span>}
    </button>
  );

  const bioSwitch = (
    <button type="button" role="switch" aria-checked={biometricLoginEnabled} disabled={pushPrefsLoading || biometricToggleBusy} onClick={(e) => { e.stopPropagation(); void handleBiometricToggle(); }} className="set-switch" data-on={biometricLoginEnabled ? '1' : '0'}>
      {!biometricToggleBusy && <span className="set-switch-knob" />}
      {biometricToggleBusy && <span className="material-symbols-outlined rotating set-switch-spin">sync</span>}
    </button>
  );

  return (
    <div className={`page-shell set-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .set-premium-page { background: #000000; min-height: 100dvh; font-family: 'DM Sans', system-ui, sans-serif; padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px)); overflow-y: auto; }
        .sp-hero { display: flex; flex-direction: column; align-items: center; padding: 52px 20px 28px; }
        .sp-avatar-ring { position: relative; width: 96px; height: 96px; border-radius: 50%; background: #111111; border: 2px solid rgba(0, 230, 118, 0.4); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(0,230,118,0.15); margin-bottom: 24px; }
        .sp-avatar-ring img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .sp-camera-btn { position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-radius: 50%; background: #00E676; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(0,230,118,0.4); border: none; cursor: pointer; transition: all 0.2s; }
        .sp-camera-btn:active { transform: scale(0.95); }
        .sp-name { font-family: system-ui, -apple-system, 'Inter', sans-serif; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; margin: 0 0 4px; text-align: center; }
        .sp-email { font-size: 13px; color: rgba(255,255,255,0.4); margin: 0 0 12px; text-align: center; }
        .sp-badge-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .sp-role-badge { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; border: 1px solid; }
        .sp-edit-btn { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 0.5px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 8px 20px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.75); cursor: pointer; transition: background 0.2s ease; }
        .sp-group { margin: 0 16px 20px; }
        .sp-group-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.25); padding: 0 4px; margin-bottom: 8px; }
        .sp-group-card { background: #0A0A0A; border: 0.5px solid #2A2A2A; border-radius: 18px; overflow: hidden; }
        .sp-row { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: none; background: none; color: inherit; cursor: pointer; text-align: left; }
        .sp-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 0 16px; }
        .sp-ic { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #1A1A1A; border: 0.5px solid rgba(255,255,255,0.08); }
        .sp-row-body { flex: 1; }
        .sp-row-title { font-size: 14px; font-weight: 600; color: #FFFFFF; }
        .sp-row-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 1px; }
        .sp-status-card { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 18px; background: #111111; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px; }
        .sp-status-ic { width: 40px; height: 40px; border-radius: 12px; background: rgba(0, 230, 118, 0.1); border: 1px solid rgba(0, 230, 118, 0.2); display: flex; align-items: center; justify-content: center; }
        .sp-upgrade-btn { font-size: 9px; font-weight: 800; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(0, 230, 118, 0.4); color: #00E676; background: rgba(0, 230, 118, 0.1); }
        .sp-logout { width: 100%; margin: 8px 0 0; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 15px; border-radius: 14px; border: 1px solid rgba(248,113,113,0.4); background: rgba(239,68,68,0.06); color: #fecaca; font-weight: 700; font-size: 13px; text-transform: uppercase; cursor: pointer; }
        .set-switch { position: relative; width: 52px; height: 30px; border-radius: 999px; border: none; cursor: pointer; background: rgba(148,163,184,0.35); transition: background 0.2s; }
        .set-switch[data-on="1"] { background: #10b981; }
        .set-switch-knob { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; transition: left 0.2s; }
        .set-switch[data-on="1"] .set-switch-knob { left: 26px; }
        @keyframes rotating { to { transform: rotate(360deg); } }
        .rotating { animation: rotating 0.9s linear infinite; }
      `}</style>

      {/* Hero Section */}
      <div className="sp-hero">
        <div className="sp-avatar-ring">
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="Profile" /> : <User size={40} className="text-white/30" strokeWidth={1.5} />}
          {isUploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined rotating" style={{ color: '#00E676' }}>sync</span>
            </div>
          )}
          <button className="sp-camera-btn" onClick={handleUpdatePhoto}><Camera size={14} className="text-black" /></button>
        </div>
        <h2 className="sp-name">{userName || 'Hardy Soldier'}</h2>
        <p className="sp-email">{userEmail}</p>
        <div className="sp-badge-row">
          <span className={`sp-role-badge ${userRole === 'admin' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : userRole === 'pro' ? 'border-[#00E676]/40 text-[#00E676] bg-[#00E676]/10' : 'border-white/20 text-white/40 bg-white/5'}`}>
            {userRole === 'admin' ? '⚡ Admin' : userRole === 'pro' ? '⚡ Pro' : 'Basic'}
          </span>
          <span className="text-white/20 text-xs">·</span>
          {memberSince && <span className="text-white/30 text-xs">Member since {memberSince}</span>}
        </div>
        <button type="button" className="sp-edit-btn" onClick={handleUpdatePhoto}><span className="material-symbols-outlined" style={{ fontSize: 13 }}>{user?.avatarUrl ? 'edit' : 'add_a_photo'}</span> {user?.avatarUrl ? 'Update Photo' : 'Add Photo'}</button>
      </div>

      {/* News and Updates */}
      <div className="sp-group">
        <div className="sp-group-label">NEWS AND UPDATES</div>
        <div className="sp-group-card">
          <button type="button" className="sp-row" onClick={async () => { navigate('/updates'); await storage.set('announcements_last_seen', Date.now().toString()); setUnreadCount(0); }}>
            <div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>campaign</span></div>
            <div className="sp-row-body">
              <span className="sp-row-title">Stay Hardy Updates</span>
              <span className="sp-row-sub">{announcements.length > 0 ? `${announcements.length} announcements` : 'No updates yet'}</span>
            </div>
            {unreadCount > 0 && <div style={{ background: '#00E87A', color: '#000', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 800, marginRight: 4 }}>{unreadCount} NEW</div>}
            <span className="material-symbols-outlined sp-chev">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Support Section */}
      <div className="sp-group">
        <div className="sp-group-label">SUPPORT</div>
        <div className="sp-group-card">
          <button type="button" className="sp-row" onClick={() => navigate('/feedback')}><div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>chat</span></div><div className="sp-row-body"><span className="sp-row-title">Support & Feedback</span><span className="sp-row-sub">Report issues or suggest features</span></div><span className="material-symbols-outlined sp-chev">chevron_right</span></button>
          <div className="sp-divider" /><button type="button" className="sp-row" onClick={() => setShowSupportModal(true)}><div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>favorite</span></div><div className="sp-row-body"><span className="sp-row-title">Support the Mission</span><span className="sp-row-sub">Support the mission</span></div><span className="material-symbols-outlined sp-chev">chevron_right</span></button>
        </div>
      </div>

      {/* Notifications */}
      {!hidePushAndBiometricOnAndroid() && (
        <div className="sp-group">
          <div className="sp-group-label">NOTIFICATIONS</div>
          <div className="sp-group-card" style={{ opacity: pushPrefsLoading ? 0.7 : 1 }}><div className="sp-row"><div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>notifications_active</span></div><div className="sp-row-body"><span className="sp-row-title">Push Notifications</span><span className="sp-row-sub">Daily reminders</span></div>{pushSwitch}</div></div>
        </div>
      )}

      {/* Security */}
      <div className="sp-group">
        <div className="sp-group-label">SECURITY</div>
        <div className="sp-group-card">
          {!hidePushAndBiometricOnAndroid() && biometricRowVisible && (
            <><div className="sp-row" style={{ opacity: pushPrefsLoading ? 0.7 : 1 }}><div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>fingerprint</span></div><div className="sp-row-body"><span className="sp-row-title">Biometric Login</span><span className="sp-row-sub">Faster sign-in</span></div>{bioSwitch}</div><div className="sp-divider" /></>
          )}
          <button type="button" className="sp-row" onClick={() => { resetPinModalFields(); setShowPinModal(true); }}><div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>lock</span></div><div className="sp-row-body"><span className="sp-row-title">Change Access PIN</span><span className="sp-row-sub">Update your 4-digit PIN</span></div><span className="material-symbols-outlined sp-chev">chevron_right</span></button>
        </div>
      </div>

      {/* Purchases */}
      {isNative && (
        <div className="sp-group">
          <div className="sp-group-label">PURCHASES</div>
          <div className="sp-status-card">
            <div className="sp-status-ic"><Zap size={18} className="text-[#00E676]" /></div>
            <div className="sp-row-body">
              <p className="text-white text-sm font-medium">{userRole === 'pro' || userRole === 'admin' ? 'Stay Hardy PRO' : 'Stay Hardy Basic'}</p>
              <p className="text-white/40 text-xs">{userRole === 'pro' || userRole === 'admin' ? 'All features unlocked ✓' : 'Upgrade to unlock Habits & Stats'}</p>
            </div>
            {userRole === 'basic' && <button className="sp-upgrade-btn" onClick={() => navigate('/paywall')}>UPGRADE</button>}
          </div>
          <div className="sp-group-card">
            {userRole !== 'admin' && (
              <button type="button" className="sp-row" disabled={isRestoring} onClick={async () => { setIsRestoring(true); try { const info = await RevenueCatService.restorePurchases(); if (!!info?.entitlements.active['pro']) { await refreshUserProfile(); setNotificationToast('Purchases restored ✅'); } else setNotificationToast('No active purchases.'); } catch { setNotificationToast('Restore failed.'); } finally { setIsRestoring(false); } }}>
                <div className="sp-ic"><span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>restore</span></div>
                <div className="sp-row-body"><span className="sp-row-title">Restore Purchases</span><span className="sp-row-sub">Recover Pro access</span></div>
                {isRestoring ? <span className="material-symbols-outlined rotating" style={{ color: '#00E87A', fontSize: 18 }}>sync</span> : <span className="material-symbols-outlined sp-chev">chevron_right</span>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="sp-group">
        <div className="sp-group-label sp-group-label--danger">DANGER ZONE</div>
        <div className="sp-group-card sp-group-card--danger">
          {(['tasks', 'habits'] as const).map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 && <div className="sp-divider" />}
              <button type="button" className="sp-row" onClick={() => setShowConfirmReset({ show: true, type: t })}>
                <div className="sp-ic" style={{ background: 'rgba(239,68,68,0.1)' }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#EF4444' }}>restart_alt</span></div>
                <div className="sp-row-body"><span className="sp-row-title sp-row-title--danger">Reset {t === 'habits' ? 'Habits' : 'Tasks'}</span><span className="sp-row-sub">Cannot be undone</span></div><span className="material-symbols-outlined sp-chev">chevron_right</span>
              </button>
            </React.Fragment>
          ))}
          <div className="sp-divider" /><button type="button" className="sp-row" onClick={() => setShowDeleteStep1Modal(true)}><div className="sp-ic" style={{ background: 'rgba(239,68,68,0.1)' }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#EF4444' }}>delete</span></div><div className="sp-row-body"><span className="sp-row-title sp-row-title--danger">Delete My Account</span><span className="sp-row-sub">Remove all data</span></div><span className="material-symbols-outlined sp-chev">chevron_right</span></button>
        </div>
      </div>

      <div className="sp-group" style={{ marginTop: 8 }}><button type="button" className="sp-logout" onClick={handleLogout} disabled={isLoggingOut}><span className={`material-symbols-outlined${isLoggingOut ? ' rotating' : ''}`} style={{ fontSize: 18 }}>{isLoggingOut ? 'sync' : 'logout'}</span> {isLoggingOut ? 'Signing out…' : 'Log out'}</button></div>
      {userRole === 'admin' && (
        <div className="sp-group" style={{ marginTop: 24 }}><div className="sp-group-label">ADMIN</div><div className="sp-group-card"><button type="button" className="sp-row" onClick={() => navigate('/admin')}><div className="sp-ic" style={{ background: 'rgba(245,158,11,0.1)' }}><span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>admin_panel_settings</span></div><div className="sp-row-body"><span className="sp-row-title">Admin Hub</span><span className="sp-row-sub">Management</span></div><span className="material-symbols-outlined sp-chev">chevron_right</span></button></div></div>
      )}

      {userRole === 'basic' && (
        <div className="sp-group" style={{ marginTop: 8 }}><div className="sp-group-label">UPGRADE</div><div className="sp-group-card" style={{ padding: '20px', background: '#111' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}><div><h4 style={{ color: '#00E676', fontWeight: 800 }}>⚡ Lifetime</h4><p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Unlock forever.</p></div><div style={{ textAlign: 'right' }}><p style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'line-through' }}>₹{originalPrice}</p><p style={{ color: '#00E676', fontWeight: 900, fontSize: '18px' }}>₹{proPrice}</p></div></div><button onClick={() => navigate('/paywall')} style={{ width: '100%', padding: '12px', background: '#00E676', color: '#000', fontWeight: 900, borderRadius: '12px', border: 'none' }}>UPGRADE NOW</button></div></div>
      )}

      {showConfirmReset.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}><div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}><h2 style={{ color: '#fff' }}>Are you sure?</h2><div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button onClick={() => setShowConfirmReset({ show: false, type: '' })} style={{ flex: 1, padding: '0.75rem', color: '#fff', background: 'none', border: '1px solid #333' }}>Cancel</button><button onClick={handleResetData} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }}>Confirm</button></div></div></div>
      )}

      {showDeleteStep1Modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}><div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}><h2 style={{ color: '#fff' }}>Delete Account?</h2><div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button onClick={() => setShowDeleteStep1Modal(false)} style={{ flex: 1, padding: '0.75rem', color: '#fff', background: 'none', border: '1px solid #333' }}>Cancel</button><button onClick={() => { setShowDeleteStep1Modal(false); setShowDeleteFinalModal(true); }} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }}>Yes, Delete</button></div></div></div>
      )}

      {showDeleteFinalModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}><div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}><h2 style={{ color: '#fff' }}>Final Confirmation</h2><div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button onClick={() => setShowDeleteFinalModal(false)} style={{ flex: 1, padding: '0.75rem', color: '#fff', background: 'none', border: '1px solid #333' }}>Cancel</button>              <button onClick={async () => { 
                setIsDeletingAccount(true);
                try {
                  await invokeDeleteUserAccount({}); 
                  await logout(); 
                  navigate('/'); 
                } catch { 
                  setIsDeletingAccount(false);
                  setNotificationToast('Deletion failed.');
                }
              }} style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: '#fff', border: 'none' }}>DELETE FOREVER</button>
</div></div></div>
      )}

      {showPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}><div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}><h2 style={{ color: '#fff', textAlign: 'center' }}>Change PIN</h2><form onSubmit={_handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}><input type="password" maxLength={4} inputMode="numeric" value={currentPin.join('')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').split('').slice(0, 4); const n = [...currentPin]; v.forEach((x, i) => n[i] = x); for(let i=v.length; i<4; i++) n[i] = ''; setCurrentPin(n); }} placeholder="Current PIN" style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #222', color: '#fff', textAlign: 'center' }} /><input type="password" maxLength={4} inputMode="numeric" value={newPin.join('')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').split('').slice(0, 4); const n = [...newPin]; v.forEach((x, i) => n[i] = x); for(let i=v.length; i<4; i++) n[i] = ''; setNewPin(n); }} placeholder="New PIN" style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #222', color: '#fff', textAlign: 'center' }} /><input type="password" maxLength={4} inputMode="numeric" value={confirmPin.join('')} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').split('').slice(0, 4); const n = [...confirmPin]; v.forEach((x, i) => n[i] = x); for(let i=v.length; i<4; i++) n[i] = ''; setConfirmPin(n); }} placeholder="Confirm PIN" style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #222', color: '#fff', textAlign: 'center' }} />{pinError && <p style={{ color: '#ef4444', fontSize: '11px', textAlign: 'center' }}>{pinError}</p>}<div style={{ display: 'flex', gap: '1rem' }}><button type="button" onClick={() => setShowPinModal(false)} style={{ flex: 1, padding: '0.75rem', color: '#fff', background: 'none', border: '1px solid #333' }}>Cancel</button><button type="submit" disabled={isUpdatingPin} style={{ flex: 1, padding: '0.75rem', background: '#00E676', color: '#000', border: 'none' }}>Save</button></div></form></div></div>
      )}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
      {notificationToast && <div className="sp-toast">{notificationToast}</div>}
      {isDeletingAccount && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}><span className="material-symbols-outlined rotating" style={{ color: '#ef4444' }}>sync</span><p style={{ color: '#ef4444' }}>Deleting account…</p></div>}
    </div>
  );
};
export default Settings;

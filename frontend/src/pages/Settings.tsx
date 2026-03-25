import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import BottomNav from '../components/BottomNav';
import { supabase } from '../supabase';
import { saveUserProfileCache } from '../lib/userProfileCache';
import { ProductivityService } from '../lib/ProductivityService';
import SupportModal from '../components/SupportModal';
import { shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
// import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
import { isAdminProfileUser } from '../config/adminOwner';
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
  setAccountDeletedToastFlag,
  wipeLocalDataAfterAccountDeletion,
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

function _getAnnouncementCategoryStyle(_category: string) {
  switch (_category) {
    case 'update':
      return { bg: '#007AFF22', border: '#007AFF44', color: '#007AFF', icon: '🔄' };
    case 'feature':
      return { bg: '#00E87A22', border: '#00E87A44', color: '#00E87A', icon: '✨' };
    case 'maintenance':
      return { bg: '#FF950022', border: '#FF950044', color: '#FF9500', icon: '🔧' };
    case 'urgent':
      return { bg: '#FF3B3022', border: '#FF3B3044', color: '#FF3B30', icon: '🚨' };
    default:
      return { bg: '#1A1A1A', border: '#333', color: '#888', icon: '📢' };
  }
}
void _getAnnouncementCategoryStyle;

const Settings: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const _toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); }; void _toggleSidebar;
  const { user, logout, setCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const _profileCardVariant = useMemo<'regular' | 'pro' | 'admin'>(() => {
    if (!user) return 'regular';
    if (isAdminProfileUser(user)) return 'admin';
    if (user.isPro) return 'pro';
    return 'regular';
  }, [user]);
  void _profileCardVariant;


  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [_showPinModal, setShowPinModal] = useState(false); void _showPinModal;
  const [currentPin, setCurrentPin] = useState(['', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [_isUpdatingPin, setIsUpdatingPin] = useState(false); void _isUpdatingPin;
  const [_pinError, setPinError] = useState(''); void _pinError;
  const [isUploading, setIsUploading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  // const [snapshotStats, setSnapshotStats] = useState({ completedTasks: 0, routineStreak: 0, activeGoals: 0 });

  const [showConfirmReset, setShowConfirmReset] = useState<{ show: boolean; type: 'tasks' | 'habits' | 'goals' | '' }>({ show: false, type: '' });

  const [showDeleteStep1Modal, setShowDeleteStep1Modal] = useState(false);
  const [_showDeletePinSheet, setShowDeletePinSheet] = useState(false); void _showDeletePinSheet;
  const [_showDeleteFinalModal, setShowDeleteFinalModal] = useState(false); void _showDeleteFinalModal;
  const [deletePinDigits, setDeletePinDigits] = useState(['', '', '', '']);
  const [_deletePinError, setDeletePinError] = useState(''); void _deletePinError;
  const [deletePinAttempts, setDeletePinAttempts] = useState(0);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [proPrice, setProPrice] = useState(199);
  const [originalPrice, setOriginalPrice] = useState(999);

  const fetchProPrice = async () => {
    try {
      const { value } = await Preferences.get({ key: 'app_settings' });
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
    } catch (e) {
      setProPrice(199);
      setOriginalPrice(999);
    }
  };

  useEffect(() => {
    fetchProPrice();
  }, []);

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);
  const [pushPrefsLoading, setPushPrefsLoading] = useState(true);
  const [biometricRowVisible, setBiometricRowVisible] = useState(false);
  const [pushToggleBusy, setPushToggleBusy] = useState(false);
  const [biometricToggleBusy, setBiometricToggleBusy] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  /** Bumps when user mutates push prefs so stale profile fetch cannot overwrite toggle state. */
  const pushFetchSeqRef = useRef(0);
  const [prefsResumeTick, setPrefsResumeTick] = useState(0);

  useEffect(() => {
    if (!sessionStorage.getItem(SESS_START_KEY)) {
      sessionStorage.setItem(SESS_START_KEY, new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let handle: { remove: () => Promise<void> } | undefined;
    void App.addListener('resume', () => {
      setPrefsResumeTick((t) => t + 1);
    }).then((h) => {
      handle = h;
    });
    return () => {
      void handle?.remove();
    };
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
      const { value: lastSeen } = await Preferences.get({ key: 'announcements_last_seen' });
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
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
  }, [user?.id, location.pathname, prefsResumeTick]);

  const handleBiometricToggle = async () => {
    if (!user?.id || biometricToggleBusy || pushPrefsLoading) return;

    if (biometricLoginEnabled) {
      pushFetchSeqRef.current += 1;
      setBiometricToggleBusy(true);
      try {
        const result = await disableBiometricLoginForCurrentUser(user.id);
        if (!result.ok) {
          if (result.reason === 'verify_failed') {
            setNotificationToast('Biometric verification failed');
          } else {
            setNotificationToast('Could not disable biometric login');
          }
          return;
        }
        setBiometricLoginEnabled(false);
        writeCachedBool(prefsCacheBiometricKey(user.id), false);
        void saveUserProfileCache(user, {
          biometric_enabled: false,
          push_notifications_enabled: pushNotificationsEnabled,
        });
        setNotificationToast('Biometric login disabled');
      } finally {
        setBiometricToggleBusy(false);
      }
      return;
    }

    const avail = await shouldShowBiometricToggle();
    if (!avail) {
      showBiometricsNotEnrolledAlert();
      return;
    }

    pushFetchSeqRef.current += 1;
    setBiometricToggleBusy(true);
    try {
      const result = await enableBiometricLoginForCurrentUser({
        id: user.id,
        email: user.email,
        name: user.name,
      });

      if (!result.ok) {
        if (result.reason === 'not_enrolled') showBiometricsNotEnrolledAlert();
        else if (result.reason === 'verify_failed') setNotificationToast('Biometric verification failed');
        else if (result.reason === 'no_session' || result.reason === 'save_failed') {
          setNotificationToast('Could not save biometric login. Please try again.');
        } else if (result.reason === 'db_failed') {
          setNotificationToast('Failed to save biometric preference. Please try again.');
        } else {
          setNotificationToast('Biometric login is not available on this device.');
        }
        return;
      }

      setBiometricLoginEnabled(true);
      writeCachedBool(prefsCacheBiometricKey(user.id), true);
      void saveUserProfileCache(user, {
        biometric_enabled: true,
        push_notifications_enabled: pushNotificationsEnabled,
      });
      setNotificationToast('Biometric login enabled');
    } finally {
      setBiometricToggleBusy(false);
    }
  };

  const handlePushToggle = async () => {
    if (!user?.id || pushToggleBusy || pushPrefsLoading) return;

    if (pushNotificationsEnabled) {
      pushFetchSeqRef.current += 1;
      pushLog('0. toggle tapped: DISABLE');
      setPushToggleBusy(true);
      try {
        const { error } = await supabase
          .from('users')
          .update({ push_notifications_enabled: false })
          .eq('id', user.id);
        pushLog('disable: database result', error ? { message: error.message, code: error.code } : { ok: true });
        if (error) {
          console.error(error);
          setNotificationToast('Could not update notification settings');
          return;
        }
        setPushNotificationsEnabled(false);
        writeCachedBool(prefsCachePushKey(user.id), false);
        void saveUserProfileCache(user, {
          push_notifications_enabled: false,
          biometric_enabled: biometricLoginEnabled,
        });
        setNotificationToast('Notifications disabled');
      } finally {
        setPushToggleBusy(false);
      }
      return;
    }

    pushLog('0. toggle tapped: ENABLE');
    if (!isPushSupportedNative()) {
      setNotificationToast('Push notifications are available in the StayHardy mobile app.');
      return;
    }

    if (await isPushPermissionDenied()) {
      pushLog('preflight: permission denied — showing alert (no spinner)');
      window.alert(
        'Notifications Blocked\n\nYou have previously denied notification permission. Please go to your device Settings and enable notifications for StayHardy.'
      );
      return;
    }

    pushFetchSeqRef.current += 1;
    setPushToggleBusy(true);
    try {
      pushLog('enable: starting enablePushNotificationsAndGetToken()');
      const result = await enablePushNotificationsAndGetToken();

      if (!result.ok) {
        pushLog('enable: token/permission step failed', result);
        if (result.reason === 'denied') {
          window.alert(
            'Notifications Blocked\n\nYou have previously denied notification permission. Please go to your device Settings and enable notifications for StayHardy.'
          );
        } else if (result.reason === 'timeout' || result.reason === 'registration_failed' || result.reason === 'empty_token') {
          setNotificationToast('Could not register device. Please try again.');
        } else if (result.reason === 'not_granted') {
          setNotificationToast('Notification permission denied');
        } else {
          setNotificationToast('Could not enable notifications. Please try again.');
        }
        return;
      }

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      pushLog('enable: saving to database', { userId: user.id, timezone: tz });
      const { error: upErr } = await supabase
        .from('users')
        .update({
          push_token: result.token,
          push_token_updated_at: new Date().toISOString(),
          push_timezone: tz,
          push_notifications_enabled: true,
        })
        .eq('id', user.id);

      pushLog('enable: database save result', upErr ? { message: upErr.message, code: upErr.code } : { ok: true });

      if (upErr) {
        console.error(upErr);
        setPushNotificationsEnabled(false);
        writeCachedBool(prefsCachePushKey(user.id), false);
        setNotificationToast('Failed to save notification preference. Please try again.');
        return;
      }

      setPushNotificationsEnabled(true);
      writeCachedBool(prefsCachePushKey(user.id), true);
      void saveUserProfileCache(user, {
        push_notifications_enabled: true,
        biometric_enabled: biometricLoginEnabled,
      });
      setNotificationToast('Notifications enabled');
    } catch (e) {
      console.error('[StayHardy Push] enable flow exception', e);
      setNotificationToast('Something went wrong. Try again.');
    } finally {
      setPushToggleBusy(false);
    }
  };

  // React.useEffect(() => { ... fetchStats removed });



  /*
  const handleExportData = async () => {
    if (!user?.id) return;
    try {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('userId', user.id);
      const { data: goals } = await supabase.from('goals').select('*').eq('userId', user.id);
      const { data: routines } = await supabase.from('routines').select('*').eq('userId', user.id);
      const { data: logs } = await supabase.from('routine_logs').select('*').eq('userId', user.id);
      const { data: feedback } = await supabase.from('feedback').select('*').eq('userId', user.id);
      const exportData = { createdAt: new Date().toISOString(), user: { id: user.id, email: user.email, name: user.name }, tasks: tasks || [], goals: goals || [], routines: routines || [], routine_logs: logs || [], feedback: feedback || [] };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a'); link.download = `stayhardy_data_${user.name || 'user'}.json`; link.href = URL.createObjectURL(blob); link.click();
    } catch (err) { console.error('Export failed:', err); }
  };
  */

  const handleResetData = async () => {
    if (!user?.id || !showConfirmReset.type) return;
    const uid = user.id;
    try {
      if (showConfirmReset.type === 'tasks') {
        await supabase.from('tasks').delete().eq('userId', uid);
        // Clear local cache
        localStorage.removeItem(`stayhardy_tasks_${uid}`);
      } else if (showConfirmReset.type === 'habits') {
        await supabase.from('routines').delete().eq('user_id', uid);
        await supabase.from('routine_logs').delete().eq('user_id', uid);
        // Clear local cache
        localStorage.removeItem(`stayhardy_routines_${uid}`);
      } else if (showConfirmReset.type === 'goals') {
        await supabase.from('goals').delete().eq('userId', uid);
        // Clear local cache
        localStorage.removeItem(`stayhardy_goals_${uid}`);
      }
      // Recalculate productivity score & refresh all pages
      await ProductivityService.recalculate(uid);
      window.dispatchEvent(new CustomEvent('stayhardy_refresh'));
      setShowConfirmReset({ show: false, type: '' });
      setNotificationToast(`${showConfirmReset.type.charAt(0).toUpperCase() + showConfirmReset.type.slice(1)} reset successfully.`);
    } catch (err) {
      console.error('Reset failed:', err);
      setNotificationToast('Reset failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await Preferences.remove({ key: 'save_login_enabled' });
      await Preferences.remove({ key: 'saved_email' });
      await Preferences.remove({ key: 'saved_pin' });
      await logout();
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const resetDeleteAccountFlow = () => {
    setShowDeleteStep1Modal(false);
    setShowDeletePinSheet(false);
    setShowDeleteFinalModal(false);
    setDeletePinDigits(['', '', '', '']);
    setDeletePinError('');
    setDeletePinAttempts(0);
  };

  const _handleConfirmDeletePin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDeletePinError('');
    const pin = deletePinDigits.join('');
    if (!/^\d{4}$/.test(pin)) {
      setDeletePinError('Enter your 4-digit PIN.');
      return;
    }
    if (!user?.email) return;

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pin + '_secure_pin',
    });

    if (error) {
      const next = deletePinAttempts + 1;
      setDeletePinAttempts(next);
      if (next >= 3) {
        resetDeleteAccountFlow();
        setNotificationToast('Too many attempts. Deletion cancelled.');
        return;
      }
      setDeletePinError('Incorrect PIN. Try again.');
      setDeletePinDigits(['', '', '', '']);
      return;
    }

    setShowDeletePinSheet(false);
    setShowDeleteFinalModal(true);
  };
  void _handleConfirmDeletePin;

  const _handleDeleteAccountForever = async () => {
    if (!user?.id) return;
    setShowDeleteFinalModal(false);
    setIsDeletingAccount(true);
    try {
      await invokeDeleteUserAccount({});
      await wipeLocalDataAfterAccountDeletion(user.id);
      setAccountDeletedToastFlag();
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Account deletion failed:', err);
      setIsDeletingAccount(false);
      resetDeleteAccountFlow();
      const msg =
        err instanceof Error ? err.message : 'Something went wrong while deleting your account.';
      window.alert(
        `Deletion Failed\n\n${msg}\n\nPlease try again or contact support at support@stayhardy.com`,
      );
    }
  };
  void _handleDeleteAccountForever;

  const resetPinModalFields = () => {
    setCurrentPin(['', '', '', '']);
    setNewPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setPinError('');
  };

  const forceLogoutAfterPinChange = async () => {
    try {
      console.log('Force logout after PIN change');
      const keysToRemove = [
        'user_profile',
        'user_pin',
        'app_pin',
        'stayhardy_last_login_at',
        'remembered_email',
        'login_timestamp',
        'supabase.auth.token',
        'sb-tiavhmbpplerffdjmodw-auth-token',
      ];
      for (const key of keysToRemove) {
        try {
          await Preferences.remove({ key });
        } catch {
          // ignore preference removal issues
        }
      }
      try {
        await CacheManager.clearAll();
      } catch {
        // ignore cache clear issues
      }
      await supabase.auth.signOut();
      await logout();
      navigate('/login', { replace: true, state: { pinUpdated: true } });
      console.log('Logged out after PIN change ✅');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown force logout error';
      console.error('Force logout error:', msg);
      navigate('/login', { replace: true, state: { pinUpdated: true } });
    }
  };

  const _handleUpdatePin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');

    const currentPinStr = currentPin.join('');
    const pinStr = newPin.join('');
    const confirmPinStr = confirmPin.join('');
    const isFourDigits = (s: string) => /^\d{4}$/.test(s);

    if (!isFourDigits(currentPinStr)) {
      setPinError('Current PIN must be exactly 4 digits (numbers only).');
      return;
    }
    if (!isFourDigits(pinStr)) {
      setPinError('New PIN must be exactly 4 digits (numbers only).');
      return;
    }
    if (!isFourDigits(confirmPinStr)) {
      setPinError('Confirm your new PIN with 4 digits.');
      return;
    }
    if (pinStr !== confirmPinStr) {
      setPinError('New PIN and confirmation do not match.');
      return;
    }
    if (pinStr === currentPinStr) {
      setPinError('New PIN must be different from your current PIN.');
      return;
    }

    if (!user?.id || !user?.email) {
      setPinError('You must be signed in to change your PIN.');
      return;
    }

    setIsUpdatingPin(true);
    try {
      const { data: dbUser, error: fetchError } = await supabase
        .from('users')
        .select('id, pin, email')
        .eq('id', user.id)
        .single();
      console.log('DB PIN check:', dbUser?.pin, 'entered:', currentPinStr);
      if (fetchError || !dbUser) {
        setPinError('Could not verify identity.');
        return;
      }

      if ((dbUser.pin || '').trim() !== currentPinStr.trim()) {
        setPinError('Current PIN is incorrect.');
        return;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ pin: pinStr.trim() })
        .eq('id', user.id);
      if (updateError) {
        console.error('PIN update error:', updateError.message);
        setPinError('Failed to update PIN. Please try again.');
        return;
      }

      const { data: verifyUser, error: verifyError } = await supabase
        .from('users')
        .select('pin')
        .eq('id', user.id)
        .single();
      console.log(
        'Verified new PIN in DB:',
        verifyUser?.pin === pinStr.trim() ? '✅ SAVED' : '❌ NOT SAVED',
      );
      if (verifyError || verifyUser?.pin !== pinStr.trim()) {
        setPinError('PIN update failed. Please try again.');
        return;
      }

      await clearBiometricOnPinChange(user.id);
      writeCachedBool(prefsCacheBiometricKey(user.id), false);
      localStorage.removeItem('remembered_pin');

      setNotificationToast('PIN updated successfully! Please login with your new PIN.');
      setShowPinModal(false);
      resetPinModalFields();
      setIsUpdatingPin(false);

      setTimeout(() => {
        void forceLogoutAfterPinChange();
      }, 1500);
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('PIN update exception:', msg);
      setPinError('Something went wrong. Please try again.');
    }
    setIsUpdatingPin(false);
  };
  void _handleUpdatePin;

  const handleAvatarUpload = async () => {
    try {
      if (!user?.id) return;

      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        width: 400,
        height: 400
      });

      if (!image.base64String) return;
      setIsUploading(true);

      // Convert base64 to blob:
      const base64 = image.base64String;
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Folder-based path required for RLS: {userId}/avatar.jpg
      const filePath = `${user.id}/avatar.jpg`;

      console.log('Uploading avatar to profile-images/', filePath);

      // Upload to Supabase storage:
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      console.log('Upload error:', JSON.stringify(uploadError));

      if (uploadError) {
        console.error('Upload failed:', JSON.stringify(uploadError));
        setNotificationToast('Upload failed: ' + uploadError.message);
        setIsUploading(false);
        return;
      }

      // Get public URL:
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Add cache-busting timestamp:
      const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

      console.log('Avatar URL:', avatarUrl);

      // Save to users table:
      const { error: updateError } = await supabase
        .from('users')
        .update({
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      console.log('Update error:', JSON.stringify(updateError));

      if (updateError) {
        console.error('Save failed:', JSON.stringify(updateError));
        setNotificationToast('Save failed: ' + updateError.message);
        setIsUploading(false);
        return;
      }

      // Update local currentUser state:
      setCurrentUser({
        ...user,
        avatarUrl: avatarUrl
      });

      setNotificationToast('Profile photo updated ✅');
      console.log('Avatar saved ✅');

    } catch (err: any) {
      if (err.message?.includes('cancelled') || err.message?.includes('cancel'))
        return;
      console.error('Avatar error:', err.message);
      alert('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const _sessionSinceLabel = (() => {
    const raw = sessionStorage.getItem(SESS_START_KEY);
    if (!raw) return 'this session';
    try {
      return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'this session';
    }
  })();
  void _sessionSinceLabel;

  const pushSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={pushNotificationsEnabled}
      disabled={pushPrefsLoading || pushToggleBusy}
      onClick={(e) => {
        e.stopPropagation();
        void handlePushToggle();
      }}
      className="set-switch"
      data-on={pushNotificationsEnabled ? '1' : '0'}
    >
      {!pushToggleBusy && <span className="set-switch-knob" />}
      {pushToggleBusy && (
        <span className="material-symbols-outlined rotating set-switch-spin">sync</span>
      )}
    </button>
  );

  const bioSwitch = (
    <button
      type="button"
      role="switch"
      aria-checked={biometricLoginEnabled}
      disabled={pushPrefsLoading || biometricToggleBusy}
      onClick={(e) => {
        e.stopPropagation();
        void handleBiometricToggle();
      }}
      className="set-switch"
      data-on={biometricLoginEnabled ? '1' : '0'}
    >
      {!biometricToggleBusy && <span className="set-switch-knob" />}
      {biometricToggleBusy && (
        <span className="material-symbols-outlined rotating set-switch-spin">sync</span>
      )}
    </button>
  );

  return (
    <div className={`page-shell set-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .set-premium-page {
          background: #080C0A;
          min-height: 100dvh;
          font-family: 'DM Sans', system-ui, sans-serif;
          padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
        }

        /* ── Hero ── */
        .sp-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 52px 20px 28px;
          gap: 0;
        }
        .sp-avatar-ring {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 2px solid #00E87A;
          overflow: hidden;
          position: relative;
          margin-bottom: 16px;
          box-shadow: 0 0 20px rgba(0,232,122,0.22);
          cursor: pointer;
          flex-shrink: 0;
        }
        .sp-avatar-ring img { width: 100%; height: 100%; object-fit: cover; }
        .sp-avatar-initial {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #1a2e1a, #0d1f0d);
          font-size: 32px; font-weight: 800; color: #00E87A;
        }
        .sp-pro-pill {
          position: absolute;
          bottom: 2px; left: 50%; transform: translateX(-50%);
          background: #00E87A; color: #000;
          font-size: 9px; font-weight: 800;
          padding: 2px 8px; border-radius: 10px;
          letter-spacing: 0.06em; white-space: nowrap;
          pointer-events: none;
        }
        .sp-uploading-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex; align-items: center; justify-content: center;
        }
        .sp-name {
          font-family: system-ui, -apple-system, 'Inter', sans-serif;
          font-size: 22px; font-weight: 800;
          color: #FFFFFF; letter-spacing: -0.3px;
          margin: 0 0 4px; text-align: center;
        }
        .sp-email {
          font-size: 13px; color: rgba(255,255,255,0.4);
          margin: 0 0 16px; text-align: center;
        }
        .sp-edit-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 0.5px solid rgba(255,255,255,0.12);
          border-radius: 20px; padding: 8px 20px;
          font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.75);
          cursor: pointer;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: background 0.2s ease;
        }
        .sp-edit-btn:active { background: rgba(255,255,255,0.09); }

        /* ── Groups ── */
        .sp-group { margin: 0 16px 8px; }
        .sp-group-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          padding: 0 4px; margin-bottom: 8px;
        }
        .sp-group-label--danger { color: rgba(239,68,68,0.5); }
        .sp-group-card {
          background: #0A0A0A;
          border: 0.5px solid #2A2A2A;
          border-radius: 18px; overflow: hidden;
        }
        .sp-group-card--danger {
          background: #0A0A0A;
          border-color: rgba(239,68,68,0.12);
        }
        .sp-row {
          width: 100%; display: flex; align-items: center;
          gap: 14px; padding: 14px 16px;
          border: none; background: none; color: inherit;
          cursor: pointer; text-align: left;
          transition: background 0.15s;
        }
        .sp-row:active { background: rgba(255,255,255,0.04); }
        .sp-row--static { cursor: default; }
        .sp-row--static:active { background: none; }
        .sp-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 0 16px; }
        .sp-ic {
          width: 34px; height: 34px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: #1A1A1A;
          border: 0.5px solid rgba(255,255,255,0.08);
        }
        .sp-row-body { flex: 1; min-width: 0; }
        .sp-row-title { font-size: 14px; font-weight: 600; color: #FFFFFF; display: block; }
        .sp-row-title--danger { color: #EF4444; }
        .sp-row-sub { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 1px; display: block; }
        .sp-chev { color: rgba(255,255,255,0.25); font-size: 18px !important; flex-shrink: 0; }

        /* ── Switch ── */
        .set-switch {
          position: relative; width: 52px; height: 30px;
          flex-shrink: 0; border-radius: 999px; border: none;
          cursor: pointer; padding: 0; transition: background 0.2s;
          background: rgba(148,163,184,0.35);
        }
        .set-switch[data-on="1"] { background: #10b981; }
        .set-switch:disabled { cursor: wait; opacity: 0.65; }
        .set-switch-knob {
          position: absolute; top: 3px; left: 3px;
          width: 24px; height: 24px; border-radius: 50%;
          background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: left 0.2s ease;
        }
        .set-switch[data-on="1"] .set-switch-knob { left: 26px; }
        .set-switch-spin {
          position: absolute; inset: 0; margin: auto;
          font-size: 16px !important;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.9);
        }
        @keyframes rotating { to { transform: rotate(360deg); } }
        .rotating { animation: rotating 0.9s linear infinite; }

        /* ── Logout ── */
        .sp-logout {
          width: 100%; margin: 8px 0 0;
          display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 15px;
          border-radius: 14px;
          border: 1px solid rgba(248,113,113,0.4);
          background: rgba(239,68,68,0.06);
          color: #fecaca; font-weight: 700;
          font-size: 13px; letter-spacing: 0.06em;
          text-transform: uppercase; cursor: pointer;
          transition: background 0.2s;
        }
        .sp-logout:active { background: rgba(239,68,68,0.12); }
        .sp-logout:disabled { opacity: 0.55; cursor: wait; }

        /* ── Toast ── */
        .sp-toast {
          position: fixed; left: 50%; bottom: max(1rem, env(safe-area-inset-bottom));
          transform: translateX(-50%); z-index: 1100;
          padding: 0.5rem 1.1rem; border-radius: 999px;
          background: rgba(15,23,42,0.92); color: #e2e8f0;
          font-size: 13px; font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.35);
          max-width: min(90vw, 320px); text-align: center;
          pointer-events: none;
        }
      `}</style>

      {/* ── SECTION 1: PROFILE HERO ── */}
      <div className="sp-hero">
        <div
          className="sp-avatar-ring"
          role="button"
          tabIndex={0}
          onClick={() => handleAvatarUpload()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAvatarUpload(); } }}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              style={{
                width: '88px',
                height: '88px',
                minWidth: '88px',
                minHeight: '88px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #00E87A',
                display: 'block',
                boxShadow: '0 0 20px rgba(0,232,122,0.2)'
              }}
              onError={(e: any) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{
              width: '88px',
              height: '88px',
              minWidth: '88px',
              minHeight: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a2e1a, #0d1f0d)',
              border: '2px solid #00E87A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: '800',
              color: '#00E87A'
            }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          {isUploading && (
            <div className="sp-uploading-overlay">
              <span className="material-symbols-outlined rotating" style={{ color: '#4ade80', fontSize: 22 }}>sync</span>
            </div>
          )}
          {/* Camera badge overlay */}
          {!isUploading && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#00E87A',
              border: '2px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#000' }}>photo_camera</span>
            </div>
          )}
          {user?.isPro && <span className="sp-pro-pill">PRO</span>}
        </div>

        <h1 className="sp-name">{user?.name || 'Operator'}</h1>
        <p className="sp-email">{user?.email || ''}</p>

        <button
          type="button"
          className="sp-edit-btn"
          onClick={() => handleAvatarUpload()}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {user?.avatarUrl ? 'edit' : 'add_a_photo'}
          </span>
          {user?.avatarUrl ? 'Update Photo' : 'Add Photo'}
        </button>
      </div>

      {/* Input removed as we use Camera plugin */}

      {/* ── SECTION 2: NEWS AND UPDATES ── */}
      {!isAdminProfileUser(user) && (
        <div className="sp-group">
          <div className="sp-group-label">NEWS AND UPDATES</div>
          <div className="sp-group-card">
            <button
              type="button"
              className="sp-row"
              onClick={() => {
                navigate('/updates');
                void Preferences.set({ key: 'announcements_last_seen', value: Date.now().toString() });
                setUnreadCount(0);
              }}
            >
              <div className="sp-ic">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>campaign</span>
              </div>
              <div className="sp-row-body">
                <span className="sp-row-title">StayHardy Updates</span>
                <span className="sp-row-sub">
                  {announcements.length > 0 ? `${announcements.length} announcements` : 'No updates yet'}
                </span>
              </div>
              {unreadCount > 0 && (
                <div style={{ background: '#00E87A', color: '#000', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 800, marginRight: 4 }}>
                  {unreadCount} NEW
                </div>
              )}
              <span className="material-symbols-outlined sp-chev">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION 3: SUPPORT ── */}
      {!isAdminProfileUser(user) && (
        <div className="sp-group">
          <div className="sp-group-label">SUPPORT</div>
          <div className="sp-group-card">
            <button type="button" className="sp-row" onClick={() => navigate('/feedback')}>
              <div className="sp-ic">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>chat</span>
              </div>
              <div className="sp-row-body">
                <span className="sp-row-title">Support &amp; Feedback</span>
                <span className="sp-row-sub">Report issues or suggest features</span>
              </div>
              <span className="material-symbols-outlined sp-chev">chevron_right</span>
            </button>
            <div className="sp-divider" />
            <button type="button" className="sp-row" onClick={() => setShowSupportModal(true)}>
              <div className="sp-ic">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>favorite</span>
              </div>
              <div className="sp-row-body">
                <span className="sp-row-title">Support This App</span>
                <span className="sp-row-sub">Buy me a tea ☕</span>
              </div>
              <span className="material-symbols-outlined sp-chev">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS (non-Android) ── */}
      {!hidePushAndBiometricOnAndroid() && (
        <div className="sp-group">
          <div className="sp-group-label">NOTIFICATIONS</div>
          <div className="sp-group-card" style={{ opacity: pushPrefsLoading ? 0.7 : 1 }}>
            <div className="sp-row sp-row--static">
              <div className="sp-ic">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>notifications_active</span>
              </div>
              <div className="sp-row-body">
                <span className="sp-row-title">Push Notifications</span>
                <span className="sp-row-sub">Daily morning &amp; evening reminders</span>
              </div>
              {pushSwitch}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 4: SECURITY ── */}
      <div className="sp-group">
        <div className="sp-group-label">SECURITY</div>
        <div className="sp-group-card">
          {!hidePushAndBiometricOnAndroid() && biometricRowVisible && (
            <>
              <div className="sp-row sp-row--static" style={{ opacity: pushPrefsLoading ? 0.7 : 1 }}>
                <div className="sp-ic">
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>fingerprint</span>
                </div>
                <div className="sp-row-body">
                  <span className="sp-row-title">Face ID / Biometric Login</span>
                  <span className="sp-row-sub">Faster sign-in on this device</span>
                </div>
                {bioSwitch}
              </div>
              <div className="sp-divider" />
            </>
          )}
          <button type="button" className="sp-row" onClick={() => { resetPinModalFields(); setShowPinModal(true); }}>
            <div className="sp-ic">
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>lock</span>
            </div>
            <div className="sp-row-body">
              <span className="sp-row-title">Change Access PIN</span>
              <span className="sp-row-sub">Update your 4-digit PIN</span>
            </div>
            <span className="material-symbols-outlined sp-chev">chevron_right</span>
          </button>
        </div>
      </div>

      {/* ── SECTION 5: DANGER ZONE ── */}
      <div className="sp-group">
        <div className="sp-group-label sp-group-label--danger">DANGER ZONE</div>
        <div className="sp-group-card sp-group-card--danger">
          {(['tasks', 'habits', 'goals'] as const).map((t, i) => (
            <React.Fragment key={t}>
              {i > 0 && <div className="sp-divider" />}
              <button type="button" className="sp-row" onClick={() => setShowConfirmReset({ show: true, type: t })}>
                <div className="sp-ic" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#EF4444' }}>restart_alt</span>
                </div>
                <div className="sp-row-body">
                  <span className="sp-row-title sp-row-title--danger">
                    Reset {t === 'habits' ? 'Habits' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                  <span className="sp-row-sub">This cannot be undone</span>
                </div>
                <span className="material-symbols-outlined sp-chev">chevron_right</span>
              </button>
            </React.Fragment>
          ))}
          <div className="sp-divider" />
          <button
            type="button"
            className="sp-row"
            onClick={() => { resetDeleteAccountFlow(); setShowDeleteStep1Modal(true); }}
          >
            <div className="sp-ic" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#EF4444' }}>delete</span>
            </div>
            <div className="sp-row-body">
              <span className="sp-row-title sp-row-title--danger">Delete My Account</span>
              <span className="sp-row-sub">Permanently remove all data</span>
            </div>
            <span className="material-symbols-outlined sp-chev">chevron_right</span>
          </button>
        </div>
      </div>

      {/* ── LOGOUT ── */}
      <div className="sp-group" style={{ marginTop: 8 }}>
        <div className="sp-group-card">
          <button type="button" className="sp-logout" onClick={handleLogout} disabled={isLoggingOut}>
            <span className={`material-symbols-outlined${isLoggingOut ? ' rotating' : ''}`} style={{ fontSize: 18 }}>
              {isLoggingOut ? 'sync' : 'logout'}
            </span>
            {isLoggingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </div>

      {/* ── UPSELL ── */}
      {shouldShowLifetimeUpsell(user) && (
        <div className="sp-group" style={{ marginTop: 8 }}>
          <div className="sp-group-card">
            <button type="button" className="sp-row" onClick={() => navigate('/lifetime-access')}>
              <div className="sp-ic" style={{ background: 'rgba(251,191,36,0.1)' }}>
                <span style={{ fontSize: 16 }}>⚡</span>
              </div>
              <div className="sp-row-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontWeight: '500' }}>
                  ₹{originalPrice}
                </span>
                <span style={{ fontSize: '13px', color: '#00E87A', fontWeight: '700' }}>
                  Lifetime · ₹{proPrice}
                </span>
              </div>
              <span className="material-symbols-outlined sp-chev">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* ── ADMIN HUB ── */}
      {isAdminProfileUser(user) && (
        <div className="sp-group" style={{ marginTop: 8 }}>
          <div className="sp-group-label">ADMIN</div>
          <div className="sp-group-card">
            <button type="button" className="sp-row" onClick={() => navigate('/admin')}>
              <div className="sp-ic" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f59e0b' }}>admin_panel_settings</span>
              </div>
              <div className="sp-row-body">
                <span className="sp-row-title">Admin Hub</span>
                <span className="sp-row-sub">System overview &amp; management</span>
              </div>
              <span className="material-symbols-outlined sp-chev">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Reset Confirmation */}
      {showConfirmReset.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }}>warning</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff' }}>Are you absolutely sure?</h2>
            <p style={{ fontSize: '0.81rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to delete all {showConfirmReset.type}? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowConfirmReset({ show: false, type: '' })} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleResetData} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav isHidden={isSidebarHidden} />
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* Delete Step 1 Modal */}
      {showDeleteStep1Modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }} onClick={() => setShowDeleteStep1Modal(false)}>
          <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.75rem', color: '#fff' }}>Delete Account?</h2>
            <p style={{ fontSize: '0.81rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.5rem', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
              This will permanently delete your account and ALL your data including tasks, goals, routines, stats and history. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" onClick={() => setShowDeleteStep1Modal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Cancel</button>
              <button type="button" onClick={() => { setShowDeleteStep1Modal(false); setDeletePinDigits(['', '', '', '']); setDeletePinError(''); setDeletePinAttempts(0); setShowDeletePinSheet(true); }} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', system-ui, sans-serif" }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {notificationToast && (
        <div role="status" className="sp-toast">{notificationToast}</div>
      )}

      {isDeletingAccount && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10001, gap: '1rem' }}>
          <span className="material-symbols-outlined rotating" style={{ fontSize: '2.5rem', color: '#f87171' }}>sync</span>
          <p style={{ color: '#f87171', fontWeight: 700 }}>Deleting account…</p>
        </div>
      )}
    </div>
  );

};

export default Settings;

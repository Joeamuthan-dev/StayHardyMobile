import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import BottomNav from '../components/BottomNav';
import { supabase } from '../supabase';
import { saveUserProfileCache } from '../lib/userProfileCache';
import SupportModal from '../components/SupportModal';
import { shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import { LIFETIME_PRICE_INR } from '../config/lifetimePricing';
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
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };
  const { user, logout, updateUserMetadata } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const profileCardVariant = useMemo<'regular' | 'pro' | 'admin'>(() => {
    if (!user) return 'regular';
    if (isAdminProfileUser(user)) return 'admin';
    if (user.isPro) return 'pro';
    return 'regular';
  }, [user]);

  const avatarInitial = useMemo(() => {
    const n = user?.name?.trim();
    if (n) return n.charAt(0).toUpperCase();
    return (user?.email?.charAt(0) || 'U').toUpperCase();
  }, [user]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState(['', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  // const [snapshotStats, setSnapshotStats] = useState({ completedTasks: 0, routineStreak: 0, activeGoals: 0 });

  const [showConfirmReset, setShowConfirmReset] = useState<{ show: boolean; type: 'tasks' | 'routines' | 'stats' | '' }>({ show: false, type: '' });

  const [showDeleteStep1Modal, setShowDeleteStep1Modal] = useState(false);
  const [showDeletePinSheet, setShowDeletePinSheet] = useState(false);
  const [showDeleteFinalModal, setShowDeleteFinalModal] = useState(false);
  const [deletePinDigits, setDeletePinDigits] = useState(['', '', '', '']);
  const [deletePinError, setDeletePinError] = useState('');
  const [deletePinAttempts, setDeletePinAttempts] = useState(0);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false);
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(false);
  const [pushPrefsLoading, setPushPrefsLoading] = useState(true);
  const [biometricRowVisible, setBiometricRowVisible] = useState(false);
  const [pushToggleBusy, setPushToggleBusy] = useState(false);
  const [biometricToggleBusy, setBiometricToggleBusy] = useState(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
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
    try {
      if (showConfirmReset.type === 'tasks') { await supabase.from('tasks').delete().eq('userId', user.id); }
      else if (showConfirmReset.type === 'routines') { await supabase.from('routines').delete().eq('user_id', user.id); }
      else if (showConfirmReset.type === 'stats') { await supabase.from('routine_logs').delete().eq('user_id', user.id); }
      alert('Action completed successfully!');
      setShowConfirmReset({ show: false, type: '' });
    } catch (err) { console.error('Reset failed:', err); }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
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

  const handleConfirmDeletePin = async (e?: React.FormEvent) => {
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

  const handleDeleteAccountForever = async () => {
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

  const resetPinModalFields = () => {
    setCurrentPin(['', '', '', '']);
    setNewPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setPinError('');
  };

  const handleUpdatePin = async (e?: React.FormEvent) => {
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
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPinStr + '_secure_pin',
      });
      if (reauthError) {
        setPinError('Current PIN is incorrect.');
        return;
      }

      const newSecure = pinStr + '_secure_pin';
      const { error: authError } = await supabase.auth.updateUser({
        password: newSecure,
      });
      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('users')
        .update({
          pin: pinStr,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (dbError) {
        console.error('DB update error:', dbError);
        const { error: rollbackErr } = await supabase.auth.updateUser({
          password: currentPinStr + '_secure_pin',
        });
        if (rollbackErr) console.error('PIN rollback failed:', rollbackErr);
        setPinError('Failed to update PIN. Please try again.');
        return;
      }

      await clearBiometricOnPinChange(user.id);
      writeCachedBool(prefsCacheBiometricKey(user.id), false);

      localStorage.removeItem('remembered_pin');
      setShowPinModal(false);
      resetPinModalFields();

      await logout();
      navigate('/login', { replace: true, state: { pinUpdated: true } });
    } catch (err: unknown) {
      console.error('PIN update error:', err);
      const msg = err instanceof Error ? err.message : '';
      setPinError(msg.trim() ? msg : 'Failed to update PIN. Please try again.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Standard profile pic size (400x400 max)
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Image processing failed'));
            },
            'image/jpeg',
            0.85 // 85% quality - sweet spot for weight vs quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // 1. Instant Optimistic UI Update
    const localPreviewUrl = URL.createObjectURL(file);
    updateUserMetadata({ avatarUrl: localPreviewUrl });

    setIsUploading(true);
    console.log('Starting profile sync for:', user.email);

    try {
      // 2. Background Compression
      const compressedBlob = await compressImage(file);
      const filename = `${user.email.replace(/@/g, '_at_')}.jpg`;
      const compressedFile = new File([compressedBlob], filename, { type: 'image/jpeg' });

      // 3. Verify Bucket and Upload
      // We'll try to list one file just to check if the bucket is reachable
      const { error: bucketError } = await supabase.storage.from('avatars').list('', { limit: 1 });
      if (bucketError) {
        console.error('Bucket "avatars" check failed. Error:', bucketError.message);
        throw new Error(`Storage bucket error: ${bucketError.message}`);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, compressedFile, { upsert: true });

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('Syncing URL to profiles:', finalUrl);

      // 5. Sync with Auth Metadata
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: finalUrl,
          avatarUrl: finalUrl
        }
      });
      if (updateAuthError) console.error('Auth metadata sync failed:', updateAuthError.message);

      // 6. Sync with Database Table
      const { error: dbUpdateError } = await supabase
        .from('users')
        .update({ avatar_url: finalUrl })
        .eq('id', user.id);
      
      if (dbUpdateError) {
        console.warn('Database table sync failed (might be missing avatar_url column):', dbUpdateError.message);
      }

      // 7. Final Local Sync
      updateUserMetadata({ avatarUrl: finalUrl });
      void saveUserProfileCache(
        { ...user, avatarUrl: finalUrl },
        {
          push_notifications_enabled: pushNotificationsEnabled,
          biometric_enabled: biometricLoginEnabled,
        },
      );
      console.log('Profile sync complete!');

    } catch (err: any) {
      console.error('Critical Sync Failure:', err);
      // We don't alert the user as requested, but the logs will show the truth.
    } finally {
      setIsUploading(false);
    }
  };

  const sessionSinceLabel = (() => {
    const raw = sessionStorage.getItem(SESS_START_KEY);
    if (!raw) return 'this session';
    try {
      return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'this session';
    }
  })();

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
          padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
        }
        @media (max-width: 767px) {
          .set-premium-page.page-shell {
            padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
          }
        }
        @media (min-width: 768px) {
          .set-premium-page .set-header {
            padding-top: 12px;
          }
        }
        .page-shell.set-premium-page .set-header {
          padding-left: 16px;
          padding-right: 16px;
        }
        .set-aurora { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .set-wrap {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 0.45rem;
        }
        .set-header {
          position: relative;
          padding: 0 0 0.5rem;
          margin: 0;
          overflow: visible;
        }
        .set-header-row {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          width: 100%;
          box-sizing: border-box;
        }
        .set-header-center {
          flex: 1;
          min-width: 0;
          text-align: center;
          padding: 0 48px;
          box-sizing: border-box;
        }
        .set-header-sidebar-btn {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          opacity: 0.55;
        }
        .set-focus-toggle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
        }
        .set-title {
          font-family: 'Syne', system-ui, sans-serif;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 2px;
          color: #ffffff;
          margin: 0;
          line-height: 1.1;
          text-align: center;
          text-transform: uppercase;
        }
        .set-tagline {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #00e87a;
          text-align: center;
          margin: 4px 0 0;
          line-height: 1.35;
        }
        .set-welcome-line {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.45);
          text-align: center;
          margin: 12px 0 8px;
          line-height: 1.35;
        }

        .set-profile-card {
          position: relative;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 1.35rem;
          overflow: hidden;
        }
        .set-profile-card--regular {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .set-profile-card--pro {
          background: linear-gradient(
            135deg,
            rgba(0, 232, 122, 0.08) 0%,
            rgba(0, 0, 0, 0) 60%,
            rgba(0, 232, 122, 0.04) 100%
          );
          border: 1px solid rgba(0, 232, 122, 0.25);
          box-shadow:
            0 0 0 1px rgba(0, 232, 122, 0.05),
            0 8px 24px rgba(0, 232, 122, 0.1);
        }
        .set-profile-card--admin {
          background: linear-gradient(
            135deg,
            rgba(245, 158, 11, 0.1) 0%,
            rgba(0, 0, 0, 0) 60%,
            rgba(245, 158, 11, 0.05) 100%
          );
          border: 1px solid rgba(245, 158, 11, 0.35);
          box-shadow: 0 8px 32px rgba(245, 158, 11, 0.12);
        }
        .set-profile-admin-shimmer {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .set-profile-admin-shimmer__inner {
          position: absolute;
          inset: -40%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(251, 191, 36, 0.12) 45deg,
            transparent 90deg,
            transparent 360deg
          );
          animation: setAdminShimmerSpin 5s linear infinite;
          opacity: 0.45;
        }
        @keyframes setAdminShimmerSpin {
          to {
            transform: rotate(360deg);
          }
        }
        .set-profile-card-topbar {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-bottom: 12px;
          min-height: 32px;
        }
        .set-profile-corner-ic {
          font-size: 16px;
          line-height: 1;
          color: #00e87a;
        }
        .set-profile-corner-ic--admin {
          font-size: 18px;
          color: #f59e0b;
        }
        .set-profile-edit-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: background 0.2s, border-color 0.2s;
        }
        .set-profile-edit-btn .material-symbols-outlined {
          font-size: 14px !important;
        }
        .set-profile-edit-btn:active {
          background: rgba(255, 255, 255, 0.12);
        }
        .set-profile-body {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .set-profile-main {
          flex: 1;
          min-width: 0;
        }
        .set-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }
        .set-avatar {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .set-avatar--regular {
          border: none;
          background: transparent;
        }
        .set-avatar--pro {
          border: 2px solid #00e87a;
          box-shadow: 0 0 12px rgba(0, 232, 122, 0.3);
        }
        .set-avatar--admin {
          border: 2px solid #f59e0b;
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.35);
        }
        .set-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .set-avatar-initial {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 22px;
        }
        .set-avatar-initial--regular {
          background: linear-gradient(135deg, #1c2b24, #0d1a13);
          color: #00e87a;
        }
        .set-avatar-initial--pro {
          background: linear-gradient(135deg, #1c2b24, #0d1a13);
          color: #00e87a;
        }
        .set-avatar-initial--admin {
          background: linear-gradient(135deg, #78350f, #451a03);
          color: #fcd34d;
        }
        .set-online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00e87a;
          border: 2px solid rgba(8, 12, 10, 0.95);
          box-shadow: 0 0 6px rgba(0, 232, 122, 0.65);
        }
        .set-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .set-display-name {
          margin: 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          letter-spacing: -0.01em;
        }
        .set-admin-star {
          font-size: 14px;
          line-height: 1;
        }
        .set-pro-badge {
          margin-left: 6px;
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 20px;
          background: linear-gradient(135deg, #00e87a, #00c563);
          color: #000000;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
        }
        .set-email {
          margin: 4px 0 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }
        .set-email--pro {
          color: rgba(255, 255, 255, 0.5);
        }
        .set-pro-lifetime-line {
          margin: 4px 0 0;
          font-size: 10px;
          letter-spacing: 0.06em;
          color: #00e87a;
        }
        .set-admin-role-badge {
          margin-top: 8px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.35);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: #f59e0b;
          letter-spacing: 1.5px;
        }
        .set-lifetime-upsell-btn {
          margin-top: 10px;
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(251, 191, 36, 0.45);
          background: rgba(251, 191, 36, 0.08);
          color: #fbbf24;
          font-size: 0.65rem;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 0.1em;
          font-family: 'JetBrains Mono', monospace;
        }

        .set-sec-label {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          margin: 1.35rem 0 0.55rem 0.15rem;
          color: rgba(226, 232, 240, 0.88);
        }
        .set-sec-label::before {
          content: '';
          width: 3px;
          height: 14px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .set-sec-label--green::before { background: #4ade80; box-shadow: 0 0 10px rgba(74, 222, 128, 0.45); }
        .set-sec-label--orange::before { background: #fb923c; box-shadow: 0 0 10px rgba(251, 146, 60, 0.35); }
        .set-sec-label--red::before { background: #f87171; }
        .set-sec-label--danger {
          color: rgba(252, 165, 165, 0.95);
        }
        .set-sec-label--danger::before {
          display: none;
        }

        .set-card {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(8, 10, 18, 0.72);
          overflow: hidden;
          margin-bottom: 0.15rem;
        }
        .set-card--danger {
          border-color: rgba(248, 113, 113, 0.35);
          background: rgba(127, 29, 29, 0.12);
        }
        .set-card--danger .set-row:active {
          background: rgba(239, 68, 68, 0.12);
          box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.2);
        }

        .set-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1rem;
          border: none;
          background: none;
          color: inherit;
          cursor: pointer;
          text-align: left;
          border-bottom: 1px solid rgba(255, 255, 255, 0.045);
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .set-row:last-child { border-bottom: none; }
        .set-row:active {
          background: rgba(16, 185, 129, 0.1);
          box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.15);
        }
        .set-row--static {
          cursor: default;
        }
        .set-row--static:active {
          background: none;
          box-shadow: none;
        }
        .set-ic {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .set-ic .material-symbols-outlined { font-size: 20px; }
        .set-ic--blue { background: rgba(59, 130, 246, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.25); }
        .set-ic--pink { background: rgba(236, 72, 153, 0.12); color: #f9a8d4; border: 1px solid rgba(244, 114, 182, 0.28); }
        .set-ic--green { background: rgba(16, 185, 129, 0.12); color: #4ade80; border: 1px solid rgba(52, 211, 153, 0.25); }
        .set-ic--orange { background: rgba(249, 115, 22, 0.12); color: #fdba74; border: 1px solid rgba(251, 146, 60, 0.3); }
        .set-ic--red { background: rgba(239, 68, 68, 0.12); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.28); }
        .set-row-body { flex: 1; min-width: 0; }
        .set-row-title { font-weight: 800; font-size: 0.9rem; color: #f1f5f9; display: block; }
        .set-row-sub { font-size: 0.65rem; color: rgba(248, 113, 113, 0.85); margin-top: 0.2rem; display: block; font-weight: 600; }
        .set-row-sub--muted { color: rgba(148, 163, 184, 0.9); }
        .set-row-sub--love { font-size: 0.58rem; font-weight: 800; letter-spacing: 0.12em; color: #f9a8d4; margin-top: 0.15rem; }
        .set-chev { color: rgba(100, 116, 139, 0.85); flex-shrink: 0; font-size: 22px !important; }
        .set-row--data { color: rgba(252, 165, 165, 0.95); }
        .set-row--data .set-row-title { color: rgba(254, 202, 202, 0.95); }
        .set-row--data:active {
          background: rgba(239, 68, 68, 0.1);
          box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.18);
        }

        .set-switch {
          position: relative;
          width: 52px;
          height: 30px;
          flex-shrink: 0;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: background 0.2s;
          background: rgba(148, 163, 184, 0.35);
        }
        .set-switch[data-on="1"] { background: #10b981; }
        .set-switch:disabled { cursor: wait; opacity: 0.65; }
        .set-switch-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          transition: left 0.2s ease;
        }
        .set-switch[data-on="1"] .set-switch-knob { left: 26px; }
        .set-switch-spin {
          position: absolute;
          inset: 0;
          margin: auto;
          font-size: 16px !important;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.9);
        }

        .set-logout {
          width: 100%;
          margin-top: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          padding: 0.95rem 1rem;
          border-radius: 14px;
          border: 2px solid rgba(248, 113, 113, 0.55);
          background: transparent;
          color: #fecaca;
          font-weight: 900;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: box-shadow 0.2s, background 0.2s;
        }
        .set-logout:active {
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
        }
        .set-logout:disabled { opacity: 0.55; cursor: wait; }
        .set-session-hint {
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: rgba(100, 116, 139, 0.95);
          margin: 0.65rem 0 0;
        }

        .set-footer {
          margin-top: 2.25rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          text-align: center;
        }
        .set-footer-logo {
          width: 40px;
          height: 40px;
          margin: 0 auto 0.65rem;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4ade80;
        }
        .set-footer-logo .material-symbols-outlined { font-size: 22px; }
        .set-footer-ver {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: rgba(100, 116, 139, 0.95);
          margin: 0;
        }

        .avatar-hover-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          backdrop-filter: blur(2px);
          border-radius: 50%;
        }
        .set-avatar:hover .avatar-hover-overlay,
        .set-avatar:focus-visible .avatar-hover-overlay {
          opacity: 1;
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
        }
      `}</style>

      <div className="aurora-bg set-aurora">
        <div className="aurora-gradient-1" />
        <div className="aurora-gradient-2" />
      </div>

      <div className="set-wrap">
        <header className="set-header">
          <div className="set-header-row">
            <button
              type="button"
              className="set-focus-toggle set-header-sidebar-btn notification-btn desktop-only-btn"
              title={isSidebarHidden ? 'Show Sidebar' : 'Focus mode'}
              aria-label={isSidebarHidden ? 'Show sidebar' : 'Hide sidebar (focus mode)'}
              onClick={toggleSidebar}
            >
              <span className="material-symbols-outlined">
                {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
              </span>
            </button>
            <div className="set-header-center">
              <h1 className="set-title">SETTINGS</h1>
            </div>
          </div>
          <p className="set-tagline">ACCOUNT · PRIVACY · CONTROL · PREFERENCE</p>
          <p className="set-welcome-line">
            Welcome back,{' '}
            {(user?.name && user.name.trim()) ||
              (user?.email ? user.email.split('@')[0] : null) ||
              'there'}
            {' '}
            👋
          </p>
        </header>

        <main style={{ display: 'flex', flexDirection: 'column' }}>
          <div className={`set-profile-card set-profile-card--${profileCardVariant}`}>
            {profileCardVariant === 'admin' && (
              <div className="set-profile-admin-shimmer" aria-hidden>
                <div className="set-profile-admin-shimmer__inner" />
              </div>
            )}
            <div className="set-profile-card-topbar">
              {profileCardVariant === 'pro' && (
                <span className="set-profile-corner-ic" aria-hidden>
                  ⚡
                </span>
              )}
              {profileCardVariant === 'admin' && (
                <span className="set-profile-corner-ic set-profile-corner-ic--admin" aria-hidden>
                  👑
                </span>
              )}
              <button
                type="button"
                className="set-profile-edit-btn"
                aria-label="Edit profile photo"
                onClick={() => document.getElementById('avatar-input')?.click()}
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>
            <div className="set-profile-body">
              <div className="set-avatar-wrap">
                <div
                  className={`set-avatar set-avatar--${profileCardVariant}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => document.getElementById('avatar-input')?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      document.getElementById('avatar-input')?.click();
                    }
                  }}
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" />
                  ) : (
                    <span className={`set-avatar-initial set-avatar-initial--${profileCardVariant}`}>{avatarInitial}</span>
                  )}
                  {isUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.75)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined rotating" style={{ color: '#4ade80' }}>
                        sync
                      </span>
                    </div>
                  )}
                  <div className="avatar-hover-overlay">
                    <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>
                      add_a_photo
                    </span>
                  </div>
                </div>
                <span className="set-online-dot" title="Active" aria-hidden />
              </div>
              <div className="set-profile-main">
                <div className="set-name-row">
                  <p className="set-display-name">{user?.name || 'Operator'}</p>
                  {profileCardVariant === 'admin' && (
                    <span className="set-admin-star" aria-hidden>
                      ⭐
                    </span>
                  )}
                  {profileCardVariant === 'pro' && <span className="set-pro-badge">PRO</span>}
                </div>
                <p
                  className={`set-email ${profileCardVariant === 'pro' ? 'set-email--pro' : ''}`}
                >
                  {user?.email || 'No email on file'}
                </p>
                {profileCardVariant === 'pro' && (
                  <p className="set-pro-lifetime-line">✦ Lifetime Access · No Subscription</p>
                )}
                {profileCardVariant === 'admin' && (
                  <div className="set-admin-role-badge">
                    <span aria-hidden>👑</span>
                    <span>ADMIN</span>
                  </div>
                )}
                {shouldShowLifetimeUpsell(user) && profileCardVariant === 'regular' && (
                  <button
                    type="button"
                    className="set-lifetime-upsell-btn"
                    onClick={() => navigate('/lifetime-access')}
                  >
                    {`LIFETIME ₹${LIFETIME_PRICE_INR}`}
                  </button>
                )}
              </div>
            </div>
          </div>
          <input
            id="avatar-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />



          <div className="set-sec-label set-sec-label--green">GROWTH AND FEEDBACK</div>
          <div className="set-card">
            <button type="button" className="set-row" onClick={() => navigate('/feedback')}>
              <span className="set-ic set-ic--blue">
                <span className="material-symbols-outlined">chat</span>
              </span>
              <span className="set-row-body">
                <span className="set-row-title">Send Feedback</span>
              </span>
              <span className="material-symbols-outlined set-chev">chevron_right</span>
            </button>
            <button
              type="button"
              className="set-row"
              onClick={() => {
                setShowSupportModal(true);
              }}
            >
              <span className="set-ic set-ic--pink">
                <span className="material-symbols-outlined">favorite</span>
              </span>
              <span className="set-row-body">
                <span className="set-row-title">Support This App</span>
                <span className="set-row-sub--love">SHOW LOVE</span>
              </span>
              <span className="material-symbols-outlined set-chev">chevron_right</span>
            </button>
          </div>

          {!hidePushAndBiometricOnAndroid() && (
            <>
              <div className="set-sec-label set-sec-label--green">NOTIFICATIONS</div>
              <div className="set-card" style={{ opacity: pushPrefsLoading ? 0.7 : 1 }}>
                <div className="set-row set-row--static">
                  <span className="set-ic set-ic--green">
                    <span className="material-symbols-outlined">notifications_active</span>
                  </span>
                  <span className="set-row-body">
                    <span className="set-row-title">Push Notifications</span>
                    <span className="set-row-sub--muted">Daily morning &amp; evening motivation reminders</span>
                  </span>
                  {pushSwitch}
                </div>
              </div>
            </>
          )}

          <div className="set-sec-label set-sec-label--green">SECURITY</div>
          <div className="set-card">
            {!hidePushAndBiometricOnAndroid() && biometricRowVisible && (
              <div className="set-row set-row--static" style={{ opacity: pushPrefsLoading ? 0.7 : 1 }}>
                <span className="set-ic set-ic--orange">
                  <span className="material-symbols-outlined">fingerprint</span>
                </span>
                <span className="set-row-body">
                  <span className="set-row-title">Face ID / Biometric Login</span>
                  <span className="set-row-sub--muted">Faster sign-in on this device</span>
                </span>
                {bioSwitch}
              </div>
            )}
            <button
              type="button"
              className="set-row"
              onClick={() => {
                resetPinModalFields();
                setShowPinModal(true);
              }}
            >
              <span className="set-ic set-ic--orange">
                <span className="material-symbols-outlined">lock</span>
              </span>
              <span className="set-row-body">
                <span className="set-row-title">Change Access PIN</span>
              </span>
              <span className="material-symbols-outlined set-chev">chevron_right</span>
            </button>
          </div>

          <div className="set-sec-label set-sec-label--red set-sec-label--danger">
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#f87171' }}>
              warning
            </span>
            DANGER ZONE
          </div>
          <div className="set-card set-card--danger">
            {(['tasks', 'routines', 'stats'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className="set-row"
                style={{ color: '#fecaca' }}
                onClick={() => setShowConfirmReset({ show: true, type })}
              >
                <span className="set-ic set-ic--red">
                  <span className="material-symbols-outlined">restart_alt</span>
                </span>
                <span className="set-row-body">
                  <span className="set-row-title" style={{ color: '#fecdd3' }}>
                    Reset {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                  <span className="set-row-sub">This cannot be undone</span>
                </span>
                <span className="material-symbols-outlined set-chev">chevron_right</span>
              </button>
            ))}
          </div>

        {/* Reset Confirmation Modal Info */}
        {showConfirmReset.show && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }}>warning</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff' }}>Are you absolutely sure?</h2>
              <p style={{ fontSize: '0.81rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.5rem' }}>This action cannot be undone. All your {showConfirmReset.type} will be permanently erased.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowConfirmReset({ show: false, type: '' })} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleResetData} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
        <button type="button" className="set-logout" onClick={handleLogout} disabled={isLoggingOut}>
          <span className={`material-symbols-outlined${isLoggingOut ? ' rotating' : ''}`}>
            {isLoggingOut ? 'sync' : 'logout'}
          </span>
          {isLoggingOut ? 'Signing out…' : 'Log out'}
        </button>
        <p className="set-session-hint">Session active since {sessionSinceLabel}</p>

        <div
          className="set-sec-label"
          style={{
            fontSize: '10px',
            color: '#EF4444',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: '1.5rem',
            marginBottom: '0.5rem',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 600,
          }}
        >
          DANGER ZONE
        </div>
        <button
          type="button"
          onClick={() => {
            resetDeleteAccountFlow();
            setShowDeleteStep1Modal(true);
          }}
          style={{
            width: '100%',
            height: '48px',
            borderRadius: '12px',
            border: '1px solid rgba(239,68,68,0.2)',
            background: 'rgba(239,68,68,0.08)',
            color: '#EF4444',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#EF4444' }}>
            delete
          </span>
          Delete My Account
        </button>

        <footer className="set-footer">
          <div className="set-footer-logo" aria-hidden>
            <span className="material-symbols-outlined">fitness_center</span>
          </div>
          <p className="set-footer-ver">STAYHARDY v1.2.0 · BUILD 2026.03.13</p>
        </footer>

        {notificationToast && (
          <div
            role="status"
            className="task-save-toast"
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
            {notificationToast}
          </div>
        )}
      </main>
      </div>

      <BottomNav isHidden={isSidebarHidden} />

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {showDeleteStep1Modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1.5rem',
          }}
          onClick={() => setShowDeleteStep1Modal(false)}
        >
          <div
            className="glass-card"
            style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.75rem', color: '#fff' }}>
              Delete Account?
            </h2>
            <p
              style={{
                fontSize: '0.81rem',
                color: '#94a3b8',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              This will permanently delete your account and ALL your data including tasks, goals, routines, stats and
              history. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setShowDeleteStep1Modal(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteStep1Modal(false);
                  setDeletePinDigits(['', '', '', '']);
                  setDeletePinError('');
                  setDeletePinAttempts(0);
                  setShowDeletePinSheet(true);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePinSheet && (
        <div
          className="premium-modal-overlay"
          style={{ zIndex: 10001 }}
          onClick={() => {
            resetDeleteAccountFlow();
          }}
        >
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 0.35rem 0' }}>
              Enter your PIN to confirm
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              This confirms it&apos;s really you
            </p>
            <form onSubmit={handleConfirmDeletePin}>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    id={`del-pin-${i}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    className="form-input"
                    value={deletePinDigits[i]}
                    onChange={(e) => {
                      setDeletePinError('');
                      const val = e.target.value.replace(/\D/g, '');
                      const next = [...deletePinDigits];
                      next[i] = val.slice(-1);
                      setDeletePinDigits(next);
                      if (val && i < 3) document.getElementById(`del-pin-${i + 1}`)?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !deletePinDigits[i] && i > 0) {
                        document.getElementById(`del-pin-${i - 1}`)?.focus();
                      }
                    }}
                    style={{
                      width: '3.5rem',
                      height: '3.5rem',
                      textAlign: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  />
                ))}
              </div>
              {deletePinError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 1rem', textAlign: 'center' }}>
                  {deletePinError}
                </p>
              )}
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '3rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Confirm Deletion
              </button>
            </form>
          </div>
        </div>
      )}

      {showDeleteFinalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
            padding: '1.5rem',
          }}
          onClick={() => resetDeleteAccountFlow()}
        >
          <div
            className="glass-card"
            style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.75rem', color: '#fff' }}>
              ⚠️ Last Warning
            </h2>
            <p
              style={{
                fontSize: '0.81rem',
                color: '#94a3b8',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              You are about to permanently delete your StayHardy account. All your tasks, goals, routines, streaks and
              history will be gone forever. There is no way back.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => resetDeleteAccountFlow()}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '0.85rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Keep My Account
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountForever}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  padding: '0.65rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.15)',
                  color: '#fecaca',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeletingAccount && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            pointerEvents: 'all',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid rgba(16, 185, 129, 0.2)',
              borderTopColor: '#10b981',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
            }}
          />
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '14px', color: '#fff', margin: 0 }}>
            Deleting your account...
          </p>
          <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>
            Please wait, do not close the app
          </p>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      {/* PIN Change Modal */}
      {showPinModal && (
        <div
          className="premium-modal-overlay"
          onClick={() => {
            if (isUpdatingPin) return;
            resetPinModalFields();
            setShowPinModal(false);
          }}
        >
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>Update Access PIN</h2>
              <button
                type="button"
                disabled={isUpdatingPin}
                onClick={() => {
                  if (isUpdatingPin) return;
                  resetPinModalFields();
                  setShowPinModal(false);
                }}
                className="notification-btn"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

              <form onSubmit={handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>Current PIN</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <input
                        key={i}
                        id={`cur-pin-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        className="form-input"
                        value={currentPin[i]}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          const nextPin = [...currentPin];
                          nextPin[i] = val.slice(-1);
                          setCurrentPin(nextPin);
                          if (val && i < 3) document.getElementById(`cur-pin-${i + 1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !currentPin[i] && i > 0) document.getElementById(`cur-pin-${i - 1}`)?.focus();
                        }}
                        style={{ width: '3.5rem', height: '3.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      />
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>New 4-Digit PIN</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <input 
                        key={i}
                        id={`new-pin-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        className="form-input"
                        value={newPin[i]}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          const nextPin = [...newPin];
                          nextPin[i] = val.slice(-1);
                          setNewPin(nextPin);
                          if (val && i < 3) document.getElementById(`new-pin-${i+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !newPin[i] && i > 0) document.getElementById(`new-pin-${i-1}`)?.focus();
                        }}
                        style={{ width: '3.5rem', height: '3.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      />
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>Confirm New PIN</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <input 
                        key={i}
                        id={`conf-pin-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        className="form-input"
                        value={confirmPin[i]}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          const nextPin = [...confirmPin];
                          nextPin[i] = val.slice(-1);
                          setConfirmPin(nextPin);
                          if (val && i < 3) document.getElementById(`conf-pin-${i+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !confirmPin[i] && i > 0) document.getElementById(`conf-pin-${i-1}`)?.focus();
                        }}
                        style={{ width: '3.5rem', height: '3.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900, borderRadius: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
                      />
                    ))}
                  </div>
                </div>

                {pinError && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>{pinError}</p>
                )}

                <button 
                  type="submit" 
                  disabled={isUpdatingPin}
                  className="glow-btn-primary" 
                  style={{ width: '100%', height: '4rem', borderRadius: '1.25rem', fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', gap: '0.75rem', marginTop: '1rem' }}
                >
                  <span className="material-symbols-outlined">{isUpdatingPin ? 'sync' : 'save'}</span>
                  <span>{isUpdatingPin ? 'Saving...' : 'Update PIN'}</span>
                </button>
              </form>
          </div>
        </div>
      )}
    </div>
  );
};


export default Settings;

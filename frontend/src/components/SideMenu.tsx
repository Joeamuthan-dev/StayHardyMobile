// src/components/SideMenu.tsx
import React, { useEffect, useState } from 'react';
import {
  Home, CheckSquare, Target, Calendar,
  RefreshCw, BarChart2, X, LogOut,
  ChevronRight, Shield, Bell
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../supabase';
import { storage } from '../utils/storage';

// Read cached profile synchronously before any useEffect
const getCachedProfile = () => {
  try {
    const userId = localStorage.getItem('cached_user_id');
    if (!userId) return null;
    const raw = localStorage.getItem('cached_profile_fast_' + userId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const getMembershipBadge = (
  userEmail: string | undefined,
  isPro: boolean
): { label: string; style: React.CSSProperties } => {
  const isAdmin = userEmail === import.meta.env.VITE_ADMIN_EMAIL;

  if (isAdmin) {
    return {
      label: 'ADMIN',
      style: {
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '9px',
        fontWeight: '800',
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
        border: '1px solid rgba(245,158,11,0.3)',
        background: 'rgba(245,158,11,0.15)',
        color: '#F59E0B',
      },
    };
  }
  if (isPro) {
    return {
      label: 'PRO',
      style: {
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '9px',
        fontWeight: '800',
        letterSpacing: '0.12em',
        textTransform: 'uppercase' as const,
        border: '1px solid rgba(0,230,118,0.3)',
        background: 'rgba(0,230,118,0.15)',
        color: '#00E676',
      },
    };
  }
  return {
    label: 'BASIC',
    style: {
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '9px',
      fontWeight: '800',
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)',
      color: 'rgba(255,255,255,0.4)',
    },
  };
};

export const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isPro } = useSubscription();

  const [userRole, setUserRole] = useState<'admin' | 'pro' | 'basic'>('basic');

  useEffect(() => {
    const detectRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const email = session.user.email || '';

      // Admin check
      if (email === import.meta.env.VITE_ADMIN_EMAIL) {
        setUserRole('admin');
        return;
      }

      // Pro check via RevenueCat
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const customerInfo = await Purchases.getCustomerInfo();
        const isProMember = customerInfo.customerInfo.entitlements.active['StayHardy Pro'] !== undefined;
        setUserRole(isProMember ? 'pro' : 'basic');
      } catch {
        // Fallback
        const role = session.user.user_metadata?.role || 'basic';
        setUserRole(role as 'pro' | 'basic');
      }
    };

    detectRole();
  }, []);

  const isProUserFromState = userRole === 'pro' || userRole === 'admin' || isPro;
  // Admin check: email match OR DB role === 'admin' (loaded by AuthContext from public.users)
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL || user?.role === 'admin';
  const isProUser = isPro || isAdmin;


  const [localProfile, setLocalProfile] = useState(getCachedProfile);
  const [isOnBoard, setIsOnBoard] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('leaderboard_members')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setIsOnBoard(data !== null));
  }, [user?.id]);

  // Map userProfile for the surgical redesign snippet
  const userProfile = {
    user_id: user?.id,
    user_email: user?.email,
    user_name: user?.name,
    user_avatar_url: user?.avatarUrl,
    pro_member: isProUserFromState
  };

  useEffect(() => {
    if (userProfile && userProfile.user_id) {
      setLocalProfile(userProfile);
      // Write fast cache for next render
      const userId = userProfile.user_id;
      if (userId) {
        localStorage.setItem('cached_user_id', userId);
        localStorage.setItem(
          'cached_profile_fast_' + userId,
          JSON.stringify(userProfile)
        );
      }
    }
  }, [userProfile.user_id, userProfile.user_name, userProfile.pro_member, userProfile.user_avatar_url]);

  // Use localProfile for rendering (falls back to userProfile)
  const displayProfile = localProfile || userProfile;

  const handleLogout = async () => {
    try {
      console.log('[Logout] Starting logout...');
      onClose();

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Logout] Supabase signOut error:', error.message);
      }

      await storage.remove('user_session');
      await storage.remove('pending_verification_email');
      await storage.remove('onboarding_complete');

      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: 'user_session' });
        await Preferences.remove({ key: 'app_settings' });
        await Preferences.remove({ key: 'pending_verification_email' });
      } catch (prefErr) {
        console.warn('[Logout] Preferences clear error:', prefErr);
      }

      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('[Logout] Error:', err?.message);
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('mobile-drawer-open');
    } else {
      document.body.classList.remove('mobile-drawer-open');
    }
    return () => document.body.classList.remove('mobile-drawer-open');
  }, [isOpen]);

  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const lastSeen = localStorage.getItem('sh_notif_last_seen') ?? '1970-01-01T00:00:00Z';

    const fetchCount = async () => {
      let count = 0;

      // Unread announcements
      const { count: annCount } = await supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .gt('created_at', lastSeen);
      if (annCount) count += annCount;

      // Support ticket updates (status changed from 'open')
      const { count: ticketCount } = await supabase
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'open')
        .gt('updated_at', lastSeen);
      if (ticketCount) count += ticketCount;

      setNotifCount(count);
    };

    fetchCount();
  }, [user?.id, isOpen]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[99998] bg-black/70 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={`fixed top-0 left-0 h-full w-[300px] z-[99999] transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          background: 'linear-gradient(180deg, #0D0D0D 0%, #080808 100%)',
          boxShadow: isOpen ? '20px 0 60px rgba(0,0,0,0.8)' : 'none',
          willChange: 'transform',
        }}
      >
        <div className="px-6 pt-14 pb-5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p style={{
                color: '#00E676',
                fontWeight: '900',
                fontSize: '22px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '2px'
              }}>
                Stay Hardy
              </p>
              <p style={{
                color: '#FFFFFF',
                opacity: 1,
                fontWeight: '600',
                fontSize: '10px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase'
              }}>
                The 1% starts here.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 active:scale-90"
              style={{
                background: 'rgba(255,255,255,0.05)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
              }}
            >
              <X size={14} className="text-white/40" />
            </button>
          </div>

          {(() => {
            const email =
              displayProfile?.user_email || user?.email || '';
            const isProUser =
              displayProfile?.pro_member === true || isPro === true;
            const badge = getMembershipBadge(email, isProUser);
            // Always prefer live AuthContext avatarUrl so photo updates reflect immediately
            const avatarUrl = user?.avatarUrl || displayProfile?.user_avatar_url;
            const displayName =
              displayProfile?.user_name || email || 'Soldier';

            return (
              <button
                onClick={() => {
                  navigate('/settings');
                  onClose();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '16px',
                  background: '#0A0A0A',

                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: `
                    0 8px 16px rgba(0,0,0,0.6),
                    inset 0 1px 1px rgba(255,255,255,0.05)
                  `,
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseDown={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                }}
                onMouseUp={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
                onTouchStart={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                }}
                onTouchEnd={e => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                }}
              >
                {/* AVATAR */}
                <div style={{
                  borderRadius: '50%',
                  flexShrink: 0,
                  position: 'relative',
                  boxShadow: '0 0 0 2px rgba(0,230,118,0.5), 0 0 0 4px #0A0A0A',
                }}>
                  <UserAvatar src={avatarUrl} size={40} />
                </div>

                {/* TEXT BLOCK */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  minWidth: 0,
                  flex: 1,
                  alignItems: 'flex-start',
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '160px',
                    display: 'block',
                  }}>
                    {displayName}
                  </span>
                  <span style={badge.style}>
                    {badge.label}
                  </span>
                </div>

                {/* NOTIFICATION BELL + COUNT */}
                <div style={{ flexShrink: 0, marginLeft: 'auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {notifCount > 0 ? (
                    <>
                      <Bell size={17} color="rgba(255,255,255,0.5)" />
                      <span style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '8px',
                        background: '#EF4444',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: '900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        boxShadow: '0 0 6px rgba(239,68,68,0.8)',
                      }}>
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    </>
                  ) : (
                    <ChevronRight size={18} color="rgba(255,255,255,0.25)" />
                  )}
                </div>
              </button>
            );
          })()}
        </div>

        {/* Hardy Board — Pro members only */}
        {isProUser && (
          <div className="px-4 pb-3">
            <div
              onClick={() => { navigate('/leaderboard'); onClose(); }}
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,165,0,0.06) 60%, rgba(0,0,0,0) 100%)',
                border: '1px solid rgba(255,215,0,0.25)',
                borderRadius: '16px',
                padding: '14px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                WebkitTapHighlightColor: 'transparent',
                transition: 'transform 0.15s ease',
                boxShadow: '0 4px 20px rgba(255,215,0,0.08)',
              }}
              onMouseDown={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.97)'; }}
              onMouseUp={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
              onTouchStart={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.97)'; }}
              onTouchEnd={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'rgba(255,215,0,0.14)',
                border: '1px solid rgba(255,215,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: '#FFD700',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 21h8M12 17v4M7 3H5C4.4 3 4 3.4 4 4v3c0 3.3 2.7 6 6 6M17 3h2c.6 0 1 .4 1 1v3c0 3.3-2.7 6-6 6M7 3h10v6c0 2.8-2.2 5-5 5s-5-2.2-5-5V3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#FFD700', fontWeight: 800, fontSize: '15px', margin: 0, letterSpacing: '0.02em' }}>
                  Hardy Board
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: '2px 0 0', letterSpacing: '0.01em' }}>
                  {isOnBoard || isProUserFromState ? 'Track your rank in leaderboard' : 'Join the habit leaderboard'}
                </p>
              </div>
              <span style={{
                padding: '3px 8px', borderRadius: '6px',
                background: 'rgba(255,215,0,0.15)',
                border: '1px solid rgba(255,215,0,0.35)',
                color: '#FFD700', fontSize: '9px', fontWeight: 800,
                letterSpacing: '0.15em', flexShrink: 0,
              }}>
                LIVE
              </span>
            </div>
          </div>
        )}

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/8 to-transparent mb-2" />

        <p className="px-6 text-[9px] font-bold tracking-[0.25em] uppercase mb-1"
          style={{ color: 'rgba(255,255,255,0.2)' }}>
          Navigate
        </p>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
          {[
            { path: '/home', label: 'Home', icon: Home },
            { path: '/dashboard', label: 'Tasks', icon: CheckSquare },
            { path: '/goals', label: 'Goals', icon: Target },
            { path: '/calendar', label: 'Calendar', icon: Calendar },
          ].map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); onClose(); }}
                className="flex items-center gap-3.5 w-full px-6 py-3.5 relative transition-all duration-200 group"
                style={active ? {
                  background: 'linear-gradient(90deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 60%, transparent 100%)'
                } : {}}
              >
                {active && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: '#00E676', boxShadow: '0 0 8px rgba(0,230,118,0.8), 0 0 16px rgba(0,230,118,0.4)' }}
                  />
                )}
                <div style={active ? { color: '#00E676', filter: 'drop-shadow(0 0 6px rgba(0,230,118,0.5))' } : {}} className={!active ? "text-white/30 group-hover:text-white/60 transition-colors" : ""}>
                  <Icon size={18} strokeWidth={active ? 1.8 : 1.5} />
                </div>
                <span className={`text-sm flex-1 text-left tracking-wide transition-colors ${active ? "text-white font-semibold" : "text-white/40 font-medium group-hover:text-white/70"}`}
                  style={active ? { textShadow: '0 0 20px rgba(0,230,118,0.3)' } : {}}
                >
                  {item.label}
                </span>
                {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00E676', boxShadow: '0 0 6px rgba(0,230,118,1)' }} />}
              </button>
            );
          })}

          {/* Habits */}
          {(() => {
            const active = location.pathname === '/routine';
            return (
              <button
                onClick={() => { navigate('/routine'); onClose(); }}
                className="flex items-center gap-3.5 w-full px-6 py-3.5 relative transition-all duration-200"
                style={active ? { background: 'linear-gradient(90deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 60%, transparent 100%)' } : {}}
              >
                {active && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: '#00E676', boxShadow: '0 0 8px rgba(0,230,118,0.8), 0 0 16px rgba(0,230,118,0.4)' }}
                  />
                )}
                <div style={active ? { color: '#00E676', filter: 'drop-shadow(0 0 6px rgba(0,230,118,0.5))' } : { color: 'rgba(255,255,255,0.35)' }}>
                  <RefreshCw size={18} strokeWidth={active ? 1.8 : 1.5} />
                </div>
                <span className="text-sm flex-1 text-left"
                  style={active ? { color: '#FFFFFF', fontWeight: 600, textShadow: '0 0 20px rgba(0,230,118,0.3)' } : { color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}
                >
                  Habits
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.6))', flexShrink: 0 }}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            );
          })()}

          {/* Stats */}
          {(() => {
            const active = location.pathname === '/stats';
            return (
              <button
                onClick={() => { navigate('/stats'); onClose(); }}
                className="flex items-center gap-3.5 w-full px-6 py-3.5 relative transition-all duration-200"
                style={active ? { background: 'linear-gradient(90deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 60%, transparent 100%)' } : {}}
              >
                {active && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: '#00E676', boxShadow: '0 0 8px rgba(0,230,118,0.8), 0 0 16px rgba(0,230,118,0.4)' }}
                  />
                )}
                <div style={active ? { color: '#00E676', filter: 'drop-shadow(0 0 6px rgba(0,230,118,0.5))' } : { color: 'rgba(255,255,255,0.35)' }}>
                  <BarChart2 size={18} strokeWidth={active ? 1.8 : 1.5} />
                </div>
                <span className="text-sm flex-1 text-left"
                  style={active ? { color: '#FFFFFF', fontWeight: 600, textShadow: '0 0 20px rgba(0,230,118,0.3)' } : { color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}
                >
                  Stats
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.6))', flexShrink: 0 }}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            );
          })()}

          {/* Hardy Board card moved above nav — removed from here */}
          {false && (
            <div className="px-4 mt-3 mb-2">
              <div
                onClick={() => { navigate('/leaderboard'); onClose(); }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(255,165,0,0.05) 50%, rgba(0,0,0,0) 100%)',
                  border: '1px solid rgba(255,215,0,0.2)',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseDown={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.96)'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
                onTouchStart={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.96)'; }}
                onTouchEnd={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
              >
                {/* Trophy icon */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255,215,0,0.12)',
                    border: '1px solid rgba(255,215,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#FFD700',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M8 21h8M12 17v4M7 3H5C4.4 3 4 3.4 4 4v3c0 3.3 2.7 6 6 6M17 3h2c.6 0 1 .4 1 1v3c0 3.3-2.7 6-6 6M7 3h10v6c0 2.8-2.2 5-5 5s-5-2.2-5-5V3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#FFD700', fontWeight: 700, fontSize: '14px', margin: 0, letterSpacing: '0.01em' }}>
                    Hardy Board
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0, marginTop: '1px' }}>
                    Monthly leaderboard
                  </p>
                </div>
                {/* LIVE badge */}
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(255,215,0,0.12)',
                    border: '1px solid rgba(255,215,0,0.3)',
                    color: '#FFD700',
                    fontSize: '9px',
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    flexShrink: 0,
                  }}
                >
                  LIVE
                </span>
              </div>
            </div>
          )}

          {/* Admin Hub — only for joeamuthan2@gmail.com */}
          {isAdmin && (
            <button
              onClick={() => { navigate('/admin'); onClose(); }}
              className="flex items-center gap-3.5 w-full px-6 py-3.5 relative transition-all duration-200 group"
              style={{
                background: location.pathname === '/admin'
                  ? 'linear-gradient(90deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 60%, transparent 100%)'
                  : 'transparent',
              }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={16} style={{ color: '#F59E0B' }} strokeWidth={1.8} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#F59E0B', letterSpacing: '0.01em' }}>
                Admin Hub
              </span>
              <div style={{
                marginLeft: 'auto',
                fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em',
                padding: '2px 7px', borderRadius: '6px',
                background: 'rgba(245,158,11,0.15)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#F59E0B',
              }}>
                ADMIN
              </div>
            </button>
          )}

          {!isProUser && (
            <div className="px-4 mt-4 mb-2">
              <div
                onClick={() => { navigate('/paywall'); onClose(); }}
                className="rounded-2xl p-4 cursor-pointer active:scale-95 transition-all duration-200 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.03) 50%, transparent 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full"
                  style={{ background: 'rgba(0,230,118,0.15)', filter: 'blur(16px)' }}
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#00E676] font-black text-sm">⚡ Just ₹1/day</span>
                  <span className="text-[8px] font-black tracking-widest px-2 py-1 rounded-full uppercase"
                    style={{ background: 'rgba(0,232,122,0.15)', color: '#00E87A' }}
                  >
                    MOST POPULAR
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Go Pro. Cancel anytime.
                </p>
                <div className="flex items-center gap-1 mt-3">
                  <p className="text-[10px] font-semibold" style={{ color: 'rgba(0,230,118,0.6)' }}>Start Now</p>
                  <ChevronRight size={12} style={{ color: 'rgba(0,230,118,0.6)' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-10 pt-4"
          style={{ 
            background: 'linear-gradient(0deg, #080808 60%, transparent 100%)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '16px',
            marginTop: '8px'
          }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-[10px] py-3.5 rounded-2xl group active:scale-95 transition-all duration-150"
            style={{ 
              background: 'rgba(255,255,255,0.02)',
              color: '#FF4444'
            }}
          >
            <LogOut 
              size={18} 
              strokeWidth={1.5} 
              style={{ stroke: '#FF4444' }}
              className="transition-colors" 
            />
            <span style={{ 
              fontSize: '15px', 
              fontWeight: '700',
              opacity: 1
            }}>
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SideMenu;

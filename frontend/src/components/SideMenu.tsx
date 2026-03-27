// src/components/SideMenu.tsx
import React, { useEffect, useState } from 'react';
import {
  Home, CheckSquare, Target, Calendar,
  RefreshCw, BarChart2, User, X, LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { isNative } from '../utils/platform';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const triggerHaptic = async (style = 'Light') => {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ 
      style: style === 'Medium' ? ImpactStyle.Medium : ImpactStyle.Light 
    });
  } catch {
    // silent fail
  }
};

export const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  const [userRole, setUserRole] = useState<'admin' | 'pro' | 'basic'>('basic');

  useEffect(() => {
    const detectRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const email = session.user.email || '';

      // Admin check
      if (email === 'joeamuthan2@gmail.com') {
        setUserRole('admin');
        return;
      }

      // Pro check via RevenueCat
      try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const customerInfo = await Purchases.getCustomerInfo();
        const isPro = customerInfo.customerInfo.entitlements.active['pro'] !== undefined;
        setUserRole(isPro ? 'pro' : 'basic');
      } catch {
        // Fallback
        const role = session.user.user_metadata?.role || 'basic';
        setUserRole(role as 'pro' | 'basic');
      }
    };

    detectRole();
  }, []);

  const isProUser = userRole === 'pro' || userRole === 'admin';

  const handleLogout = async () => {
    await triggerHaptic('Light');
    onClose();
    setTimeout(() => {
      logout();
    }, 300);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('mobile-drawer-open');
    } else {
      document.body.classList.remove('mobile-drawer-open');
    }
    return () => document.body.classList.remove('mobile-drawer-open');
  }, [isOpen]);

  return (
    <>
      {/* Backdrop — dark overlay behind menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[99998] bg-black/70 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Menu drawer — slides in from left */}
      <div
        className={`fixed top-0 left-0 h-full
                    w-[280px] z-[99999]
                    bg-[#0A0A0A]
                    border-r border-white/7
                    transition-transform
                    duration-300 ease-out flex flex-col
                    ${isOpen
                      ? 'translate-x-0'
                      : '-translate-x-full'
                    }`}
      >
        {/* Menu header */}
        <div className="flex items-center
                        justify-between
                        px-6 pt-14 pb-6
                        border-b border-white/7">
          <div>
            <p className="text-[#00E676] font-bold
                          text-sm tracking-[0.2em]
                          uppercase">
              Stay Hardy
            </p>
            <p className="text-white/30 text-xs
                          tracking-widest mt-0.5">
              The 1% starts here.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full
                       bg-white/5 flex items-center
                       justify-center
                       active:bg-white/10
                       transition-all"
          >
            <X size={16} className="text-white/60" />
          </button>
        </div>

        {/* Nav items */}
        <div className="px-4 py-6 flex flex-col gap-1 overflow-y-auto flex-1 custom-scrollbar">
          {/* Home */}
          <button
            onClick={() => { navigate('/home'); onClose(); }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/home'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <Home size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Home
            </span>
            {location.pathname === '/home' && (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            )}
          </button>

          {/* Tasks */}
          <button
            onClick={() => { navigate('/dashboard'); onClose(); }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/dashboard'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <CheckSquare size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Tasks
            </span>
            {location.pathname === '/dashboard' && (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            )}
          </button>

          {/* Goals */}
          <button
            onClick={() => { navigate('/goals'); onClose(); }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/goals'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <Target size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Goals
            </span>
            {location.pathname === '/goals' && (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            )}
          </button>

          {/* Calendar */}
          <button
            onClick={() => { navigate('/calendar'); onClose(); }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/calendar'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <Calendar size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Calendar
            </span>
            {location.pathname === '/calendar' && (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            )}
          </button>

          {/* Habits — PRO */}
          <button
            onClick={() => {
              if (!isProUser) {
                navigate('/paywall');
              } else {
                navigate('/routine');
              }
              onClose();
            }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/routine'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : !isProUser
                  ? 'text-white/30'
                  : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <RefreshCw size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Habits
            </span>
            {!isProUser ? (
              <span className="ml-auto text-[9px]
                font-bold tracking-widest
                px-2 py-0.5 rounded-full
                border border-[#00E676]/40
                text-[#00E676] bg-[#00E676]/10">
                PRO
              </span>
            ) : location.pathname === '/routine' ? (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            ) : null}
          </button>

          {/* Stats — PRO */}
          <button
            onClick={() => {
              if (!isProUser) {
                navigate('/paywall');
              } else {
                navigate('/stats');
              }
              onClose();
            }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/stats'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : !isProUser
                  ? 'text-white/30'
                  : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <BarChart2 size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Stats
            </span>
            {!isProUser ? (
              <span className="ml-auto text-[9px]
                font-bold tracking-widest
                px-2 py-0.5 rounded-full
                border border-[#00E676]/40
                text-[#00E676] bg-[#00E676]/10">
                PRO
              </span>
            ) : location.pathname === '/stats' ? (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            ) : null}
          </button>
        </div>

        {/* Lifetime card — basic users only */}
        {!isProUser && (
          <div className="mx-4 p-4 rounded-2xl
                          border border-[#00E676]/20
                          bg-[#00E676]/5 mb-4">
            <div className="flex items-center
                            justify-between mb-1">
              <span className="text-[#00E676]
                               font-bold text-sm">
                ⚡ Lifetime ₹199
              </span>
              <span className="text-[9px] font-bold
                tracking-widest px-2 py-0.5
                rounded-full border
                border-[#00E676]/40
                text-[#00E676]">
                ONE-TIME
              </span>
            </div>
            <p className="text-white/40 text-xs mb-3">
              Unlock all modules forever.
            </p>
            <button
              onClick={() => {
                navigate('/lifetime-access');
                onClose();
              }}
              className="w-full py-2 rounded-xl
                         bg-[#00E676] text-black
                         font-bold text-xs
                         tracking-wide uppercase
                         active:scale-95
                         transition-all duration-150"
            >
              Unlock PRO →
            </button>
          </div>
        )}

        {/* Account section */}
        <div className="px-4 mb-4">
          <p className="text-white/20 text-[10px]
                        tracking-widest uppercase
                        mb-2 px-4">
            Account
          </p>
          <button
            onClick={() => { navigate('/settings'); onClose(); }}
            className={`flex items-center gap-3
              w-full px-4 py-3 rounded-xl
              transition-all duration-150
              ${location.pathname === '/settings'
                ? 'bg-[#00E676]/10 text-[#00E676]'
                : 'text-white/60 hover:bg-white/5'
              }`}
          >
            <User size={18} strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Profile
            </span>
            {location.pathname === '/settings' && (
              <div className="ml-auto w-1.5 h-1.5
                              rounded-full bg-[#00E676]" />
            )}
          </button>
        </div>

        {/* Exit the Vault */}
        <div className="px-4 mt-auto mb-10 pb-[env(safe-area-inset-bottom,20px)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center
                       justify-center gap-2
                       py-3 rounded-2xl
                       border border-red-500/20
                       text-red-400 text-sm
                       font-medium
                       active:bg-red-500/10
                       transition-all duration-150"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Exit the Vault
          </button>
        </div>
      </div>
    </>
  );
};

export default SideMenu;

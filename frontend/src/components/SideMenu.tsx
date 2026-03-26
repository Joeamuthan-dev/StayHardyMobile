import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { X, Home, CheckSquare, Target, Repeat, BarChart2, Lock, Calendar, User, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePaywall } from '../context/PaywallContext';
import { isNative } from '../utils/platform';

interface SideMenuProps {
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

export const SideMenu: React.FC<SideMenuProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { openPaywall } = usePaywall();
  const isPro = user?.isPro === true || user?.role === 'admin';
  const currentRoute = location.pathname;

  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // 1. Fade in the heavy glass background
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );

    // 2. Whip the drawer in from the left edge
    gsap.fromTo(
      drawerRef.current,
      { x: '-100%' },
      { x: '0%', duration: 0.5, ease: 'expo.out' }
    );

    // 3. Prevent scrolling and hide bottom nav
    document.body.classList.add('mobile-drawer-open');
    return () => {
      document.body.classList.remove('mobile-drawer-open');
    };
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    // 1. Slide drawer back to the left
    gsap.to(drawerRef.current, {
      x: '-100%',
      duration: 0.35,
      ease: 'power3.in',
    });

    // 2. Fade out overlay, then unmount
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.35,
      ease: 'power3.in',
      onComplete: onClose,
    });
  };

  const handleNavClick = async (route: string, isLocked: boolean) => {
    // Fire the hardware haptic immediately so the UI feels instantly responsive
    await triggerHaptic('Light');
    
    if (isLocked && !isPro) { 
      openPaywall(); 
    }
    else { 
      navigate(route); 
      handleClose(); 
    }
  };

  const handleUpsellClick = async () => {
    // Use a slightly heavier impact for the purchase button to give it weight
    await triggerHaptic('Medium');
    openPaywall();
  };

  const handleLogout = async () => {
    await triggerHaptic('Light');
    handleClose();
    // Small delay to allow menu closing animation to finish before clearing state
    setTimeout(() => {
      logout();
    }, 350);
  };

  const renderNavRow = (name: string, icon: React.ReactNode, route: string, isLocked: boolean = false) => {
    const isActive = currentRoute === route;

    return (
      <button 
        onClick={() => handleNavClick(route, isLocked)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all active:scale-[0.98] ${
          isActive 
            ? 'bg-[#00E676]/10 text-[#00E676] border-l-2 border-[#00E676]' 
            : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
        }`}
      >
        <div className="flex items-center gap-4">
          {icon}
          <span className="font-medium tracking-wide">{name}</span>
        </div>
        {isLocked && !isPro && <Lock size={14} className="text-gray-500" />}
      </button>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex ${isClosing ? 'pointer-events-none' : ''}`}>
      {/* Heavy Glass Backdrop - Clicking it closes the menu */}
      <div 
        ref={overlayRef}
        onClick={handleClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md cursor-pointer"
      />

      {/* The Command Drawer */}
      <div 
        ref={drawerRef}
        className="relative w-[80%] max-w-sm h-full bg-[#0A0A0A] border-r border-white/10 shadow-[20px_0_40px_rgba(0,0,0,0.8)] flex flex-col pt-safe-top pb-safe-bottom"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-[#00E676] tracking-tight">StayHardy</h2>
            <p className="text-gray-500 text-xs italic mt-0.5">The 1% starts here.</p>
          </div>
          <button 
            onClick={async () => {
              await triggerHaptic('Light');
              handleClose();
            }} 
            className="p-2 text-gray-400 hover:text-white rounded-full bg-white/5 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar space-y-8">
          
          {/* Main Stacked Navigation */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3 px-4">Navigate</h3>
            {renderNavRow('Home', <Home size={20} />, '/home')}
            {renderNavRow('Tasks', <CheckSquare size={20} />, '/dashboard')}
            {renderNavRow('Goals', <Target size={20} />, '/goals')}
            {renderNavRow('Habits', <Repeat size={20} />, '/routine', true)}
            {renderNavRow('Stats', <BarChart2 size={20} />, '/stats', true)}
          </div>

          {/* Premium Upsell Card (Only shows if Free) */}
          {!isPro && (
            <div 
              onClick={handleUpsellClick}
              className="mx-2 p-4 rounded-xl bg-gradient-to-br from-[#00E676]/10 to-transparent border border-[#00E676]/30 shadow-[0_0_15px_rgba(0,230,118,0.1)] cursor-pointer active:scale-[0.98] transition-all hover:bg-[#00E676]/20"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#00E676] font-bold flex items-center gap-2">
                  ⚡ Lifetime ₹199
                </span>
                <span className="text-[10px] font-bold bg-[#00E676] text-black px-2 py-0.5 rounded-full uppercase">
                  One-Time
                </span>
              </div>
              <p className="text-gray-400 text-xs">Unlock all modules forever.</p>
            </div>
          )}

          {/* Account Section */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-gray-600 tracking-widest uppercase mb-3 px-4">Account</h3>
            {renderNavRow('Calendar', <Calendar size={20} />, '/calendar')}
            {renderNavRow('Profile', <User size={20} />, '/settings')}
          </div>
        </div>

        {/* Footer / Logout */}
        <div className="p-6 border-t border-white/5 shrink-0">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-red-500/80 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all active:scale-[0.98]"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Initialize Logout</span>
          </button>
        </div>
        
      </div>
    </div>
  );
};

export default SideMenu;

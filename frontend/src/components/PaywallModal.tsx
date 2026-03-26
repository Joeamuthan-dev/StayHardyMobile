import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { X, CheckCircle2, TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { SuccessModal } from './SuccessModal';

interface PaywallModalProps {
  onClose: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { offerings, purchasePackage, restorePurchases, loading, refreshSubscription } = useSubscription();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // ENTRY ANIMATION
    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    );

    gsap.fromTo(
      modalRef.current,
      { y: '100%', opacity: 0.5 },
      { y: '0%', opacity: 1, duration: 0.6, ease: 'expo.out' }
    );
  }, []);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);

    // EXIT ANIMATION
    gsap.to(modalRef.current, {
      y: '100%',
      opacity: 0,
      duration: 0.35,
      ease: 'power3.in',
    });

    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.35,
      ease: 'power3.in',
      onComplete: onClose,
    });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePurchase = async (pkg: any) => {
    setBusy(true);
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        setShowSuccess(true);
      }
    } catch (e) {
      showToast('Purchase failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    try {
      const success = await restorePurchases();
      showToast(success ? 'StayHardy Pro Restored!' : 'No active subscription found.');
    } catch (e) {
      showToast('Restore failed.');
    } finally {
      setBusy(false);
    }
  };

  const benefitSections = [
    {
      title: 'ADVANCED TELEMETRY',
      items: ['1-Year Productivity Heatmaps', 'Deep Insight Analytics', 'Category Performance Reports']
    },
    {
      title: 'HABIT TRACKING',
      items: ['Advanced Habit Streaks', 'Historical Completion Trends', 'Rhythm Stability Metrics']
    },
    {
      title: 'ELITE SYSTEM',
      items: ['Cloud Sync & Secure Backup', 'Early Access to Future Modules', 'Premium Tactical Aesthetics']
    }
  ];

  return (
    <div 
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-md px-0 sm:px-6 ${isClosing ? 'pointer-events-none' : ''}`}
    >
      {/* Absolute click-away layer */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* The Modal Card */}
      <div 
        ref={modalRef}
        className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {showSuccess && <SuccessModal onClose={handleClose} userName={user?.name} />}
        
        {toast && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/90 text-[#00E87A] px-6 py-3 rounded-full border border-[#00E87A] z-[2000] text-sm font-bold animate-in fade-in duration-300">
            {toast}
          </div>
        )}

        {/* Header & Close Button */}
        <div className="flex items-center justify-between p-6 pb-2 shrink-0">
          <div className="flex flex-col">
            <span className="text-[#00E676] text-[10px] font-black tracking-[0.2em] uppercase mb-1">
              Precision Subscription
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              StayHardy PRO
            </h2>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Unlock the full suite of tactical modules and telemetry. Acquire technical superiority with elite modules.
          </p>

          {/* Benefit Groups */}
          {benefitSections.map((section, idx) => (
            <div key={idx} className="mb-8">
              <h3 className="text-gray-500 text-[10px] font-black tracking-widest mb-4 border-b border-white/5 pb-2">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-[#00E676] shrink-0 mt-0.5" 
                      style={{ filter: "drop-shadow(0 0 4px rgba(0,230,118,0.4))" }}
                    />
                    <span className="text-gray-300 text-sm font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Action Area (Sticky) */}
        <div className="p-6 pt-4 border-t border-white/5 bg-[#0A0A0A] shrink-0">
          {/* PRICING AREA */}
          <div className="space-y-3 mb-4">
            {loading ? (
              <div className="space-y-3">
                <div className="h-20 w-full bg-[#1A1A1A] rounded-2xl animate-pulse" />
                <div className="h-20 w-full bg-[#1A1A1A] rounded-2xl animate-pulse" />
              </div>
            ) : offerings ? (
              <>
                {[
                  { pkg: offerings.yearly, label: 'Annual', sub: 'Best Value', price: offerings.yearly?.product.priceString },
                  { pkg: offerings.monthly, label: 'Monthly', sub: 'Flexible', price: offerings.monthly?.product.priceString }
                ].filter(o => o.pkg).map((o, idx) => (
                  <button 
                    key={idx}
                    disabled={busy}
                    onClick={() => handlePurchase(o.pkg)}
                    className="w-full text-left bg-[#1C1F26] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-[#00E87A]/30 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <div>
                      <p className="font-extrabold text-lg text-white">{o.label}</p>
                      <p className="text-[10px] text-[#00E87A] font-black uppercase opacity-60 tracking-wider">
                        {o.sub}
                      </p>
                    </div>
                    <p className="font-black text-xl text-white">{o.price}</p>
                  </button>
                ))}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
                  <TriangleAlert className="text-red-400 w-5 h-5 flex-shrink-0" />
                  <p className="text-red-400 text-xs font-medium leading-relaxed">Store connectivity issues. Check connection.</p>
                </div>
                <button 
                   onClick={() => refreshSubscription()}
                   className="w-full border border-gray-600 text-gray-300 py-3 rounded-xl text-xs font-black tracking-widest uppercase hover:bg-gray-800 transition-colors"
                >
                   RETRY CONNECTION
                </button>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <button 
              onClick={handleRestore}
              disabled={busy}
              className="text-xs text-gray-500 hover:text-white border-b border-gray-700 pb-0.5 transition-colors disabled:opacity-50"
            >
              Restore Purchases
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

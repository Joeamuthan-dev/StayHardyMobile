import React, { useState, useEffect } from 'react';
import { type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { RevenueCatService } from '../services/revenuecat';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

declare global { interface Window { Razorpay: any; } }

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tiers = [
  { id: 'tip_29', amount: 29, label: 'Just Tea',        image: '/images/tier1.svg', recommended: false },
  { id: 'tip_49', amount: 49, label: 'Caffeine Boost',  image: '/images/tier2.svg', recommended: true  },
  { id: 'tip_99', amount: 99, label: 'Full Power Mode', image: '/images/tier3.svg', recommended: false },
];

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [selectedId, setSelectedId]       = useState('tip_49');
  const [packages, setPackages]           = useState<PurchasesPackage[]>([]);
  const [isLoadingPkgs, setIsLoadingPkgs] = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [toast, setToast]                 = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Fetch the Tips offering packages when modal opens, with retries for RC init delay
  useEffect(() => {
    if (!isOpen) return;
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const load = async (attempt: number) => {
      if (attempt === 1) setIsLoadingPkgs(true);
      try {
        const offering = await RevenueCatService.getTipsOffering();
        if (cancelled) return;
        if (offering?.availablePackages?.length) {
          setPackages(offering.availablePackages);
          setIsLoadingPkgs(false);
        } else if (attempt < 4) {
          setTimeout(() => { if (!cancelled) load(attempt + 1); }, 800);
        } else {
          showToast('Could not load tip options. Try again.');
          setIsLoadingPkgs(false);
        }
      } catch {
        if (cancelled) return;
        if (attempt < 4) {
          setTimeout(() => { if (!cancelled) load(attempt + 1); }, 800);
        } else {
          showToast('Could not load tip options. Try again.');
          setIsLoadingPkgs(false);
        }
      }
    };

    load(1);
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleWebPurchase = async () => {
    const tier = tiers.find((t) => t.id === selectedId) ?? tiers[1];
    setIsProcessing(true);
    try {
      const { data: order, error: orderErr } = await supabase.functions.invoke('razorpay-create-order', {
        body: { purpose: 'support', amountInr: tier.amount },
      });
      if (orderErr || !order?.orderId) {
        showToast('Could not initiate payment. Try again.');
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) { showToast('Could not load payment gateway.'); return; }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency ?? 'INR',
        order_id: order.orderId,
        name: 'StayHardy',
        description: `Tip — ${tier.label}`,
        prefill: { email: user?.email ?? '', name: user?.name ?? '' },
        theme: { color: '#00E87A' },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const { error: verifyErr } = await supabase.functions.invoke('razorpay-verify', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                device_platform: 'web',
              },
            });
            if (verifyErr) { showToast('Verification failed. Contact support.'); return; }
            showToast('Thank you for your support! ❤️');
            setTimeout(onClose, 1500);
          } catch {
            showToast('Verification error. Contact support.');
          } finally {
            setIsProcessing(false);
          }
        },
        modal: { ondismiss: () => setIsProcessing(false) },
      });
      rzp.open();
    } catch {
      showToast('Something went wrong. Try again.');
      setIsProcessing(false);
    }
  };

  const handlePurchase = async () => {
    if (!Capacitor.isNativePlatform()) {
      return handleWebPurchase();
    }

    const pkg = packages.find((p) => p.identifier === selectedId);
    if (!pkg) {
      showToast('Selected option not available. Please try again.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await RevenueCatService.purchasePackage(pkg);
      if (result !== null) {
        const amountInr = Math.round(pkg.product.price);
        if (user?.id && amountInr > 0) {
          void supabase.from('tips').insert({
            user_id: user.id,
            user_email: user.email ?? '',
            user_name: user.name ?? '',
            amount: amountInr,
            payment_status: 'success',
            device_platform: 'android',
          });
        }
        showToast('Thank you for your support! ❤️');
        setTimeout(onClose, 1500);
      }
    } catch {
      showToast('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedTier = tiers.find((t) => t.id === selectedId) ?? tiers[1];

  if (!isOpen) return null;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#00E87A',
          color: '#000000',
          padding: '12px 24px',
          borderRadius: '12px',
          fontWeight: '700',
          zIndex: 100001,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'fadeInOut 3.5s ease',
          fontSize: '14px',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 99999,
          animation: 'fadeIn 0.3s ease',
        }}
      />

      {/* Bottom Sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          backgroundColor: '#0D1210',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          zIndex: 100000,
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
        }}
      >
        {/* Close Button */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            width: '36px', height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 101000,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/>
            <line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </div>

        {/* Drag Handle */}
        <div style={{
          width: '36px', height: '5px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '10px',
          margin: '12px auto 8px auto',
          flexShrink: 0,
        }} />

        <div style={{ overflowY: 'auto', padding: '0 0 24px 0' }}>
          {/* Hero */}
          <div style={{
            height: '140px', position: 'relative',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'radial-gradient(circle at center, rgba(0,232,122,0.1) 0%, transparent 70%)',
            marginBottom: '4px',
          }}>
            <svg width="100" height="100" viewBox="0 0 200 200">
              <g className="steam">
                <path d="M70,50 Q75,30 80,50 T90,50"  fill="none" stroke="#00E87A" strokeWidth="2" opacity="0.4"/>
                <path d="M95,40 Q100,20 105,40 T115,40" fill="none" stroke="#00E87A" strokeWidth="2" opacity="0.6"/>
                <path d="M120,45 Q125,25 130,45 T140,45" fill="none" stroke="#00E87A" strokeWidth="2" opacity="0.4"/>
              </g>
              <path className="floating-heart"
                d="M100,75 C100,75 97,65 88,65 C79,65 75,72 75,80 C75,90 85,100 100,110 C115,100 125,90 125,80 C125,72 121,65 112,65 C103,65 100,75 100,75 Z"
                fill="#00E87A"/>
              <path d="M60,95 L140,95 L130,160 C128,172 118,180 106,180 L94,180 C82,180 72,172 70,160 Z"
                fill="#1A2220" stroke="#00E87A" strokeWidth="3"/>
              <path d="M140,110 C155,110 165,120 165,135 C165,150 155,160 140,160"
                fill="none" stroke="#00E87A" strokeWidth="3"/>
              <path d="M70,105 Q100,110 130,105" fill="none" stroke="#00E87A" strokeWidth="1" opacity="0.3"/>
            </svg>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', padding: '0 24px', marginBottom: '24px' }}>
            <h2 style={{
              color: '#FFFFFF', fontSize: '22px', fontWeight: '800',
              marginBottom: '8px', letterSpacing: '-0.02em',
            }}>
              Fuel this Mission
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.5' }}>
              I built StayHardy to help you win. Your tips fuel the next big update.
            </p>
          </div>

          {/* Tier Grid */}
          {isLoadingPkgs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                border: '2.5px solid rgba(0,232,122,0.2)',
                borderTop: '2.5px solid #00E87A',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', padding: '0 20px', marginBottom: '0' }}>
              {tiers.map((tier) => {
                const isSelected = selectedId === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedId(tier.id)}
                    style={{
                      flex: 1, position: 'relative',
                      backgroundColor: isSelected ? 'rgba(0,232,122,0.12)' : '#161C1A',
                      border: isSelected ? '2px solid #00E87A' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px',
                      padding: '16px 8px 12px 8px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isSelected ? '0 8px 24px rgba(0,232,122,0.15)' : 'none',
                    }}
                  >
                    {tier.recommended && (
                      <div style={{
                        position: 'absolute', top: '-8px',
                        backgroundColor: '#00E87A', color: '#000000',
                        fontSize: '9px', fontWeight: '900',
                        padding: '2px 8px', borderRadius: '10px',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        Popular
                      </div>
                    )}
                    <div style={{
                      height: '40px', width: '40px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '4px',
                    }}>
                      <img
                        src={tier.image}
                        alt={tier.label}
                        style={{
                          width: '36px', height: '36px', objectFit: 'contain',
                          mixBlendMode: 'screen',
                          filter: isSelected
                            ? 'invert(0) drop-shadow(0 0 8px rgba(0,232,122,0.6))'
                            : 'invert(0) brightness(0.9)',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: '15px', fontWeight: '800',
                      color: isSelected ? '#00E87A' : '#FFFFFF',
                      marginBottom: '2px',
                    }}>
                      ₹{tier.amount}
                    </span>
                    <span style={{
                      fontSize: '10px', fontWeight: '600',
                      color: 'rgba(255,255,255,0.4)', textAlign: 'center',
                    }}>
                      {tier.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Button */}
          <div style={{ padding: '24px 24px 0 24px' }}>
            <button
              onClick={handlePurchase}
              disabled={isProcessing || isLoadingPkgs || (Capacitor.isNativePlatform() && packages.length === 0)}
              style={{
                width: '100%', height: '60px',
                backgroundColor: (isProcessing || isLoadingPkgs || (Capacitor.isNativePlatform() && packages.length === 0))
                  ? 'rgba(0,232,122,0.4)' : '#00E87A',
                color: '#000000',
                borderRadius: '18px',
                fontSize: '17px', fontWeight: '900',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isProcessing ? 'none' : '0 8px 24px rgba(0,232,122,0.3)',
                transition: 'all 0.2s ease',
                gap: '8px',
              }}
            >
              {isProcessing ? (
                <>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.2)',
                    borderTop: '2px solid #000',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Processing...
                </>
              ) : (
                `Fuel the Journey — ₹${selectedTier.amount}`
              )}
            </button>

            <p style={{
              textAlign: 'center', fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
              marginTop: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '4px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
              {Capacitor.isNativePlatform() ? 'Secure payment via Google Play' : 'Secure payment via Razorpay'}
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeInOut {
          0%   { opacity: 0; transform: translate(-50%, -10px); }
          15%  { opacity: 1; transform: translate(-50%, 0); }
          85%  { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .steam {
          animation: steamFlow 3s ease-in-out infinite;
        }
        @keyframes steamFlow {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50%       { transform: translateY(-10px) scale(1.1); opacity: 0.7; }
        }
        .floating-heart {
          animation: heartFloat 2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes heartFloat {
          0%, 100% { transform: translateY(0) scale(1) rotate(-5deg); }
          50%       { transform: translateY(-15px) scale(1.1) rotate(5deg); }
        }
      `}} />
    </>
  );
};

export default SupportModal;

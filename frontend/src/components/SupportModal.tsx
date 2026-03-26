import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => RazorpayInstance;
  }
}

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: { error?: { description?: string } }) => void) => void;
};

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_STxtr78ph0HFG9';

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(49);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const tiers = [
    {
      amount: 29,
      label: 'Just Tea',
      image: '/images/tier1.svg',
      recommended: false
    },
    {
      amount: 49,
      label: 'Caffeine Boost',
      image: '/images/tier2.svg',
      recommended: true
    },
    {
      amount: 99,
      label: 'Full Power Mode',
      image: '/images/tier3.svg',
      recommended: false
    }
  ];

  const handlePayment = async (amount: number, user: any) => {
    if (!user?.id) {
      showToast('Please log in first');
      return;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay script if not present
      if (typeof window.Razorpay === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: amount * 100, // Razorpay takes amount in paise
        currency: 'INR',
        name: 'StayHardy',
        description: `Support - ₹${amount}`,
        prefill: {
          name: user.name || '',
          email: user.email || ''
        },
        theme: {
          color: '#00E87A'
        },
        handler: async function (response: any) {
          try {
            // Correct field names for the tip-record-success edge function
            const { error } = await supabase.functions.invoke('tip-record-success', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                amountInr: amount,
                userId: user.id,
                email: user.email || ''
              }
            });

            if (error) throw error;
            showToast('Thank you for your support! ❤️');
            onClose();
          } catch (err) {
            console.error('Error recording tip:', err);
            showToast('Supported! (Rec failed)');
            onClose();
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        showToast(response.error.description || 'Payment failed');
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment Error:', err);
      showToast('Could not start payment');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const finalAmount = customAmount && parseInt(customAmount) > 0
    ? parseInt(customAmount)
    : selectedAmount;

  return (
    <>
      {/* Toast Notification */}
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
          animation: 'fadeInOut 3s ease',
          fontSize: '14px'
        }}>
          {toast}
        </div>
      )}

      {/* Backdrop */}
      <div 
        onClick={() => {
          console.log('Backdrop tapped');
          onClose();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 99999,
          animation: 'fadeIn 0.3s ease'
        }}
      />
      
      {/* Bottom Sheet Modal */}
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#0D1210',
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 100000,
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
        
        {/* Close Button X */}
        <div
          onClick={() => {
            console.log('Close tapped');
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 101000 // Ensure it's above other elements in the sheet
          }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/>
            <line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </div>

        {/* Drag Handle */}
        <div style={{
          width: '36px',
          height: '5px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '10px',
          margin: '12px auto 8px auto',
          flexShrink: 0
        }} />

        <div style={{ overflowY: 'auto', padding: '0 0 24px 0' }}>
          {/* Hero Illustration Section */}
          <div style={{
            height: '140px',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'radial-gradient(circle at center, rgba(0, 232, 122, 0.1) 0%, transparent 70%)',
            marginBottom: '4px'
          }}>
            <svg width="100" height="100" viewBox="0 0 200 200">
              {/* Cup Steam */}
              <g className="steam">
                <path d="M70,50 Q75,30 80,50 T90,50" fill="none" stroke="#00E87A" strokeWidth="2" opacity="0.4" />
                <path d="M95,40 Q100,20 105,40 T115,40" fill="none" stroke="#00E87A" strokeWidth="2" opacity="0.6" />
                <path d="M120,45 Q125,25 130,45 T140,45" fill="none" stroke="#00E87A" strokeWidth="2" opacity="0.4" />
              </g>

              {/* Floating Heart */}
              <path 
                className="floating-heart"
                d="M100,75 C100,75 97,65 88,65 C79,65 75,72 75,80 C75,90 85,100 100,110 C115,100 125,90 125,80 C125,72 121,65 112,65 C103,65 100,75 100,75 Z" 
                fill="#00E87A"
              />

              {/* Cup Body */}
              <path d="M60,95 L140,95 L130,160 C128,172 118,180 106,180 L94,180 C82,180 72,172 70,160 Z" fill="#1A2220" stroke="#00E87A" strokeWidth="3" />
              {/* Cup Handle */}
              <path d="M140,110 C155,110 165,120 165,135 C165,150 155,160 140,160" fill="none" stroke="#00E87A" strokeWidth="3" />
              {/* Cup Inner Highlight */}
              <path d="M70,105 Q100,110 130,105" fill="none" stroke="#00E87A" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', padding: '0 24px', marginBottom: '24px' }}>
            <h2 style={{ 
              color: '#FFFFFF', 
              fontSize: '22px', 
              fontWeight: '800', 
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              Fuel this Mission
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '14px', lineHeight: '1.5' }}>
              I built StayHardy to help you win. Your tips fuel the next big update.
            </p>
          </div>

          {/* Tier Grid */}
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '0 20px',
            marginBottom: '0'
          }}>
            {tiers.map((tier) => (
              <div 
                key={tier.amount}
                onClick={() => {
                  setSelectedAmount(tier.amount);
                  setCustomAmount('');
                }}
                style={{
                  flex: 1,
                  position: 'relative',
                  backgroundColor: selectedAmount === tier.amount && !customAmount ? 'rgba(0, 232, 122, 0.12)' : '#161C1A',
                  border: selectedAmount === tier.amount && !customAmount ? '2px solid #00E87A' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '16px 8px 12px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  transform: selectedAmount === tier.amount && !customAmount ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: selectedAmount === tier.amount && !customAmount ? '0 8px 24px rgba(0, 232, 122, 0.15)' : 'none'
                }}
              >
                {tier.recommended && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    backgroundColor: '#00E87A',
                    color: '#000000',
                    fontSize: '9px',
                    fontWeight: '900',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Popular
                  </div>
                )}

                {/* Tier Icon */}
                <div style={{
                  height: '40px',
                  width: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px'
                }}>
                  <img
                    src={tier.image}
                    alt={tier.label}
                    style={{
                      width: '36px',
                      height: '36px',
                      objectFit: 'contain',
                      mixBlendMode: 'screen',
                      filter: selectedAmount === tier.amount && !customAmount
                        ? 'invert(0) drop-shadow(0 0 8px rgba(0,232,122,0.6))'
                        : 'invert(0) brightness(0.9)',
                      transition: 'all 0.2s ease'
                    }}
                  />
                </div>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: selectedAmount === tier.amount && !customAmount ? '#00E87A' : '#FFFFFF',
                  marginBottom: '2px'
                }}>
                  ₹{tier.amount}
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.4)',
                  textAlign: 'center'
                }}>
                  {tier.label}
                </span>
              </div>
            ))}
          </div>

          {/* Custom amount section */}
          <div style={{ padding: '20px 24px 0 24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}/>
              <span style={{
                fontSize: '10px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.2)',
                letterSpacing: '0.1em'
              }}>
                OR ENTER CUSTOM
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }}/>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              border: customAmount ? '1.5px solid #00E87A' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '0 16px',
              height: '52px',
              transition: 'all 0.2s ease',
              boxShadow: customAmount ? '0 0 16px rgba(0,232,122,0.1)' : 'none'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '700',
                color: customAmount ? '#00E87A' : 'rgba(255, 255, 255, 0.2)',
                marginRight: '8px'
              }}>
                ₹
              </span>

              <input
                type="number"
                inputMode="numeric"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setCustomAmount(val);
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#FFFFFF',
                  caretColor: '#00E87A'
                }}
              />

              {customAmount && (
                <div
                  onClick={() => setCustomAmount('')}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '10px',
                    color: '#FFFFFF'
                  }}>
                  ✕
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div style={{ padding: '24px 24px 0 24px' }}>
            <button
              onClick={() => handlePayment(finalAmount, currentUser)}
              disabled={isProcessing || (customAmount !== '' && parseInt(customAmount) < 1)}
              style={{
                width: '100%',
                height: '60px',
                backgroundColor: isProcessing || (customAmount !== '' && parseInt(customAmount) < 1) ? 'rgba(0, 232, 122, 0.4)' : '#00E87A',
                color: '#000000',
                borderRadius: '18px',
                fontSize: '17px',
                fontWeight: '900',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isProcessing ? 'none' : '0 8px 24px rgba(0, 232, 122, 0.3)',
                transition: 'all 0.2s ease',
                gap: '8px'
              }}
            >
              {isProcessing ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.2)',
                    borderTop: '2px solid #000',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Processing...
                </>
              ) : (
                `Fuel the Journey — ₹${finalAmount}`
              )}
            </button>
            <p style={{
              textAlign: 'center',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.2)',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
              Secure payment processed via Razorpay
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          15% { opacity: 1; transform: translate(-50%, 0); }
          85% { opacity: 1; transform: translate(-50%, 0); }
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
          50% { transform: translateY(-10px) scale(1.1); opacity: 0.7; }
        }
        .floating-heart {
          animation: heartFloat 2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes heartFloat {
          0%, 100% { transform: translateY(0) scale(1) rotate(-5deg); }
          50% { transform: translateY(-15px) scale(1.1) rotate(5deg); }
        }
      `}} />
    </>
  );
};

export default SupportModal;

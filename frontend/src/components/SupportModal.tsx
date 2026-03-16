import React, { useRef, useEffect } from 'react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportScriptLoader: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ''; 

    const form = document.createElement('form');
    const script = document.createElement('script');
    
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.setAttribute("data-payment_button_id", "pl_SR9DVPj4qUF7bh");
    script.async = true;
    
    form.appendChild(script);
    containerRef.current.appendChild(form);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="razorpay-injection-point"
      style={{ width: '100%', display: 'flex', justifyContent: 'center', minHeight: '50px' }} 
    />
  );
};

const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0, 0, 0, 0.9)', 
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 10000, 
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '2rem', 
        textAlign: 'center', 
        position: 'relative', 
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: '2rem'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#ffffff', cursor: 'pointer', width: '2.5rem', height: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ec4899', margin: '0 auto 2rem auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>favorite</span>
        </div>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1.25rem', color: '#ffffff' }}>Support the App</h2>
        
        <div id="razorpay-form-container" style={{ marginBottom: '2rem', minHeight: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <SupportScriptLoader />
        </div>

        <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>
          If you enjoy using this app, your support would mean a lot. You can contribute any amount—even ₹1—to help improve features and overall performance.
          Your support encourages continued development, and your feedback is always welcome to help us make the app better.
        </p>

        <button 
          onClick={onClose}
          style={{ marginTop: '2rem', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', padding: '1rem', borderRadius: '1rem', fontWeight: 700, cursor: 'pointer' }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default SupportModal;

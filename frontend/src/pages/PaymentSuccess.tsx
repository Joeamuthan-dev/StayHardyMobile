// PaymentSuccess.tsx
// Instamojo redirects to /payment-success?payment_id=xxx&payment_request_id=xxx&payment_status=Credit
// (via payment-success.html shim which forwards into the hash router)
// This page verifies the payment server-side and grants Pro.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

type Status = 'verifying' | 'success' | 'failed';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuth() as any;
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Hash router URL looks like: /#/payment-success?payment_id=xxx&payment_request_id=xxx
    const search = window.location.hash.includes('?')
      ? window.location.hash.split('?')[1]
      : window.location.search.slice(1);

    const params = new URLSearchParams(search);
    const paymentId = params.get('payment_id') ?? '';
    const paymentRequestId = params.get('payment_request_id') ?? '';
    const paymentStatus = params.get('payment_status') ?? '';

    // Instamojo sends payment_status=Credit on success
    if (!paymentId || !paymentRequestId) {
      setStatus('failed');
      setErrorMsg('Missing payment details. If you were charged, contact support at hello@stayhardy.com');
      return;
    }

    if (paymentStatus && paymentStatus !== 'Credit') {
      setStatus('failed');
      setErrorMsg(`Payment was not completed (status: ${paymentStatus}). No amount was charged.`);
      return;
    }

    const verify = async () => {
      try {
        const { error } = await supabase.functions.invoke('instamojo-verify', {
          body: { payment_id: paymentId, payment_request_id: paymentRequestId },
        });

        if (error) {
          console.error('[PaymentSuccess] Verify error:', error);
          setErrorMsg(error.message ?? 'Verification failed. Contact support@stayhardy.com if amount was deducted.');
          setStatus('failed');
          return;
        }

        if (refreshUserProfile) await refreshUserProfile();
        setStatus('success');
        setTimeout(() => navigate('/home', { replace: true }), 2500);
      } catch (e: any) {
        setErrorMsg(e?.message ?? 'Something went wrong. Contact hello@stayhardy.com');
        setStatus('failed');
      }
    };

    verify();
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Syne, sans-serif',
    }}>

      {status === 'verifying' && (
        <>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '3px solid rgba(0,232,122,0.2)',
            borderTop: '3px solid #00E87A',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '24px',
          }} />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', margin: 0 }}>
            Verifying your payment…
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(0,232,122,0.1)', border: '2px solid #00E87A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(0,232,122,0.3)', marginBottom: '24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#00E87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Welcome to Pro!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>
            Taking you to the app…
          </p>
        </>
      )}

      {status === 'failed' && (
        <>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
            Verification Failed
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: '13px',
            margin: '0 0 32px', textAlign: 'center',
            maxWidth: '300px', lineHeight: 1.6,
          }}>
            {errorMsg}
          </p>
          <button
            onClick={() => navigate('/home', { replace: true })}
            style={{
              background: '#00E87A', color: '#000', border: 'none',
              borderRadius: '14px', padding: '14px 32px',
              fontSize: '15px', fontWeight: 800, cursor: 'pointer',
            }}
          >
            Go to App
          </button>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PaymentSuccess;

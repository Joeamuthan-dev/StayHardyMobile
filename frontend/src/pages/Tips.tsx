import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RAZORPAY_KEY = 'rzp_test_YourKeyHere'; // Replace with actual Razorpay key

const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 500];

const Tips: React.FC = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | ''>('');
  const [customInput, setCustomInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedAmount = amount !== '' ? amount : (customInput ? parseInt(customInput) : 0);

  const handlePreset = (val: number) => {
    setAmount(val);
    setCustomInput('');
    setError('');
  };

  const handleCustom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomInput(val);
    setAmount('');
    setError('');
  };

  const handlePay = () => {
    const finalAmount = selectedAmount;
    if (!finalAmount || finalAmount <= 0) {
      setError('Please enter an amount greater than ₹0');
      return;
    }
    setLoading(true);

    // Razorpay Checkout
    const options: any = {
      key: RAZORPAY_KEY,
      amount: finalAmount * 100, // in paise
      currency: 'INR',
      name: 'StayHardy App',
      description: 'Tip to Developer 💚',
      image: '/logo.png',
      theme: { color: '#10b981' },
      prefill: { name: '', email: '', contact: '' },
      handler: (response: any) => {
        console.log('Payment success', response);
        setLoading(false);
        navigate('/settings', { state: { tipSuccess: true } });
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
        }
      }
    };

    if (!(window as any).Razorpay) {
      // Load Razorpay script dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', () => setLoading(false));
        rzp.open();
      };
      document.body.appendChild(script);
    } else {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => setLoading(false));
      rzp.open();
    }
  };

  return (
    <div className="relative flex min-h-screen w-full page-responsive flex-col bg-[var(--bg-color)] text-[var(--text-main)] font-display">
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header
        className="px-6 pb-6 flex items-center gap-4 relative z-10"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <button
          onClick={() => navigate('/settings')}
          className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Support the Dev</h1>
          <p className="text-slate-500 text-xs font-medium">Every tip means a lot 💚</p>
        </div>
      </header>

      <main className="flex-1 px-6 pb-12 relative z-10 flex flex-col gap-6">

        {/* Motivation card */}
        <div className="glass-card rounded-3xl p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <div className="text-4xl mb-3">🌱</div>
          <h2 className="text-lg font-black text-white leading-tight">Built with love,<br/>kept alive by you.</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            This app is crafted by a solo developer. Your tip helps keep the servers running, new features coming, and the coffee brewing!
          </p>
        </div>

        {/* Preset amounts */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Choose an Amount (₹)</p>
          <div className="grid grid-cols-3 gap-3">
            {PRESET_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => handlePreset(val)}
                className={`h-14 rounded-2xl font-black text-base transition-all border ${
                  amount === val
                    ? 'bg-emerald-500 text-slate-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-emerald-500/30'
                }`}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Or Enter Custom Amount</p>
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-lg">₹</span>
            <input
              type="number"
              min="1"
              placeholder="Enter amount"
              value={customInput}
              onChange={handleCustom}
              className="w-full h-14 bg-white/5 rounded-2xl pl-10 pr-5 border border-white/10 focus:border-emerald-500 outline-none text-white font-bold text-lg"
            />
          </div>
        </div>

        {/* Selected amount display */}
        {selectedAmount > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">You're tipping</span>
            <span className="text-2xl font-black text-emerald-400">₹{selectedAmount}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handlePay}
          disabled={loading || selectedAmount <= 0}
          className="glow-btn-primary w-full h-14 rounded-2xl font-bold text-base tracking-tight disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Opening Razorpay...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Pay ₹{selectedAmount > 0 ? selectedAmount : '—'} via Razorpay
            </>
          )}
        </button>

        <p className="text-center text-slate-600 text-xs">Secured by Razorpay · No data stored</p>
      </main>
    </div>
  );
};

export default Tips;

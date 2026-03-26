import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { SuccessModal } from '../components/SuccessModal';

export const Paywall = () => {
  const { user } = useAuth();
  const { offerings, purchasePackage, restorePurchases, loading, isPro, refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isPro) {
      navigate('/home', { replace: true });
    }
  }, [loading, isPro, navigate]);

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
      showToast('Purchase failed. Please try again.');
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

  const PricingSkeleton = () => (
    <div className="space-y-4 w-full">
      <div className="h-24 w-full bg-[#1A1A1A] rounded-xl animate-pulse opacity-80" />
      <div className="h-24 w-full bg-[#1A1A1A] rounded-xl animate-pulse opacity-80" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080C0A] py-10 px-6 flex flex-col items-center text-white relative overflow-hidden">
      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} userName={user?.name} />}
      
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 bg-black/80 text-[#00E87A] px-6 py-3 rounded-full border border-[#00E87A] z-[2000] animate-in fade-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="text-center mb-10 mt-10">
        <div className="bg-[#00E87A] rounded-full px-4 py-1.5 inline-flex items-center mb-4">
          <span className="text-[10px] font-black text-black tracking-[0.1em]">PRECISION SUBSCRIPTION</span>
        </div>
        <h1 className="text-4xl font-black tracking-tighter">StayHardy PRO</h1>
        <p className="text-white/40 text-sm mt-2">Unlock the full suite of tactical modules.</p>
      </div>

      {/* OFFERINGS / ERROR / LOADING */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {loading ? (
          <PricingSkeleton />
        ) : offerings ? (
          <div className="flex flex-col gap-4">
            {[
              { pkg: offerings.yearly, label: 'Annual', sub: 'Best Value', price: offerings.yearly?.product.priceString },
              { pkg: offerings.monthly, label: 'Monthly', sub: 'Flexible', price: offerings.monthly?.product.priceString }
            ].filter(o => o.pkg).map((o, idx) => (
              <button 
                key={idx}
                disabled={busy}
                onClick={() => handlePurchase(o.pkg)}
                className="w-full text-left bg-[#1C1F26] border border-white/5 rounded-xl p-5 flex items-center justify-between transition-all active:scale-[0.98] hover:border-white/10 disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-lg">{o.label}</span>
                  <span className="text-xs text-[#00E87A] opacity-70 font-medium">{o.sub}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-xl">{o.price}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center">
            <div className="w-full bg-red-900/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 justify-center">
              <TriangleAlert className="text-red-400 w-5 h-5 flex-shrink-0" />
              <p className="text-red-400 text-sm font-medium">Unable to connect to secure servers. Please check your connection.</p>
            </div>
            <button 
              onClick={() => refreshSubscription()}
              className="border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg px-4 py-2 transition-all font-bold text-sm"
            >
              RETRY CONNECTION
            </button>
          </div>
        )}
      </div>

      {/* FEATURES */}
      <div className="mt-10 w-full max-w-sm flex flex-col gap-3">
         <p className="text-[11px] font-bold text-white/30 tracking-widest uppercase mb-2">ELITE BENEFITS</p>
         {[
           'Advanced Analytics & Charting',
           'Complete Habit Dashboard',
           'Behavioral Heatmaps',
           'Personalized Productivity Insights'
         ].map((f, i) => (
           <div key={i} className="flex items-center gap-3 py-1">
             <CheckCircle 
               className="w-5 h-5 flex-shrink-0" 
               style={{ color: '#00E676', filter: "drop-shadow(0 0 4px #00E676)" }} 
             />
             <span className="text-gray-300 font-medium tracking-wide text-sm">{f}</span>
           </div>
         ))}
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <button 
          onClick={handleRestore}
          disabled={busy}
          className="text-gray-500 hover:text-white transition-colors text-sm border-b border-gray-700 pb-1 cursor-pointer disabled:opacity-50"
        >
          Restore Purchases
        </button>
      </div>
    </div>
  );
};

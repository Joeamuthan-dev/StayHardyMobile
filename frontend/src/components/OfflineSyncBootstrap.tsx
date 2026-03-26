import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { useAuth } from '../context/AuthContext';
import { processSyncQueue, registerSyncNetworkListener, SYNC_BANNER_EVENT } from '../lib/syncQueue';

/**
 * Processes the offline sync queue when the network returns or the app resumes,
 * and shows a small banner when some queued changes exceeded max retries.
 */
const OfflineSyncBootstrap: React.FC = () => {
  const { user } = useAuth();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    registerSyncNetworkListener();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void processSyncQueue();
  }, [user?.id]);

  useEffect(() => {
    let remove: (() => void) | undefined;
    void App.addListener('resume', () => {
      void processSyncQueue();
    }).then((handle) => {
      remove = () => void handle.remove();
    });
    return () => {
      remove?.();
    };
  }, []);

  useEffect(() => {
    const onBanner = (e: Event) => {
      const msg = (e as CustomEvent<{ message?: string }>).detail?.message;
      if (!msg) return;
      setBanner(msg);
      window.setTimeout(() => setBanner(null), 6000);
    };
    window.addEventListener(SYNC_BANNER_EVENT, onBanner);
    return () => window.removeEventListener(SYNC_BANNER_EVENT, onBanner);
  }, []);

  if (!banner) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 99998,
        maxWidth: 'min(92vw, 420px)',
        padding: '0.65rem 1rem',
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.94)',
        border: '1px solid rgba(248, 113, 113, 0.35)',
        color: '#fecaca',
        fontSize: '0.82rem',
        fontWeight: 600,
        textAlign: 'center',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        pointerEvents: 'none',
      }}
    >
      {banner}
    </div>
  );
};

export default OfflineSyncBootstrap;

import React, { useCallback, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { supabase } from '../supabase';
import { CacheManager, CACHE_EXPIRY, CACHE_KEYS } from '../lib/smartCacheManager';

type AnnouncementCategory = 'feature' | 'update' | 'fix' | 'info';
type UpdateRow = {
  id: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  created_at: string;
};

const CATEGORY_CONFIG: Record<AnnouncementCategory, {
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  leftBorder: string;
}> = {
  feature: {
    icon: '✨',
    label: 'NEW FEATURE',
    color: '#00E87A',
    bg: 'rgba(0,232,122,0.08)',
    border: 'rgba(0,232,122,0.2)',
    leftBorder: '#00E87A',
  },
  update: {
    icon: '🔄',
    label: 'UPDATE',
    color: '#818CF8',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
    leftBorder: '#6366F1',
  },
  fix: {
    icon: '🔧',
    label: 'BUG FIX',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    leftBorder: '#F59E0B',
  },
  info: {
    icon: 'ℹ️',
    label: 'INFO',
    color: 'rgba(255,255,255,0.7)',
    bg: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    leftBorder: 'rgba(255,255,255,0.3)',
  },
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: diffDays > 365 ? 'numeric' : undefined,
  });
};

const StayHardyUpdatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarHidden, setIsSidebarHidden] = useState(
    () => localStorage.getItem('sidebarHidden') === 'true'
  );

  const fetchUpdatesFromDB = useCallback(async (): Promise<UpdateRow[] | null> => {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, message, category, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) {
      console.error('Load updates error:', error);
      return null;
    }
    return (data || []) as UpdateRow[];
  }, []);

  const markAsRead = useCallback(async () => {
    await Preferences.set({
      key: 'updates_last_viewed',
      value: new Date().toISOString(),
    });
  }, []);

  const loadUpdates = useCallback(async () => {
    setIsLoading(true);
    const cached = await CacheManager.get<UpdateRow[]>(CACHE_KEYS.ANNOUNCEMENTS_LIST);
    if (cached) {
      setUpdates(cached);
      setIsLoading(false);
      void fetchUpdatesFromDB().then(async (fresh) => {
        if (!fresh) return;
        setUpdates(fresh);
        await CacheManager.set(CACHE_KEYS.ANNOUNCEMENTS_LIST, fresh, CACHE_EXPIRY.ANNOUNCEMENTS_LIST);
      });
      return;
    }
    const fresh = await fetchUpdatesFromDB();
    if (fresh) {
      setUpdates(fresh);
      await CacheManager.set(CACHE_KEYS.ANNOUNCEMENTS_LIST, fresh, CACHE_EXPIRY.ANNOUNCEMENTS_LIST);
    }
    setIsLoading(false);
  }, [fetchUpdatesFromDB]);

  useEffect(() => {
    void loadUpdates();
    void markAsRead();
  }, [loadUpdates, markAsRead]);

  return (
    <div className={`page-shell updates-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="updates-wrap">
        <div className="updates-top">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="notification-btn desktop-only-btn"
            title="Back"
            style={{ width: 36, height: 36, minWidth: 36, opacity: 0.65 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSidebarHidden((prev) => {
                const next = !prev;
                localStorage.setItem('sidebarHidden', next.toString());
                return next;
              });
            }}
            className="notification-btn desktop-only-btn"
            title="Sidebar"
            style={{ width: 36, height: 36, minWidth: 36, opacity: 0.45 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>
        </div>
        <h1 className="updates-title">STAYHARDY UPDATES</h1>
        <p className="updates-tagline">FEATURES · FIXES · NEWS</p>

        {isLoading ? (
          <div className="updates-empty">
            <div style={{ fontSize: 38, marginBottom: 8 }}>⏳</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Loading updates...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="updates-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <h3 style={{ color: 'white', fontFamily: 'Syne, sans-serif', fontSize: 16, margin: '0 0 8px' }}>
              No Updates Yet
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
              Check back soon for new features and updates from the team!
            </p>
          </div>
        ) : (
          <div>
            {updates.map((announcement, index) => {
              const cfg = CATEGORY_CONFIG[announcement.category] || CATEGORY_CONFIG.info;
              return (
                <div
                  key={announcement.id}
                  className="updates-card"
                  style={{
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    borderLeft: `3px solid ${cfg.leftBorder}`,
                    animationDelay: `${index * 0.05}s`,
                  }}
                >
                  <div className="updates-card-row">
                    <div className="updates-badge" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <span style={{ fontSize: 11 }}>{cfg.icon}</span>
                      <span className="updates-badge-label" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <span className="updates-date">{formatDate(announcement.created_at)}</span>
                  </div>
                  <h3 className="updates-card-title">{announcement.title}</h3>
                  <p className="updates-card-message">{announcement.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav isHidden={isSidebarHidden} />

      <style>{`
        .updates-page { background: #050807 !important; min-height: 100dvh; }
        .updates-wrap { max-width: 680px; margin: 0 auto; padding: 16px 14px 82px; }
        .updates-top { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .updates-title {
          text-align: center; margin: 6px 0 2px; color: #fff;
          font-family: 'Syne, sans-serif'; font-size: 21px; font-weight: 800; letter-spacing: 0.8px;
        }
        .updates-tagline {
          text-align: center; margin: 0 0 14px; color: rgba(255,255,255,0.44);
          font-size: 10px; letter-spacing: 2px; font-weight: 700;
        }
        .updates-empty {
          text-align: center; padding: 40px 20px; border-radius: 16px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
        }
        .updates-card {
          border-radius: 16px; padding: 16px; margin-bottom: 12px;
          animation: fadeUp 0.4s ease forwards; opacity: 0;
        }
        .updates-card-row {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px;
        }
        .updates-badge {
          display: inline-flex; align-items: center; gap: 5px; border-radius: 20px; padding: 3px 10px;
        }
        .updates-badge-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; }
        .updates-date { color: rgba(255,255,255,0.3); font-size: 11px; }
        .updates-card-title {
          font-family: 'Syne, sans-serif'; font-weight: 800; font-size: 16px;
          color: #fff; margin: 0 0 8px; line-height: 1.3;
        }
        .updates-card-message {
          color: rgba(255,255,255,0.62); font-size: 13px; line-height: 1.7; margin: 0; white-space: pre-wrap;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default StayHardyUpdatesPage;


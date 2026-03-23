import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistGoalsList, loadGoalsListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import BottomNav from '../components/BottomNav';
import {  useLocation } from 'react-router-dom';

import { useLanguage } from '../context/LanguageContext';

interface Goal {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetDate: string;
  status: 'pending' | 'completed';
  quote: string;
  image_url?: string;
  createdAt: string;
  updatedAt?: string;
}

type UrgencyBucket = 'critical' | 'urgent' | 'soon' | 'comfort';

function getUrgencyBucket(daysLeft: number | null, isOverdue: boolean): UrgencyBucket {
  if (isOverdue || daysLeft === null) return 'critical';
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'soon';
  return 'comfort';
}

/** Card gradient + left accent by time pressure (not index). */
function getCardUrgencyStyle(bucket: UrgencyBucket): {
  gradient: string;
  leftGlow: string;
  shadow: string;
} {
  switch (bucket) {
    case 'critical':
      return {
        gradient: 'linear-gradient(145deg, rgba(127, 29, 29, 0.35), rgba(15, 23, 42, 0.92))',
        leftGlow: '#f87171',
        shadow: '0 12px 40px rgba(239, 68, 68, 0.18)',
      };
    case 'urgent':
      return {
        gradient: 'linear-gradient(145deg, rgba(185, 28, 28, 0.28), rgba(15, 23, 42, 0.9))',
        leftGlow: '#ef4444',
        shadow: '0 12px 36px rgba(239, 68, 68, 0.15)',
      };
    case 'soon':
      return {
        gradient: 'linear-gradient(145deg, rgba(30, 58, 138, 0.35), rgba(15, 23, 42, 0.92))',
        leftGlow: '#fbbf24',
        shadow: '0 12px 36px rgba(59, 130, 246, 0.14)',
      };
    default:
      return {
        gradient: 'linear-gradient(145deg, rgba(6, 78, 59, 0.32), rgba(15, 23, 42, 0.92))',
        leftGlow: '#34d399',
        shadow: '0 12px 36px rgba(16, 185, 129, 0.12)',
      };
  }
}

/** DAYS LEFT badge: 0–3 red, 4–7 amber, 8+ green (overdue = red). */
function getDaysBadgeColors(daysLeft: number | null, isOverdue: boolean) {
  if (isOverdue || daysLeft === null || daysLeft <= 3) {
    return {
      bg: 'rgba(239, 68, 68, 0.22)',
      border: 'rgba(248, 113, 113, 0.55)',
      text: '#fecaca',
      glow: 'rgba(239, 68, 68, 0.55)',
      pulse: true,
    };
  }
  if (daysLeft <= 7) {
    return {
      bg: 'rgba(245, 158, 11, 0.2)',
      border: 'rgba(251, 191, 36, 0.5)',
      text: '#fde68a',
      glow: 'rgba(245, 158, 11, 0.45)',
      pulse: false,
    };
  }
  return {
    bg: 'rgba(16, 185, 129, 0.2)',
    border: 'rgba(52, 211, 153, 0.45)',
    text: '#a7f3d0',
    glow: 'rgba(16, 185, 129, 0.4)',
    pulse: false,
  };
}

const motivationalQuotes = [
  "Small progress each day leads to big results.",
  "Discipline today builds the future you want.",
  "Stay focused on the goal.",
  "Your future self will thank you for what you do today.",
  "Dream big, work hard, stay focused.",
  "Success is the sum of small efforts day in and day out.",
  "The secret of getting ahead is getting started.",
  "It does not matter how slowly you go as long as you do not stop.",
  "The only way to do great work is to love what you do."
];

function GoalProgressRing({
  percent,
  size = 92,
  goalId,
  children,
}: {
  percent: number;
  size?: number;
  goalId: string;
  children: React.ReactNode;
}) {
  const gid = `g${goalId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = 36;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="goal-progress-ring-wrap" style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="goal-progress-ring-svg" aria-hidden>
        <defs>
          <linearGradient id={`goalRingGrad-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#goalRingGrad-${gid})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          className="goal-progress-ring-stroke"
        />
      </svg>
      <div
        className="goal-progress-ring-inner"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

const Goals: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  // const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => {
    const newState = !isSidebarHidden;
    setIsSidebarHidden(newState);
    localStorage.setItem('sidebarHidden', newState.toString());
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  const fetchGoals = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id) return;
      const stale = await loadGoalsListStale<Goal>(user.id);
      if (stale !== null) {
        const sortedGoals = stale.sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'pending' ? -1 : 1;
        });
        setGoals(sortedGoals);
      }

      const expired =
        options?.force ||
        (await isCacheExpired(CACHE_KEYS.goals_list, CACHE_EXPIRY_MINUTES.goals_list));
      if (!expired) return;

      const { data, error } = await supabase
        .from('goals')
        .select('id, userId, name, description, targetDate, status, quote, image_url, createdAt, updatedAt')
        .eq('userId', user.id)
        .eq('status', 'pending')
        .order('createdAt', { ascending: false });

      if (error) console.error('Error fetching goals:', error);
      else if (data) {
        const sortedGoals = (data as Goal[]).sort((a, b) => {
          if (a.status === b.status) return 0;
          return a.status === 'pending' ? -1 : 1;
        });
        setGoals(sortedGoals);
        void persistGoalsList(user.id, sortedGoals);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    fetchGoals();

    if (!user?.id) return;

    const goalsChannel = supabase
      .channel('goals_page_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals', 
        filter: `userId=eq.${user.id}` 
      }, () => void fetchGoals({ force: true }))
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
    };
  }, [fetchGoals, user?.id]);

  useEffect(() => {
    const h = () => void fetchGoals({ force: true });
    window.addEventListener(AFTER_SYNC_FLUSH_EVENT, h);
    return () => window.removeEventListener(AFTER_SYNC_FLUSH_EVENT, h);
  }, [fetchGoals]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-goal') {
      setShowModal(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Storage Error:', err);
      throw new Error(err.message || 'Storage connection failed');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !name) return;

    setLoading(true);
    setError('');

    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const tempId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    try {
      const online = await isOnline();
      if (!online) {
        if (imageFile) {
          setError('Images require a connection. Try again when online.');
          setLoading(false);
          return;
        }
        const optimistic: Goal = {
          id: tempId,
          userId: user.id,
          name,
          description,
          targetDate,
          status: 'pending',
          quote: randomQuote,
          image_url: undefined,
          createdAt: nowIso,
        };
        setGoals((prev) => [optimistic, ...prev]);
        await enqueueSync({
          action: 'create',
          entity: 'goal',
          data: {
            row: {
              userId: user.id,
              name,
              description,
              targetDate,
              status: 'pending',
              quote: randomQuote,
              image_url: '',
            },
          },
          timestamp: Date.now(),
        });
        void setGoals((prev) => {
          void persistGoalsList(user.id, prev);
          return prev;
        });
        void invalidateUserStatsCache();
        setName('');
        setDescription('');
        setImageFile(null);
        setTargetDate('');
        setShowModal(false);
        setLoading(false);
        return;
      }

      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const newGoal = {
        userId: user.id,
        name,
        description,
        targetDate,
        status: 'pending' as const,
        quote: randomQuote,
        image_url: imageUrl,
      };

      const { error: insertError } = await supabase.from('goals').insert([newGoal]);

      if (insertError) throw insertError;

      setName('');
      setDescription('');
      setImageFile(null);
      setTargetDate('');
      setShowModal(false);
      void fetchGoals({ force: true });
      void invalidateUserStatsCache();
    } catch (err: any) {
      console.error('Error creating goal:', err);
      setError(err.message || 'Failed to create goal.');
    } finally {
      setLoading(false);
    }
  };

  const triggerCompleteCelebration = useCallback(() => {
    setConfettiActive(true);
    window.setTimeout(() => setConfettiActive(false), 2600);
  }, []);

  const toggleGoalStatus = async (goal: Goal) => {
    const newStatus = goal.status === 'pending' ? 'completed' : 'pending';
    const originalGoals = [...goals];

    setGoals(prev => prev.map(g => (g.id === goal.id ? { ...g, status: newStatus } : g)));

    const online = await isOnline();
    if (!online && user?.id) {
      await enqueueSync({
        action: 'update',
        entity: 'goal',
        data: {
          id: goal.id,
          patch: {
            status: newStatus,
            updatedAt: newStatus === 'completed' ? new Date().toISOString() : null,
          },
        },
        timestamp: Date.now(),
      });
      void setGoals((prev) => {
        void persistGoalsList(user.id, prev);
        return prev;
      });
      void invalidateUserStatsCache();
      void syncWidgetData();
      return;
    }

    try {
      const { error: statusError } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goal.id);

      if (statusError) throw statusError;

      await supabase
        .from('goals')
        .update({ updatedAt: newStatus === 'completed' ? new Date().toISOString() : null })
        .eq('id', goal.id);

      void syncWidgetData();
      void invalidateUserStatsCache();
      void setGoals((prev) => {
        if (user?.id) void persistGoalsList(user.id, prev);
        return prev;
      });
    } catch (err: any) {
      console.error('Core status update failed:', err);
      setError('Failed to update goal status. Please check your connection.');
      setGoals(originalGoals);
      void fetchGoals({ force: true });
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user?.id) return;
    setGoals(prev => prev.filter(g => g.id !== goalId));

    const online = await isOnline();
    if (!online) {
      await enqueueSync({
        action: 'delete',
        entity: 'goal',
        data: { id: goalId },
        timestamp: Date.now(),
      });
      void setGoals((prev) => {
        void persistGoalsList(user.id, prev);
        return prev;
      });
      void invalidateUserStatsCache();
      return;
    }

    const { error } = await supabase.from('goals').delete().eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      void fetchGoals({ force: true });
    } else {
      void invalidateUserStatsCache();
      void setGoals((prev) => {
        void persistGoalsList(user.id, prev);
        return prev;
      });
    }
  };

  const calculateDaysRemaining = useCallback((dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const calculateTimeProgress = (createdAt: string, targetDate: string, isCompleted: boolean) => {
    if (isCompleted) return 100;
    if (!targetDate || !createdAt) return 0;
    
    const start = new Date(createdAt).getTime();
    const end = new Date(targetDate).getTime();
    const now = new Date().getTime();
    
    if (end <= start) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    return Math.round(progress);
  };

  /** Second bar: timeline runway until target (no goal-linked tasks in schema). */
  const calculateTimeRemainingPct = (createdAt: string, targetDate: string, isCompleted: boolean) => {
    const tp = calculateTimeProgress(createdAt, targetDate, isCompleted);
    return Math.max(0, 100 - tp);
  };

  const openNewGoalModal = () => {
    setShowModal(true);
  };

  const pendingGoals = goals.filter((g) => g.status === 'pending');
  const onTrackCount = pendingGoals.filter((g) => {
    const d = calculateDaysRemaining(g.targetDate);
    return d !== null && d >= 0;
  }).length;

  const goalsSummaryStats = useMemo(() => {
    const pending = goals.filter((g) => g.status === 'pending');
    const onTrack = pending.filter((g) => {
      const d = calculateDaysRemaining(g.targetDate);
      return d !== null && d >= 0;
    }).length;
    const completed = goals.filter((g) => g.status === 'completed').length;
    const daysLeftList = pending
      .map((g) => calculateDaysRemaining(g.targetDate))
      .filter((d): d is number => d !== null);
    const minDays = daysLeftList.length === 0 ? null : Math.min(...daysLeftList);
    return { onTrack, completed, minDays };
  }, [goals, calculateDaysRemaining]);

  const daysLeftStatColor = (d: number | null) => {
    if (d === null) return 'rgba(255, 255, 255, 0.55)';
    if (d <= 0) return '#EF4444';
    if (d <= 7) return '#F59E0B';
    return '#ffffff';
  };

  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="stats-premium-header">
        <div className="stats-header-center">
          <h1 className="stats-display-title">{(language === 'Tamil' ? t('goals') : t('goals').toUpperCase())}</h1>
          <div className="stats-marquee-wrap">
            <div className="stats-marquee-line" />
            <div className="stats-marquee-track" aria-hidden>
              <div className="stats-marquee-inner">
                <span>SET TARGETS · TRACK PROGRESS · WIN BIG · SET TARGETS · TRACK PROGRESS · WIN BIG · </span>
                <span>SET TARGETS · TRACK PROGRESS · WIN BIG · SET TARGETS · TRACK PROGRESS · WIN BIG · </span>
              </div>
            </div>
            <div className="stats-marquee-line" />
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="stats-header-sidebar-btn notification-btn desktop-only-btn"
          title={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar (Focus Mode)'}
          data-tooltip={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
          aria-label="Toggle sidebar"
          style={
            isSidebarHidden
              ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
              : undefined
          }
        >
          <span className="material-symbols-outlined">{isSidebarHidden ? 'side_navigation' : 'fullscreen'}</span>
        </button>
      </header>

      <div className="goals-header-meta">
        <div className="goals-summary-chip" role="status">
          <span className="material-symbols-outlined goals-summary-chip-icon" aria-hidden>
            trending_up
          </span>
          <span>
            {onTrackCount} of {pendingGoals.length} goal{pendingGoals.length === 1 ? '' : 's'} on track
          </span>
        </div>
        <div className="goals-summary-bar" aria-label="Goals summary">
          <div className="goals-summary-bar__item">
            <span className="material-symbols-outlined goals-summary-bar__ic" style={{ color: '#00E87A' }}>
              north_east
            </span>
            <span className="goals-summary-bar__val">{goalsSummaryStats.onTrack}</span>
            <span className="goals-summary-bar__lbl">On Track</span>
          </div>
          <div className="goals-summary-bar__divider" aria-hidden />
          <div className="goals-summary-bar__item">
            <span className="material-symbols-outlined goals-summary-bar__ic" style={{ color: 'rgba(245, 158, 11, 0.8)' }}>
              schedule
            </span>
            <span
              className="goals-summary-bar__val"
              style={{ color: daysLeftStatColor(goalsSummaryStats.minDays) }}
            >
              {goalsSummaryStats.minDays === null ? '—' : goalsSummaryStats.minDays}
            </span>
            <span className="goals-summary-bar__lbl">Days Left</span>
          </div>
          <div className="goals-summary-bar__divider" aria-hidden />
          <div className="goals-summary-bar__item">
            <span className="material-symbols-outlined goals-summary-bar__ic" style={{ color: '#00E87A' }}>
              check_circle
            </span>
            <span className="goals-summary-bar__val">{goalsSummaryStats.completed}</span>
            <span className="goals-summary-bar__lbl">Completed</span>
          </div>
          <div className="goals-summary-bar__divider" aria-hidden />
          <button
            type="button"
            className="goals-summary-bar__item goals-summary-bar__item--add"
            onClick={openNewGoalModal}
            title={`${t('add')} Goal`}
            aria-label={`${t('add')} Goal`}
          >
            <span className="goals-summary-bar__add-ic" aria-hidden>
              <span className="material-symbols-outlined">add</span>
            </span>
            <span className="goals-summary-bar__lbl goals-summary-bar__lbl--add">New Goal</span>
          </button>
        </div>
      </div>

      {/* Active Goals Grid */}
      {goals.filter(g => g.status === 'pending').length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '8rem 2rem', 
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '2.5rem',
          border: '1px dashed rgba(255,255,255,0.1)',
          marginBottom: '2rem'
        }}>
           <div style={{ 
             width: '120px', 
             height: '120px', 
             borderRadius: '40px', 
             background: 'rgba(16, 185, 129, 0.05)', 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             marginBottom: '2rem', 
             border: '1px solid rgba(16, 185, 129, 0.1)',
             boxShadow: '0 0 40px rgba(16, 185, 129, 0.05)'
           }}>
             <span className="material-symbols-outlined" style={{ fontSize: '4.5rem', color: '#10b981', opacity: 0.8 }}>rocket_launch</span>
           </div>
           <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
             Create your first dream goal
           </h2>
           <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '3rem', maxWidth: '450px', fontSize: '1.1rem', lineHeight: 1.6, fontWeight: 600 }}>
             Turn your vision into reality. Every great achievement starts with the decision to try.
           </p>
           <button 
             onClick={openNewGoalModal} 
             className="glow-btn-primary" 
             style={{ padding: '0 3rem', height: '4rem', borderRadius: '1.5rem', fontSize: '1.1rem', fontWeight: 900, width: 'fit-content' }}
           >
             <span>Make it Track & Happen</span>
           </button>
        </div>
      ) : (
        <div
          className="goals-grid goals-page-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', paddingBottom: '2rem', alignItems: 'start' }}
        >
        {pendingGoals.map((goal) => {
          const daysLeft = calculateDaysRemaining(goal.targetDate);
          const isOverdue = daysLeft !== null && daysLeft < 0;
          const isTargetToday = daysLeft === 0;
          const isCompleted = false;
          const bucket = getUrgencyBucket(daysLeft, isOverdue);
          const cardStyle = getCardUrgencyStyle(bucket);
          const badge = getDaysBadgeColors(daysLeft, isOverdue);
          const timeProgress = calculateTimeProgress(goal.createdAt, goal.targetDate, isCompleted);
          const timeLeftPct = calculateTimeRemainingPct(goal.createdAt, goal.targetDate, isCompleted);
          const showBehindStrip = timeProgress < 50 && !isOverdue && daysLeft !== null;

          const daysPrimary =
            daysLeft === null
              ? '—'
              : isOverdue
                ? `${Math.abs(daysLeft)}`
                : String(daysLeft);
          const daysSub = daysLeft === null ? 'SET DATE' : isOverdue ? 'DAYS OVER' : 'DAYS LEFT';

          const targetChipLabel = goal.targetDate
            ? new Date(goal.targetDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
            : 'No date';

          return (
            <div
              key={goal.id}
              className="glass-card active-goal-card goals-mobile-card goals-urgency-card"
              style={{
                padding: 0,
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                background: cardStyle.gradient,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: `${cardStyle.shadow}, -4px 0 18px ${badge.glow}`,
                transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                borderLeft: `3px solid ${badge.border}`,
              }}
            >
              <div
                style={{
                  padding: '1.25rem 1.35rem 1rem',
                  position: 'relative',
                  minHeight: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div
                    className={`goals-days-pill ${badge.pulse ? 'goals-days-pill--pulse' : ''}`}
                    style={{
                      background: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.text,
                      boxShadow: `0 0 20px ${badge.glow}`,
                      ['--pulse-glow' as string]: badge.glow,
                    }}
                  >
                    <span className="goals-days-pill-num">{daysPrimary}</span>
                    <span className="goals-days-pill-label">{daysSub}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGoal(goal.id);
                    }}
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: 'none',
                      color: 'rgba(255,255,255,0.45)',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    className="delete-goal-btn"
                    aria-label="Delete goal"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      delete
                    </span>
                  </button>
                </div>

                <div className="goal-card-main-row">
                  <div className="goal-card-text-block goals-card-text">
                    <h3 className="goals-card-title">{goal.name}</h3>
                    {goal.description ? (
                      <p className="goals-card-desc">{goal.description}</p>
                    ) : (
                      <p className="goals-card-desc goals-card-desc--placeholder">No description</p>
                    )}
                    {showBehindStrip && (
                      <div className="goals-behind-strip" role="status">
                        <span className="material-symbols-outlined" aria-hidden>
                          schedule
                        </span>
                        <span>Behind schedule — use the runway below to catch up.</span>
                      </div>
                    )}
                    <div className="goals-progress-stack">
                      <div className="goals-progress-label-row">
                        <span className="goals-progress-metric-label">TIME PROGRESS</span>
                        <span className="goals-progress-metric-val">{timeProgress}%</span>
                      </div>
                      <div className="goal-neon-track goal-neon-track--cyan">
                        <div className="goal-neon-bar-fill" style={{ width: `${timeProgress}%` }} />
                        <div className="goal-neon-shimmer" />
                      </div>
                      <div className="goals-progress-label-row goals-progress-label-row--second">
                        <span className="goals-progress-metric-label">TIME LEFT</span>
                        <span className="goals-progress-metric-val goals-progress-metric-val--muted">{timeLeftPct}%</span>
                      </div>
                      <div className="goal-neon-track goal-neon-track--violet">
                        <div className="goal-neon-bar-fill goal-neon-bar-fill--violet" style={{ width: `${timeLeftPct}%` }} />
                        <div className="goal-neon-shimmer goal-neon-shimmer--slow" />
                      </div>
                    </div>
                  </div>
                  <GoalProgressRing percent={timeProgress} goalId={goal.id} size={96}>
                    {goal.image_url ? (
                      <img src={goal.image_url} alt="" className="goals-ring-img" />
                    ) : (
                      <span className="goals-ring-emoji" aria-hidden>
                        🎯
                      </span>
                    )}
                  </GoalProgressRing>
                </div>
              </div>
              <div
                className="goal-card-footer goals-card-footer"
                style={{
                  padding: '1rem 1.35rem 1.2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.2)',
                  gap: '0.75rem',
                }}
              >
                <div
                  className={`goals-date-chip ${isOverdue || isTargetToday ? 'goals-date-chip--warn' : ''}`}
                >
                  <span className="material-symbols-outlined goals-date-chip-icon" aria-hidden>
                    {isOverdue || isTargetToday ? 'warning' : 'calendar_today'}
                  </span>
                  <span>{targetChipLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerCompleteCelebration();
                    void toggleGoalStatus(goal);
                  }}
                  className="goal-complete-tick goal-complete-tick-bounce"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '2px solid #10b981',
                    background: 'transparent',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    zIndex: 20,
                    position: 'relative',
                  }}
                  title="Mark as Complete"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', fontWeight: '900' }}>
                    check
                  </span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}



      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', borderRadius: '2.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{t('define_milestone')}</h2>
              <button onClick={() => setShowModal(false)} className="notification-btn"><span className="material-symbols-outlined">close</span></button>
            </div>

            {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 700 }}>{error}</div>}
            
            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('task_name')}</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('what_achieve')} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('target_date')}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      className="form-input date-input-premium" 
                      value={targetDate} 
                      onChange={e => setTargetDate(e.target.value)} 
                      required 
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        padding: '1rem', 
                        paddingRight: '3rem',
                        borderRadius: '1rem', 
                        color: 'var(--text-main)', 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }} 
                    />
                    <span className="material-symbols-outlined" style={{ 
                      position: 'absolute', 
                      right: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: '#10b981', 
                      pointerEvents: 'none',
                      fontSize: '22px'
                    }}>
                      calendar_month
                    </span>
                  </div>
                </div>
              </div>

              <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('description_vision')}</label>
                <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('path_success')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', minHeight: '80px', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', resize: 'none' }} />
                
              </div>

              <button type="submit" disabled={loading} className="glow-btn-primary" style={{ height: '3.5rem', width: '100%', borderRadius: '1.25rem' }}>
                {loading ? <span className="material-symbols-outlined rotating">sync</span> : <span>{t('add')} Goal</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {confettiActive && (
        <div className="goals-confetti-overlay" aria-hidden>
          {Array.from({ length: 56 }, (_, i) => (
            <span
              key={i}
              className="goals-confetti-bit"
              style={{
                left: `${(i * 17 + (i % 7) * 11) % 100}%`,
                animationDelay: `${(i % 12) * 0.04}s`,
                background: ['#34d399', '#60a5fa', '#fbbf24', '#f472b6', '#a78bfa', '#f87171'][i % 6],
              }}
            />
          ))}
        </div>
      )}

      <BottomNav
        isHidden={isSidebarHidden}
        hideFloatingShelf={showModal}
        hideMobileNavChrome={showModal}
      />
      
      <style>{`
        .goals-header-meta {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.5rem;
          max-width: 720px;
          margin: 0 auto 1rem;
          padding: 0 0.2rem;
        }
        .goals-header-meta .goals-summary-chip {
          margin-top: 0;
          align-self: flex-start;
        }
        .goals-summary-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.5rem;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: rgba(248, 250, 252, 0.88);
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.28);
        }
        .goals-summary-chip-icon {
          font-size: 16px !important;
          color: #34d399;
        }
        .goals-summary-bar {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .goals-summary-bar__item {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 2px;
        }
        .goals-summary-bar__ic {
          font-size: 18px !important;
          font-variation-settings: 'FILL' 0, 'wght' 500;
          line-height: 1;
          margin-bottom: 2px;
        }
        .goals-summary-bar__val {
          font-family: 'Syne', system-ui, sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
        }
        .goals-summary-bar__lbl {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.02em;
        }
        .goals-summary-bar__divider {
          width: 1px;
          align-self: stretch;
          min-height: 44px;
          background: rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }
        .goals-summary-bar__item--add {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 2px;
          background: rgba(0, 232, 122, 0.06);
          border: none;
          border-radius: 10px;
          padding: 8px 4px;
          margin: 0;
          cursor: pointer;
          font: inherit;
          transition: transform 120ms ease, background 120ms ease;
        }
        .goals-summary-bar__item--add:active {
          transform: scale(0.95);
          background: rgba(0, 232, 122, 0.1);
        }
        .goals-summary-bar__add-ic {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #00e87a;
          color: #000000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 232, 122, 0.3);
        }
        .goals-summary-bar__add-ic .material-symbols-outlined {
          font-size: 20px !important;
          font-variation-settings: 'FILL' 0, 'wght' 300;
          line-height: 1;
        }
        .goals-summary-bar__lbl--add {
          color: #00e87a !important;
          margin-top: 4px;
        }
        .goal-card-main-row {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
        }
        .goals-card-text {
          flex: 1;
          min-width: 0;
          margin-right: 0;
        }
        .goals-card-title {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.35rem;
          line-height: 1.25;
        }
        .goals-card-desc {
          font-size: 12px;
          color: rgba(148, 163, 184, 0.95);
          margin: 0 0 0.5rem;
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .goals-card-desc--placeholder {
          opacity: 0.45;
        }
        .goals-behind-strip {
          display: flex;
          align-items: flex-start;
          gap: 0.35rem;
          padding: 0.45rem 0.55rem;
          margin-bottom: 0.5rem;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.25);
          font-size: 11px;
          font-weight: 700;
          color: #fde68a;
          line-height: 1.35;
        }
        .goals-behind-strip .material-symbols-outlined {
          font-size: 16px !important;
          color: #fbbf24;
          flex-shrink: 0;
        }
        .goals-days-pill {
          display: inline-flex;
          align-items: baseline;
          gap: 0.4rem;
          padding: 0.4rem 0.85rem 0.45rem;
          border-radius: 999px;
          backdrop-filter: blur(8px);
        }
        .goals-days-pill-num {
          font-size: 1.05rem;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .goals-days-pill-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
          opacity: 0.92;
        }
        @keyframes goalsDaysPulse {
          0%, 100% { box-shadow: 0 0 12px var(--pulse-glow); transform: scale(1); }
          50% { box-shadow: 0 0 28px var(--pulse-glow); transform: scale(1.02); }
        }
        .goals-days-pill--pulse {
          animation: goalsDaysPulse 1.8s ease-in-out infinite;
        }
        .goals-progress-stack {
          margin-top: 0.35rem;
        }
        .goals-progress-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .goals-progress-label-row--second {
          margin-top: 10px;
        }
        .goals-progress-metric-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: rgba(255, 255, 255, 0.38);
        }
        .goals-progress-metric-val {
          font-size: 12px;
          font-weight: 900;
          color: #5eead4;
        }
        .goals-progress-metric-val--muted {
          color: #c4b5fd;
        }
        .goal-neon-track {
          position: relative;
          height: 7px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .goal-neon-track--cyan {
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4), 0 0 12px rgba(45, 212, 191, 0.15);
        }
        .goal-neon-track--violet {
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4), 0 0 12px rgba(167, 139, 250, 0.12);
        }
        .goal-neon-bar-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #2dd4bf, #5eead4, #99f6e4);
          box-shadow: 0 0 14px rgba(45, 212, 191, 0.65), 0 0 4px rgba(255, 255, 255, 0.5);
          transition: width 1.2s cubic-bezier(0.34, 1.2, 0.64, 1);
          min-width: 0;
        }
        .goal-neon-bar-fill--violet {
          background: linear-gradient(90deg, #8b5cf6, #a78bfa, #c4b5fd);
          box-shadow: 0 0 14px rgba(139, 92, 246, 0.55), 0 0 4px rgba(255, 255, 255, 0.35);
        }
        .goal-neon-shimmer {
          position: absolute;
          top: 0;
          left: -40%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.45),
            transparent
          );
          animation: goalNeonShimmer 2.4s ease-in-out infinite;
          pointer-events: none;
          border-radius: 999px;
        }
        .goal-neon-shimmer--slow {
          animation-duration: 3.2s;
          opacity: 0.7;
        }
        @keyframes goalNeonShimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(350%); }
        }
        .goals-ring-img {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          object-fit: cover;
        }
        .goals-ring-emoji {
          font-size: 2.35rem;
          line-height: 1;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
        }
        .goal-progress-ring-stroke {
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.45));
        }
        .goals-date-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          color: rgba(226, 232, 240, 0.92);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .goals-date-chip-icon {
          font-size: 16px !important;
          color: #94a3b8;
        }
        .goals-date-chip--warn {
          color: #fecaca;
          background: rgba(127, 29, 29, 0.35);
          border-color: rgba(248, 113, 113, 0.45);
        }
        .goals-date-chip--warn .goals-date-chip-icon {
          color: #f87171;
        }
        @keyframes goalTickBounce {
          0% { transform: scale(1); }
          35% { transform: scale(0.88); }
          55% { transform: scale(1.12); }
          75% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        .goal-complete-tick-bounce:active {
          animation: goalTickBounce 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        .goals-confetti-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 2000;
          overflow: hidden;
        }
        .goals-confetti-bit {
          position: absolute;
          top: -12px;
          width: 8px;
          height: 10px;
          border-radius: 2px;
          opacity: 0.95;
          animation: goalsConfettiFall 2.4s ease-out forwards;
        }
        @keyframes goalsConfettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0.85;
          }
        }
        .goals-grid {
          display: grid;
          gap: 1.5rem;
          padding-bottom: 7rem;
        }
        @media (min-width: 1400px) {
          .goals-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 1399px) and (min-width: 1024px) {
          .goals-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 1023px) and (min-width: 640px) {
          .goals-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 639px) {
          .goals-grid { grid-template-columns: 1fr !important; }
        }
        .delete-goal-btn:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
          border-radius: 50%;
        }
        .goals-urgency-card.glass-card:hover {
          transform: translateY(-4px);
          filter: brightness(1.03);
        }
        .date-input-premium::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        .goal-complete-tick:hover {
          background: #10b981 !important;
          color: white !important;
          transform: scale(1.08);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
};

export default Goals;

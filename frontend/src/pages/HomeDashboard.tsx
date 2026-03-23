import React, { useState, useEffect, useMemo, useCallback } from 'react';
import BottomNav from '../components/BottomNav';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine } from '../lib/lifetimeAccess';
import { supabase } from '../supabase';
import { calculateProductivityScore } from '../utils/productivity';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, saveToCache, getStaleCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import {
  loadTasksListStale,
  persistTasksList,
  loadGoalsListStale,
  persistGoalsList,
  loadRoutinesRawStale,
  persistRoutinesRaw,
  loadRoutineLogsListStale,
  persistRoutineLogsList,
} from '../lib/listCaches';

type HomeRoutineRow = { id: string; title: string; days: string[] };
import WhyStayHardyModal from '../components/WhyStayHardyModal';
import SupportModal from '../components/SupportModal';
import {
  ensureFirstOpenDate,
  shouldShowAutomaticSupportPopup,
  markSupportPopupShown,
  isCompletedTaskToday,
} from '../lib/supportPopup';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt?: string;
  category: string;
}

interface Routine {
  id: string;
  title: string;
  days: string[];
}

interface RoutineLog {
  routine_id: string;
  completed_at: string;
}

interface Goal {
  id: string;
  name: string;
  targetDate: string;
  status: 'pending' | 'completed';
  progress?: number;
  createdAt: string;
}

const HomeDashboard: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };
  const { language } = useLanguage();
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'Tamil' ? 'போருக்குத் தயார்' : 'Awaken — Grind Starts';
    if (hour < 18) return language === 'Tamil' ? 'தொடர்ந்து முன்னேறு' : 'Stay Relentless';
    return language === 'Tamil' ? 'வெற்றியுடன் முடி' : 'Earn Your Rest';
  };
  /** Time-of-day label for welcome line only (not the motivational title). */
  const getWelcomeGreeting = () => {
    const hour = new Date().getHours();
    if (language === 'Tamil') {
      if (hour >= 5 && hour < 12) return 'காலை வணக்கம்';
      if (hour >= 12 && hour < 17) return 'மதிய வணக்கம்';
      if (hour >= 17 && hour < 21) return 'இனிய மாலை';
      return 'வணக்கம்';
    }
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 21) return 'Good evening';
    return 'Hey';
  };
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportGateReady, setSupportGateReady] = useState(false);
  const [scoreData, setScoreData] = useState<{
    tasks_progress: number;
    routines_progress: number;
    goals_progress: number;
    overall_score: number;
    tasks_total?: number;
    tasks_completed?: number;
    routines_total?: number;
    routines_completed?: number;
    goals_total?: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayDate = new Date();
    const currentDayName = daysOfWeek[todayDate.getDay()];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDayStr =
      thirtyDaysAgo.getFullYear() +
      '-' +
      String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(thirtyDaysAgo.getDate()).padStart(2, '0');

    const stTasks = await loadTasksListStale<Task>(user.id);
    if (stTasks !== null) setTasks(stTasks as Task[]);
    const stGoals = await loadGoalsListStale<Goal>(user.id);
    if (stGoals !== null) setGoals(stGoals as Goal[]);
    const stRoutines = await loadRoutinesRawStale<HomeRoutineRow>(user.id);
    if (stRoutines !== null) setRoutines(stRoutines as Routine[]);
    const stLogs = await loadRoutineLogsListStale<RoutineLog>(user.id);
    if (stLogs !== null) {
      setRoutineLogs(stLogs.filter((l) => l.completed_at >= startDayStr));
    }

    const homeScoreSnap = await getStaleCache<{ user_id: string; score: NonNullable<typeof scoreData> }>(
      CACHE_KEYS.home_stats,
    );
    if (homeScoreSnap?.user_id === user.id && homeScoreSnap.score) {
      setScoreData(homeScoreSnap.score);
    }

    const tasksExp = await isCacheExpired(CACHE_KEYS.tasks_list, CACHE_EXPIRY_MINUTES.tasks_list);
    const goalsExp = await isCacheExpired(CACHE_KEYS.goals_list, CACHE_EXPIRY_MINUTES.goals_list);
    const routinesExp = await isCacheExpired(CACHE_KEYS.routines_list, CACHE_EXPIRY_MINUTES.routines_list);
    const logsExp = await isCacheExpired(CACHE_KEYS.routine_logs_list, CACHE_EXPIRY_MINUTES.routines_list);

    const [scoreRes, tasksRes, routinesRes, logsRes, goalsRes] = await Promise.all([
      supabase.rpc('get_productivity_score', {
        p_user_id: user.id,
        p_day_name: currentDayName,
        p_today_str: localTodayStr,
      }),
      tasksExp
        ? supabase
            .from('tasks')
            .select('id, title, status, priority, createdAt, updatedAt, category')
            .eq('userId', user.id)
        : Promise.resolve({ data: null, error: null }),
      routinesExp
        ? supabase.from('routines').select('id, title, days').eq('user_id', user.id)
        : Promise.resolve({ data: null, error: null }),
      logsExp
        ? supabase
            .from('routine_logs')
            .select('routine_id, completed_at')
            .eq('user_id', user.id)
            .gte('completed_at', startDayStr)
        : Promise.resolve({ data: null, error: null }),
      goalsExp
        ? supabase
            .from('goals')
            .select('id, name, status, targetDate, createdAt')
            .eq('userId', user.id)
            .order('createdAt', { ascending: false })
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (scoreRes.data) {
      setScoreData(scoreRes.data);
      void saveToCache(
        CACHE_KEYS.home_stats,
        { user_id: user.id, score: scoreRes.data },
        CACHE_EXPIRY_MINUTES.home_stats,
      );
    }

    if (tasksExp && tasksRes.data) {
      const tasksData = tasksRes.data;
      setTasks(tasksData as Task[]);
      void persistTasksList(user.id, tasksData);
    }

    if (routinesExp && routinesRes.data) {
      const routinesData = routinesRes.data;
      setRoutines(routinesData as Routine[]);
      void persistRoutinesRaw(user.id, routinesData as HomeRoutineRow[]);
    }

    if (logsExp && logsRes.data) {
      const logsData = logsRes.data as RoutineLog[];
      const asLogs = logsData.filter((l) => l.completed_at >= startDayStr);
      setRoutineLogs(asLogs);
      const mergedMap = new Map<string, RoutineLog>();
      for (const l of stLogs ?? []) mergedMap.set(`${l.routine_id}|${l.completed_at}`, l);
      for (const l of asLogs) mergedMap.set(`${l.routine_id}|${l.completed_at}`, l);
      void persistRoutineLogsList(user.id, [...mergedMap.values()]);
    }

    if (goalsExp) {
      if (goalsRes.error) console.error('Error fetching goals:', goalsRes.error);
      if (goalsRes.data) {
        const goalsData = goalsRes.data;
        setGoals(goalsData as Goal[]);
        void persistGoalsList(user.id, goalsData as Goal[]);
      }
    }

    void syncWidgetData();
  }, [user?.id]);

  useEffect(() => {
    fetchData();
    
    // First-time intro logic (Only show once globally per user)
    const checkAndShowIntro = async () => {
      // Small delay to let user load fully if needed
      if (!user) return;
      
      const { data } = await supabase.auth.getUser();
      const hasSeenIntro = data.user?.user_metadata?.has_seen_stay_hardy_intro;
      
      if (!hasSeenIntro) {
        setTimeout(() => {
          setIsFirstTime(true);
          setIsIntroOpen(true);
        }, 1500); // Slight delay for better entrance
      }
    };
    checkAndShowIntro();
  }, [fetchData, user]);

  const handleCloseIntro = async () => {
    setIsIntroOpen(false);
    
    // Save to database so it never shows again across devices
    if (user?.id) {
      await supabase.auth.updateUser({
        data: { has_seen_stay_hardy_intro: true }
      });
    }
  };
  
  // Automatic Daily Reset Check at Midnight
  useEffect(() => {
    const checkMidnight = () => {
      const lastCheck = localStorage.getItem('last_dashboard_reset_date');
      const today = new Date().toLocaleDateString();
      if (lastCheck && lastCheck !== today) {
        console.log('Midnight detected. Resetting dashboard data.');
        fetchData();
      }
      localStorage.setItem('last_dashboard_reset_date', today);
    };

    const interval = setInterval(checkMidnight, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived Data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const topPendingTasks = [...pendingTasks].sort((a, b) => {
    const pA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
    const pB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
    return pB - pA;
  }).slice(0, 2);

  const upcomingReminders = useMemo(() => {
    try {
      const key = `reminders_${user?.id || 'guest'}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      const all: { id: string; date: string; title: string }[] = JSON.parse(stored);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const todayStr = now.toISOString().split('T')[0];
      const limit = new Date(now); limit.setDate(limit.getDate() + 3);
      const limitStr = limit.toISOString().split('T')[0];
      return all
        .filter(r => r.date >= todayStr && r.date <= limitStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch { return []; }
  }, [user?.id]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDate = new Date();
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const activeRoutinesTodayCount = scoreData?.routines_total ?? routines.filter(r => r.days?.includes(currentDayName)).length;

  const completedRoutinesToday = scoreData?.routines_completed ?? routineLogs.filter(l => l.completed_at === localTodayStr).length;

  let currentStreak = 0;
  const uniqueLogDaysSet = new Set(routineLogs.map(l => l.completed_at));
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const checkStr = new Date(checkDate.getTime() - (checkDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const checkDayName = daysOfWeek[checkDate.getDay()];
    const scheduledThatDay = routines.filter(r => r.days?.includes(checkDayName)).length;
    if (uniqueLogDaysSet.has(checkStr)) {
      currentStreak++;
    } else {
      if (i === 0) continue;
      if (scheduledThatDay === 0) continue;
      break;
    }
  }




  // Productivity Chart Data
  // Use DB calculated scores with client-side fallback
  const tasksProgress = scoreData?.tasks_progress ?? (tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0);
  
  const routinesProgress = scoreData?.routines_progress ?? (activeRoutinesTodayCount > 0 ? Math.round((completedRoutinesToday / activeRoutinesTodayCount) * 100) : 0);

  const avgGoalProgress = scoreData?.goals_progress ?? (goals.length > 0 
    ? Math.round(goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : (g.progress || 0)), 0) / goals.length) 
    : 0);

  const overallProgress = scoreData?.overall_score ?? calculateProductivityScore({
    tasksProgress,
    routinesProgress,
    goalsProgress: avgGoalProgress
  });

  // Dynamic data for 5% intervals
  const progressIntervals = [
    { min: 0, tag: 'Warming Up', quote: 'Every journey starts with a single pulse.' },
    { min: 5, tag: 'Getting Started', quote: 'Small steps lead to massive destinations.' },
    { min: 10, tag: 'First Gear', quote: 'Traction gained. Keep the wheels turning.' },
    { min: 15, tag: 'Movement', quote: 'You are no longer standing still.' },
    { min: 20, tag: 'Building Heat', quote: 'Heat is building. Don\'t cool down now.' },
    { min: 25, tag: 'Momentum', quote: 'Your momentum is becoming a force.' },
    { min: 30, tag: 'In Motion', quote: 'Rhythm found. Keep your breath steady.' },
    { min: 35, tag: 'Rising Up', quote: 'You\'re climbing. The view gets better.' },
    { min: 40, tag: 'Consistent', quote: 'Consistency is your greatest weapon.' },
    { min: 45, tag: 'Disciplined', quote: 'Halfway there. Sacrifice the comfort.' },
    { min: 50, tag: 'Locked In', quote: 'Locked in. Silence the distractions.' },
    { min: 55, tag: 'Focused', quote: 'Focus is a muscle. Flex it harder.' },
    { min: 60, tag: 'Strong Pace', quote: 'Strong pace. Your body follows your mind.' },
    { min: 65, tag: 'Hard Work', quote: 'True progress happens in the grind.' },
    { min: 70, tag: 'Elite Force', quote: 'Elite effort detected. Stay relentless.' },
    { min: 75, tag: 'High Speed', quote: 'Speed is addictive. Don\'t let up.' },
    { min: 80, tag: 'Beast Mode', quote: 'Beast mode engaged. Destroy the list.' },
    { min: 85, tag: 'Unstoppable', quote: 'Unstoppable. The finish line is scared.' },
    { min: 90, tag: 'Legendary', quote: 'Legendary status approaching. Push!' },
    { min: 95, tag: 'Near Perfect', quote: 'Near perfection. Finish with pride.' },
    { min: 100, tag: 'Stayed Hardy', quote: 'You stayed Hardy. You won today.' },
  ];

  const currentProgressData = [...progressIntervals].reverse().find(i => overallProgress >= i.min) || progressIntervals[0];

  const getMotivationalTagline = () => currentProgressData.quote;
  const getStatusTagline = () => currentProgressData.tag;

  const hubStatusPillClass =
    overallProgress < 34 ? 'hub-status-pill--low' : overallProgress < 67 ? 'hub-status-pill--mid' : 'hub-status-pill--high';

  const ringR = 30;
  const ringC = 2 * Math.PI * ringR;
  const routineFrac =
    activeRoutinesTodayCount > 0 ? Math.min(1, completedRoutinesToday / activeRoutinesTodayCount) : 0;
  const ringOffset = ringC - routineFrac * ringC;

  const pendingGoalsSorted = useMemo(
    () =>
      [...goals]
        .filter((g) => g.status === 'pending' && g.targetDate)
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
        .slice(0, 5),
    [goals],
  );

  const streakSubtext =
    currentStreak <= 10 ? 'Building the habit ⚡' : currentStreak <= 30 ? 'Momentum locked in ⚡' : 'Unstoppable rhythm ⚡';

  const firstName = user?.name?.split(' ')[0] || 'Operator';
  const displayFirstName =
    firstName.length > 0
      ? firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      : firstName;

  useEffect(() => {
    ensureFirstOpenDate();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSupportGateReady(false);
      return;
    }
    setSupportGateReady(false);
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const seen = !!data.user?.user_metadata?.has_seen_stay_hardy_intro;
      if (!seen) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (cancelled) return;
      setSupportGateReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !supportGateReady || isIntroOpen) return;
    const tasksToday = tasks.filter(
      (t) => t.status === 'completed' && isCompletedTaskToday(t.updatedAt)
    ).length;
    if (
      !shouldShowAutomaticSupportPopup({
        tasksCompletedToday: tasksToday,
        routineStreak: currentStreak,
        goalCount: goals.length,
      })
    ) {
      return;
    }
    markSupportPopupShown();
    const t = window.setTimeout(() => setShowSupportModal(true), 1200);
    return () => window.clearTimeout(t);
  }, [user?.id, supportGateReady, isIntroOpen, tasks, goals.length, currentStreak]);

  return (
    <div className={`page-shell hub-daily-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .hub-daily-page {
          --hub-radius: 20px;
        }
        @media (max-width: 767px) {
          .hub-daily-page.page-shell {
            padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
          }
        }
        @media (min-width: 768px) {
          .hub-daily-page.page-shell {
            padding-top: 12px;
          }
        }
        .hub-page-header {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0;
          padding: 12px 16px 8px;
          max-width: 720px;
          margin: 0 auto;
          box-sizing: border-box;
          width: 100%;
        }
        .hub-header-bg {
          position: absolute;
          inset: 0;
          left: 0;
          right: 0;
          background: linear-gradient(180deg, rgba(0, 232, 122, 0.04) 0%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }
        .hub-header-row1 {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          min-height: 44px;
        }
        .hub-header-row1-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .hub-header-welcome {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          text-align: left;
          align-self: stretch;
        }
        .hub-welcome-greeting {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.55);
          margin: 0;
          line-height: 1.35;
        }
        .hub-welcome-motivation {
          font-family: 'Syne', system-ui, sans-serif;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #ffffff;
          margin: 2px 0 0;
          line-height: 1.15;
        }
        .hub-icon-btn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, transform 0.15s;
        }
        .hub-icon-btn:active {
          transform: scale(0.96);
        }
        .hub-icon-btn .material-symbols-outlined {
          font-size: 22px;
        }
        .hub-avatar-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 2px solid rgba(0, 232, 122, 0.4);
          overflow: hidden;
          padding: 0;
          cursor: pointer;
          background: linear-gradient(145deg, rgba(16, 185, 129, 0.25), rgba(15, 23, 42, 0.9));
          color: #ecfdf5;
          font-weight: 900;
          font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 0 12px rgba(0, 232, 122, 0.2);
        }
        .hub-avatar-btn img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hub-main-scroll {
          max-width: 720px;
          margin: 8px auto 0;
          padding: 0 0.35rem calc(7rem + env(safe-area-inset-bottom, 0px));
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .hub-card {
          border-radius: var(--hub-radius);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1.05rem 1.05rem;
          min-height: 0;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 380px) {
          .hub-card {
            padding: 1.15rem 1.15rem;
          }
        }
        .hub-section-title {
          margin: 0 0 1rem;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #e2e8f0;
        }
        .hub-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .hub-section-head .hub-section-title {
          margin: 0;
        }
        .hub-see-all {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #4ade80;
          text-decoration: none;
          border: none;
          background: none;
          cursor: pointer;
          padding: 0.25rem 0;
        }

        .hub-hero-focus {
          background: radial-gradient(ellipse 90% 70% at 50% 80%, rgba(16, 185, 129, 0.18), rgba(6, 8, 14, 0.96));
          box-shadow: 0 0 80px rgba(16, 185, 129, 0.08), inset 0 0 60px rgba(0, 0, 0, 0.35);
          padding: 1.35rem 1.2rem 1.25rem;
        }
        .hub-hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.65rem;
        }
        .hub-score-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: rgba(148, 163, 184, 0.85);
          margin: 0 0 0.35rem;
        }
        .hub-score-pct {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(3.2rem, 16vw, 4.5rem);
          font-weight: 400;
          color: #ffffff;
          line-height: 0.95;
          letter-spacing: 0.02em;
          text-shadow: 0 0 40px rgba(255, 255, 255, 0.08);
        }
        .hub-hero-quote {
          margin: 0.55rem 0 0;
          font-size: 0.82rem;
          font-style: italic;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.92);
          line-height: 1.45;
          max-width: 95%;
        }
        .hub-status-pill {
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid transparent;
          text-transform: uppercase;
        }
        .hub-status-pill--low {
          color: #fecaca;
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(248, 113, 113, 0.45);
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.25);
        }
        .hub-status-pill--mid {
          color: #fef08a;
          background: rgba(234, 179, 8, 0.15);
          border-color: rgba(250, 204, 21, 0.4);
          box-shadow: 0 0 14px rgba(250, 204, 21, 0.2);
        }
        .hub-status-pill--high {
          color: #d1fae5;
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(52, 211, 153, 0.45);
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.3);
        }

        .hub-runner-track {
          position: relative;
          height: 22px;
          margin-top: 1.35rem;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
          overflow: visible;
        }
        .hub-runner-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          border-radius: 999px;
          background: linear-gradient(90deg, #ef4444, #facc15, #4ade80);
          transition: width 1.3s cubic-bezier(0.34, 1.1, 0.64, 1);
          box-shadow: 0 0 20px rgba(74, 222, 128, 0.25);
          z-index: 1;
        }
        .hub-runner-char {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.55rem;
          line-height: 1;
          z-index: 3;
          pointer-events: none;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
          transition: left 1.3s cubic-bezier(0.34, 1.1, 0.64, 1);
          animation: hubRunnerBob 0.9s ease-in-out infinite;
        }
        @keyframes hubRunnerBob {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-3px); }
        }
        .hub-runner-char-inner {
          display: inline-block;
          transform: scaleX(-1);
        }
        .hub-legend-row {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }
        .hub-legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(148, 163, 184, 0.95);
        }
        .hub-legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }

        .hub-task-row {
          display: flex;
          gap: 0.75rem;
          padding: 0.85rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          cursor: pointer;
          text-align: left;
          width: 100%;
          background: none;
          border-left: none;
          border-right: none;
          border-top: none;
          color: inherit;
        }
        .hub-task-row:last-child {
          border-bottom: none;
          padding-bottom: 0.25rem;
        }
        .hub-task-title {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
          margin: 0;
          line-height: 1.25;
        }
        .hub-task-micro {
          margin: 0.3rem 0 0;
          font-size: 11px;
          color: rgba(148, 163, 184, 0.9);
          font-weight: 600;
        }

        .hub-routine-card {
          position: relative;
          background: linear-gradient(165deg, rgba(16, 185, 129, 0.08), rgba(8, 10, 18, 0.94));
          cursor: pointer;
        }
        .hub-routine-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.65), transparent);
        }
        .hub-routine-split {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: stretch;
          gap: 0;
          margin-top: 0.25rem;
        }
        .hub-routine-divider {
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(52, 211, 153, 0.25), transparent);
          margin: 0.5rem 0;
        }
        .hub-routine-block {
          padding: 0.5rem 0.65rem;
          text-align: center;
        }
        .hub-routine-frac {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(1.75rem, 7vw, 2.25rem);
          font-weight: 800;
          color: #fff;
          line-height: 1;
        }
        .hub-routine-frac span {
          opacity: 0.45;
          margin: 0 0.08em;
        }
        .hub-routine-sublabel {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: rgba(148, 163, 184, 0.85);
          margin-top: 0.45rem;
        }
        .hub-routine-ring-wrap {
          position: relative;
          width: 56px;
          height: 56px;
          margin: 0.5rem auto 0;
        }
        .hub-routine-ring-icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4ade80;
        }
        .hub-routine-ring-icon .material-symbols-outlined {
          font-size: 22px !important;
          font-variation-settings: 'FILL' 1;
        }
        .hub-streak-num {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(2.5rem, 10vw, 3.25rem);
          font-weight: 400;
          color: #facc15;
          line-height: 1;
          text-shadow: 0 0 24px rgba(250, 204, 21, 0.25);
        }
        .hub-streak-sub {
          margin-top: 0.45rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(226, 232, 240, 0.85);
          line-height: 1.35;
        }

        .hub-goals-card {
          background: rgba(10, 12, 20, 0.92);
        }
        .hub-goal-row {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 1rem 0.85rem;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 0.65rem;
          cursor: pointer;
          text-align: left;
          width: 100%;
          background: rgba(0, 0, 0, 0.25);
          color: inherit;
        }
        .hub-goal-row:last-child {
          margin-bottom: 0;
        }
        .hub-goal-row--soon {
          border-left: 3px solid rgba(249, 115, 22, 0.65);
          box-shadow: inset 0 0 40px rgba(249, 115, 22, 0.04);
        }
        .hub-goal-row--urgent {
          border-left: 3px solid rgba(239, 68, 68, 0.75);
          background: rgba(127, 29, 29, 0.12);
          box-shadow: inset 0 0 50px rgba(239, 68, 68, 0.06);
        }
        .hub-goal-emoji {
          font-size: 1.5rem;
          line-height: 1;
          flex-shrink: 0;
        }
        .hub-goal-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
          line-height: 1.25;
        }
        .hub-goal-chip {
          display: inline-block;
          margin-top: 0.45rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
        }
        .hub-goal-chip--orange {
          color: #fdba74;
          background: rgba(234, 88, 12, 0.15);
          border: 1px solid rgba(251, 146, 60, 0.35);
        }
        .hub-goal-chip--red {
          color: #fecaca;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(248, 113, 113, 0.45);
          animation: hubPulseRed 1.8s ease-in-out infinite;
        }
        @keyframes hubPulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
          50% { box-shadow: 0 0 14px 2px rgba(239, 68, 68, 0.25); }
        }

        .hub-reminders-block {
          padding-top: 0.25rem;
        }
        .hub-reminders-label {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: rgba(52, 211, 153, 0.85);
          margin-bottom: 0.5rem;
        }
        .reminder-row-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          color: #e2e8f0;
          background: rgba(255, 255, 255, 0.03);
          padding: 0.55rem 0.75rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          text-decoration: none;
          margin-bottom: 0.4rem;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        @media (hover: hover) {
          .reminder-row-link:hover {
            background: rgba(16, 185, 129, 0.08);
            border-color: rgba(16, 185, 129, 0.2);
            transform: translateX(4px);
          }
        }
      `}</style>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>
      
      <header className="hub-page-header">
        <div className="hub-header-bg" aria-hidden />
        <div className="hub-header-row1">
          <div className="hub-header-row1-left">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hub-icon-btn desktop-only-btn notification-btn"
              title={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar (Focus Mode)'}
              data-tooltip={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
              style={
                isSidebarHidden
                  ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderColor: 'rgba(52, 211, 153, 0.35)' }
                  : undefined
              }
            >
              <span className="material-symbols-outlined">{isSidebarHidden ? 'side_navigation' : 'fullscreen'}</span>
            </button>
          </div>
          <button type="button" className="hub-avatar-btn" title="Profile" onClick={() => navigate('/settings')}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              <span>{firstName.charAt(0).toUpperCase()}</span>
            )}
          </button>
        </div>
        <div className="hub-header-welcome">
          <p className="hub-welcome-greeting">
            {getWelcomeGreeting()}, {displayFirstName} 👋
          </p>
          <p className="hub-welcome-motivation">{getTimeGreeting()}</p>
        </div>
      </header>

      <main className="hub-main-scroll">
        {(() => {
          const pct = Math.max(0, Math.min(100, overallProgress));
          const runnerX = Math.max(3, Math.min(97, pct));
          return (
            <section className="hub-card hub-hero-focus" aria-label="Today's focus">
              <div className="hub-hero-top">
                <div>
                  <p className="hub-score-label">SCORE</p>
                  <div className="hub-score-pct">{pct}%</div>
                  <p className="hub-hero-quote">{getMotivationalTagline()}</p>
                </div>
                <span className={`hub-status-pill ${hubStatusPillClass}`}>{getStatusTagline()}</span>
              </div>
              <div className="hub-runner-track" aria-hidden>
                <div className="hub-runner-fill" style={{ width: `${pct}%` }} />
                <span className="hub-runner-char" style={{ left: `${runnerX}%` }} aria-hidden>
                  <span className="hub-runner-char-inner">🏃</span>
                </span>
              </div>
              <div className="hub-legend-row">
                <span className="hub-legend-item">
                  <span className="hub-legend-dot" style={{ color: '#3b82f6', background: '#3b82f6' }} />
                  TASKS
                </span>
                <span className="hub-legend-item">
                  <span className="hub-legend-dot" style={{ color: '#4ade80', background: '#4ade80' }} />
                  ROUTINES
                </span>
                <span className="hub-legend-item">
                  <span className="hub-legend-dot" style={{ color: '#ef4444', background: '#ef4444' }} />
                  GOALS
                </span>
              </div>
            </section>
          );
        })()}

        <section className="hub-card">
          <div className="hub-section-head">
            <h2 className="hub-section-title">TOP 2 PENDING TASKS</h2>
            <button type="button" className="hub-see-all" onClick={() => navigate('/dashboard')}>
              SEE ALL
            </button>
          </div>
          {topPendingTasks.length > 0 ? (
            topPendingTasks.map((t, index) => {
              const taglines = ['Still waiting 👀', "Pending — don't ignore 😏", 'Clock is ticking ⏱️'];
              const dynamicTagline = taglines[(t.id.length + index) % taglines.length];
              return (
                <button
                  key={t.id}
                  type="button"
                  className="hub-task-row"
                  onClick={() => navigate('/dashboard')}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p className="hub-task-title">{t.title}</p>
                    <p className="hub-task-micro">{dynamicTagline}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.95)', fontWeight: 600, textAlign: 'center', padding: '0.5rem 0 0.25rem' }}>
              Clear deck — nothing pending. 🎯
            </p>
          )}

          {upcomingReminders.length > 0 && (
            <div className="hub-reminders-block" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="hub-reminders-label">UPCOMING REMINDERS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem' }}>
                {upcomingReminders.map((r, i) => (
                  <Link key={i} to="/calendar" className="reminder-row-link">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, maxWidth: '72%' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#4ade80', flexShrink: 0 }}>
                        notifications
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {r.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 800, flexShrink: 0 }}>
                      {r.date.split('-').slice(1).join('/')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <section
          className="hub-card hub-routine-card"
          role="button"
          tabIndex={0}
          onClick={() => navigate(canAccessStatsAndRoutine(user) ? '/routine' : '/lifetime-access')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(canAccessStatsAndRoutine(user) ? '/routine' : '/lifetime-access');
            }
          }}
        >
          <div className="hub-routine-shimmer" aria-hidden />
          <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>
            TODAY ROUTINE
          </h2>
          <div className="hub-routine-split">
            <div className="hub-routine-block">
              <div className="hub-routine-frac">
                {completedRoutinesToday || 0}
                <span>/</span>
                {activeRoutinesTodayCount || 0}
              </div>
              <div className="hub-routine-sublabel">COMPLETED</div>
              <div className="hub-routine-ring-wrap">
                <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden>
                  <circle
                    cx="32"
                    cy="32"
                    r={ringR}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={ringR}
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 32 32)"
                  />
                </svg>
                <span className="hub-routine-ring-icon material-symbols-outlined" aria-hidden>
                  check
                </span>
              </div>
            </div>
            <div className="hub-routine-divider" aria-hidden />
            <div className="hub-routine-block">
              <div className="hub-streak-num">{currentStreak}</div>
              <div className="hub-routine-sublabel">DAY STREAK</div>
              <p className="hub-streak-sub">{streakSubtext}</p>
            </div>
          </div>
        </section>

        <section className="hub-card hub-goals-card">
          <h2 className="hub-section-title" style={{ marginBottom: '1rem' }}>
            GOALS DUE SOON
          </h2>
          {pendingGoalsSorted.length > 0 ? (
            pendingGoalsSorted.map((goal) => {
              const calToday = new Date();
              calToday.setHours(0, 0, 0, 0);
              const calTarget = new Date(goal.targetDate);
              calTarget.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((calTarget.getTime() - calToday.getTime()) / (1000 * 60 * 60 * 24));
              const overdue = diffDays <= 0;
              let chipText = 'NO DUE DATE';
              if (goal.targetDate) {
                if (diffDays === 0) chipText = 'OVERDUE TODAY';
                else if (diffDays < 0) chipText = `${Math.abs(diffDays)} DAYS OVERDUE`;
                else chipText = `${diffDays} DAYS LEFT`;
              }
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`hub-goal-row ${overdue ? 'hub-goal-row--urgent' : 'hub-goal-row--soon'}`}
                  onClick={() => navigate('/goals')}
                >
                  <span className="hub-goal-emoji" aria-hidden>
                    🎯
                  </span>
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <p className="hub-goal-title">{goal.name}</p>
                    <span className={`hub-goal-chip ${overdue ? 'hub-goal-chip--red' : 'hub-goal-chip--orange'}`}>
                      {chipText}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(148, 163, 184, 0.95)', fontWeight: 600, textAlign: 'center', padding: '0.35rem 0 0.15rem' }}>
              No goals on the radar. Set a target. 🎯
            </p>
          )}
        </section>



      </main>
      <BottomNav isHidden={isSidebarHidden} />
      <WhyStayHardyModal
        isOpen={isIntroOpen}
        onClose={handleCloseIntro}
        isFirstTime={isFirstTime}
        onOpenSupport={() => {
          handleCloseIntro();
          setShowSupportModal(true);
        }}
      />
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  );
};

export default HomeDashboard;

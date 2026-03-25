import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
// import { canAccessStatsAndRoutine } from '../lib/lifetimeAccess';
import { supabase } from '../supabase';
import { calculateProductivityScore } from '../utils/productivity';
import { syncWidgetData } from '../lib/syncWidgetData';
import { ProductivityService, type ProductivityScoreData } from '../lib/ProductivityService';
import { isCacheExpired } from '../lib/cacheManager';
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

// CircularProgress removed

const HomeDashboard: React.FC = () => {
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const { language } = useLanguage();
  const _getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'Tamil' ? 'போருக்குத் தயார்' : 'Awaken — Grind Starts';
    if (hour < 18) return language === 'Tamil' ? 'தொடர்ந்து முன்னேறு' : 'Stay Relentless';
    return language === 'Tamil' ? 'வெற்றியுடன் முடி' : 'Earn Your Rest';
  }; void _getTimeGreeting;
  /** Time-of-day label for welcome line only (not the motivational title). */
  const _getWelcomeGreeting = () => {
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
  }; void _getWelcomeGreeting;
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [imgError, setImgError] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pendingHabitsCount, setPendingHabitsCount] = useState(0);
  const [totalHabitsTodayFresh, setTotalHabitsTodayFresh] = useState(0); void totalHabitsTodayFresh;
  const [completedHabitsTodayFresh, setCompletedHabitsTodayFresh] = useState(0); void completedHabitsTodayFresh;

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportGateReady, setSupportGateReady] = useState(false);
  const [scoreData, setScoreData] = useState<ProductivityScoreData | null>(null);

  const fetchPendingHabits = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const todayName = dayNames[new Date().getDay()];

    const { data: todayHabits } = await supabase
      .from('routines')
      .select('id')
      .eq('user_id', user.id)
      .contains('days', [todayName]);

    const totalToday = todayHabits?.length || 0;

    const { data: completedLogs } = await supabase
      .from('routine_logs')
      .select('routine_id')
      .eq('user_id', user.id)
      .eq('completed_at', today);

    const completedToday = completedLogs?.length || 0;
    const pending = totalToday - completedToday;

    setPendingHabitsCount(Math.max(0, pending));
    setTotalHabitsTodayFresh(totalToday);
    setCompletedHabitsTodayFresh(completedToday);
  }, [user?.id]);

  const fetchHabitActivityFresh = useCallback(async () => {
    if (!user?.id) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('routine_logs')
      .select('completed_at')
      .eq('user_id', user.id)
      .gte('completed_at', startDate);

    setRoutineLogs((logs as RoutineLog[]) || []);
  }, [user?.id]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    void refreshUserProfile();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    if (stLogs) {
      setRoutineLogs(stLogs.filter((l) => l.completed_at >= startDayStr));
    }

    const cachedScore = await ProductivityService.getStoredScore(user.id);
    if (cachedScore) {
      setScoreData(cachedScore);
    }

    const tasksExp = await isCacheExpired(CACHE_KEYS.tasks_list, CACHE_EXPIRY_MINUTES.tasks_list);
    const routinesExp = await isCacheExpired(CACHE_KEYS.routines_list, CACHE_EXPIRY_MINUTES.routines_list);
    const logsExp = await isCacheExpired(CACHE_KEYS.routine_logs_list, CACHE_EXPIRY_MINUTES.routines_list);

    const [tasksRes, routinesRes, logsRes, goalsRes] = await Promise.all([
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
      supabase
        .from('goals')
        .select('id, name, status, targetDate, createdAt')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false })
    ]);

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

    if (goalsRes.error) console.error('Error fetching goals:', goalsRes.error);
    if (goalsRes.data) {
      const goalsData = goalsRes.data;
      setGoals(goalsData as Goal[]);
      void persistGoalsList(user.id, goalsData as Goal[]);
    }

    const calculatedScore = await ProductivityService.recalculate(user.id);
    setScoreData(calculatedScore);

    void syncWidgetData();
  }, [user?.id]);

  useEffect(() => {
    const handleScoreUpdated = (e: any) => {
      setScoreData(e.detail);
    };
    window.addEventListener('productivity_sync', handleScoreUpdated);
    return () => window.removeEventListener('productivity_sync', handleScoreUpdated);
  }, []);

  useEffect(() => {
    fetchData();

    if (!user?.id) return;

    const goalsChannel = supabase
      .channel('home_goals_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals', 
        filter: `userId=eq.${user.id}` 
      }, () => void fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
    };
  }, [fetchData, user?.id]);

  useEffect(() => {
    const handler = () => {
      console.log('Home refreshing from global event...');
      void fetchPendingHabits();
      void fetchHabitActivityFresh();
      void fetchData();
    };
    window.addEventListener('stayhardy_refresh', handler);
    return () => window.removeEventListener('stayhardy_refresh', handler);
  }, [user?.id, fetchData, fetchPendingHabits, fetchHabitActivityFresh]);

  useEffect(() => {
    void fetchPendingHabits();
    void fetchHabitActivityFresh();
  }, [user?.id, fetchPendingHabits, fetchHabitActivityFresh]);

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
  const _dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); void _dateStr;

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const _topPendingTasks = [...pendingTasks].sort((a, b) => {
    const pA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
    const pB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
    return pB - pA;
  }).slice(0, 2); void _topPendingTasks;

  const _upcomingReminders = useMemo(() => {
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
  }, [user?.id]); void _upcomingReminders;

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

  const _currentProgressData = [...progressIntervals].reverse().find(i => overallProgress >= i.min) || progressIntervals[0];

  const _getMotivationalTagline = () => _currentProgressData.quote; void _getMotivationalTagline;
  const _getStatusTagline = () => _currentProgressData.tag; void _getStatusTagline;

  const _hubStatusPillClass =
    overallProgress < 34 ? 'hub-status-pill--low' : overallProgress < 67 ? 'hub-status-pill--mid' : 'hub-status-pill--high'; void _hubStatusPillClass;

  const ringR = 30;
  const ringC = 2 * Math.PI * ringR;
  const routineFrac =
    activeRoutinesTodayCount > 0 ? Math.min(1, completedRoutinesToday / activeRoutinesTodayCount) : 0;
  const _ringOffset = ringC - routineFrac * ringC; void _ringOffset;

  /* const pendingGoalsSorted = useMemo(
    () =>
      [...goals]
        .filter((g) => g.status === 'pending' && g.targetDate)
        .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
        .slice(0, 5),
    [goals],
  ); */

  const _streakSubtext =
    currentStreak <= 10 ? 'Building the habit ⚡' : currentStreak <= 30 ? 'Momentum locked in ⚡' : 'Unstoppable rhythm ⚡'; void _streakSubtext;

  const displayFirstName = useMemo(() => {
    const raw = (user?.name?.split(' ')[0] || 'Operator');
    const capped = raw.length > 12 ? raw.slice(0, 12) : raw;
    if (capped.length === 0) return capped;
    return capped.charAt(0).toUpperCase() + capped.slice(1).toLowerCase();
  }, [user?.name]);

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
    if (!user?.id || !supportGateReady) return;
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
  }, [user?.id, supportGateReady, tasks, goals.length, currentStreak]);

  // const [activeActivityTab, setActiveActivityTab] = useState<'Tasks' | 'Habits'>('Tasks');
  const [activeSection, setActiveSection] = useState(0);

  const calcBestStreak = useCallback((logs: RoutineLog[]) => {
    if (!logs?.length) return 0;
    const dates = [...new Set(logs.map(l => l.completed_at))].sort();
    let best = 1, current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i-1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) { current++; best = Math.max(best, current); } else { current = 1; }
    }
    return best;
  }, []);

  const bestStreakDays = useMemo(() => calcBestStreak(routineLogs), [routineLogs, calcBestStreak]);



  const getLast7DaysHabits = useCallback(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result: { day: string; date: string; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = days[(d.getDay() + 6) % 7];
      const count = routineLogs?.filter(log => log.completed_at === dateStr).length || 0;

      result.push({ day: dayName, date: dateStr, count });
    }
    return result;
  }, [routineLogs]);


  const completedTasksTotal = useMemo(() => tasks.filter(t => t.status === 'completed' && isCompletedTaskToday(t.updatedAt)).length, [tasks]);
  // const completedHabitsTotal = useMemo(() => routineLogs.filter(l => l.completed_at === localTodayStr).length, [routineLogs, localTodayStr]);

  const activeGoalsCount = useMemo(() => goals.filter(g => g.status === 'pending').length, [goals]);
  const completedGoalsCount = useMemo(() => goals.filter(g => g.status === 'completed').length, [goals]);

  const pendingCount = pendingTasks.length || 0;

  const sections = [
    {
      label: 'Tasks',
      leftStat: { icon: '📋', label: 'To Do', value: `${pendingCount} Tasks` },
      rightStat: { icon: '✓', label: 'Done', value: `${completedTasksTotal} Tasks` }
    },
    {
      label: 'Goals',
      leftStat: { icon: '🎯', label: 'Active', value: `${activeGoalsCount} Goals` },
      rightStat: { icon: '🏆', label: 'Done', value: `${completedGoalsCount} Goals` }
    },
    {
      label: 'Habits',
      leftStat: { icon: '🔄', label: 'Today', value: `${completedRoutinesToday}/${activeRoutinesTodayCount}` },
      rightStat: { icon: '🔥', label: 'Streak', value: `${currentStreak} Days` }
    }
  ];

  const currentSection = sections[activeSection];

  const AnimatedAvatar = () => (
    <div style={{
      width: '36px',
      height: '36px',
      minWidth: '36px',
      minHeight: '36px',
      borderRadius: '50%',
      background: '#1a1a2e',
      border: '2px solid #000',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      animation: 'bobHead 2s ease-in-out infinite'
    }}>
      <svg viewBox="0 0 36 36" width="36" height="36">
        <circle cx="18" cy="13" r="7" fill="#FBBF24"/>
        <ellipse cx="18" cy="8" rx="7" ry="4" fill="#92400E"/>
        <circle cx="15" cy="13" r="1.2" fill="#1F2937"/>
        <circle cx="21" cy="13" r="1.2" fill="#1F2937"/>
        <path d="M15 16.5 Q18 18.5 21 16.5" stroke="#1F2937" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <ellipse cx="18" cy="28" rx="8" ry="6" fill="#3B82F6"/>
      </svg>
      <style>{`
        @keyframes bobHead {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );

  const HeroFire = () => (
    <>
      <style>{`
        @keyframes heroFlicker {
          0%, 100% { transform: scaleY(1) scaleX(1); filter: drop-shadow(0 0 4px rgba(0,232,122,0.8)); }
          25% { transform: scaleY(1.1) scaleX(0.95); filter: drop-shadow(0 0 6px rgba(0,232,122,1)); }
          75% { transform: scaleY(0.95) scaleX(1.05); filter: drop-shadow(0 0 3px rgba(0,200,100,0.6)); }
        }
      `}</style>
      <span style={{
        fontSize: '16px',
        display: 'inline-block',
        animation: 'heroFlicker 1.5s ease-in-out infinite',
        WebkitFilter: 'hue-rotate(100deg) drop-shadow(0 0 4px rgba(0,232,122,0.8))',
        filter: 'hue-rotate(100deg) drop-shadow(0 0 6px rgba(0,232,122,0.9))'
      }}>
        🔥
      </span>
    </>
  );

  const pendingHabitsToday = pendingHabitsCount;
  const isPro = user?.isPro === true || user?.role === 'admin';

  return (
    <div className={`page-shell hub-daily-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ background: '#080C0A', paddingTop: '110px', paddingBottom: '100px', overflowY: 'auto' }}>
      <style>{`
        .light-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(0,232,122,0.15) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
        .green-card {
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), #CCFF00 !important;
        }
      `}</style>



      {/* SECTION 1 — HERO GREETING CARD */}
      <section className="light-card" style={{
        margin: '0 16px 12px 16px',
        borderRadius: '28px',
        padding: '20px 20px 32px 20px',
        background: 'linear-gradient(135deg, #e8f5e9 0%, #f0fdf4 30%, #e0f2fe 60%, #f0e6ff 100%)',
        position: 'relative',
        minHeight: 'fit-content'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#000000' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#000000', opacity: 0.6 }}>Overview</span>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          marginBottom: '8px',
          flexWrap: 'nowrap',
          overflow: 'hidden'
        }}>
          <span style={{ 
            fontSize: 'max(24px, min(32px, 8vw))', 
            fontWeight: 800, 
            color: '#000000', 
            letterSpacing: '-1px',
            whiteSpace: 'nowrap'
          }}>Hello</span>
          <span style={{ 
            fontSize: 'max(24px, min(32px, 8vw))', 
            fontWeight: 800, 
            color: '#000000', 
            letterSpacing: '-1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>{displayFirstName}!</span>
          <button type="button" onClick={() => navigate('/settings')} style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
            {user?.avatarUrl && !imgError ? (
              <img 
                src={user.avatarUrl} 
                alt="" 
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #000',
                  flexShrink: 0,
                  display: 'block'
                }}
                onError={(e: any) => {
                  e.target.style.display = 'none';
                  setImgError(true);
                }}
              />
            ) : (
              <AnimatedAvatar />
            )}
          </button>
        </div>

        <div style={{ fontSize: '24px', fontWeight: 700, color: '#000000', lineHeight: 1.3, marginBottom: '20px', letterSpacing: '-0.5px' }}>
          {pendingHabitsToday > 0 ? (
            <>You have <span onClick={() => navigate('/routine')} style={{ fontWeight: '900', color: '#000000', textDecoration: 'underline', textDecorationStyle: 'dotted', cursor: 'pointer' }}>{pendingHabitsToday} habits</span> due today</>
          ) : (
            <>You're all <span style={{ fontWeight: '900' }}>caught up</span> today 🎉</>
          )}
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#EF4444', fontSize: '14px' }}>🎯</span>
            <span style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>Goals:</span>
            <span style={{ fontSize: '13px', color: '#000000', fontWeight: 700 }}>{goals.filter(g => g.status === 'completed').length}/{goals.length}</span>
          </div>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HeroFire />
            <span style={{ fontSize: '13px', color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>Streak</span>
            <span style={{ fontSize: '13px', color: '#000000', fontWeight: 700 }}>{currentStreak} Days</span>
          </div>
        </div>
      </section>

      {/* SECTION 2 — DAILY PROGRESS CARD */}
      <section className="green-card" style={{
        margin: '0 16px 12px 16px',
        borderRadius: '24px',
        padding: '24px',
        position: 'relative',
        minHeight: 'fit-content'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '42px', fontWeight: 900, color: '#000000', letterSpacing: '-2px', lineHeight: 1 }}>{Math.max(0, Math.min(100, overallProgress))}%</span>
            {overallProgress > 0 && <span style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '10px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, color: '#000', marginLeft: '8px' }}>+5%</span>}
          </div>
          <button onClick={() => navigate('/stats')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            <BarChart2 size={18} color="#CCFF00" strokeWidth={2.5} />
          </button>
        </div>

        <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(0,0,0,0.55)', marginBottom: '16px' }}>Productivity Score</div>

        {/* CYCLING GROUPS ROW */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#000' }}>{currentSection.label}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setActiveSection((activeSection - 1 + 3) % 3)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', border: '1.5px solid rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#000000', fontSize: '16px', fontWeight: '900' }}>‹</button>
            <button onClick={() => setActiveSection((activeSection + 1) % 3)} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', border: '1.5px solid rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#000000', fontSize: '16px', fontWeight: '900' }}>›</button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: i === activeSection ? '#000' : 'rgba(0,0,0,0.25)' }} />
            ))}
          </div>
        </div>

        {activeSection === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '8px' }}>
            {/* TO DO */}
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>To Do</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#000000', lineHeight: 1 }}>{pendingTasks.length}</span>
              <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', fontWeight: '500' }}>tasks pending</span>
            </div>
            {/* DONE */}
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Done</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: '900', color: '#000000', lineHeight: 1 }}>{completedTasksTotal}</span>
              <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', fontWeight: '500' }}>completed today</span>
            </div>
          </div>
        )}

        {activeSection === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '8px' }}>
            {/* ACTIVE */}
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Active</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#000', lineHeight: 1 }}>{activeGoalsCount}</div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', marginTop: '4px' }}>in progress</div>
            </div>
            {/* DONE */}
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>Done</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#000', lineHeight: 1 }}>{completedGoalsCount}</div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', marginTop: '4px' }}>achieved 🏆</div>
            </div>
          </div>
        )}

        {activeSection === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', marginTop: '8px' }}>
            {/* TODAY — Circular Progress */}
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Today</div>
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="4"/>
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#000000" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 22}`} strokeDashoffset={`${2 * Math.PI * 22 * (1 - (totalHabitsTodayFresh > 0 ? completedHabitsTodayFresh / totalHabitsTodayFresh : 0))}`} transform="rotate(-90 28 28)" style={{ transition: 'stroke-dashoffset 0.5s ease' }}/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#000', lineHeight: 1 }}>{completedHabitsTodayFresh}</span>
                  <span style={{ fontSize: '8px', color: 'rgba(0,0,0,0.4)', fontWeight: '600' }}>/{totalHabitsTodayFresh}</span>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', textAlign: 'center' }}>habits done</div>
            </div>
            {/* BEST STREAK */}
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Best Streak</div>
              <div style={{ fontSize: '32px', lineHeight: 1, filter: 'hue-rotate(100deg) drop-shadow(0 0 4px rgba(0,200,100,0.6))' }}>🔥</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#000', lineHeight: 1 }}>{bestStreakDays}</div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)' }}>days record</div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3 — SMOOTH LINE CHART activity-card */}
      {(() => {
        const habitsData = getLast7DaysHabits();
        const width = 300;
        const height = 80;
        const padding = 10;
        const maxVal = Math.max(1, ...habitsData.map(d => d.count));

        const points = habitsData.map((d, i) => ({
          x: padding + (i / (habitsData.length - 1)) * (width - padding * 2),
          y: height - padding - (d.count / maxVal) * (height - padding * 2),
          day: d.day,
          count: d.count,
          isToday: i === habitsData.length - 1
        }));

        const pathD = points.reduce((acc, point, i) => {
          if (i === 0) return `M ${point.x} ${point.y}`;
          const prev = points[i - 1];
          const cpX = (prev.x + point.x) / 2;
          return acc + ` C ${cpX} ${prev.y} ${cpX} ${point.y} ${point.x} ${point.y}`;
        }, '');

        const areaPath = pathD + ` L ${points[points.length - 1]?.x} ${height} L ${points[0]?.x} ${height} Z`;

        return (
          <div style={{ position: 'relative' }}>
            {/* Card Content */}
            <div style={{
              filter: !isPro ? 'blur(6px)' : 'none',
              pointerEvents: !isPro ? 'none' : 'auto',
              userSelect: !isPro ? 'none' : 'auto',
              transition: 'filter 0.3s ease'
            }}>
              <section style={{
                margin: '0 16px 10px 16px',
                borderRadius: '24px',
                padding: '20px',
                background: 'linear-gradient(135deg, #1a3ae0 0%, #2563eb 100%)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.6)' }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Habit Activity</span>
                </div>

                <div style={{ position: 'relative', marginTop: '8px' }}>
                  <p style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                    {habitsData.reduce((s, d) => s + d.count, 0)} Done
                  </p>

                  <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '70px' }} preserveAspectRatio="none">
                    {points.map((p, i) => (
                      <line key={i} x1={p.x} y1={0} x2={p.x} y2={height} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                    ))}
                    <path d={areaPath} fill="rgba(255,255,255,0.08)" />
                    <path d={pathD} fill="none" stroke="#86EFAC" strokeWidth="2.5" strokeLinecap="round" />
                    {points[points.length - 1] && (
                      <rect x={points[points.length - 1].x - 14} y={0} width={28} height={height} rx={8} fill="rgba(134,239,172,0.2)" />
                    )}
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={p.isToday ? 5 : 3} fill={p.isToday ? '#FFFFFF' : 'rgba(255,255,255,0.4)'} />
                    ))}
                    {points[points.length - 1] && (
                      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill="#1a3ae0" />
                    )}
                  </svg>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    {habitsData.map((d, i) => (
                      <span key={i} style={{ fontSize: '10px', color: i === habitsData.length - 1 ? '#FFFFFF' : 'rgba(255,255,255,0.4)', fontWeight: i === habitsData.length - 1 ? '700' : '500', flex: 1, textAlign: 'center' }}>
                        {d.day}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    {/* Weekly date range removed for cleaner look */}
                  </div>
                </div>
              </section>
            </div>

            {/* Premium Overlay for non-pro */}
            {!isPro && (
              <div style={{
                position: 'absolute',
                inset: '0 16px 10px 16px',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'rgba(8,12,10,0.5)',
                backdropFilter: 'blur(2px)'
              }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(0,232,122,0.12)', border: '1px solid rgba(0,232,122,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', margin: 0, textAlign: 'center' }}>Premium Feature</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center', padding: '0 20px' }}>Upgrade to see habit activity</p>
                <div onClick={() => navigate('/lifetime-access')} style={{ background: '#00E87A', color: '#000', fontSize: '11px', fontWeight: '800', padding: '7px 18px', borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  UPGRADE →
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <BottomNav isHidden={isSidebarHidden} />
      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  );
};

export default HomeDashboard;

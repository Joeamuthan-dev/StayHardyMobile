// src/pages/HomeDashboard.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BarChart2 } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useLoading } from '../context/LoadingContext';
import { storage } from '../utils/storage';
// import { canAccessStats and Routine } from '../lib/lifetimeAccess';
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
  const { isPro } = useSubscription();
  const { setLoading } = useLoading();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [pendingHabitsCount, setPendingHabitsCount] = useState(0);
  const [totalHabitsTodayFresh, setTotalHabitsTodayFresh] = useState(0); void totalHabitsTodayFresh;
  const [completedHabitsTodayFresh, setCompletedHabitsTodayFresh] = useState(0); void completedHabitsTodayFresh;

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportGateReady, setSupportGateReady] = useState(false);
  const [scoreData, setScoreData] = useState<ProductivityScoreData | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [animatedScore, setAnimatedScore] = useState(0);
  const animationRef = useRef<number | null>(null);

  const authChecked = useRef(false);
  const lastScoreUpdateTime = useRef(0);

  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    const verifyAuth = async () => {
      // Check Supabase session first
      const { data: { session } } =
        await supabase.auth.getSession();

      if (!session) {
        console.log('[Home] No session — redirecting to login');

        // Also check local storage
        const savedLogin =
          await storage.get('user_session');

        if (!savedLogin || savedLogin === '') {
          navigate('/login', { replace: true });
          return;
        }
      }
    };

    verifyAuth();
  }, [navigate]);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('[Home] Auth event:', event);

          if (event === 'SIGNED_OUT' || !session) {
            navigate('/login', { replace: true });
          }
        }
      );

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchName = async () => {
      // 1. FAST PATH: Check synchronous cache or context first
      const fastProfile = (() => {
        try {
          const raw = localStorage.getItem('cached_profile_fast_' + user?.id);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      if (fastProfile?.user_name) {
        setDisplayName(fastProfile.user_name.split(' ')[0]);
      } else if (user?.name) {
        setDisplayName(user.name.split(' ')[0]);
      }

      try {
        const cachedRaw = await storage.get('cached_user_profile_' + user?.id);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.user_name) {
            setDisplayName(cached.user_name.split(' ')[0]);
            return;
          }
        }
      } catch (_) { }

      // 2. BACKGROUND SYNC: Try fetching from public.users if fallback is needed
      if (user?.email) {
        const { data } = await supabase
          .from('users')
          .select('name')
          .eq('email', user.email)
          .maybeSingle();

        if (data?.name) {
          setDisplayName(data.name.split(' ')[0]);
        } else if (!displayName) { // only set fallback if we didn't get it from cache/context
          setDisplayName(
            user.email.split('@')[0]
          );
        }
      }
    };
    fetchName();
  }, [user]);

  const fetchPendingHabits = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    setLoading(true);
    try {

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

      const cachedScore = localStorage.getItem('ps_score_' + user.id);
      if (cachedScore) {
        setScoreData({ overall_score: Number(cachedScore) } as ProductivityScoreData);
      } else {
        const asyncScore = await ProductivityService.getStoredScore(user.id);
        if (asyncScore) setScoreData(asyncScore);
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

      void syncWidgetData();
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setLoading, refreshUserProfile]);

  useEffect(() => {
    const handleScoreUpdated = (e: any) => {
      const data = e.detail;
      const tsKey = 'productivity_score_ts_' + user?.id;
      const incomingTs = parseInt(localStorage.getItem(tsKey) || '0');

      if (incomingTs >= lastScoreUpdateTime.current) {
        lastScoreUpdateTime.current = incomingTs;
        setScoreData(data);
      }
    };

    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('productivity_sync', handleScoreUpdated);
    window.addEventListener('stayhardy_refresh', handleRefresh);

    return () => {
      window.removeEventListener('productivity_sync', handleScoreUpdated);
      window.removeEventListener('stayhardy_refresh', handleRefresh);
    };
  }, [user?.id, fetchData]);

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
    goalsProgress: avgGoalProgress,
    isPro
  });

  const todayKey = `ps_delta_${localTodayStr}_${user?.id}`;
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = new Date(yesterdayDate.getTime() - (yesterdayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const yesterdayKey = `ps_delta_${yesterdayStr}_${user?.id}`;

  // Save today's score
  if (overallProgress > 0) {
    localStorage.setItem(todayKey, String(overallProgress));
  }

  // Read yesterday's score
  const yesterdayScore = parseInt(localStorage.getItem(yesterdayKey) || '', 10);
  const scoreDelta = !isNaN(yesterdayScore) ? overallProgress - yesterdayScore : null;

  useEffect(() => {
    if (overallProgress === 0) {
      setAnimatedScore(0);
      return;
    }
    const startTime = performance.now();
    const startValue = animatedScore;
    const endValue = Math.max(0, Math.min(100, overallProgress));
    const duration = 1200;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const currentValue = Math.round(
        startValue + (endValue - startValue) * easedProgress
      );
      setAnimatedScore(currentValue);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [overallProgress]);

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

  const _streakSubtext =
    currentStreak <= 10 ? 'Building the habit ⚡' : currentStreak <= 30 ? 'Momentum locked in ⚡' : 'Unstoppable rhythm ⚡'; void _streakSubtext;


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

  const [activeSection, setActiveSection] = useState(0);

  const calcBestStreak = useCallback((logs: RoutineLog[]) => {
    if (!logs?.length) return 0;
    const dates = [...new Set(logs.map(l => l.completed_at))].sort();
    let best = 1, current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
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

  const activeGoalsCount = useMemo(() => goals.filter(g => g.status === 'pending').length, [goals]);
  const completedGoalsCount = useMemo(() => goals.filter(g => g.status === 'completed').length, [goals]);

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
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  const isProUser = !!isPro || isAdmin;

  return (
    <div className={`page-shell hub-daily-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ background: '#080C0A', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 72px)', paddingBottom: '140px', overflowY: 'auto' }}>
      <style>{`
        .light-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(0,232,122,0.15) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.1) 0%, transparent 50%);
          pointer-events: none;
        }
      `}</style>

      {/* SECTION 1 — HERO GREETING CARD */}
      <section className="light-card" style={{
        margin: '0 16px 12px 16px',
        borderRadius: '28px',
        padding: '20px 20px 32px 20px',
        background: 'linear-gradient(135deg, #0C1812 0%, #111F18 60%, #0A1510 100%)',
        border: '1px solid rgba(0,232,122,0.12)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        position: 'relative',
        minHeight: 'fit-content'
      }}>
        {/* Greeting row — Hello + Avatar + Name inline */}
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: '16px' }}>

          {/* Hello text */}
          <span style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#FFFFFF',
            lineHeight: 1.1,
          }}>
            Hello
          </span>

          {/* Avatar — between Hello and name */}
          <button
            onClick={() => navigate('/settings')}
            className="flex-shrink-0
                       active:scale-90
                       transition-transform duration-150"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              background: 'none',
            }}
          >
            <UserAvatar src={user?.avatarUrl} size={36} />
          </button>

          {/* Name — truncated to 12 chars max */}
          <span style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#00E87A',
            lineHeight: 1.1,
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {displayName.length > 12
              ? displayName.substring(0, 12) + '...'
              : displayName || 'Soldier'
            }
          </span>
        </div>

        <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3, marginBottom: '20px', letterSpacing: '-0.5px' }}>
          {/* Role-based greeting subtitle */}
          {isProUser ? (
            // PRO + ADMIN: show habits pending
            <span>
              {pendingHabitsToday > 0 ? (
                <>
                  You have{' '}
                  <span
                    onClick={() => navigate('/routine')}
                    style={{
                      fontWeight: '900',
                      color: '#00E87A',
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                      cursor: 'pointer',
                    }}
                  >
                    {pendingHabitsToday}{' '}
                    {pendingHabitsToday === 1
                      ? 'habit'
                      : 'habits'
                    }
                  </span>
                  {' '}due today
                </>
              ) : (
                "You're all caught up today 🎉"
              )}
            </span>
          ) : (
            // BASIC USER: show tasks pending instead
            <span>
              {pendingTasks.length > 0 ? (
                <>
                  You have{' '}
                  <span
                    onClick={() => navigate('/dashboard')}
                    style={{
                      fontWeight: '900',
                      color: '#00E87A',
                      textDecoration: 'underline',
                      textDecorationStyle: 'dotted',
                      cursor: 'pointer',
                    }}
                  >
                    {pendingTasks.length}{' '}
                    {pendingTasks.length === 1
                      ? 'task'
                      : 'tasks'
                    }
                  </span>
                  {' '}pending today
                </>
              ) : (
                "You're all caught up today 🎉"
              )}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#EF4444', fontSize: '14px' }}>🎯</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Goals:</span>
            <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700 }}>{goals.filter(g => g.status === 'completed').length}/{goals.length}</span>
          </div>
          <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HeroFire />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>Streak</span>
            <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700 }}>{currentStreak} Days</span>
          </div>
        </div>
      </section>

      {/* SECTION 2 — DAILY PROGRESS CARD (Productivity Score) */}
      <section style={{
        margin: '0 16px 12px 16px',
        background: 'linear-gradient(135deg, #0D0D0D 0%, #141414 100%)',
        borderRadius: '24px',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(214,255,46,0.12), 0 2px 8px rgba(0,0,0,0.6)',
        border: '1px solid rgba(214,255,46,0.18)'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top HUD Row */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            {/* Left: Score + delta + label */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Score row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2px' }}>
                  <span style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial Black", sans-serif',
                    fontWeight: '900',
                    fontSize: '72px',
                    color: '#D6FF2E',
                    letterSpacing: '-3px',
                    lineHeight: '1',
                    display: 'inline-block',
                  }}>
                    {animatedScore}
                  </span>
                  <span style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial Black", sans-serif',
                    fontWeight: '900',
                    fontSize: '28px',
                    color: '#D6FF2E',
                    lineHeight: '1',
                    marginTop: '10px',
                    display: 'inline-block',
                  }}>
                    %
                  </span>
                </div>

                {/* Delta pill */}
                {animatedScore > 0 && scoreDelta !== null && (
                  <span style={{
                    background: scoreDelta > 0 ? 'rgba(0,232,122,0.15)' : scoreDelta < 0 ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.1)',
                    color: scoreDelta > 0 ? '#00E87A' : scoreDelta < 0 ? '#FF3B30' : 'rgba(255,255,255,0.6)',
                    padding: '5px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: '700',
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                    letterSpacing: '0.02em',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}>
                    {scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`}
                  </span>
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: '13px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.45)',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}>
                Productivity Score
              </span>
            </div>

            {/* Right: Chart icon */}
            <div
              onClick={() => navigate('/stats')}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(214,255,46,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(214,255,46,0.35)',
                color: '#D6FF2E',
                boxShadow: '0 2px 12px rgba(214,255,46,0.15)',
                flexShrink: 0,
                cursor: 'pointer'
              }}
            >
              <BarChart2 size={22} strokeWidth={2.5} />
            </div>
          </div>

          {/* Navigation controls (arrows + dots) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}>
            {/* Left Arrow */}
            <button
              onClick={() => setActiveSection(prev => (prev === 0 ? 2 : prev - 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>

            {/* Dots */}
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                style={{
                  width: activeSection === idx ? '6px' : '5px',
                  height: activeSection === idx ? '6px' : '5px',
                  borderRadius: '50%',
                  background: activeSection === idx ? '#D6FF2E' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.2s'
                }}
              />
            ))}

            {/* Right Arrow */}
            <button
              onClick={() => setActiveSection(prev => (prev === 2 ? 0 : prev + 1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {/* Sub-cards Row */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {activeSection === 0 && (
              <>
                {/* TO DO (Tasks) */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', flex: 1, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>To Do</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', lineHeight: 1 }}>{pendingTasks.length}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px' }}>tasks pending</div>
                </div>
                {/* DONE (Tasks) */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', flex: 1, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Done</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', lineHeight: 1 }}>{completedTasksTotal}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px' }}>completed today</div>
                </div>
              </>
            )}

            {activeSection === 1 && (
              <>
                {/* ACTIVE (Goals) */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', flex: 1, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Active</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', lineHeight: 1 }}>{activeGoalsCount}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px' }}>goals in progress</div>
                </div>
                {/* DONE (Goals) */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', flex: 1, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Done</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', lineHeight: 1 }}>{completedGoalsCount}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px' }}>achieved 🏆</div>
                </div>
              </>
            )}

            {activeSection === 2 && (
              <>
                {/* TODAY (Habits) */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', flex: 1, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Today</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', lineHeight: 1 }}>{completedHabitsTodayFresh}/{totalHabitsTodayFresh}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px' }}>habits done</div>
                </div>
                {/* BEST STREAK (Habits) */}
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '14px', flex: 1, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Best Streak</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', lineHeight: 1 }}>{bestStreakDays}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px' }}>days record</div>
                </div>
              </>
            )}
          </div>
        </div>
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
              filter: !isProUser ? 'blur(6px)' : 'none',
              pointerEvents: !isProUser ? 'none' : 'auto',
              userSelect: !isProUser ? 'none' : 'auto',
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
            {!isProUser && (
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
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', margin: 0, textAlign: 'center' }}>💀 Blind spots kill progress</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, textAlign: 'center', padding: '0 20px' }}>Go Pro. See everything.</p>
                <div onClick={() => navigate('/paywall')} style={{ background: '#00E87A', color: '#000', fontSize: '11px', fontWeight: '800', padding: '7px 18px', borderRadius: '20px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  UPGRADE →
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  );
};

export default HomeDashboard;

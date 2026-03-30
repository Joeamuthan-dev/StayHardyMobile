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
  const { isPro: _isPro } = useSubscription();
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
    const todayObj = new Date();
    const today = new Date(todayObj.getTime() - (todayObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayName = dayNames[todayObj.getDay()];

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
      const tsKey = 'ps_score_ts_' + user?.id;
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

  // Recompute productivity score whenever state changes — avoids stale-cache race
  useEffect(() => {
    if (!user?.id) return;
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const currentDayName = daysOfWeek[now.getDay()];
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const tasksProgress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

    const goalsTotal = goals.length;
    const goalsSum = goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : ((g as any).progress || 0)), 0);
    const goalsProgress = goalsTotal > 0 ? Math.round(goalsSum / goalsTotal) : 0;

    const routinesToday = routines.filter(r => r.days?.includes(currentDayName)).length;
    const logsToday = routineLogs.filter(l => l.completed_at === todayStr).length;
    const routinesProgress = routinesToday > 0 ? Math.round((logsToday / routinesToday) * 100) : 0;

    const overallScore = calculateProductivityScore({ tasksProgress, routinesProgress, goalsProgress });
    if (overallScore === 0 && tasksTotal === 0 && goalsTotal === 0 && routinesToday === 0) return;

    const freshData: ProductivityScoreData = {
      tasks_progress: tasksProgress,
      routines_progress: routinesProgress,
      goals_progress: goalsProgress,
      overall_score: overallScore,
      tasks_total: tasksTotal,
      tasks_completed: tasksCompleted,
      routines_total: routinesToday,
      routines_completed: logsToday,
      goals_total: goalsTotal,
    };
    setScoreData(freshData);
    localStorage.setItem('ps_score_' + user.id, String(overallScore));
    localStorage.setItem('ps_score_ts_' + user.id, String(Date.now()));
  }, [tasks, goals, routines, routineLogs, user?.id]);

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

  let clientStreak = 0;
  const uniqueLogDaysSet = new Set(routineLogs.map(l => l.completed_at));
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const checkStr = new Date(checkDate.getTime() - (checkDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const checkDayName = daysOfWeek[checkDate.getDay()];
    const scheduledThatDay = routines.filter(r => r.days?.includes(checkDayName)).length;
    if (uniqueLogDaysSet.has(checkStr)) {
      clientStreak++;
    } else {
      if (i === 0) continue;
      if (scheduledThatDay === 0) continue;
      break;
    }
  }
  const currentStreak = (user?.currentStreak != null && user.currentStreak > 0) ? user.currentStreak : clientStreak;

  // Productivity Chart Data
  // Use DB calculated scores with client-side fallback
  const tasksProgress = scoreData?.tasks_progress ?? (tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0);

  const routinesProgress = scoreData?.routines_progress ?? (activeRoutinesTodayCount > 0 ? Math.round((completedRoutinesToday / activeRoutinesTodayCount) * 100) : 0);

  const avgGoalProgress = scoreData?.goals_progress ?? (goals.length > 0
    ? Math.round(goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : (g.progress || 0)), 0) / goals.length)
    : 0);

  const overallProgress = scoreData?.overall_score !== undefined && scoreData.overall_score !== null
    ? scoreData.overall_score
    : calculateProductivityScore({
        tasksProgress,
        routinesProgress,
        goalsProgress: avgGoalProgress,
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

  const [habitRange, setHabitRange] = useState<7 | 30>(7);

  const getHabitsData = useCallback((range: number) => {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result: { label: string; date: string; count: number }[] = [];
    const now = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = range === 7 ? dayNames[(d.getDay() + 6) % 7] : String(d.getDate());
      const count = routineLogs?.filter(log => log.completed_at === dateStr).length || 0;
      result.push({ label, date: dateStr, count });
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
        margin: '0 16px 8px 16px',
        borderRadius: '28px',
        padding: '16px 20px',
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

        <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1.3, marginBottom: '10px', letterSpacing: '-0.5px' }}>
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
                  {pendingHabitsToday === 1 ? 'habit' : 'habits'}
                </span>
                {' '}due today
              </>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                You're all caught up today
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginBottom: '-2px' }}>
                  <circle cx="10" cy="10" r="9" stroke="#00E87A" strokeWidth="1.5" fill="rgba(0,232,122,0.1)" />
                  <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="#00E87A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </span>
        </div>

      </section>

      {/* SECTION 2 — PRODUCTIVITY SCORE CARD */}
      <section style={{
        margin: '0 16px 8px 16px',
        background: 'linear-gradient(135deg, #0D0D0D 0%, #141414 100%)',
        borderRadius: '24px',
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,232,122,0.12), 0 2px 8px rgba(0,0,0,0.6)',
        border: '1px solid rgba(0,232,122,0.18)'
      }}>
        {/* Top row: label + stats icon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.45)',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Productivity Score
          </span>
          <div
            onClick={() => navigate('/stats')}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(0,232,122,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(0,232,122,0.35)',
              color: '#00E87A',
              boxShadow: '0 2px 12px rgba(0,232,122,0.15)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <BarChart2 size={20} strokeWidth={2.5} />
          </div>
        </div>

        {/* Circular progress ring — dashed track + gradient arc */}
        {(() => {
          const cx = 100, cy = 100, r = 76;
          const circ = 2 * Math.PI * r; // 477.52
          const filledAngle = (animatedScore / 100) * 360;
          const totalTicks = 80;
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px', position: 'relative' }}>
              <svg width="170" height="170" viewBox="0 0 200 200">
                <defs>
                  <linearGradient id="arcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#007A3D" />
                    <stop offset="40%" stopColor="#00E87A" />
                    <stop offset="100%" stopColor="#AAFF44" />
                  </linearGradient>
                  <filter id="arcGlow" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Dashed tick marks — shown on unfilled portion */}
                {Array.from({ length: totalTicks }, (_, i) => {
                  const normalizedDeg = (i / totalTicks) * 360;
                  const angleDeg = normalizedDeg - 90;
                  const angleRad = (angleDeg * Math.PI) / 180;
                  const innerR = r - 10;
                  const outerR = r + 1;
                  const x1 = cx + innerR * Math.cos(angleRad);
                  const y1 = cy + innerR * Math.sin(angleRad);
                  const x2 = cx + outerR * Math.cos(angleRad);
                  const y2 = cy + outerR * Math.sin(angleRad);
                  const inFilled = normalizedDeg <= filledAngle;
                  return (
                    <line
                      key={i}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={inFilled ? 'transparent' : 'rgba(255,255,255,0.18)'}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Progress arc — thick gradient with glow */}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke="url(#arcGrad)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - animatedScore / 100)}
                  transform={`rotate(-90 ${cx} ${cy})`}
                  filter="url(#arcGlow)"
                />
                {/* Gloss sheen on filled arc */}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - animatedScore / 100)}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              </svg>

              {/* Score overlay */}
              <div style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}>
                {/* Lightning bolt icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#00E87A">
                  <path d="M13 2L4.09 12.97H11L10 22L20.91 11H14L13 2Z" />
                </svg>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1px' }}>
                  <span style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial Black", sans-serif',
                    fontWeight: '900',
                    fontSize: '52px',
                    color: '#FFFFFF',
                    letterSpacing: '-2px',
                    lineHeight: '1',
                  }}>
                    {animatedScore}
                  </span>
                  <span style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "Arial Black", sans-serif',
                    fontWeight: '900',
                    fontSize: '20px',
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: '1',
                    marginTop: '8px',
                  }}>
                    %
                  </span>
                </div>
                {animatedScore > 0 && scoreDelta !== null && (
                  <span style={{
                    background: scoreDelta > 0 ? 'rgba(0,232,122,0.15)' : scoreDelta < 0 ? 'rgba(255,59,48,0.15)' : 'rgba(255,255,255,0.1)',
                    color: scoreDelta > 0 ? '#00E87A' : scoreDelta < 0 ? '#FF3B30' : 'rgba(255,255,255,0.55)',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {scoreDelta > 0 ? `+${scoreDelta}%` : `${scoreDelta}%`} today
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Stat cards row — Option A style */}
        {(() => {
          const goalsTotal = goals.length;
          const goalsPct = goalsTotal > 0 ? Math.round((completedGoalsCount / goalsTotal) * 100) : 0;
          const tasksTotal = completedTasksTotal + pendingTasks.length;
          const tasksPct = tasksTotal > 0 ? Math.round((completedTasksTotal / tasksTotal) * 100) : 0;

          const MiniRing = ({ pct, color }: { pct: number; color: string }) => {
            const r = 16, c = 20, circ = 2 * Math.PI * r;
            return (
              <svg width="40" height="40" viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
                <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="4" />
                <circle
                  cx={c} cy={c} r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - pct / 100)}
                  transform={`rotate(-90 ${c} ${c})`}
                />
                <text x={c} y={c + 3.5} textAnchor="middle" fontSize="7" fontWeight="800" fill={color} fontFamily="-apple-system, sans-serif">
                  {pct}%
                </text>
              </svg>
            );
          };

          return (
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Goals card */}
              <div
                onClick={() => navigate('/goals')}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, rgba(0,232,122,0.18) 0%, rgba(0,180,80,0.12) 100%)',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid rgba(0,232,122,0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', lineHeight: 1.2 }}>
                      {activeGoalsCount === 0 ? 'Add Goal' : 'Goals'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px', fontWeight: 500 }}>
                      {activeGoalsCount === 0 ? 'No goals yet' : `${activeGoalsCount} active`}
                    </div>
                  </div>
                  <MiniRing pct={goalsPct} color="#00E87A" />
                </div>
              </div>

              {/* Tasks card */}
              <div
                onClick={() => navigate('/dashboard')}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, rgba(196,255,60,0.18) 0%, rgba(150,220,0,0.10) 100%)',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid rgba(196,255,60,0.25)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', lineHeight: 1.2 }}>
                      {pendingTasks.length === 0 ? 'Add Task' : 'Tasks'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '4px', fontWeight: 500 }}>
                      {pendingTasks.length === 0 ? 'All clear!' : `${pendingTasks.length} tasks`}
                    </div>
                  </div>
                  <MiniRing pct={tasksPct} color="#C4FF3C" />
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* SECTION 3 — HABIT ACTIVITY BAR CHART */}
      {(() => {
        const habitsData = getHabitsData(habitRange);
        const maxVal = Math.max(1, ...habitsData.map(d => d.count));
        const svgW = 300, svgH = 120;
        const maxBarH = 82, topPad = 12, labelH = 14;
        const barW = habitRange === 7 ? 28 : 6;
        const gap = habitRange === 7 ? 10 : 3;
        const totalBarsW = habitsData.length * barW + (habitsData.length - 1) * gap;
        const startX = (svgW - totalBarsW) / 2;

        return (
          <div style={{ position: 'relative' }}>
            <div>
              <section style={{
                margin: '0 16px 10px 16px',
                borderRadius: '24px',
                padding: '16px 16px 14px 16px',
                background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3ae0 60%, #2563eb 100%)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
                onClick={() => navigate('/routine')}
              >
                {/* Header row: title left, toggle right */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                  {/* Left: title + streak below */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Habit Activity</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '13px' }}>
                      <HeroFire />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                        {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} Streak
                      </span>
                    </div>
                  </div>
                  {/* Right: 7D / 30D toggle */}
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexShrink: 0 }}>
                    {([7, 30] as const).map(r => (
                      <button
                        key={r}
                        onClick={e => { e.stopPropagation(); setHabitRange(r); }}
                        style={{
                          padding: '2px 8px',
                          borderRadius: r === 7 ? '10px 0 0 10px' : '0 10px 10px 0',
                          fontSize: '9px',
                          fontWeight: '700',
                          border: 'none',
                          cursor: 'pointer',
                          background: habitRange === r ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)',
                          color: habitRange === r ? '#1a3ae0' : 'rgba(255,255,255,0.5)',
                          transition: 'all 0.2s',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {r}D
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar chart */}
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: '120px' }} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#007A3D" />
                      <stop offset="100%" stopColor="#00E87A" />
                    </linearGradient>
                    <linearGradient id="barGradToday" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#00C86A" />
                      <stop offset="100%" stopColor="#AAFF44" />
                    </linearGradient>
                    <filter id="todayGlow" x="-40%" y="-20%" width="180%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {habitsData.map((d, i) => {
                    const isToday = i === habitsData.length - 1;
                    const barH = d.count > 0 ? Math.max(4, (d.count / maxVal) * maxBarH) : 3;
                    const x = startX + i * (barW + gap);
                    const y = topPad + (maxBarH - barH);
                    const rx = barW < 8 ? 2 : Math.min(barW / 2, 7);
                    const showLabel = habitRange === 7 || i === 0 || (i + 1) % 5 === 0 || isToday;

                    return (
                      <g key={i}>
                        {/* Today background glow */}
                        {isToday && d.count > 0 && (
                          <rect x={x - 2} y={y - 2} width={barW + 4} height={barH + 4} rx={rx + 2}
                            fill="rgba(170,255,68,0.25)" filter="url(#todayGlow)" />
                        )}
                        {/* Bar */}
                        <rect
                          x={x} y={y} width={barW} height={barH} rx={rx}
                          fill={isToday ? 'url(#barGradToday)' : d.count > 0 ? 'url(#barGrad)' : 'rgba(255,255,255,0.1)'}
                        />
                        {/* Count above bar (7D only, non-zero) */}
                        {habitRange === 7 && d.count > 0 && (
                          <text x={x + barW / 2} y={y - 3} textAnchor="middle"
                            fontSize="8" fontWeight="700"
                            fill={isToday ? '#AAFF44' : 'rgba(255,255,255,0.7)'}
                            fontFamily="-apple-system, sans-serif">
                            {d.count}
                          </text>
                        )}
                        {/* Day label below */}
                        {showLabel && (
                          <text
                            x={x + barW / 2}
                            y={topPad + maxBarH + labelH}
                            textAnchor="middle"
                            fontSize={habitRange === 7 ? '9' : '7'}
                            fontWeight={isToday ? '700' : '500'}
                            fill={isToday ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                            fontFamily="-apple-system, sans-serif"
                          >
                            {d.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </section>
            </div>

          </div>
        );
      })()}

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
    </div>
  );
};

export default HomeDashboard;

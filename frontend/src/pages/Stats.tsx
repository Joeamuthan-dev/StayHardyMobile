import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { calculateProductivityScore, getScoreLabels } from '../utils/productivity';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { loadStatsPageStale, persistStatsPageCache } from '../lib/statsPageCache';

interface Task {
  id: string;
  status: 'pending' | 'completed';
  category: string;
  createdAt: string;
  updatedAt?: string;
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
  progress: number;
  createdAt: string;
  updatedAt?: string;
}

function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = null;
    const end = Math.max(0, Math.round(target));
    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(end * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return value;
}

function statusPillClass(label: string): string {
  const u = label.toUpperCase();
  if (['IDLE', 'LAZY', 'SLACKER'].some((k) => u.includes(k))) return 'stats-status-pill--red';
  if (['WAKING', 'AVERAGE'].some((k) => u.includes(k))) return 'stats-status-pill--amber';
  return 'stats-status-pill--green';
}

/** Arc fill color by score band (matches gauge spec). */
function gaugeFillColor(score: number): string {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s <= 30) return '#FF6B35';
  if (s <= 50) return '#FFD166';
  if (s <= 75) return '#4ECDC4';
  if (s <= 90) return '#00E87A';
  return '#00FF87';
}

function gaugeAmbientGlow(score: number): string {
  const c = gaugeFillColor(score);
  const hex = c.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.38)`;
}

function getCategoryTier(rate: number): {
  label: string;
  verdict: string;
  barColor: string;
  borderGlow: string;
} {
  if (rate <= 10) return { label: 'BARELY MOVING', verdict: 'Are we working… or hibernating?', barColor: '#dc2626', borderGlow: 'rgba(220,38,38,0.55)' };
  if (rate <= 30) return { label: 'SLOW ROLL', verdict: 'Movement detected. Barely.', barColor: '#ea580c', borderGlow: 'rgba(234,88,12,0.5)' };
  if (rate <= 55) return { label: 'BUILDING STEAM', verdict: 'Okay. Now push harder.', barColor: '#eab308', borderGlow: 'rgba(234,179,8,0.45)' };
  if (rate <= 75) return { label: 'IN MOTION', verdict: 'Now we are talking.', barColor: '#22c55e', borderGlow: 'rgba(34,197,94,0.45)' };
  return { label: 'CHARGING FORWARD', verdict: 'Power and momentum. Nice work.', barColor: '#14b8a6', borderGlow: 'rgba(20,184,166,0.5)' };
}

function barMascot(rate: number): string {
  if (rate >= 70) return '🐎';
  if (rate < 40) return '🐢';
  return '🏃';
}

const SpeedometerCard: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const displayScore = useCountUp(score, 1400);
  const width = 300;
  const height = 142;
  const cx = width / 2;
  const cy = height - 4;
  const radius = 108;
  const stroke = 12;
  const halfCirc = Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, score));
  const arcOffset = halfCirc - (clamped / 100) * halfCirc;
  const fillColor = gaugeFillColor(clamped);
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div
      className="stats-speedo-card"
      style={
        {
          ['--speedo-accent' as string]: fillColor,
          ['--speedo-glow' as string]: gaugeAmbientGlow(score),
        } as React.CSSProperties
      }
    >
      <div className="stats-speedo-card__inner" aria-hidden />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="stats-speedo-svg" aria-hidden>
        {/* Background track — muted half arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress fill — band color, rounded caps, glow via CSS */}
        <path
          d={arcPath}
          fill="none"
          stroke={fillColor}
          strokeWidth={stroke}
          strokeDasharray={halfCirc}
          strokeDashoffset={arcOffset}
          strokeLinecap="round"
          className="stats-speedo-arc-fill"
        />
      </svg>
      <div className="stats-speedo-readout">
        <span className="stats-speedo-pct">{displayScore}%</span>
        <span className={`stats-status-pill ${statusPillClass(label)}`}>{label}</span>
      </div>
    </div>
  );
};

const Stats: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => {
    setIsSidebarHidden((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarHidden', next.toString());
      return next;
    });
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchAllData = async (opts?: { force?: boolean }) => {
      if (!opts?.force) {
        const expired = await isCacheExpired(CACHE_KEYS.user_stats, CACHE_EXPIRY_MINUTES.user_stats);
        if (!expired) return;
      }

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayDate = new Date();
      const currentDayName = daysOfWeek[todayDate.getDay()];
      const localTodayStr = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDayStr =
        thirtyDaysAgo.getFullYear() +
        '-' +
        String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(thirtyDaysAgo.getDate()).padStart(2, '0');

      const [
        { data: score, error: scoreErr },
        { data: tasksData, error: taskErr },
        { data: catData, error: catErr },
        { data: routinesData },
        { data: logsData },
        { data: goalsData },
      ] = await Promise.all([
        supabase.rpc('get_productivity_score', {
          p_user_id: user.id,
          p_day_name: currentDayName,
          p_today_str: localTodayStr,
        }),
        supabase
          .from('tasks')
          .select('id, status, category, createdAt, updatedAt')
          .eq('userId', user.id),
        supabase.from('categories').select('name').eq('userId', user.id),
        supabase.from('routines').select('id, title, days').eq('user_id', user.id),
        supabase
          .from('routine_logs')
          .select('routine_id, completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', startDayStr),
        supabase
          .from('goals')
          .select('id, name, targetDate, status, progress, createdAt, updatedAt')
          .eq('userId', user.id),
      ]);
      if (scoreErr) console.error('Score RPC error:', scoreErr);
      if (taskErr) console.error('Supabase fetch error:', taskErr);
      if (catErr) console.warn('Categories fetch error:', catErr.message);

      if (cancelled) return;

      const tasksArr = (tasksData ?? []) as Task[];
      const routinesArr = (routinesData ?? []) as Routine[];
      const logsArr = (logsData ?? []) as RoutineLog[];
      const goalsArr = (goalsData ?? []) as Goal[];
      const cats = catData?.map((c) => c.name) ?? [];

      if (score) setScoreData(score);
      setTasks(tasksArr);
      setDbCategories(cats);
      setRoutines(routinesArr);
      setRoutineLogs(logsArr);
      setGoals(goalsArr);

      void persistStatsPageCache(user.id, {
        scoreData: score ?? null,
        tasks: tasksArr,
        routines: routinesArr,
        routineLogs: logsArr,
        goals: goalsArr,
        dbCategories: cats,
      });

      void syncWidgetData();
    };

    void (async () => {
      const snap = await loadStatsPageStale(user.id);
      if (!cancelled && snap) {
        if (snap.scoreData) {
          setScoreData(
            snap.scoreData as {
              tasks_progress: number;
              routines_progress: number;
              goals_progress: number;
              overall_score: number;
              tasks_total?: number;
              tasks_completed?: number;
              routines_total?: number;
              routines_completed?: number;
              goals_total?: number;
            },
          );
        }
        setTasks((snap.tasks ?? []) as Task[]);
        setRoutines((snap.routines ?? []) as Routine[]);
        setRoutineLogs((snap.routineLogs ?? []) as RoutineLog[]);
        setGoals((snap.goals ?? []) as Goal[]);
        setDbCategories(snap.dbCategories ?? []);
      }
      await fetchAllData({ force: false });
    })();

    const tasksChannel = supabase
      .channel('stats_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `userId=eq.${user.id}` }, () => {
        void fetchAllData({ force: true });
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('stats_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `userId=eq.${user.id}` }, () => {
        void fetchAllData({ force: true });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [user]);

  const defaultCategories = ['Personal', 'Content', 'Health', 'Business'];
  const allCategories = Array.from(
    new Set([...defaultCategories, ...dbCategories, ...tasks.map((t: Task) => t.category)]),
  ).filter((c) => c && c !== '');

  const totalGoals = scoreData?.goals_total ?? goals.length;
  const activeGoalsCount = goals.filter((g) => g.status === 'pending').length;
  const overdueGoalsCount = goals.filter(
    (g) => g.status === 'pending' && g.targetDate && new Date(g.targetDate).getTime() < new Date().setHours(0, 0, 0, 0),
  ).length;
  const avgGoalProgress =
    scoreData?.goals_progress ??
    (totalGoals > 0
      ? Math.round(goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : g.progress || 0), 0) / totalGoals)
      : 0);

  const totalUserTasks = scoreData?.tasks_total ?? tasks.length;
  const completedUserTasks = scoreData?.tasks_completed ?? tasks.filter((t: Task) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const taskCompletionRate =
    scoreData?.tasks_progress ?? (totalUserTasks > 0 ? Math.round((completedUserTasks / totalUserTasks) * 100) : 0);

  const totalRoutines = routines.length;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDate = new Date();
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const activeRoutinesTodayCount = scoreData?.routines_total ?? routines.filter((r) => r.days?.includes(currentDayName)).length;

  const localTodayStr = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const routinesCompletedToday = scoreData?.routines_completed ?? routineLogs.filter((l) => l.completed_at === localTodayStr).length;
  const todayRoutineRate =
    scoreData?.routines_progress ??
    (activeRoutinesTodayCount > 0 ? Math.round((routinesCompletedToday / activeRoutinesTodayCount) * 100) : 0);

  let currentStreak = 0;
  const uniqueLogDaysSet = new Set(routineLogs.map((l) => l.completed_at));
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const checkStr = new Date(checkDate.getTime() - checkDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const checkDayName = daysOfWeek[checkDate.getDay()];
    const scheduledThatDay = routines.filter((r) => r.days?.includes(checkDayName)).length;

    if (uniqueLogDaysSet.has(checkStr)) {
      currentStreak++;
    } else {
      if (i === 0) continue;
      if (scheduledThatDay === 0) continue;
      break;
    }
  }

  const startDateForConsistency = new Date();
  startDateForConsistency.setHours(0, 0, 0, 0);
  let expectedRoutinesLast7Days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDateForConsistency);
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    expectedRoutinesLast7Days += routines.filter((r) => r.days?.includes(dayName)).length;
  }

  const last7DaysLogs = routineLogs.filter((l) => {
    const d = new Date(l.completed_at);
    return startDateForConsistency.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
  });
  const weeklyConsistency =
    expectedRoutinesLast7Days > 0 ? Math.min(100, Math.round((last7DaysLogs.length / expectedRoutinesLast7Days) * 100)) : 0;

  const dynamicTodayScore =
    scoreData?.overall_score ??
    calculateProductivityScore({
      tasksProgress: taskCompletionRate,
      routinesProgress: todayRoutineRate,
      goalsProgress: avgGoalProgress,
    });

  const historicalData = useMemo(() => {
    const data: { name: string; tasks: number; goals: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = d.getTime();
      const nextDayStart = dayStart + 24 * 60 * 60 * 1000;

      const tasksCompleted = tasks.filter((t) => {
        if (t.status !== 'completed' || !t.updatedAt) return false;
        const uDate = new Date(t.updatedAt).getTime();
        return uDate >= dayStart && uDate < nextDayStart;
      }).length;

      const goalsCompleted = goals.filter((g) => {
        if (g.status !== 'completed' || !g.updatedAt) return false;
        const uDate = new Date(g.updatedAt).getTime();
        return uDate >= dayStart && uDate < nextDayStart;
      }).length;

      data.push({ name: dayStr, tasks: tasksCompleted, goals: goalsCompleted });
    }
    return data;
  }, [tasks, goals, trendDays]);

  const categoryStats = allCategories
    .map((cat) => {
      const catTasks = tasks.filter((t: Task) => (t.category || 'Focus') === cat);
      const catCompleted = catTasks.filter((t: Task) => t.status === 'completed').length;
      return {
        name: cat,
        total: catTasks.length,
        completed: catCompleted,
        rate: catTasks.length > 0 ? Math.round((catCompleted / catTasks.length) * 100) : 0,
      };
    })
    .filter((stat) => stat.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const { label, verdict } = getScoreLabels(dynamicTodayScore, totalUserTasks + totalGoals + totalRoutines);

  const cTotal = useCountUp(totalUserTasks);
  const cDone = useCountUp(completedUserTasks);
  const cPending = useCountUp(pendingCount);
  const cRate = useCountUp(taskCompletionRate);
  const gTotal = useCountUp(totalGoals);
  const gActive = useCountUp(activeGoalsCount);
  const gOverdue = useCountUp(overdueGoalsCount);
  const gProg = useCountUp(avgGoalProgress);
  const rCreated = useCountUp(totalRoutines);
  const rToday = useCountUp(routinesCompletedToday);
  const rConsist = useCountUp(weeklyConsistency);
  const rStreak = useCountUp(currentStreak);

  return (
    <div className={`page-shell stats-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1" />
        <div className="aurora-gradient-2" />
      </div>

      <header className="stats-premium-header">
        <div className="stats-header-center">
          <h1 className="stats-display-title">PRODUCTIVITY STATS</h1>
          <div className="stats-marquee-wrap">
            <div className="stats-marquee-line" />
            <div className="stats-marquee-track" aria-hidden>
              <div className="stats-marquee-inner">
                <span>PERFORMANCE METRICS · COMBINED PERFORMANCE · INSIGHTS · PERFORMANCE METRICS · COMBINED PERFORMANCE · </span>
                <span>PERFORMANCE METRICS · COMBINED PERFORMANCE · INSIGHTS · PERFORMANCE METRICS · COMBINED PERFORMANCE · </span>
              </div>
            </div>
            <div className="stats-marquee-line" />
          </div>
        </div>
        <button
          type="button"
          className="stats-header-sidebar-btn notification-btn desktop-only-btn"
          onClick={toggleSidebar}
          title={isSidebarHidden ? 'Show sidebar' : 'Focus mode'}
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined">{isSidebarHidden ? 'side_navigation' : 'fullscreen'}</span>
        </button>
      </header>

      <main className="stats-premium-main">
        <SpeedometerCard score={dynamicTodayScore} label={label} />

        <section className="stats-activity-card">
          <div className="stats-activity-head">
            <div>
              <p className="stats-mono-overline">TASK AND GOAL ACTIVITY</p>
              <h2 className="stats-activity-subtitle">Insights Trend</h2>
              <p className="stats-muted-micro">Excludes Routines</p>
            </div>
            <div className="stats-activity-head-right">
              <div className="stats-legend">
                <span className="stats-legend-dot stats-legend-dot--blue" />
                <span className="stats-legend-txt">Tasks</span>
                <span className="stats-legend-dot stats-legend-dot--red" />
                <span className="stats-legend-txt">Goals</span>
              </div>
              <div className="stats-trend-filters">
                <button
                  type="button"
                  className={`stats-trend-pill ${trendDays === 7 ? 'stats-trend-pill--on' : ''}`}
                  onClick={() => setTrendDays(7)}
                >
                  7D
                </button>
                <button
                  type="button"
                  className={`stats-trend-pill ${trendDays === 30 ? 'stats-trend-pill--on' : ''}`}
                  onClick={() => setTrendDays(30)}
                >
                  30D
                </button>
              </div>
            </div>
          </div>
          <div className="stats-chart-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={historicalData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="statsFillTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="statsFillGoals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} strokeDasharray="4 8" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  interval={trendDays === 7 ? 0 : 6}
                  tick={{
                    fill: 'rgba(148,163,184,0.95)',
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 600,
                  }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(8,12,22,0.95)',
                    border: '1px solid rgba(52,211,153,0.25)',
                    borderRadius: '12px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="tasks" name="Tasks" stroke="#60a5fa" strokeWidth={2.5} fill="url(#statsFillTasks)" />
                <Area type="monotone" dataKey="goals" name="Goals" stroke="#f87171" strokeWidth={2.5} fill="url(#statsFillGoals)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="stats-verdict-card">
          <div className="stats-verdict-shimmer" />
          <div className="stats-verdict-head">
            <span className="stats-verdict-trophy" aria-hidden>
              🏆
            </span>
            <span className="stats-verdict-label">THE VERDICT</span>
          </div>
          <p className="stats-verdict-quote">{verdict}</p>
        </section>

        <section className="stats-insight-card stats-insight-card--tasks">
          <div className="stats-insight-head">
            <span className="material-symbols-outlined stats-insight-icon">check_circle</span>
            <span>Tasks Insight</span>
          </div>
          <div className="stats-insight-grid">
            <div>
              <span className="stats-col-label">TOTAL</span>
              <span className="stats-col-val stats-col-val--white">{cTotal}</span>
            </div>
            <div>
              <span className="stats-col-label">COMPLETED</span>
              <span className="stats-col-val stats-col-val--green">{cDone}</span>
            </div>
            <div>
              <span className="stats-col-label">PENDING</span>
              <span className="stats-col-val stats-col-val--orange">{cPending}</span>
            </div>
            <div>
              <span className="stats-col-label">RATE</span>
              <span className="stats-col-val stats-col-val--blue">{cRate}%</span>
            </div>
          </div>
        </section>

        <section className="stats-insight-card stats-insight-card--goals">
          <div className="stats-insight-head">
            <span className="material-symbols-outlined stats-insight-icon">star</span>
            <span>Goals Insight</span>
          </div>
          <div className="stats-insight-grid">
            <div>
              <span className="stats-col-label">TOTAL</span>
              <span className="stats-col-val stats-col-val--white">{gTotal}</span>
            </div>
            <div>
              <span className="stats-col-label">ACTIVE</span>
              <span className="stats-col-val stats-col-val--green">{gActive}</span>
            </div>
            <div>
              <span className="stats-col-label">OVERDUE</span>
              <span className="stats-col-val stats-col-val--red">{gOverdue}</span>
            </div>
            <div>
              <span className="stats-col-label">PROGRESS</span>
              <span className="stats-col-val stats-col-val--blue">{gProg}%</span>
            </div>
          </div>
        </section>

        <section className="stats-insight-card stats-insight-card--routines">
          <div className="stats-insight-head">
            <span className="material-symbols-outlined stats-insight-icon">calendar_month</span>
            <span>Routines Insight</span>
          </div>
          <div className="stats-insight-grid">
            <div>
              <span className="stats-col-label">CREATED</span>
              <span className="stats-col-val stats-col-val--white">{rCreated}</span>
            </div>
            <div>
              <span className="stats-col-label">DONE TODAY</span>
              <span className="stats-col-val stats-col-val--green">{rToday}</span>
            </div>
            <div>
              <span className="stats-col-label">CONSISTENCY</span>
              <span className="stats-col-val stats-col-val--cyan">{rConsist}%</span>
            </div>
            <div>
              <span className="stats-col-label">STREAK</span>
              <span className="stats-col-val stats-col-val--yellow">
                {rStreak} <span className="stats-fire-emoji">🔥</span>
              </span>
            </div>
          </div>
        </section>

        <section className="stats-category-section">
          <h3 className="stats-category-section-label">CATEGORY INSIGHT</h3>
          {categoryStats.length > 0 ? (
            <div className="stats-category-stack">
              {categoryStats.map((stat) => {
                const tier = getCategoryTier(stat.rate);
                const mascot = barMascot(stat.rate);
                return (
                  <article
                    key={stat.name}
                    className="stats-cat-card"
                    style={{ ['--cat-bar' as string]: tier.barColor, ['--cat-glow' as string]: tier.borderGlow } as React.CSSProperties}
                  >
                    <div className="stats-cat-card__glow" />
                    <div className="stats-cat-card__top">
                      <div>
                        <div className="stats-cat-name-row">
                          <span className="stats-cat-name">{stat.name}</span>
                          <span className="stats-cat-pill">{stat.rate}%</span>
                        </div>
                        <p className="stats-cat-count">
                          {stat.completed}/{stat.total} tasks
                        </p>
                        <p className="stats-cat-status" style={{ color: tier.barColor }}>
                          {tier.label}
                        </p>
                      </div>
                    </div>
                    <div className="stats-cat-bar-wrap">
                      <div
                        className="stats-cat-mascot"
                        style={{ left: `${stat.rate}%`, transition: 'left 1.2s cubic-bezier(0.34, 1.2, 0.64, 1)' }}
                      >
                        {mascot}
                      </div>
                      <div className="stats-cat-bar-track">
                        <div
                          className="stats-cat-bar-fill"
                          style={{
                            width: `${stat.rate}%`,
                            background: `linear-gradient(90deg, ${tier.barColor}, #fff)`,
                            boxShadow: `0 0 16px ${tier.barColor}`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="stats-cat-quote">&ldquo;{tier.verdict}&rdquo;</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="stats-category-empty">
              <span className="material-symbols-outlined">analytics</span>
              <p>No category data yet. Add tasks with categories.</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav isHidden={isSidebarHidden} />

      <style>{`
        .stats-premium-page {
          padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
        }

        .stats-premium-main {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 0.35rem;
        }

        .stats-speedo-card {
          position: relative;
          border-radius: 24px;
          padding: 1.35rem 1rem 1.25rem;
          background:
            radial-gradient(ellipse 130% 85% at 50% 115%, var(--speedo-glow, rgba(78, 205, 196, 0.18)), transparent 62%),
            linear-gradient(165deg, rgba(15, 23, 42, 0.98) 0%, rgba(3, 7, 16, 0.99) 100%);
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow:
            0 4px 32px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.03) inset,
            0 0 64px var(--speedo-glow, rgba(78, 205, 196, 0.2));
          overflow: hidden;
        }
        .stats-speedo-card__inner {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse 90% 55% at 50% -5%, rgba(255, 255, 255, 0.06), transparent 52%);
          opacity: 0.9;
        }
        .stats-speedo-svg {
          display: block;
          margin: 0 auto;
        }
        .stats-speedo-arc-fill {
          transition: stroke-dashoffset 1.4s cubic-bezier(0.34, 1.15, 0.64, 1), stroke 0.45s ease;
          filter: drop-shadow(0 0 5px var(--speedo-accent, #4ecdc4))
            drop-shadow(0 0 14px var(--speedo-glow, rgba(78, 205, 196, 0.35)));
        }
        .stats-speedo-readout {
          text-align: center;
          margin-top: 0.35rem;
          padding-top: 0.15rem;
          position: relative;
          z-index: 2;
        }
        .stats-speedo-pct {
          display: block;
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(2.75rem, 12vw, 3.75rem);
          font-weight: 400;
          color: #f8fafc;
          letter-spacing: 0.03em;
          line-height: 1.05;
          text-shadow:
            0 2px 24px rgba(0, 0, 0, 0.4),
            0 0 36px var(--speedo-glow, rgba(255, 255, 255, 0.08));
        }
        .stats-status-pill {
          display: inline-block;
          margin-top: 0.65rem;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
        }
        .stats-status-pill--red {
          background: rgba(239, 68, 68, 0.2);
          color: #fecaca;
          border: 1px solid rgba(248, 113, 113, 0.45);
        }
        .stats-status-pill--amber {
          background: rgba(245, 158, 11, 0.18);
          color: #fde68a;
          border: 1px solid rgba(251, 191, 36, 0.4);
        }
        .stats-status-pill--green {
          background: rgba(16, 185, 129, 0.2);
          color: #a7f3d0;
          border: 1px solid rgba(52, 211, 153, 0.45);
        }

        .stats-activity-card {
          border-radius: 18px;
          padding: 1.1rem 1rem 0.85rem;
          background: rgba(12, 18, 32, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(14px);
        }
        .stats-activity-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.65rem;
        }
        .stats-mono-overline {
          margin: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: rgba(148, 163, 184, 0.9);
        }
        .stats-activity-subtitle {
          margin: 0.25rem 0 0;
          font-size: 1rem;
          font-weight: 900;
          color: #f8fafc;
        }
        .stats-muted-micro {
          margin: 0.2rem 0 0;
          font-size: 10px;
          font-weight: 600;
          color: rgba(100, 116, 139, 0.95);
        }
        .stats-activity-head-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }
        .stats-legend {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .stats-legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
        }
        .stats-legend-dot--blue {
          background: #3b82f6;
          color: #3b82f6;
        }
        .stats-legend-dot--red {
          background: #ef4444;
          color: #ef4444;
        }
        .stats-legend-txt {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(148, 163, 184, 0.95);
        }
        .stats-trend-filters {
          display: flex;
          gap: 0.3rem;
          background: rgba(0, 0, 0, 0.3);
          padding: 3px;
          border-radius: 999px;
        }
        .stats-trend-pill {
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: rgba(148, 163, 184, 0.9);
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .stats-trend-pill--on {
          background: rgba(16, 185, 129, 0.22);
          color: #ecfdf5;
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.35);
        }

        .stats-verdict-card {
          position: relative;
          border-radius: 18px;
          padding: 1.25rem 1.15rem 1.4rem;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(18px);
          overflow: hidden;
        }
        .stats-verdict-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.7), rgba(251, 191, 36, 0.4), transparent);
          opacity: 0.9;
        }
        .stats-verdict-head {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .stats-verdict-trophy {
          font-size: 1.35rem;
          filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.45));
        }
        .stats-verdict-label {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.22em;
          color: #fbbf24;
        }
        .stats-verdict-quote {
          margin: 0;
          font-size: clamp(1.05rem, 4vw, 1.35rem);
          font-weight: 700;
          font-style: italic;
          line-height: 1.45;
          color: #f1f5f9;
        }
        .stats-insight-card {
          border-radius: 16px;
          padding: 1rem 0.85rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .stats-insight-card--tasks {
          background: linear-gradient(160deg, rgba(30, 58, 138, 0.12), rgba(8, 12, 22, 0.92));
        }
        .stats-insight-card--goals {
          background: linear-gradient(160deg, rgba(88, 28, 135, 0.12), rgba(8, 12, 22, 0.92));
        }
        .stats-insight-card--routines {
          background: linear-gradient(160deg, rgba(6, 78, 59, 0.14), rgba(8, 12, 22, 0.92));
        }
        .stats-insight-head {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.95rem;
          font-weight: 900;
          color: #f8fafc;
          margin-bottom: 0.85rem;
        }
        .stats-insight-icon {
          font-size: 22px !important;
          color: #94a3b8;
        }
        .stats-insight-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.35rem;
        }
        @media (max-width: 400px) {
          .stats-insight-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .stats-col-label {
          display: block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: rgba(148, 163, 184, 0.85);
          margin-bottom: 0.25rem;
        }
        .stats-col-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: clamp(1.15rem, 4.5vw, 1.45rem);
          font-weight: 800;
          line-height: 1.1;
        }
        .stats-col-val--white {
          color: #f8fafc;
        }
        .stats-col-val--green {
          color: #4ade80;
        }
        .stats-col-val--orange {
          color: #fb923c;
        }
        .stats-col-val--blue {
          color: #60a5fa;
        }
        .stats-col-val--red {
          color: #f87171;
        }
        .stats-col-val--cyan {
          color: #22d3ee;
        }
        .stats-col-val--yellow {
          color: #facc15;
        }
        .stats-fire-emoji {
          font-style: normal;
        }

        .stats-category-section-label {
          margin: 0.25rem 0 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: rgba(100, 116, 139, 0.95);
        }
        .stats-category-stack {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .stats-cat-card {
          position: relative;
          border-radius: 16px;
          padding: 1rem 1rem 0.85rem;
          background: rgba(10, 14, 26, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-left: 3px solid var(--cat-bar, #64748b);
          box-shadow: -4px 0 22px var(--cat-glow, transparent);
          overflow: visible;
        }
        .stats-cat-card__glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 16px;
          box-shadow: inset 0 0 40px rgba(255, 255, 255, 0.02);
        }
        .stats-cat-name-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        .stats-cat-name {
          font-size: 1rem;
          font-weight: 900;
          color: #fff;
        }
        .stats-cat-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 800;
          padding: 0.25rem 0.55rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
          border: 1px solid var(--cat-bar, #64748b);
          box-shadow: 0 0 12px var(--cat-glow, transparent);
        }
        .stats-cat-count {
          margin: 0.2rem 0 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.9);
        }
        .stats-cat-status {
          margin: 0.35rem 0 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }
        .stats-cat-bar-wrap {
          position: relative;
          margin-top: 1.15rem;
          padding-top: 0.5rem;
        }
        .stats-cat-mascot {
          position: absolute;
          bottom: 100%;
          transform: translateX(-50%);
          font-size: 1.65rem;
          line-height: 1;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
          pointer-events: none;
          margin-bottom: 2px;
        }
        .stats-cat-bar-track {
          height: 10px;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .stats-cat-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 1.2s cubic-bezier(0.34, 1.15, 0.64, 1);
        }
        .stats-cat-quote {
          margin: 0.65rem 0 0;
          font-size: 0.8rem;
          font-style: italic;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.85);
          line-height: 1.4;
        }
        .stats-category-empty {
          text-align: center;
          padding: 2.5rem 1rem;
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          color: rgba(100, 116, 139, 0.9);
          font-size: 0.8rem;
        }
        .stats-category-empty .material-symbols-outlined {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
};

export default Stats;

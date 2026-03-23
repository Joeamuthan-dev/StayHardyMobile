import React, { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BottomNav from '../components/BottomNav';
import { supabase } from '../supabase';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistRoutinesRaw, persistRoutineLogsList, loadRoutinesRawStale, loadRoutineLogsListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  YAxis,
} from 'recharts';

interface RoutineData {
  id: string;
  title: string;
  days: string[];
  color: string;
  icon: string;
  category: string;
  completed?: boolean;
  missed?: boolean;
  isActiveToday?: boolean;
}

interface RoutineLog {
  routine_id: string;
  completed_at: string;
}

type RoutineRow = {
  id: string;
  title: string;
  days: string[];
  color: string;
  icon: string;
  category: string;
};

function mapFetchedToRoutineState(
  routinesData: RoutineRow[],
  logsData: RoutineLog[],
  userId: string,
): { mappedRoutines: RoutineData[]; logs: RoutineLog[] } {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayName = dayNames[now.getDay()];
  const yesterdayDayName = dayNames[yesterday.getDay()];
  const completedIdsToday = new Set(logsData.filter((l) => l.completed_at === todayStr).map((l) => l.routine_id));
  const completedIdsYesterday = new Set(
    logsData.filter((l) => l.completed_at === yesterdayStr).map((l) => l.routine_id),
  );
  const mapped = routinesData.map((r) => {
    const isActiveToday = r.days.includes(todayDayName);
    const isCompletedToday = completedIdsToday.has(r.id);
    const isActiveYesterday = r.days.includes(yesterdayDayName);
    const isCompletedYesterday = completedIdsYesterday.has(r.id);
    const isMissedYesterday = isActiveYesterday && !isCompletedYesterday;
    return { ...r, completed: isCompletedToday, missed: isMissedYesterday, isActiveToday };
  });

  const savedOrder = localStorage.getItem(`routine_order_${userId}`);
  if (savedOrder) {
    try {
      const orderArray = JSON.parse(savedOrder) as string[];
      mapped.sort((a, b) => {
        const idxA = orderArray.indexOf(a.id);
        const idxB = orderArray.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    } catch {
      /* ignore */
    }
  }

  return { mappedRoutines: mapped, logs: logsData };
}

const ROUTINE_ICONS = [
  // Sleep & Rest
  'bed', 'nightlight', 'dark_mode', 'alarm', 'snooze',
  // Food & Drink
  'restaurant', 'lunch_dining', 'local_cafe', 'coffee', 'water_drop', 'nutrition',
  // Gym & Fitness
  'fitness_center', 'directions_run', 'sports_gymnastics', 'exercise', 'sports_martial_arts',
  // Yoga & Mindfulness
  'self_improvement', 'spa', 'emoji_nature',
  // Work & Job
  'work', 'laptop_mac', 'business_center', 'schedule', 'task_alt',
  // Content & Video
  'play_circle', 'videocam', 'mic', 'photo_camera', 'edit_note',
  // Travel
  'flight', 'directions_car', 'commute', 'hiking', 'map',
  // Learning & Growth
  'menu_book', 'school', 'psychology', 'language', 'lightbulb',
  // Social & People
  'people', 'chat', 'handshake', 'family_restroom', 'volunteer_activism',
  // Health
  'favorite', 'local_hospital', 'pill', 'medical_information',
  // Home & Daily
  'home', 'cleaning_services', 'shower', 'wb_sunny', 'timer',
];


const DEFAULT_CATEGORIES = ['Health', 'Work', 'Mindset', 'Growth', 'Home', 'Social'];

type TimeRange = '7d' | '1m' | '3m' | '6m' | '1y';

type RoutineFilterChip = 'ALL' | 'HEALTH' | 'WORK' | 'SOCIAL' | 'FITNESS' | 'GROWTH';

const FILTER_CHIPS: RoutineFilterChip[] = ['ALL', 'HEALTH', 'WORK', 'SOCIAL', 'FITNESS', 'GROWTH'];

function categoryAccentBar(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('health')) return '#22c55e';
  if (c.includes('work')) return '#3b82f6';
  if (c.includes('social')) return '#f97316';
  if (c.includes('fitness') || c.includes('mindset')) return '#eab308';
  if (c.includes('growth')) return '#a855f7';
  return '#64748b';
}

function chartColorForCategory(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('growth')) return '#ef4444';
  if (c.includes('health')) return '#22c55e';
  if (c.includes('social')) return '#f97316';
  if (c.includes('work')) return '#3b82f6';
  if (c.includes('fitness') || c.includes('mindset')) return '#eab308';
  return '#94a3b8';
}

function routineMatchesFilterChip(routine: RoutineData, chip: RoutineFilterChip): boolean {
  if (chip === 'ALL') return true;
  const c = routine.category.toUpperCase();
  switch (chip) {
    case 'HEALTH':
      return c.includes('HEALTH');
    case 'WORK':
      return c.includes('WORK');
    case 'SOCIAL':
      return c.includes('SOCIAL');
    case 'FITNESS':
      return c.includes('FITNESS') || c.includes('MINDSET');
    case 'GROWTH':
      return c.includes('GROWTH');
    default:
      return true;
  }
}

function gradientIdForCategory(cat: string): string {
  return `routineArea-${cat.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function computeStreakDays(routines: RoutineData[], logs: RoutineLog[]): number {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const scheduled = routines.filter((r) => r.days.includes(dayName));
    if (scheduled.length === 0) continue;
    const scheduledIds = new Set(scheduled.map((r) => r.id));
    const anyDone = logs.some((l) => l.completed_at === dStr && scheduledIds.has(l.routine_id));
    if (anyDone) streak += 1;
    else break;
  }
  return streak;
}

/** Longest run of days (chronological) where at least one scheduled routine was completed. */
function computeBestStreak(routines: RoutineData[], logs: RoutineLog[]): number {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let best = 0;
  let cur = 0;
  for (let i = 400; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const scheduled = routines.filter((r) => r.days.includes(dayName));
    if (scheduled.length === 0) {
      cur = 0;
      continue;
    }
    const ids = new Set(scheduled.map((r) => r.id));
    const anyDone = logs.some((l) => l.completed_at === dStr && ids.has(l.routine_id));
    if (anyDone) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

/** Rolling 7-day completion vs scheduled slots (respects category filter). */
function weekDoneVsTotal(
  routines: RoutineData[],
  logs: RoutineLog[],
  filterChip: RoutineFilterChip,
): { done: number; total: number } {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let done = 0;
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const sched = routines.filter((r) => r.days.includes(dayName) && routineMatchesFilterChip(r, filterChip));
    total += sched.length;
    for (const r of sched) {
      if (logs.some((l) => l.routine_id === r.id && l.completed_at === dStr)) done++;
    }
  }
  return { done, total };
}

type SparkDay = {
  key: string;
  pct: number;
  isToday: boolean;
  state: 'done' | 'missed' | 'none';
  completed: number;
  scheduled: number;
  labelShort: string;
};

function buildLast7DaySparkline(
  routines: RoutineData[],
  logs: RoutineLog[],
  filterChip: RoutineFilterChip,
): SparkDay[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const labelShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const out: SparkDay[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    const dStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const sched = routines.filter((r) => r.days.includes(dayName) && routineMatchesFilterChip(r, filterChip));
    const isToday = dStr === todayStr;
    const lab = labelShort[d.getDay()];
    if (sched.length === 0) {
      out.push({ key: dStr, pct: 0, isToday, state: 'none', completed: 0, scheduled: 0, labelShort: lab });
      continue;
    }
    const completed = sched.filter((r) => logs.some((l) => l.routine_id === r.id && l.completed_at === dStr)).length;
    const pct = Math.round((completed / sched.length) * 100);
    const state: SparkDay['state'] = completed === 0 ? 'missed' : 'done';
    out.push({ key: dStr, pct, isToday, state, completed, scheduled: sched.length, labelShort: lab });
  }
  return out;
}

function windowCompletionPercent(
  routines: RoutineData[],
  logs: RoutineLog[],
  category: string,
  startDayOffset: number,
  numDays: number,
): number {
  const catRoutines = routines.filter((r) => r.category === category);
  if (catRoutines.length === 0) return 0;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let total = 0;
  let completed = 0;
  for (let i = 0; i < numDays; i++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - startDayOffset - i);
    const dStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    const sched = catRoutines.filter((r) => r.days.includes(dayName));
    total += sched.length;
    completed += logs.filter((l) => {
      if (l.completed_at !== dStr) return false;
      return sched.some((r) => r.id === l.routine_id);
    }).length;
  }
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function smoothPathThroughPoints(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const RoutineSparkAreaChart: React.FC<{
  days: SparkDay[];
  introActive: boolean;
}> = ({ days, introActive }) => {
  const lineRef = useRef<SVGPathElement>(null);
  const [dashLen, setDashLen] = useState(0);
  const fillGradId = useId().replace(/:/g, '');

  const { lineD, fillD, points, flatEmpty } = useMemo(() => {
    if (!days.length) {
      return { lineD: '', fillD: '', points: [] as { x: number; y: number; day: SparkDay }[], flatEmpty: true };
    }
    const n = days.length;
    const top = 10;
    const bottom = 58;
    const left = 12;
    const right = 308;
    const span = n > 1 ? (right - left) / (n - 1) : 0;
    const hasAny = days.some((d) => d.completed > 0);
    const pts = days.map((d, i) => {
      const x = left + i * span;
      const y = hasAny ? bottom - (d.pct / 100) * (bottom - top) : bottom;
      return { x, y };
    });
    const line = smoothPathThroughPoints(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const fill =
      pts.length && first && last
        ? `${line} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`
        : '';
    return { lineD: line, fillD: fill, points: pts.map((p, i) => ({ ...p, day: days[i] })), flatEmpty: !hasAny };
  }, [days]);

  useEffect(() => {
    if (!introActive || !lineRef.current) return;
    const len = lineRef.current.getTotalLength();
    setDashLen(Math.max(1, len));
  }, [introActive, lineD]);

  return (
    <div className="routine-spark-chart-outer">
      <div className="routine-spark-chart-svg-wrap">
        <svg
          className="routine-spark-chart-svg"
          viewBox="0 0 320 80"
          preserveAspectRatio="none"
          width="100%"
          height={80}
        >
          <defs>
            <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,232,122,0.3)" />
              <stop offset="100%" stopColor="rgba(0,232,122,0)" />
            </linearGradient>
          </defs>
          {fillD ? (
            <path
              d={fillD}
              fill={`url(#${fillGradId})`}
              className={`routine-spark-area-fill ${introActive ? 'routine-spark-area-fill--animate' : ''}`}
            />
          ) : null}
          {lineD ? (
            <path
              ref={lineRef}
              d={lineD}
              fill="none"
              stroke="#00E87A"
              strokeWidth={2}
              strokeLinecap="round"
              className={`routine-spark-line ${introActive && dashLen > 0 ? 'routine-spark-line--animate' : ''}`}
              style={
                {
                  ['--spark-dash' as string]: dashLen,
                } as React.CSSProperties
              }
            />
          ) : null}
          {points.map(({ x, y, day }) => (
            <circle
              key={day.key}
              cx={x}
              cy={y}
              r={3}
              fill="#00E87A"
              stroke="#080c0a"
              strokeWidth={2}
              className="routine-spark-dot"
              style={{ cursor: 'pointer' }}
            >
              <title>
                {day.scheduled === 0
                  ? `${day.labelShort}: No routines scheduled`
                  : `${day.labelShort}: ${day.completed} completed`}
              </title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="routine-spark-chart-xlabels">
        {days.map((d) => (
          <span key={d.key} className={`routine-spark-xlab${d.isToday ? ' routine-spark-xlab--today' : ''}`}>
            {d.labelShort}
          </span>
        ))}
      </div>
      {flatEmpty && (
        <p className="routine-spark-chart-empty-msg">Start completing routines to see your trend</p>
      )}
    </div>
  );
};

const PremiumRoutineCard: React.FC<{
  routine: RoutineData;
  toggleCompletion: (r: RoutineData) => void;
  index: number;
  barColor: string;
  flash?: boolean;
}> = ({ routine, toggleCompletion, index, barColor, flash }) => {
  const done = !!routine.completed;
  const style: React.CSSProperties = {
    animationDelay: `${index * 70}ms`,
  };
  return (
    <div
      style={style}
      className={`premium-routine-card ${done ? 'premium-routine-card--done' : ''} ${flash ? 'premium-routine-card--flash' : ''}`}
    >
      {done && <span className="premium-routine-card__done-check material-symbols-outlined" aria-hidden>check_circle</span>}
      <div className="premium-routine-card__bar" style={{ background: barColor, boxShadow: `0 0 14px ${barColor}66` }} />
      <div className="premium-routine-card__body">
        <div className="premium-routine-card__left">
          <div className="routine-icon-neo" style={{ color: barColor }}>
            <span className="material-symbols-outlined">{routine.icon}</span>
          </div>
          <div className="premium-routine-card__text">
            <div className="routine-cat-pill" style={{ borderColor: `${barColor}55`, background: `${barColor}14` }}>
              <span className="routine-cat-pill__dot" style={{ background: barColor }} />
              <span className="routine-cat-pill__label">{routine.category}</span>
            </div>
            <h3 className="premium-routine-card__title">{routine.title}</h3>
          </div>
        </div>
        <button
          type="button"
          className={`neon-toggle ${done ? 'neon-toggle--on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleCompletion(routine);
          }}
          aria-pressed={done}
          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
        >
          <span className="neon-toggle__glow" />
          <span className="neon-toggle__knob" />
        </button>
      </div>
      <div className="premium-routine-card__progress-track">
        <div
          className="premium-routine-card__progress-fill"
          style={{
            width: done ? '100%' : '0%',
            background: `linear-gradient(90deg, ${barColor}, #fff)`,
            boxShadow: done ? `0 0 12px ${barColor}` : 'none',
          }}
        />
      </div>
    </div>
  );
};

const Routine: React.FC = () => {
  const { user } = useAuth();
  useLanguage();
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  const [activeStatCategory, setActiveStatCategory] = useState('All');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [filterChip, setFilterChip] = useState<RoutineFilterChip>('ALL');
  const [streakBannerMounted, setStreakBannerMounted] = useState(true);
  const [streakBannerLeaving, setStreakBannerLeaving] = useState(false);
  const [previewConsistencyTab, setPreviewConsistencyTab] = useState<'7d' | '1m' | '3m'>('7d');
  const [consistencyFullExpanded, setConsistencyFullExpanded] = useState(false);
  const [dailyListExpanded, setDailyListExpanded] = useState(false);
  const [flashRoutineId, setFlashRoutineId] = useState<string | null>(null);
  const [consistencyIntro, setConsistencyIntro] = useState(false);
  const [streakDisplay, setStreakDisplay] = useState(0);

  const dismissStreakBanner = useCallback(() => {
    setStreakBannerLeaving(true);
    window.setTimeout(() => setStreakBannerMounted(false), 420);
  }, []);

  // Form State
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#10b981');
  const [selectedIcon, setSelectedIcon] = useState('fitness_center');
  const [selectedCategory, setSelectedCategory] = useState('Health');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const lastFetchedLogsRangeRef = useRef<string | null>(null);

  const persistRoutineCaches = useCallback((uid: string, r: RoutineData[], l: RoutineLog[]) => {
    const rawRows: RoutineRow[] = r.map(({ completed, missed, isActiveToday, ...rest }) => rest as RoutineRow);
    void persistRoutinesRaw(uid, rawRows);
    void persistRoutineLogsList(uid, l);
  }, []);

  const categories = useMemo(() => {
    const fromRoutines = Array.from(new Set(routines.map(r => r.category)));
    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...fromRoutines]));
    return merged.sort();
  }, [routines]);

  const toggleSidebar = () => {
    const newState = !isSidebarHidden;
    setIsSidebarHidden(newState);
    localStorage.setItem('sidebarHidden', newState.toString());
  };

  const fetchRoutinesAndLogs = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const rawR = await loadRoutinesRawStale<RoutineRow>(user.id);
        const rawL = await loadRoutineLogsListStale<RoutineLog>(user.id);
        if (rawR !== null && rawL !== null) {
          const { mappedRoutines, logs } = mapFetchedToRoutineState(rawR, rawL, user.id);
          setLogs(logs);
          setRoutines(mappedRoutines);
        }

        const routinesExp = await isCacheExpired(CACHE_KEYS.routines_list, CACHE_EXPIRY_MINUTES.routines_list);
        const logsExp = await isCacheExpired(CACHE_KEYS.routine_logs_list, CACHE_EXPIRY_MINUTES.routines_list);
        const needNetwork =
          options?.force ||
          rawR === null ||
          rawL === null ||
          routinesExp ||
          logsExp ||
          lastFetchedLogsRangeRef.current !== timeRange;

        if (!needNetwork) {
          return;
        }

        const { data: routinesData, error: rError } = await supabase
          .from('routines')
          .select('id, title, days, color, icon, category')
          .eq('user_id', user.id);
        if (rError) throw rError;
        const now = new Date();
        let daysToFetch = 7;
        if (timeRange === '7d') daysToFetch = 7;
        else if (timeRange === '1m') daysToFetch = 30;
        else if (timeRange === '3m') daysToFetch = 90;
        else if (timeRange === '6m') daysToFetch = 180;
        else if (timeRange === '1y') daysToFetch = 365;
        const startDate = new Date();
        startDate.setDate(now.getDate() - daysToFetch);
        const startDayStr = startDate.toISOString().split('T')[0];
        const { data: logsData, error: lError } = await supabase
          .from('routine_logs')
          .select('routine_id, completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', startDayStr);
        if (lError) throw lError;

        const logsArr = logsData || [];
        const rrows = routinesData || [];
        await persistRoutinesRaw(user.id, rrows);
        await persistRoutineLogsList(user.id, logsArr);
        lastFetchedLogsRangeRef.current = timeRange;

        const { mappedRoutines, logs } = mapFetchedToRoutineState(rrows, logsArr, user.id);
        setLogs(logs);
        setRoutines(mappedRoutines);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, timeRange],
  );

  useEffect(() => {
    void fetchRoutinesAndLogs();
  }, [fetchRoutinesAndLogs]);

  useEffect(() => {
    const h = () => void fetchRoutinesAndLogs({ force: true });
    window.addEventListener(AFTER_SYNC_FLUSH_EVENT, h);
    return () => window.removeEventListener(AFTER_SYNC_FLUSH_EVENT, h);
  }, [fetchRoutinesAndLogs]);

  // Automatic Daily Reset Check at Midnight
  useEffect(() => {
    const checkMidnight = () => {
      const lastCheck = localStorage.getItem('last_routine_reset_date');
      const today = new Date().toLocaleDateString();
      if (lastCheck && lastCheck !== today) {
        console.log('Midnight detected. Resetting daily routines UI.');
        fetchRoutinesAndLogs();
      }
      localStorage.setItem('last_routine_reset_date', today);
    };

    const interval = setInterval(checkMidnight, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [fetchRoutinesAndLogs]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-routine') {
      setShowModal(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  // --- Dynamic Chart Data Calculation ---
  const lineChartData = useMemo(() => {
    const result = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const useMonthlyAggregation = (timeRange !== '7d' && timeRange !== '1m');
    const activeCategories = Array.from(new Set(routines.map(r => r.category)));

    if (useMonthlyAggregation) {
      let monthsToCover = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
      for (let i = monthsToCover - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const xAxisLabel = `${monthsShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
        const dataPoint: any = { date: xAxisLabel };
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        activeCategories.forEach(cat => {
          const catRoutines = routines.filter(r => r.category === cat);
          let monthScheduled = 0;
          let monthCompleted = 0;
          for (let day = new Date(monthStart); day <= monthEnd && day <= now; day.setDate(day.getDate() + 1)) {
            const dayName = days[day.getDay()];
            const dStr = day.toISOString().split('T')[0];
            const scheduledToday = catRoutines.filter(r => r.days.includes(dayName));
            monthScheduled += scheduledToday.length;
            const completedToday = logs.filter(l => {
              const routine = catRoutines.find(r => r.id === l.routine_id);
              return l.completed_at === dStr && !!routine;
            }).length;
            monthCompleted += completedToday;
          }
          dataPoint[cat] = monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : 0;
        });
        result.push(dataPoint);
      }
    } else {
      const daysToCover = timeRange === '7d' ? 7 : 30;
      for (let i = daysToCover - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        const xAxisLabel = `${monthsShort[d.getMonth()]} ${d.getDate()}`;
        const dataPoint: any = { date: xAxisLabel };
        activeCategories.forEach(cat => {
          const scheduled = routines.filter(r => r.category === cat && r.days.includes(dayName));
          const completedCount = logs.filter(l => {
            const routine = routines.find(r => r.id === l.routine_id);
            return l.completed_at === dStr && routine?.category === cat;
          }).length;
          dataPoint[cat] = scheduled.length > 0 ? Math.round((completedCount / scheduled.length) * 100) : 0;
        });
        result.push(dataPoint);
      }
    }
    return result;
  }, [logs, routines, timeRange]);

  const categoryAverages = useMemo(() => {
    return categories.map(cat => {
      const catRoutines = routines.filter(r => r.category === cat);
      if (catRoutines.length === 0) return { category: cat, average: 0, color: '#64748b' };
      let totalPoints = 0;
      let completedPoints = 0;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let daysBack = timeRange === '7d' ? 7 : timeRange === '1m' ? 30 : timeRange === '3m' ? 90 : timeRange === '6m' ? 180 : 365;
      for (let i = 0; i < daysBack; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = dayNames[d.getDay()];
        const scheduledToday = catRoutines.filter(r => r.days.includes(dayName));
        totalPoints += scheduledToday.length;
        const completedToday = logs.filter(l => {
          const routine = catRoutines.find(r => r.id === l.routine_id);
          return l.completed_at === d.toISOString().split('T')[0] && !!routine;
        }).length;
        completedPoints += completedToday;
      }
      return { category: cat, average: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0, color: catRoutines[0]?.color || '#10b981' };
    }).filter(c => routines.some(r => r.category === c.category));
  }, [routines, logs, categories, timeRange]);

  const streakCount = useMemo(() => computeStreakDays(routines, logs), [routines, logs]);

  const { todayDoneCount, todayTotalCount, ringPct } = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayDayName = dayNames[new Date().getDay()];
    const todayRoutinesAll = routines.filter((r) => r.days.includes(todayDayName));
    const todayFiltered = todayRoutinesAll.filter((r) => routineMatchesFilterChip(r, filterChip));
    const done = todayFiltered.filter((r) => r.completed).length;
    const total = todayFiltered.length;
    return {
      todayDoneCount: done,
      todayTotalCount: total,
      ringPct: total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0,
    };
  }, [routines, filterChip]);

  const categoryWeeklyDelta = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((cat) => {
      if (!routines.some((r) => r.category === cat)) return;
      const curr = windowCompletionPercent(routines, logs, cat, 0, 7);
      const prev = windowCompletionPercent(routines, logs, cat, 7, 7);
      map[cat] = curr - prev;
    });
    return map;
  }, [routines, logs, categories]);

  const chartCategories = useMemo(() => {
    const set = new Set(routines.map((r) => r.category));
    return Array.from(set);
  }, [routines]);

  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayKey = dayNamesShort[new Date().getDay()];

  const orderedForToday = useMemo(() => {
    const list = routines.filter((r) => r.days.includes(todayKey) && routineMatchesFilterChip(r, filterChip));
    let order: string[] = [];
    if (user?.id) {
      const saved = localStorage.getItem(`routine_order_${user.id}`);
      if (saved) {
        try {
          order = JSON.parse(saved) as string[];
        } catch {
          order = [];
        }
      }
    }
    const inList = new Set(list.map((r) => r.id));
    const byId = new Map(list.map((r) => [r.id, r]));
    const head = order.filter((id) => inList.has(id));
    const tail = list.map((r) => r.id).filter((id) => !head.includes(id));
    const orderedIds = [...new Set([...head, ...tail])];
    const ordered = orderedIds.map((id) => byId.get(id)!);
    const pending = ordered.filter((r) => !r.completed);
    const done = ordered.filter((r) => r.completed);
    return [...pending, ...done];
  }, [routines, todayKey, filterChip, user?.id]);

  const bestStreakAllTime = useMemo(() => computeBestStreak(routines, logs), [routines, logs]);

  const weekDoneStat = useMemo(
    () => weekDoneVsTotal(routines, logs, filterChip),
    [routines, logs, filterChip],
  );

  const sparklineDays = useMemo(
    () => buildLast7DaySparkline(routines, logs, filterChip),
    [routines, logs, filterChip],
  );

  const weekProgressPct = useMemo(() => {
    if (weekDoneStat.total <= 0) return 0;
    return Math.min(100, (weekDoneStat.done / weekDoneStat.total) * 100);
  }, [weekDoneStat.done, weekDoneStat.total]);

  useEffect(() => {
    if (previewConsistencyTab === '7d') setTimeRange('7d');
    else if (previewConsistencyTab === '1m') setTimeRange('1m');
    else setTimeRange('3m');
  }, [previewConsistencyTab]);

  useEffect(() => {
    setDailyListExpanded(false);
  }, [filterChip]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setConsistencyIntro(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!consistencyIntro) return;
    const start = performance.now();
    const from = 0;
    const to = streakCount;
    const dur = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - p) * (1 - p);
      setStreakDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [consistencyIntro, streakCount]);

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title) return;
    const finalCategory = isAddingNewCategory ? newCategory : selectedCategory;
    const online = await isOnline();
    if (!online) {
      const tempId = crypto.randomUUID();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const optimistic: RoutineData = {
        id: tempId,
        title,
        days: selectedDays,
        color,
        icon: selectedIcon,
        category: finalCategory,
        completed: false,
        missed: false,
        isActiveToday: selectedDays.includes(dayNames[new Date().getDay()]),
      };
      const mergedR = [...routines, optimistic];
      setRoutines(mergedR);
      persistRoutineCaches(user.id, mergedR, logs);
      await enqueueSync({
        action: 'create',
        entity: 'routine',
        data: {
          row: {
            user_id: user.id,
            title,
            days: selectedDays,
            color,
            icon: selectedIcon,
            category: finalCategory,
          },
        },
        timestamp: Date.now(),
      });
      void invalidateUserStatsCache();
      setShowModal(false);
      setTitle('');
      setSelectedIcon('fitness_center');
      setIsAddingNewCategory(false);
      setNewCategory('');
      return;
    }
    try {
      const { error } = await supabase.from('routines').insert([{ user_id: user.id, title, days: selectedDays, color, icon: selectedIcon, category: finalCategory }]).select();
      if (error) throw error;
      setShowModal(false); setTitle(''); setSelectedIcon('fitness_center'); setIsAddingNewCategory(false); setNewCategory(''); void fetchRoutinesAndLogs({ force: true });
    } catch (err: any) { alert(`Failed to create routine: ${err.message}`); }
  };

  const toggleCompletion = async (routine: RoutineData) => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const isNowCompleted = !routine.completed;

    const nextRoutines = routines.map((r) =>
      r.id === routine.id ? { ...r, completed: isNowCompleted } : r,
    );
    let nextLogs: RoutineLog[];
    if (isNowCompleted) {
      const exists = logs.find((l) => l.routine_id === routine.id && l.completed_at === today);
      nextLogs = exists ? logs : [...logs, { routine_id: routine.id, completed_at: today }];
    } else {
      nextLogs = logs.filter((l) => !(l.routine_id === routine.id && l.completed_at === today));
    }

    setRoutines(nextRoutines);
    setLogs(nextLogs);

    if (isNowCompleted) {
      setFlashRoutineId(routine.id);
      window.setTimeout(() => setFlashRoutineId(null), 700);
    }

    const online = await isOnline();
    if (!online) {
      if (isNowCompleted) {
        await enqueueSync({
          action: 'create',
          entity: 'routine_log',
          data: { routine_id: routine.id, completed_at: today },
          timestamp: Date.now(),
        });
      } else {
        await enqueueSync({
          action: 'delete',
          entity: 'routine_log',
          data: { routine_id: routine.id, completed_at: today },
          timestamp: Date.now(),
        });
      }
      persistRoutineCaches(user.id, nextRoutines, nextLogs);
      void invalidateUserStatsCache();
      void syncWidgetData();
      return;
    }

    try {
      if (isNowCompleted) {
        const { error } = await supabase.from('routine_logs').insert([{
          routine_id: routine.id,
          user_id: user.id,
          completed_at: today
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routine_logs')
          .delete()
          .eq('routine_id', routine.id)
          .eq('user_id', user.id)
          .eq('completed_at', today);
        if (error) throw error;
      }
      void syncWidgetData();
      void invalidateUserStatsCache();
      persistRoutineCaches(user.id, nextRoutines, nextLogs);
    } catch (err) {
      console.error('Failed to sync routine status:', err);
      setRoutines((prev) => prev.map((r) =>
        r.id === routine.id ? { ...r, completed: !isNowCompleted } : r,
      ));
      if (isNowCompleted) {
        setLogs((prev) => prev.filter((l) => !(l.routine_id === routine.id && l.completed_at === today)));
      } else {
        setLogs((prev) => [...prev, { routine_id: routine.id, completed_at: today }]);
      }
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this routine?')) return;
    if (!user?.id) return;
    const prevR = routines;
    const prevL = logs;
    const nextR = prevR.filter((r) => r.id !== id);
    const nextL = prevL.filter((l) => l.routine_id !== id);
    setRoutines(nextR);
    setLogs(nextL);

    const online = await isOnline();
    if (!online) {
      await enqueueSync({ action: 'delete', entity: 'routine', data: { id }, timestamp: Date.now() });
      persistRoutineCaches(user.id, nextR, nextL);
      void invalidateUserStatsCache();
      return;
    }
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      persistRoutineCaches(user.id, nextR, nextL);
      void invalidateUserStatsCache();
    } catch (err) {
      console.error('Error deleting routine:', err);
      setRoutines(prevR);
      setLogs(prevL);
    }
  };


  const visibleDailyRoutines = dailyListExpanded ? orderedForToday : orderedForToday.slice(0, 4);
  const dailyMoreCount = Math.max(0, orderedForToday.length - 4);
  const showDailyMoreButton = orderedForToday.length > 4;

  const miniRingR = 11;
  const miniRingCirc = 2 * Math.PI * miniRingR;
  const miniRingOffset = miniRingCirc - (ringPct / 100) * miniRingCirc;

  const scoreCards = categoryAverages.slice(0, 4);
  const legendCategories =
    chartCategories.length > 0 ? chartCategories.slice(0, 5) : categoryAverages.map((c) => c.category).slice(0, 5);

  return (
    <div className={`page-shell routine-page routine-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1" />
        <div className="aurora-gradient-2" />
      </div>

      <header className="routine-premium-header">
        <div className="routine-premium-header__row routine-premium-header__row--nav">
          <div className="routine-premium-header__nav-left">
            <button
              type="button"
              onClick={toggleSidebar}
              className="notification-btn desktop-only-btn routine-header-icon-btn"
              aria-label="Toggle sidebar"
            >
              <span className="material-symbols-outlined">{isSidebarHidden ? 'side_navigation' : 'fullscreen'}</span>
            </button>
          </div>
          <div className="routine-premium-header__title-block">
            <h1 className="routine-premium-title">ROUTINES</h1>
            <div className="routine-marquee-lines">
              <div className="routine-marquee-line" />
              <div className="routine-marquee-track" aria-hidden>
                <div className="routine-marquee-inner">
                  <span>
                    DAILY DISCIPLINE · HIGH PERFORMANCE · ROUTINE = RESULTS · DAILY DISCIPLINE · HIGH PERFORMANCE · ROUTINE =
                    RESULTS ·{' '}
                  </span>
                  <span>
                    DAILY DISCIPLINE · HIGH PERFORMANCE · ROUTINE = RESULTS · DAILY DISCIPLINE · HIGH PERFORMANCE · ROUTINE =
                    RESULTS ·{' '}
                  </span>
                </div>
              </div>
              <div className="routine-marquee-line" />
            </div>
          </div>
          <div className="routine-premium-header__nav-spacer" aria-hidden />
        </div>
        <div
          className="routine-header-progress-wrap"
          role="progressbar"
          aria-valuenow={todayTotalCount ? Math.round((todayDoneCount / todayTotalCount) * 100) : 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Today routines completed"
        >
          <div
            className="routine-header-progress-fill"
            style={{
              width: `${todayTotalCount ? Math.min(100, (todayDoneCount / todayTotalCount) * 100) : 0}%`,
            }}
          />
        </div>
      </header>

      <div className="routine-premium-scroll">
        {streakBannerMounted && (
          <div className={`streak-glass-banner ${streakBannerLeaving ? 'streak-glass-banner--leave' : ''}`}>
            <div className="streak-glass-banner__accent" />
            <span className="material-symbols-outlined streak-glass-banner__sparkle">auto_awesome</span>
            <div className="streak-glass-banner__copy">
              <p className="streak-glass-banner__head">Streak command center</p>
              <p className="streak-glass-banner__sub">
                Log today&apos;s habits before midnight. Consistency stats update as you close the loop.
              </p>
            </div>
            <button type="button" className="streak-glass-banner__close" onClick={dismissStreakBanner} aria-label="Dismiss">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        <div className="routine-consistency-preview-wrap">
          <div className={`routine-consistency-preview routine-consistency-preview--premium ${consistencyIntro ? 'routine-consistency-preview--intro' : ''}`}>
            <div className="routine-consistency-preview__head routine-consistency-preview__head--premium">
              <span className="routine-consistency-preview__label routine-consistency-preview__label--premium">CONSISTENCY STATS</span>
              <div className="routine-consistency-preview__tabs" role="presentation">
                {(['7d', '1m', '3m'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`routine-consistency-preview__tab ${previewConsistencyTab === tab ? 'routine-consistency-preview__tab--active' : ''}`}
                    onClick={() => setPreviewConsistencyTab(tab)}
                  >
                    {tab === '7d' ? '7D' : tab === '1m' ? '1M' : '3M'}
                  </button>
                ))}
              </div>
            </div>

            <div className="routine-consistency-stat-row">
              <div className="routine-consistency-stat routine-consistency-stat--0">
                <span className="routine-consistency-stat__flame" aria-hidden>
                  🔥
                </span>
                <span className="routine-consistency-stat__value routine-consistency-stat__value--lg">{streakDisplay}</span>
                <span className="routine-consistency-stat__subl">Day Streak</span>
              </div>
              <div className="routine-consistency-stat-divider" aria-hidden />
              <div className="routine-consistency-stat routine-consistency-stat--1">
                <div className="routine-consistency-stat__ring-wrap" title={`${todayDoneCount} of ${todayTotalCount} today`}>
                  <svg width={28} height={28} viewBox="0 0 28 28" className="routine-mini-ring-svg">
                    <circle cx="14" cy="14" r={miniRingR} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle
                      cx="14"
                      cy="14"
                      r={miniRingR}
                      fill="none"
                      stroke="#00E87A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={miniRingCirc}
                      strokeDashoffset={miniRingCirc}
                      transform="rotate(-90 14 14)"
                      className={`routine-mini-ring-progress ${consistencyIntro ? 'routine-mini-ring-progress--go' : ''}`}
                      style={
                        {
                          ['--mini-ring-start' as string]: String(miniRingCirc),
                          ['--mini-ring-end' as string]: String(miniRingOffset),
                        } as React.CSSProperties
                      }
                    />
                  </svg>
                </div>
                <span className="routine-consistency-stat__value">
                  {todayDoneCount}/{todayTotalCount || 0}
                </span>
                <span className="routine-consistency-stat__subl">Today</span>
              </div>
              <div className="routine-consistency-stat-divider" aria-hidden />
              <div className="routine-consistency-stat routine-consistency-stat--2">
                <span className="material-symbols-outlined routine-consistency-stat__check-ic" aria-hidden>
                  check_circle
                </span>
                <div className="routine-consistency-stat__value-row">
                  <span className="routine-consistency-stat__value">
                    {weekDoneStat.done}/{weekDoneStat.total}
                  </span>
                  <span className="routine-consistency-stat__done-muted">done</span>
                </div>
                <span className="routine-consistency-stat__subl">This Week</span>
                <div className="routine-consistency-week-bar">
                  <div
                    className={`routine-consistency-week-bar__fill ${consistencyIntro ? 'routine-consistency-week-bar__fill--go' : ''}`}
                    style={{ ['--week-pct' as string]: `${weekProgressPct}%` }}
                  />
                </div>
              </div>
              <div className="routine-consistency-stat-divider" aria-hidden />
              <div className="routine-consistency-stat routine-consistency-stat--3">
                <span className="routine-consistency-stat__trophy" aria-hidden>
                  🏆
                </span>
                <div className="routine-consistency-stat__value-row">
                  <span className="routine-consistency-stat__value">{bestStreakAllTime}</span>
                  <span className="routine-consistency-stat__days-muted">days</span>
                </div>
                <span className="routine-consistency-stat__subl">Best</span>
                <div className="routine-consistency-best-dots" aria-hidden>
                  {sparklineDays.map((d, i) => (
                    <span
                      key={d.key}
                      className={`routine-consistency-best-dot ${d.state === 'done' ? 'routine-consistency-best-dot--on' : ''} ${consistencyIntro ? 'routine-consistency-best-dot--in' : ''}`}
                      style={{ animationDelay: `${0.7 + i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="routine-consistency-chart-block">
              <RoutineSparkAreaChart days={sparklineDays} introActive={consistencyIntro} />
            </div>

            <div className="routine-consistency-preview__footer">
              <button
                type="button"
                className={`routine-consistency-preview__link-btn ${consistencyFullExpanded ? 'routine-consistency-preview__link-btn--expanded' : ''}`}
                onClick={() => setConsistencyFullExpanded((open) => !open)}
                aria-expanded={consistencyFullExpanded}
              >
                <span className="routine-consistency-preview__link-text routine-consistency-preview__link-text--collapsed">
                  See Full Report →
                </span>
                <span className="routine-consistency-preview__link-text routine-consistency-preview__link-text--expanded">
                  ↑ Minimize Report
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className={`routine-consistency-expand ${consistencyFullExpanded ? 'routine-consistency-expand--open' : ''}`}
          aria-hidden={!consistencyFullExpanded}
        >
        <section className="routine-section routine-consistency-section">
          <div className="routine-chart-head">
            <h2 className="routine-chart-bebas">ROUTINE CONSISTENCY</h2>
            <div className="routine-range-pills">
              {(['7d', '1m', '3m', '6m', '1y'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`routine-range-pill ${timeRange === range ? 'routine-range-pill--active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="routine-chart-glass">
            <div className="routine-chart-glass__shimmer" />
            <div className="routine-chart-area-wrap">
              {chartCategories.length === 0 ? (
                <div className="routine-chart-empty">Create routines to unlock your consistency chart.</div>
              ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={lineChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {chartCategories.map((cat) => {
                      const col = chartColorForCategory(cat);
                      return (
                        <linearGradient key={cat} id={gradientIdForCategory(cat)} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={col} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={col} stopOpacity={0} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} strokeDasharray="4 6" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: 'rgba(148,163,184,0.9)',
                      fontSize: 9,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600,
                    }}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: '#0b1220',
                      border: '1px solid rgba(52,211,153,0.25)',
                      borderRadius: '12px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                    }}
                  />
                  {activeStatCategory === 'All'
                    ? chartCategories.map((cat) => (
                        <Area
                          key={cat}
                          type="monotone"
                          dataKey={cat}
                          stroke={chartColorForCategory(cat)}
                          strokeWidth={2}
                          fill={`url(#${gradientIdForCategory(cat)})`}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))
                    : (
                        <Area
                          type="monotone"
                          dataKey={activeStatCategory}
                          stroke={chartColorForCategory(activeStatCategory)}
                          strokeWidth={2.5}
                          fill={`url(#${gradientIdForCategory(activeStatCategory)})`}
                          dot={false}
                        />
                      )}
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className="routine-chart-legend">
              {legendCategories.map((cat) => (
                <div key={cat} className="routine-chart-legend__item">
                  <span className="routine-chart-legend__dot" style={{ background: chartColorForCategory(cat) }} />
                  <span className="routine-chart-legend__text">{cat}</span>
                </div>
              ))}
            </div>
            <div className="routine-chart-cat-icons">
              <button
                type="button"
                className={`routine-cat-icon-btn ${activeStatCategory === 'All' ? 'routine-cat-icon-btn--on' : ''}`}
                onClick={() => setActiveStatCategory('All')}
                aria-label="All categories"
              >
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              {categoryAverages.slice(0, 4).map((cat) => (
                <button
                  key={cat.category}
                  type="button"
                  className={`routine-cat-icon-btn ${activeStatCategory === cat.category ? 'routine-cat-icon-btn--on' : ''}`}
                  onClick={() => setActiveStatCategory(cat.category)}
                  aria-label={cat.category}
                >
                  <span className="material-symbols-outlined">
                    {routines.find((r) => r.category === cat.category)?.icon || 'category'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="routine-score-grid">
            {scoreCards.map((cat, idx) => {
              const col = chartColorForCategory(cat.category);
              const delta = categoryWeeklyDelta[cat.category] ?? 0;
              const r = 22;
              const c = 2 * Math.PI * r;
              const off = c - (cat.average / 100) * c;
              const gid = `scoreGrad-${idx}-${cat.category.replace(/[^a-zA-Z0-9]/g, '')}`;
              return (
                <div
                  key={cat.category}
                  className="routine-score-card"
                  style={{ ['--accent' as string]: col } as React.CSSProperties}
                >
                  <div className="routine-score-card__main">
                    <div className="routine-score-ring">
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <defs>
                          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={col} />
                            <stop offset="100%" stopColor="#fff" stopOpacity={0.35} />
                          </linearGradient>
                        </defs>
                        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                        <circle
                          cx="28"
                          cy="28"
                          r={r}
                          fill="none"
                          stroke={`url(#${gid})`}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={c}
                          strokeDashoffset={off}
                          transform="rotate(-90 28 28)"
                          className="routine-score-ring__stroke"
                        />
                      </svg>
                      <span className="routine-score-pct">{cat.average}%</span>
                    </div>
                    <div className="routine-score-meta">
                      <span className="routine-score-name">{cat.category}</span>
                      <span className="routine-score-sublabel">Consistency</span>
                    </div>
                  </div>
                  <div className={`routine-score-delta ${delta >= 0 ? 'routine-score-delta--up' : 'routine-score-delta--down'}`}>
                    <span className="material-symbols-outlined" aria-hidden>
                      {delta >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    <span>{delta >= 0 ? '+' : ''}{delta}%</span>
                    <span className="routine-score-delta__hint">vs prior week</span>
                  </div>
                  <div className="routine-score-card__accent-line" />
                </div>
              );
            })}
          </div>
        </section>
        </div>

        <section className="routine-section routine-daily-actions-premium">
          <div className="routine-section__head">
            <h2 className="routine-section__title">Daily Actions</h2>
            <div className="routine-section__head-actions">
              <button type="button" className="routine-link-btn" onClick={() => setShowAllModal(true)}>
                View All
              </button>
              <button type="button" className="routine-create-pill" onClick={() => setShowModal(true)}>
                <span className="material-symbols-outlined">add</span>
                Create Routine
              </button>
            </div>
          </div>
          <div className="routine-filter-chips" role="tablist" aria-label="Category filter">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                role="tab"
                aria-selected={filterChip === chip}
                className={`routine-filter-chip ${filterChip === chip ? 'routine-filter-chip--active' : ''}`}
                onClick={() => setFilterChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="routine-daily-scroll">
            <div className="routine-cards-stack">
              {loading ? (
                <div className="routine-syncing">Syncing…</div>
              ) : routines.length === 0 ? (
                <button type="button" className="routine-empty-tile" onClick={() => setShowModal(true)}>
                  Add your first habit.
                </button>
              ) : orderedForToday.length === 0 ? (
                <p className="routine-filter-empty">
                  No routines scheduled today for this filter. Try ALL or another category.
                </p>
              ) : (
                visibleDailyRoutines.map((routine, index) => (
                  <PremiumRoutineCard
                    key={routine.id}
                    routine={routine}
                    index={index}
                    barColor={categoryAccentBar(routine.category)}
                    toggleCompletion={toggleCompletion}
                    flash={flashRoutineId === routine.id}
                  />
                ))
              )}
            </div>
          </div>
          {showDailyMoreButton && !loading && orderedForToday.length > 0 && (
            <button
              type="button"
              className="routine-daily-show-more"
              onClick={() => setDailyListExpanded((v) => !v)}
              aria-expanded={dailyListExpanded}
            >
              <span>
                {dailyListExpanded ? 'Show less' : `Show ${dailyMoreCount} more`}
              </span>
              <span className="material-symbols-outlined routine-daily-show-more__chev" aria-hidden>
                {dailyListExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
            </button>
          )}
        </section>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', padding: '2rem', borderRadius: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>New Routine</h2><button onClick={() => setShowModal(false)} className="notification-btn"><span className="material-symbols-outlined">close</span></button></div>
            <form onSubmit={handleCreateRoutine} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group"><label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>WHAT'S THE HABIT?</label><input autoFocus className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 5 AM Run" required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} /></div>
              <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.75rem', display: 'block' }}>CATEGORY</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>{categories.map(cat => <div key={cat} onClick={() => { setSelectedCategory(cat); setIsAddingNewCategory(false); }} className={`form-cat-pill ${!isAddingNewCategory && selectedCategory === cat ? 'active' : ''}`}>{cat}</div>)}<div onClick={() => setIsAddingNewCategory(true)} className={`form-cat-pill add-custom ${isAddingNewCategory ? 'active' : ''}`}> + Custom </div></div>
                {isAddingNewCategory && <input className="form-input" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category Name..." style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} />}
              </div>
              <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>ICON</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>{ROUTINE_ICONS.map(iconName => <div key={iconName} onClick={() => setSelectedIcon(iconName)} className={`form-icon-option ${selectedIcon === iconName ? 'active' : ''}`} style={{ '--active-color': color } as any}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{iconName}</span></div>)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>COLOR</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {['#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#14b8a6'].map(c => (
                      <div
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer',
                          border: color === c ? '2px solid white' : '2px solid transparent',
                          boxShadow: color === c ? `0 0 10px ${c}` : 'none',
                          transition: 'all 0.2s'
                        }}
                      />
                    ))}
                    <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-secondary)', cursor: 'pointer' }}>palette</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{
                          position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="input-group"><label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>REPEAT ON</label><div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} onClick={() => { if (selectedDays.includes(day)) setSelectedDays(prev => prev.filter(d => d !== day)); else setSelectedDays(prev => [...prev, day]); }} className={`repeat-day-pill ${selectedDays.includes(day) ? 'active' : ''}`} style={{ '--active-color': color } as any}> {day[0]} </div>)}</div></div>
              </div>
              <button type="submit" className="glow-btn-primary" style={{ height: '3.25rem', borderRadius: '1.25rem', marginTop: '0.5rem' }}><span>Activate Routine</span></button>
            </form>
          </div>
        </div>
      )}
      {showAllModal && (
        <div onClick={() => setShowAllModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#040914', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'white' }}>Manage Routines</h3>
              <button onClick={() => setShowAllModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {routines.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color || '#10b981', flexShrink: 0 }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{r.icon || 'fitness_center'}</span></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: 'white',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word'
                      }}>{r.title}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.category}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteRoutine(r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span></button>
                </div>
              ))}
              {routines.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>No routines created yet.</div>}
            </div>
          </div>
        </div>
      )}
      <BottomNav
        isHidden={isSidebarHidden}
        hideFloatingShelf={showModal || showAllModal}
        hideMobileNavChrome={showModal || showAllModal}
      />
      <style>{`
        .routine-premium-page.routine-page {
          padding-bottom: calc(8rem + env(safe-area-inset-bottom, 0px));
        }

        .routine-premium-header {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding: 0 0.15rem;
        }
        .routine-premium-header__row--nav {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          align-items: flex-start;
          width: 100%;
          gap: 0;
        }
        .routine-premium-header__nav-left {
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          min-height: 40px;
        }
        .routine-premium-header__nav-spacer {
          width: 44px;
          min-height: 1px;
        }
        .routine-premium-header__title-block {
          min-width: 0;
          text-align: center;
        }
        .routine-header-progress-wrap {
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .routine-header-progress-fill {
          height: 100%;
          border-radius: 2px;
          background: #00e87a;
          transition: width 0.45s cubic-bezier(0.34, 1.15, 0.64, 1);
        }
        .routine-premium-title {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(2.35rem, 8vw, 3rem);
          font-weight: 400;
          letter-spacing: 0.28em;
          margin: 0;
          color: #f8fafc;
          line-height: 1;
        }
        .routine-marquee-lines {
          margin-top: 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .routine-marquee-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.45), transparent);
          opacity: 0.9;
        }
        .routine-marquee-track {
          overflow: hidden;
          width: 100%;
        }
        .routine-marquee-inner {
          display: flex;
          width: max-content;
          animation: routineMarquee 22s linear infinite;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: #4ade80;
          text-shadow: 0 0 12px rgba(74, 222, 128, 0.45);
          white-space: nowrap;
        }
        .routine-marquee-inner span {
          padding-right: 2rem;
        }
        @keyframes routineMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .routine-header-icon-btn {
          opacity: 0.55;
        }

        .routine-premium-scroll {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          max-width: 720px;
          margin: 0 auto;
        }

        .streak-glass-banner {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1rem 1rem 1.1rem;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: streakBannerIn 0.55s cubic-bezier(0.34, 1.1, 0.64, 1) both;
        }
        .streak-glass-banner__accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #34d399, #6ee7b7, #22d3ee);
          box-shadow: 0 0 16px rgba(52, 211, 153, 0.55);
        }
        .streak-glass-banner--leave {
          animation: streakBannerOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes streakBannerIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes streakBannerOut {
          to { opacity: 0; transform: translateY(-28px); }
        }
        .streak-glass-banner__sparkle {
          color: #6ee7b7;
          font-size: 22px !important;
          flex-shrink: 0;
          margin-top: 2px;
          filter: drop-shadow(0 0 8px rgba(110, 231, 183, 0.5));
        }
        .streak-glass-banner__copy {
          flex: 1;
          min-width: 0;
        }
        .streak-glass-banner__head {
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
          font-weight: 900;
          color: #f8fafc;
        }
        .streak-glass-banner__sub {
          margin: 0;
          font-size: 0.72rem;
          line-height: 1.45;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.95);
        }
        .streak-glass-banner__close {
          background: rgba(0, 0, 0, 0.2);
          border: none;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.45);
          cursor: pointer;
          padding: 6px;
          display: flex;
          transition: color 0.2s, background 0.2s;
        }
        .streak-glass-banner__close:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .routine-consistency-preview-wrap {
          width: 100%;
        }
        .routine-consistency-preview {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: left;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .routine-consistency-preview--premium {
          padding: 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 4px 16px rgba(0, 0, 0, 0.2);
          margin-bottom: 16px;
        }
        .routine-consistency-preview:hover {
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .routine-consistency-preview__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .routine-consistency-preview__head--premium {
          margin-bottom: 12px;
          animation: routineConsHeadFade 0.45s ease both;
        }
        @keyframes routineConsHeadFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .routine-consistency-preview__label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: rgba(167, 243, 208, 0.75);
          text-transform: uppercase;
        }
        .routine-consistency-preview__label--premium {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: rgba(255, 255, 255, 0.4);
        }
        .routine-consistency-preview__tabs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .routine-consistency-preview__tab {
          background: none;
          border: none;
          padding: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: rgba(148, 163, 184, 0.95);
          cursor: pointer;
        }
        .routine-consistency-preview__tab--active {
          color: #00e87a;
          text-shadow: 0 0 12px rgba(0, 232, 122, 0.35);
        }
        .routine-consistency-stat-row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 0;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 16px 12px;
        }
        .routine-consistency-stat {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0;
        }
        .routine-consistency-stat--0 {
          animation: routineStatIn 0.45s ease both;
          animation-delay: 0.1s;
        }
        .routine-consistency-stat--1 {
          animation: routineStatIn 0.45s ease both;
          animation-delay: 0.2s;
        }
        .routine-consistency-stat--2 {
          animation: routineStatIn 0.45s ease both;
          animation-delay: 0.3s;
        }
        .routine-consistency-stat--3 {
          animation: routineStatIn 0.45s ease both;
          animation-delay: 0.4s;
        }
        @keyframes routineStatIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .routine-consistency-stat-divider {
          width: 1px;
          align-self: stretch;
          background: rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          margin: 0 2px;
        }
        .routine-consistency-stat__flame {
          font-size: 22px;
          line-height: 1;
          display: inline-block;
          animation: routineFlameFlicker 2s ease-in-out infinite;
        }
        @keyframes routineFlameFlicker {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.8;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.98);
          }
        }
        .routine-consistency-stat__value--lg {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 22px;
          color: #fff;
          line-height: 1.2;
          margin-top: 2px;
        }
        .routine-consistency-stat__value {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: #fff;
          line-height: 1.2;
          margin-top: 2px;
        }
        .routine-consistency-stat__subl {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }
        .routine-consistency-stat__value-row {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .routine-consistency-stat__done-muted,
        .routine-consistency-stat__days-muted {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.35);
        }
        .routine-consistency-stat__ring-wrap {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .routine-mini-ring-svg {
          display: block;
        }
        .routine-mini-ring-progress {
          filter: drop-shadow(0 0 4px rgba(0, 232, 122, 0.35));
        }
        .routine-mini-ring-progress--go {
          animation: routineMiniRingDraw 1.2s ease-out forwards;
          animation-delay: 0.6s;
        }
        @keyframes routineMiniRingDraw {
          from {
            stroke-dashoffset: var(--mini-ring-start);
          }
          to {
            stroke-dashoffset: var(--mini-ring-end);
          }
        }
        .routine-consistency-stat__check-ic {
          font-size: 20px !important;
          font-variation-settings: 'FILL' 1, 'wght' 500;
          color: #00e87a !important;
          animation: routineCheckPop 0.4s cubic-bezier(0.34, 1.2, 0.64, 1) both;
          animation-delay: 0.2s;
        }
        @keyframes routineCheckPop {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        .routine-consistency-week-bar {
          margin-top: 6px;
          width: 100%;
          max-width: 100%;
          height: 3px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .routine-consistency-week-bar__fill {
          height: 100%;
          border-radius: 2px;
          background: #00e87a;
          width: 0;
        }
        .routine-consistency-week-bar__fill--go {
          animation: routineWeekBarGrow 1s ease-out forwards;
          animation-delay: 0.5s;
        }
        @keyframes routineWeekBarGrow {
          from {
            width: 0;
          }
          to {
            width: var(--week-pct);
          }
        }
        .routine-consistency-stat__trophy {
          font-size: 20px;
          line-height: 1;
          filter: drop-shadow(0 0 3px rgba(255, 209, 102, 0.45));
          animation: routineTrophyIn 0.5s ease both;
          animation-delay: 0.3s;
        }
        @keyframes routineTrophyIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .routine-consistency-best-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          margin-top: 6px;
          width: 100%;
        }
        .routine-consistency-best-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.1);
          opacity: 0;
        }
        .routine-consistency-best-dot--on {
          background: #ffd166;
        }
        .routine-consistency-best-dot--in {
          animation: routineBestDotIn 0.3s ease both;
          animation-fill-mode: forwards;
        }
        @keyframes routineBestDotIn {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .routine-consistency-chart-block {
          margin-top: 16px;
        }
        .routine-spark-chart-outer {
          width: 100%;
          position: relative;
        }
        .routine-spark-chart-svg-wrap {
          position: relative;
          width: 100%;
          margin-top: 0;
        }
        .routine-spark-line--animate {
          stroke-dasharray: var(--spark-dash);
          stroke-dashoffset: var(--spark-dash);
          animation: routineSparkDraw 1.5s ease-out forwards;
          animation-delay: 0.8s;
        }
        @keyframes routineSparkDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        .routine-spark-area-fill--animate {
          opacity: 0;
          animation: routineSparkFillIn 0.4s ease forwards;
          animation-delay: 2.2s;
        }
        @keyframes routineSparkFillIn {
          to {
            opacity: 1;
          }
        }
        .routine-spark-chart-xlabels {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          padding: 0 2px;
        }
        .routine-spark-xlab {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.3);
          font-family: 'DM Sans', system-ui, sans-serif;
          flex: 1;
          text-align: center;
        }
        .routine-spark-xlab--today {
          color: rgba(0, 232, 122, 0.75);
          font-weight: 600;
        }
        .routine-spark-chart-empty-msg {
          margin: 8px 0 0;
          text-align: center;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .routine-consistency-expand {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.3s ease-in, opacity 0.3s ease-in;
        }
        .routine-consistency-expand--open {
          max-height: 4800px;
          opacity: 1;
          transition: max-height 0.35s ease-out, opacity 0.35s ease-out;
        }
        .routine-consistency-preview__footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .routine-consistency-preview__link-btn {
          position: relative;
          min-width: 160px;
          min-height: 20px;
          align-self: flex-end;
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0, 232, 122, 0.8);
          text-decoration: none;
          text-align: right;
        }
        .routine-consistency-preview__link-text {
          transition: opacity 0.2s ease;
        }
        .routine-consistency-preview__link-text--expanded {
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          white-space: nowrap;
        }
        .routine-consistency-preview__link-btn--expanded .routine-consistency-preview__link-text--collapsed {
          opacity: 0;
        }
        .routine-consistency-preview__link-btn--expanded .routine-consistency-preview__link-text--expanded {
          opacity: 1;
        }

        .routine-daily-scroll {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior: contain;
          touch-action: pan-y;
          max-height: min(62vh, 520px);
        }

        .routine-daily-show-more {
          width: 100%;
          margin-top: 0.35rem;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .routine-daily-show-more:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .routine-daily-show-more__chev {
          font-size: 20px !important;
          opacity: 0.85;
        }

        .routine-section__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .routine-section__title {
          margin: 0;
          font-size: 1rem;
          font-weight: 900;
          color: var(--text-main);
        }
        .routine-section__head-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .routine-link-btn {
          background: none;
          border: none;
          color: rgba(148, 163, 184, 0.95);
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .routine-link-btn:active {
          color: #fff;
        }
        .routine-create-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          border: 1px solid rgba(52, 211, 153, 0.45);
          background: rgba(16, 185, 129, 0.12);
          color: #6ee7b7;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.2);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .routine-create-pill .material-symbols-outlined {
          font-size: 16px !important;
        }
        .routine-create-pill:hover {
          box-shadow: 0 0 26px rgba(16, 185, 129, 0.35);
        }
        .routine-create-pill:active {
          transform: scale(0.97);
        }

        .routine-filter-chips {
          display: flex;
          gap: 0.45rem;
          overflow-x: auto;
          padding: 0.35rem 0;
          margin-bottom: 0.25rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .routine-filter-chips::-webkit-scrollbar {
          display: none;
        }
        .routine-filter-chip {
          flex-shrink: 0;
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.5);
          color: rgba(148, 163, 184, 0.95);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .routine-filter-chip--active {
          color: #ecfdf5;
          border-color: rgba(52, 211, 153, 0.55);
          background: rgba(16, 185, 129, 0.18);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
        }

        .routine-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          scroll-snap-type: none;
        }
        .routine-syncing {
          text-align: center;
          padding: 2rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .routine-empty-tile {
          width: 100%;
          padding: 2rem;
          border-radius: 16px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 800;
          cursor: pointer;
        }
        .routine-filter-empty,
        .routine-chart-empty {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          color: rgba(148, 163, 184, 0.9);
          text-align: center;
          padding: 2.5rem 1rem;
        }

        .premium-routine-card {
          position: relative;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          animation: routineCardEnter 0.55s cubic-bezier(0.34, 1.1, 0.64, 1) both;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        .premium-routine-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35);
        }
        @keyframes routineCardEnter {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .premium-routine-card__bar {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
        }
        .premium-routine-card__body {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.9rem 0.9rem 0.65rem 0.95rem;
        }
        .premium-routine-card__left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
          flex: 1;
        }
        .routine-icon-neo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.35));
          box-shadow:
            inset 2px 2px 6px rgba(255, 255, 255, 0.06),
            inset -3px -3px 8px rgba(0, 0, 0, 0.45),
            0 4px 12px rgba(0, 0, 0, 0.35);
        }
        .routine-icon-neo .material-symbols-outlined {
          font-size: 22px !important;
        }
        .routine-cat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 10px 3px 8px;
          border-radius: 999px;
          border: 1px solid;
          width: fit-content;
        }
        .routine-cat-pill__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .routine-cat-pill__label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(226, 232, 240, 0.85);
        }
        .premium-routine-card__text {
          min-width: 0;
          flex: 1;
        }
        .premium-routine-card__title {
          margin: 0.35rem 0 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: #f8fafc;
          line-height: 1.25;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .premium-routine-card--done .premium-routine-card__title {
          opacity: 0.5;
        }
        .premium-routine-card--done {
          opacity: 0.88;
        }
        .premium-routine-card--done .premium-routine-card__bar {
          background: #00e87a !important;
          box-shadow: 0 0 14px rgba(0, 232, 122, 0.4) !important;
        }
        .premium-routine-card__done-check {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 18px !important;
          color: #00e87a;
          filter: drop-shadow(0 0 8px rgba(0, 232, 122, 0.45));
          pointer-events: none;
          z-index: 2;
        }
        .premium-routine-card--flash {
          animation: routineCardFlash 0.7s ease;
        }
        @keyframes routineCardFlash {
          0% {
            box-shadow: inset 0 0 0 2px rgba(0, 232, 122, 0.95);
          }
          100% {
            box-shadow: inset 0 0 0 0 transparent;
          }
        }

        .neon-toggle {
          position: relative;
          width: 52px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.45);
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
          transition: border-color 0.35s cubic-bezier(0.34, 1.3, 0.64, 1), background 0.35s;
        }
        .neon-toggle__glow {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.35s;
          box-shadow: inset 0 0 12px rgba(16, 185, 129, 0.15);
        }
        .neon-toggle__knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: transform 0.45s cubic-bezier(0.34, 1.45, 0.64, 1), background 0.35s, box-shadow 0.35s;
        }
        .neon-toggle--on {
          background: rgba(16, 185, 129, 0.22);
          border-color: rgba(52, 211, 153, 0.55);
          box-shadow: 0 0 18px rgba(16, 185, 129, 0.35);
        }
        .neon-toggle--on .neon-toggle__glow {
          opacity: 1;
        }
        .neon-toggle--on .neon-toggle__knob {
          transform: translateX(24px);
          background: #34d399;
          box-shadow: 0 0 14px rgba(52, 211, 153, 0.85);
        }
        .neon-toggle:active .neon-toggle__knob {
          transform: scale(0.92);
        }
        .neon-toggle--on:active .neon-toggle__knob {
          transform: translateX(24px) scale(0.92);
        }

        .premium-routine-card__progress-track {
          height: 3px;
          background: rgba(0, 0, 0, 0.35);
          margin: 0 0.75rem 0.65rem;
          border-radius: 999px;
          overflow: hidden;
        }
        .premium-routine-card__progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.85s cubic-bezier(0.34, 1.15, 0.64, 1);
        }

        .routine-stats-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.5rem 0;
          padding: 0 0.25rem;
        }
        .routine-stats-divider__line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.5), transparent);
          opacity: 0.85;
        }
        .routine-stats-divider__label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.28em;
          color: rgba(167, 243, 208, 0.95);
          text-shadow: 0 0 14px rgba(52, 211, 153, 0.35);
          white-space: nowrap;
        }

        .routine-chart-head {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          align-items: flex-start;
        }
        .routine-chart-bebas {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 1.65rem;
          letter-spacing: 0.2em;
          margin: 0;
          color: #f1f5f9;
        }
        .routine-range-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .routine-range-pill {
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(148, 163, 184, 0.9);
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .routine-range-pill--active {
          color: #ecfdf5;
          border-color: rgba(52, 211, 153, 0.5);
          background: rgba(16, 185, 129, 0.2);
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);
        }

        .routine-chart-glass {
          position: relative;
          border-radius: 18px;
          padding: 1rem 0.75rem 0.85rem;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.35);
          overflow: hidden;
        }
        .routine-chart-glass__shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.4), rgba(34, 211, 238, 0.35), transparent);
          opacity: 0.95;
          animation: chartShimmer 3s ease-in-out infinite;
        }
        @keyframes chartShimmer {
          0%, 100% { opacity: 0.5; filter: blur(0); }
          50% { opacity: 1; filter: blur(0.5px); }
        }
        .routine-chart-area-wrap {
          margin-top: 0.35rem;
        }
        .routine-chart-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 0.85rem;
          justify-content: center;
          margin-top: 0.5rem;
          padding-top: 0.5rem;
        }
        .routine-chart-legend__item {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .routine-chart-legend__dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          box-shadow: 0 0 10px currentColor;
        }
        .routine-chart-legend__text {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          color: rgba(203, 213, 225, 0.9);
        }
        .routine-chart-cat-icons {
          display: flex;
          justify-content: center;
          gap: 0.45rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }
        .routine-cat-icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          color: rgba(148, 163, 184, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .routine-cat-icon-btn .material-symbols-outlined {
          font-size: 20px !important;
        }
        .routine-cat-icon-btn--on {
          background: rgba(16, 185, 129, 0.22);
          border-color: rgba(52, 211, 153, 0.45);
          color: #a7f3d0;
          box-shadow: 0 0 16px rgba(16, 185, 129, 0.28);
        }

        .routine-score-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .routine-score-card {
          position: relative;
          background: rgba(10, 15, 28, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 0.85rem 0.75rem 0.65rem;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .routine-score-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }
        .routine-score-card__main {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .routine-score-ring {
          position: relative;
          width: 56px;
          height: 56px;
          flex-shrink: 0;
        }
        .routine-score-ring__stroke {
          filter: drop-shadow(0 0 5px var(--accent, #10b981));
          transition: stroke-dashoffset 1s cubic-bezier(0.34, 1.1, 0.64, 1);
        }
        .routine-score-pct {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #f8fafc;
        }
        .routine-score-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .routine-score-name {
          font-size: 0.8rem;
          font-weight: 900;
          color: #f8fafc;
        }
        .routine-score-sublabel {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: rgba(148, 163, 184, 0.9);
        }
        .routine-score-delta {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.5rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
        }
        .routine-score-delta .material-symbols-outlined {
          font-size: 14px !important;
        }
        .routine-score-delta--up {
          color: #4ade80;
        }
        .routine-score-delta--down {
          color: #f87171;
        }
        .routine-score-delta__hint {
          margin-left: 0.25rem;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: rgba(148, 163, 184, 0.65);
        }
        .routine-score-card__accent-line {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--accent, #10b981);
          opacity: 0.85;
        }

        .form-cat-pill { padding: 0.5rem 0.75rem; border-radius: 0.75rem; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; }
        .light-mode .form-cat-pill { background: rgba(0, 0, 0, 0.03); border-color: rgba(0, 0, 0, 0.03); }
        .form-cat-pill.active { background: var(--text-main); color: #000; }
        .light-mode .form-cat-pill.active { color: #fff; }

        .form-icon-option { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid transparent; color: rgba(255,255,255,0.3); }
        .light-mode .form-icon-option { color: rgba(0, 0, 0, 0.2); }
        .form-icon-option.active { border-color: var(--active-color); background: var(--active-color)15; color: var(--active-color); }
        
        .repeat-day-pill { width: 20px; height: 20px; border-radius: 6px; font-size: 8px; font-weight: 900; background: rgba(255,255,255,0.05); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .light-mode .repeat-day-pill { background: rgba(0, 0, 0, 0.03); }
        .repeat-day-pill.active { background: var(--active-color); color: #fff; }
      `}</style>
    </div>
  );
};
export default Routine;

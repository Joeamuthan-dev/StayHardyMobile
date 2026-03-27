import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../supabase';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistRoutinesRaw, persistRoutineLogsList, loadRoutinesRawStale, loadRoutineLogsListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import { ProductivityService } from '../lib/ProductivityService';
import CategorySelector from '../components/CategorySelector';
import { FeatureGate } from '../components/FeatureGate';


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
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayName = dayNames[now.getDay()];
  const completedIdsToday = new Set(logsData.filter((l) => l.completed_at === todayStr).map((l) => l.routine_id));
  const mapped = routinesData.map((r) => {
    const isActiveToday = r.days.includes(todayDayName);
    const isCompletedToday = completedIdsToday.has(r.id);
    return { ...r, completed: isCompletedToday, isActiveToday };
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





const HABIT_SUGGESTIONS = [
  { icon: '🧘', text: 'Morning meditation' },
  { icon: '💧', text: 'Drink 8 glasses of water' },
  { icon: '🏃', text: '30 min workout' },
  { icon: '📚', text: 'Read for 20 minutes' },
  { icon: '📵', text: 'No phone first hour' },
  { icon: '😴', text: 'Sleep by 11 PM' },
  { icon: '🚶', text: 'Evening walk' },
  { icon: '✍️', text: 'Journaling' },
  { icon: '🚿', text: 'Cold shower' },
  { icon: '🥗', text: 'Healthy breakfast' },
  { icon: '🤸', text: '10 min stretching' },
  { icon: '🙏', text: 'Gratitude practice' },
  { icon: '🎯', text: 'Learn something new' },
  { icon: '🥦', text: 'No junk food' },
  { icon: '🍱', text: 'Weekly meal prep' },
  { icon: '📵', text: 'Digital detox hour' },
  { icon: '🌬️', text: 'Breathing exercises' },
  { icon: '🌿', text: 'Skincare routine' },
  { icon: '📋', text: "Plan tomorrow's tasks" },
  { icon: '📞', text: 'Call family or friends' },
];



const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Growth':  '#6366F1',
    'Health':  '#00E87A',
    'Home':    '#F59E0B',
    'Mindset': '#8B5CF6',
    'Social':  '#EC4899',
    'Work':    '#3B82F6',
    'Hobby':   '#F59E0B',
    'Learning': '#06B6D4',
  };
  const randoms = ['#F97316','#06B6D4','#84CC16','#EF4444','#A855F7'];
  return colors[category] || randoms[Math.floor(Math.random() * randoms.length)];
};

const getCategoryIcon = (category: string) => {
  const icons: Record<string, string> = {
    'Growth': '🌱',
    'Health': '💪',
    'Hobby': '🎯',
    'Home': '🏠',
    'Learning': '📚',
    'Mindset': '🧠',
    'Social': '👥',
    'Work': '💼',
    'General': '✦',
    'Custom': '⚡'
  }
  return icons[category] || '✦'
}






type RoutineFilterChip = 'ALL' | string;





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
      return c === chip.toUpperCase();
  }
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
















const getCategoryTabIcon = (cat: string) => {
  switch(cat) {
    case 'All':
    case 'ALL':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      );
    case 'Health':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      );
    case 'Work':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        </svg>
      );
    case 'Social':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case 'Growth':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      );
    case 'Mindset':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
      );
    case 'Home':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'Hobby':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
      );
    case 'Learning':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0 -4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      );
  }
};









const StreakCard = ({
  streak,
  weekData
}: {
  streak: number;
  weekData: any[];
}) => {
  const days = ['MON','TUE','WED',
    'THU','FRI','SAT','SUN']

  return (
    <div style={{
      margin: '0 16px 12px 16px',
      background: '#0A0F0D',
      border: '1px solid ' +
        'rgba(0,232,122,0.2)',
      borderRadius: '20px',
      padding: '16px',
      boxShadow:
        '0 0 20px rgba(0,0,0,0.5),' +
        'inset 0 1px 0 ' +
        'rgba(255,255,255,0.05)'
    }}>

      {/* Top row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>

        {/* Inset glass fire panel */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background:
            'linear-gradient(145deg,' +
            '#0d1a10, #1a0d00)',
          boxShadow:
            'inset 3px 3px 8px ' +
            'rgba(0,0,0,0.8),' +
            'inset -1px -1px 4px ' +
            'rgba(255,140,0,0.1),' +
            '0 0 20px ' +
            'rgba(255,100,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          flexShrink: 0
        }}>
          <span style={{
            fontSize: '24px',
            animation:
              'fireGlow 1.5s ease-in-out infinite',
            display: 'block'
          }}>
            🔥
          </span>
          <span style={{
            fontSize: '16px',
            fontWeight: '900',
            color: '#FF8C00',
            lineHeight: 1
          }}>
            {streak}
          </span>
        </div>

        {/* Streak info */}
        <div>
          <p style={{
            fontSize: '18px',
            fontWeight: '900',
            color: '#FFFFFF',
            margin: '0 0 2px 0',
            letterSpacing: '-0.5px'
          }}>
            {streak} Day Streak
          </p>
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            margin: 0
          }}>
            {streak === 0
              ? 'Start your streak today'
              : streak >= 7
                ? 'On fire! Keep going 🔥'
                : 'Building momentum...'}
          </p>
        </div>
      </div>

      {/* Week bubbles with path */}
      <div style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px'
      }}>

        {/* Connecting path line */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          height: '1px',
          background:
            'linear-gradient(90deg,' +
            'rgba(0,232,122,0.5) 0%,' +
            'rgba(0,232,122,0.1) 100%)',
          animation:
            'pathGlow 2s ease-in-out infinite'
        }}/>

        {days.map((day, i) => {
          const isCompleted =
            weekData?.[i]?.hasCompletion
          const isToday =
            weekData?.[i]?.isToday

          return (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              position: 'relative',
              zIndex: 1
            }}>

              {/* Day bubble */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background:
                  isCompleted
                    ? 'linear-gradient(' +
                      '135deg,' +
                      '#00E87A,#00C563)'
                    : isToday
                      ? 'rgba(0,232,122,0.1)'
                      : '#0A0F0D',
                border: isCompleted
                  ? 'none'
                  : isToday
                    ? '1.5px solid #00E87A'
                    : '1px solid ' +
                      'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isCompleted
                  ? '0 0 12px ' +
                    'rgba(0,232,122,0.6),' +
                    '0 0 24px ' +
                    'rgba(0,232,122,0.2)'
                  : isToday
                    ? '0 0 8px ' +
                      'rgba(0,232,122,0.2)'
                    : 'none',
                transition:
                  'all 0.3s ease'
              }}>
                {isCompleted && (
                  <svg width="14"
                    height="14"
                    viewBox="0 0 14 14">
                    <path
                      d="M2 7l3.5 3.5L12 4"
                      stroke="#000"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="40"
                      strokeDashoffset="0"/>
                  </svg>
                )}
              </div>

              {/* Day label */}
              <span style={{
                fontSize: '8px',
                fontWeight: '700',
                color: isCompleted
                  ? '#00E87A'
                  : isToday
                    ? 'rgba(0,232,122,0.7)'
                    : 'rgba(255,255,255,0.2)',
                letterSpacing: '0.04em'
              }}>
                {day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const HabitCard = ({
  habit,
  isCompleted,
  onToggle
}: {
  habit: any;
  isCompleted: boolean;
  onToggle: (id: string) => void;
}) => {

  return (
    <div style={{
      margin: '0 16px 10px 16px',
      background: isCompleted
        ? 'linear-gradient(135deg,' +
          'rgba(0,230,118,0.12) 0%,' +
          'rgba(0,77,64,0.25) 100%)'
        : '#121212',
      border: '1px solid ' +
        (isCompleted
          ? 'rgba(0,232,122,0.5)'
          : 'rgba(0,232,122,0.2)'),
      borderRadius: '20px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxShadow: isCompleted
        ? '0 0 16px rgba(0,232,122,0.15)'
        : '0 2px 8px rgba(0,0,0,0.4)',
      transition: 'all 0.4s ease',
      animation: isCompleted
        ? 'cardComplete 0.4s ease'
        : 'none'
    }}>

      {/* Top row — icon + checkmark */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>

        {/* Category icon top-left */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: isCompleted
            ? 'rgba(0,232,122,0.15)'
            : 'rgba(255,255,255,0.05)',
          border: '1px solid ' +
            (isCompleted
              ? 'rgba(0,232,122,0.3)'
              : 'rgba(255,255,255,0.08)'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px'
        }}>
          {getCategoryIcon(
            habit.category)}
        </div>

        {/* Neumorphic checkmark
            top-right */}
        <div
          onClick={() => onToggle(
            habit.id)}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: isCompleted
              ? 'linear-gradient(' +
                '135deg,' +
                '#00E87A,#00C563)'
              : 'linear-gradient(' +
                '145deg,' +
                '#1a1a1a,#0d0d0d)',
            boxShadow: isCompleted
              ? '0 0 16px ' +
                'rgba(0,232,122,0.6),' +
                '0 0 32px ' +
                'rgba(0,232,122,0.2),' +
                'inset 0 1px 0 ' +
                'rgba(255,255,255,0.2)'
              : 'inset 3px 3px 8px ' +
                'rgba(0,0,0,0.6),' +
                'inset -2px -2px 6px ' +
                'rgba(255,255,255,0.04),' +
                '0 0 0 1px ' +
                'rgba(0,232,122,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            animation: isCompleted
              ? 'completePulse 0.4s ease'
              : 'none'
          }}>

          {/* Checkmark SVG */}
          <svg width="20" height="20"
            viewBox="0 0 20 20"
            fill="none">
            <path
              d="M4 10l4.5 4.5L16 6"
              stroke={isCompleted
                ? '#000000'
                : 'rgba(0,232,122,0.3)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset={
                isCompleted ? 0 : 40}
              style={{
                transition:
                  'stroke-dashoffset ' +
                  '0.3s ease,' +
                  'stroke 0.3s ease'
              }}/>
          </svg>
        </div>
      </div>

      {/* Bottom row — habit name */}
      <div>
        <p style={{
          fontSize: '15px',
          fontWeight: '800',
          color: isCompleted
            ? '#00E87A'
            : '#FFFFFF',
          margin: '0 0 2px 0',
          letterSpacing: '-0.2px',
          transition: 'color 0.3s ease',
          textDecoration: isCompleted
            ? 'none' : 'none'
        }}>
          {habit.title}
        </p>

        <p style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.35)',
          margin: 0,
          fontWeight: '500'
        }}>
          {habit.category || 'General'}
          {isCompleted
            ? ' · Done ✓'
            : ' · Pending'}
        </p>
      </div>
    </div>
  )
}




const triggerGlobalRefresh = () => {
  window.dispatchEvent(new CustomEvent('stayhardy_refresh'));
  console.log('Global refresh triggered');
};

const Routine: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { setLoading: setGlobalLoading, setLoadingText } = useLoading();
  const { isPro } = useSubscription();
  useLanguage();
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const isTogglingRef = useRef(false);
  const toggleTimeoutRef = useRef<any>(null);


  useEffect(() => {
    const handleOpenCreateRoutine = () => setShowModal(true);
    window.addEventListener('open-create-routine', handleOpenCreateRoutine);
    return () => window.removeEventListener('open-create-routine', handleOpenCreateRoutine);
  }, []);



  const [filterChip, setFilterChip] = useState<RoutineFilterChip>('ALL');
  const [streakBannerMounted, setStreakBannerMounted] = useState(true);
  const [streakBannerLeaving, setStreakBannerLeaving] = useState(false);


  const [consistencyIntro, setConsistencyIntro] = useState(false);

  console.log('=== ROUTINES PAGE RENDER ===');
  console.log('User:', user?.id);
  console.log('Auth loading:', authLoading);
  console.log('Routines state:', routines);
  console.log('Component mounted at:', new Date().toISOString());

  useEffect(() => {
    console.log('=== ROUTINES useEffect FIRED ===');
    console.log('User in effect:', user?.id);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 50);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissStreakBanner = useCallback(() => {
    setStreakBannerLeaving(true);
    window.setTimeout(() => setStreakBannerMounted(false), 420);
  }, []);

  // Form State
  const [title, setTitle] = useState('');

  const [selectedIcon, setSelectedIcon] = useState('fitness_center');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [isSuggestionsFocused, setIsSuggestionsFocused] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState('');



  const persistRoutineCaches = useCallback((uid: string, r: RoutineData[], l: RoutineLog[]) => {
    const rawRows: RoutineRow[] = r.map(({ completed, missed, isActiveToday, ...rest }) => rest as RoutineRow);
    void persistRoutinesRaw(uid, rawRows);
    void persistRoutineLogsList(uid, l);
    void ProductivityService.recalculate(uid);
  }, []);







  const getWeekDays = () => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const today = new Date();
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diff);
    
    return days.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const isToday = date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
      const isFuture = date > today;
      const hasCompletion = logs?.some(log =>
        log.completed_at?.startsWith(date.toISOString().split('T')[0])
      );
      return { label, dateStr: date.toISOString().split('T')[0], isToday, isFuture, hasCompletion };
    });
  };

  const fetchRoutinesAndLogs = useCallback(
    async (options?: { force?: boolean }) => {
      if (isTogglingRef.current) {
        console.log('fetch blocked — toggle in progress');
        return;
      }
      if (authLoading) {
        setLoading(true);
        return;
      }
      if (!user?.id) {
        setRoutines([]);
        setLogs([]);
        setLoading(false);
        return;
      }
      setGlobalLoading(true);
      setLoadingText("Loading Protocol Routines...");
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
          false;

        if (!needNetwork) {
          return;
        }

        const { data: routinesData, error: rError } = await supabase
          .from('routines')
          .select('id, user_id, title, time, days, color, created_at, icon, category')
          .eq('user_id', user.id);
        if (rError) throw rError;
        const now = new Date();
        let daysToFetch = 7;

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
        void ProductivityService.recalculate(user.id);
        // lastFetchedLogsRangeRef.current = '7d';

        const { mappedRoutines, logs } = mapFetchedToRoutineState(rrows, logsArr, user.id);
        setLogs(logs);
        setRoutines(mappedRoutines);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    },
    [authLoading, user?.id, setGlobalLoading, setLoadingText],
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







  const streakCount = useMemo(() => computeStreakDays(routines, logs), [routines, logs]);

  const { todayDoneCount, todayTotalCount } = useMemo(() => {
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



  useEffect(() => {

  }, [filterChip]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setConsistencyIntro(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!consistencyIntro) return;
    const start = performance.now();
    const dur = 1000;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      // Removed unused calculation
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [consistencyIntro, streakCount]);

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title) return;
    const finalCategory = selectedCategory;
    const online = await isOnline();
    if (!online) {
      const tempId = crypto.randomUUID();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const optimistic: RoutineData = {
        id: tempId,
        title,
        days: selectedDays,
        color: getCategoryColor(finalCategory),
        icon: '⭐',
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
            color: getCategoryColor(finalCategory),
            icon: '⭐',
            category: finalCategory,
            time: null,
            created_at: new Date().toISOString()
          },
        },
        timestamp: Date.now(),
      });
      void invalidateUserStatsCache();
      setShowModal(false);
      setTitle('');
      setSelectedIcon('fitness_center');
      triggerGlobalRefresh();
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      const payload = {
        user_id: user.id,
        title,
        days: selectedDays,
        color: getCategoryColor(finalCategory),
        icon: selectedIcon,
        category: finalCategory,
        time: null,
        created_at: new Date().toISOString()
      };
      const { data: _data, error: insertError } = await supabase.from('routines').insert([payload]).select();
      if (insertError) throw insertError;
      setShowModal(false); 
      setTitle(''); 
      setSelectedIcon('fitness_center'); 
      void fetchRoutinesAndLogs({ force: true });
      triggerGlobalRefresh();
    } catch (err: any) { 
      setError(err.message || 'Failed to create habit');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleCompletion = async (routine: RoutineData) => {
    if (!user?.id) return;

    isTogglingRef.current = true;
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }
    toggleTimeoutRef.current = setTimeout(() => {
      isTogglingRef.current = false;
    }, 8000);

    const today = new Date().toISOString().split('T')[0];
    const isNowCompleted = !routine.completed;

    // 1. Optimistic Synchronous Updates with functional queuing secure
    setRoutines((prev) =>
      prev.map((r) => (r.id === routine.id ? { ...r, completed: isNowCompleted } : r))
    );

    setLogs((prev) => {
      if (isNowCompleted) {
        const exists = prev.some((l) => l.routine_id === routine.id && l.completed_at === today);
        return exists ? prev : [...prev, { routine_id: routine.id, completed_at: today }];
      } else {
        return prev.filter((l) => !(l.routine_id === routine.id && l.completed_at === today));
      }
    });

    // Removed flash Routine id effects

    // 2. Background DB Updates
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
      persistRoutineCaches(user.id, routines.map((r) => r.id === routine.id ? { ...r, completed: isNowCompleted } : r), isNowCompleted ? (logs.some((l) => l.routine_id === routine.id && l.completed_at === today) ? logs : [...logs, { routine_id: routine.id, completed_at: today }]) : logs.filter((l) => !(l.routine_id === routine.id && l.completed_at === today)));
      void invalidateUserStatsCache();
      void syncWidgetData();
      triggerGlobalRefresh();
      return;
    }

    try {
      if (isNowCompleted) {
        const { error } = await supabase.from('routine_logs').insert([{
          routine_id: routine.id,
          user_id: user.id,
          completed_at: today,
          created_at: new Date().toISOString()
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
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Failed to sync routine status:', err);
      // Rollback
      setRoutines((prev) =>
        prev.map((r) => (r.id === routine.id ? { ...r, completed: !isNowCompleted } : r))
      );
      setLogs((prev) => {
        if (isNowCompleted) {
          return prev.filter((l) => !(l.routine_id === routine.id && l.completed_at === today));
        } else {
          return [...prev, { routine_id: routine.id, completed_at: today }];
        }
      });
    }
  };

  const handleDeleteRoutine = async (id: string) => {
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
      triggerGlobalRefresh();
      return;
    }
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      persistRoutineCaches(user.id, nextR, nextL);
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Error deleting routine:', err);
      setRoutines(prevR);
      setLogs(prevL);
    }
  };

    if (loading && routines.length === 0) {
      return (
      <FeatureGate moduleName="Habits" isPro={!!isPro}>
          <div className={`page-shell routine-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ background: '#080C0A', minHeight: '100vh' }}>
            <div className="aurora-bg">
              <div className="aurora-gradient-1" />
              <div className="aurora-gradient-2" />
            </div>
            <div className="routine-syncing" style={{ color: '#fff', paddingTop: '120px' }}>Syncing sequence...</div>
          </div>
        </FeatureGate>
      );
    }

    if (!isVisible) {
      return (
      <FeatureGate moduleName="Habits" isPro={!!isPro}>
          <div className={`page-shell routine-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ background: '#080C0A', minHeight: '100vh' }} />
        </FeatureGate>
      );
    }

    return (
      <FeatureGate moduleName="Habits" isPro={!!isPro}>
        <div className={`page-shell routine-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ 
          minHeight: '100vh',
          background: '#080C0A',
          paddingBottom: '120px'
        }}>
          <div className="aurora-bg">
            <div className="aurora-gradient-1" />
            <div className="aurora-gradient-2" />
          </div>

          <div style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 100,
            background: 'rgba(8,12,10,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '0.5px solid rgba(255,255,255,0.05)',
            paddingTop: 'env(safe-area-inset-top, 20px)'
          }}>
            {streakBannerMounted && (
              <div className={`streak-glass-banner ${streakBannerLeaving ? 'streak-glass-banner--leave' : ''}`} style={{ margin: '10px 16px' }}>
                <div className="streak-glass-banner__accent" />
                <span className="material-symbols-outlined streak-glass-banner__sparkle">auto_awesome</span>
                <div className="streak-glass-banner__copy">
                  <p className="streak-glass-banner__head">Today&apos;s Habits</p>
                  <p className="streak-glass-banner__sub">Mark your habits done. Log today only.</p>
                </div>
                <button type="button" className="streak-glass-banner__close" onClick={dismissStreakBanner}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )}

            <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center', marginBottom: '-10px' }}>
              <StreakCard streak={streakCount} weekData={getWeekDays()} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 20px 8px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>DAILY ACTIONS</h2>
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{todayDoneCount}/{todayTotalCount}</p>
              </div>
              <button onClick={() => setShowAllModal(true)} style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: '800', color: '#00E676', cursor: 'pointer' }}>MANAGE</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px 12px 16px', scrollbarWidth: 'none' }} className="no-scrollbar">
              {['All', ...new Set(routines.filter(r => r.days.includes(todayKey)).map(r => r.category).filter(Boolean))].map(cat => {
                const isSelected = filterChip === cat.toUpperCase() || (filterChip === 'ALL' && cat === 'All');
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterChip((cat === 'All' ? 'ALL' : cat.toUpperCase()) as RoutineFilterChip)}
                    style={{
                      background: isSelected ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.05)',
                      border: isSelected ? '1px solid rgba(0,232,122,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px', padding: '6px 14px', fontSize: '10px', fontWeight: 600,
                      color: isSelected ? '#00E87A' : 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    {getCategoryTabIcon(cat)}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }} className="bouncing-scroll">
            {loading ? (
              <div className="routine-syncing">Syncing…</div>
            ) : routines.length === 0 ? (
              <button type="button" className="routine-empty-tile" onClick={() => setShowModal(true)}>Add your first habit.</button>
            ) : orderedForToday.length === 0 ? (
              <p className="routine-filter-empty">No habits scheduled today.</p>
            ) : (
              orderedForToday.map((routine) => (
                <HabitCard key={routine.id} habit={routine} isCompleted={!!routine.completed} onToggle={() => toggleCompletion(routine)} />
              ))
            )}
          </div>

          {showModal && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex', alignItems: 'flex-end' }}>
              <div onClick={() => setShowModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} />
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'relative',
                  width: '100%',
                  background: 'rgba(5,5,5,0.97)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  borderRadius: '32px 32px 0 0',
                  border: '1px solid rgba(0,232,122,0.35)',
                  borderBottom: 'none',
                  paddingBottom: '48px',
                  animation: 'modalUp 0.4s cubic-bezier(0.34,1.56,0.64,1), modalGlow 3s ease-in-out infinite',
                  maxHeight: '90vh',
                  overflowY: 'auto'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0 0' }}><div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }}/></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 20px 20px' }}>
                  <div>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#00E87A', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>ACTIVATION SEQUENCE</p>
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>New Habit</h2>
                  </div>
                  <div onClick={() => setShowModal(false)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
                      <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
                    </svg>
                  </div>
                </div>

                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>HABIT NAME</label>
                    </div>
                    <div style={{
                      borderRadius: '16px',
                      background: 'linear-gradient(145deg,#080808,#0f0f0f)',
                      border: `1px solid ${focusedField === 'name' ? 'rgba(0,232,122,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: focusedField === 'name' 
                        ? '0 0 0 1px rgba(0,232,122,0.3), 0 0 20px rgba(0,232,122,0.15), inset 3px 3px 8px rgba(0,0,0,0.6)' 
                        : 'inset 3px 3px 8px rgba(0,0,0,0.6), inset -1px -1px 4px rgba(255,255,255,0.02)',
                      transition: 'all 0.2s ease'
                    }}>
                      <input
                        type="text"
                        placeholder="e.g. Morning run, Read 20 pages..."
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        onFocus={() => { setFocusedField('name'); setIsSuggestionsFocused(true); }}
                        onBlur={() => { setFocusedField(''); setTimeout(() => setIsSuggestionsFocused(false), 200); }}
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', caretColor: '#00E87A', boxSizing: 'border-box' }}
                      />
                      {isSuggestionsFocused && (title.length === 0 || title.length < 3) && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A2118', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', zIndex: 100 }}>
                          {HABIT_SUGGESTIONS.map((suggestion, index) => (
                            <div key={index} onClick={() => { setTitle(suggestion.text); setIsSuggestionsFocused(false); }} className="suggestion-item" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                              <span style={{ fontSize: '16px', width: '28px', textAlign: 'center' }}>{suggestion.icon}</span>
                              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{suggestion.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', margin: '0 0 10px 0' }}>⚡ QUICK START</p>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {[
                        { label: 'Meditation', emoji: '🧘' }, { label: 'Workout', emoji: '🏃' }, { label: 'Read', emoji: '📚' },
                        { label: 'Journal', emoji: '✍️' }, { label: 'Cold Shower', emoji: '🚿' }, { label: 'Walk', emoji: '🚶' },
                        { label: 'Hydrate', emoji: '💧' }, { label: 'Sleep Early', emoji: '🌙' }, { label: 'No Phone', emoji: '📵' },
                        { label: 'Stretch', emoji: '🤸' }
                      ].map((pick, i) => (
                        <div key={i} onClick={() => setTitle(pick.label)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: title === pick.label ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (title === pick.label ? 'rgba(0,232,122,0.5)' : 'rgba(255,255,255,0.1)'), borderRadius: '20px', padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s ease', boxShadow: title === pick.label ? '0 0 12px rgba(0,232,122,0.3)' : 'none' }}>
                          <span style={{ fontSize: '14px' }}>{pick.emoji}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: title === pick.label ? '#00E87A' : 'rgba(255,255,255,0.6)' }}>{pick.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <CategorySelector
                      selected={selectedCategory}
                      onSelect={setSelectedCategory}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                      </svg>
                      <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>REPEAT ON</label>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{selectedDays.length} days selected</span>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                      <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', height: '1px', background: 'linear-gradient(90deg, rgba(0,232,122,0.15), rgba(0,232,122,0.05))', zIndex: 0 }}/>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => {
                        const isSelected = selectedDays.includes(day);
                        const label = ['M','T','W','T','F','S','S'][i];
                        return (
                          <div key={i} onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(x => x !== day) : [...prev, day])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1, cursor: 'pointer' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? 'linear-gradient(135deg, #00E87A, #00C563)' : 'linear-gradient(145deg, #0d0d0d, #151515)', border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSelected ? '0 0 16px rgba(0,232,122,0.7), 0 0 32px rgba(0,232,122,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'inset 3px 3px 6px rgba(0,0,0,0.6), inset -1px -1px 3px rgba(255,255,255,0.02)', transition: 'all 0.25s ease', animation: isSelected ? 'dayGlow 2s ease-in-out infinite' : 'none' }}>
                              <span style={{ fontSize: '11px', fontWeight: '900', color: isSelected ? '#000000' : 'rgba(255,255,255,0.25)' }}>{label}</span>
                            </div>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? '#00E87A' : 'transparent', boxShadow: isSelected ? '0 0 6px rgba(0,232,122,0.8)' : 'none', transition: 'all 0.2s ease' }}/>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {[ { label: 'Every Day', days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] }, { label: 'Weekdays', days: ['Mon','Tue','Wed','Thu','Fri'] }, { label: 'Weekends', days: ['Sat','Sun'] } ].map((preset, i) => (
                        <div key={i} onClick={() => setSelectedDays(preset.days)} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '7px 4px', textAlign: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', transition: 'all 0.2s ease' }}>{preset.label}</div>
                      ))}
                    </div>
                  </div>

                  {error && <p style={{ fontSize: '13px', color: '#EF4444', margin: 0, textAlign: 'center', fontWeight: '500' }}>{error}</p>}
                  <button
                    onClick={handleCreateRoutine}
                    disabled={isCreating || !title.trim() || selectedDays.length === 0}
                    style={{ width: '100%', height: '58px', borderRadius: '20px', border: 'none', cursor: isCreating || !title.trim() || selectedDays.length === 0 ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '900', color: '#000000', letterSpacing: '0.1em', background: isCreating || !title.trim() || selectedDays.length === 0 ? 'rgba(0,232,122,0.3)' : 'linear-gradient(90deg, #00E87A 0%, #00FF88 30%, #00E5CC 60%, #00E87A 100%)', backgroundSize: '200% auto', animation: !isCreating && title.trim() && selectedDays.length > 0 ? 'shimmerActivate 2s linear infinite' : 'none', boxShadow: !isCreating && title.trim() && selectedDays.length > 0 ? '0 0 24px rgba(0,232,122,0.4), 0 0 48px rgba(0,229,204,0.2)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 0.2s ease' }}
                  >
                    {isCreating ? (
                      <>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000', animation: 'spin 0.8s linear infinite' }}/>
                        Activating...
                      </>
                    ) : (
                      <span>⚡ ACTIVATE HABIT</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAllModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 800,
              display: 'flex',
              alignItems: 'flex-end'
            }}>
              <div onClick={() => setShowAllModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'relative',
                  width: '100%',
                  background: '#0D0D0D',
                  borderRadius: '32px 32px 0 0',
                  borderTop: '1px solid #00E676',
                  paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
                  maxHeight: '80vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 -10px 40px rgba(0,230,118,0.1)',
                  animation: 'modalUp 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                <div style={{
                  padding: '0 24px 20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>Edit Habits</h3>
                  <button 
                    onClick={() => setShowAllModal(false)}
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: 'rgba(255,255,255,0.06)', 
                      border: 'none', 
                      color: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                  </button>
                </div>

                <div 
                  className="no-scrollbar"
                  style={{ 
                    padding: '0 16px', 
                    overflowY: 'auto',
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {routines.map(r => (
                      <div 
                        key={r.id} 
                        style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          padding: '12px', 
                          borderRadius: '12px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}
                      >
                        <span style={{ color: '#fff' }}>{r.title}</span>
                        <button onClick={() => handleDeleteRoutine(r.id)} style={{ color: '#EF4444', background: 'none', border: 'none' }}>Delete</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}


          <style>{`
            .streak-glass-banner { position: relative; display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; border-radius: 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(16px); }
            .streak-glass-banner__sparkle { color: #6ee7b7; font-size: 20px !important; }
            .streak-glass-banner__head { margin: 0; font-size: 0.9rem; font-weight: 900; color: #fff; }
            .streak-glass-banner__sub { margin: 0; font-size: 0.7rem; color: rgba(255,255,255,0.6); }
            .routine-syncing { text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); }
            .routine-empty-tile { width: 100%; padding: 30px; border: 1px dashed rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.4); border-radius: 16px; cursor: pointer; }
            .routine-filter-empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); font-size: 13px; }
          `}</style>
        </div>
      </FeatureGate>
    );
  };

  export default Routine;

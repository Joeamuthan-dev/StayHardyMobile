import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { ProductivityService } from '../lib/ProductivityService';
import CategorySelector from '../components/CategorySelector';


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
  useLanguage();
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
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
      }
    },
    [authLoading, user?.id],
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
        <div className={`page-shell routine-page routine-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ paddingBottom: '100px' }}>
        <div className="aurora-bg">
          <div className="aurora-gradient-1" />
          <div className="aurora-gradient-2" />
        </div>
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div className={`page-shell routine-page routine-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
        <div className="aurora-bg">
          <div className="aurora-gradient-1" />
          <div className="aurora-gradient-2" />
        </div>
      </div>
    );
  }

  return (
    <div className={`page-shell routine-page routine-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ 
      minHeight: '100vh',
      background: '#000',
      paddingBottom: '120px' // Space for bottom nav at the very end
    }}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1" />
        <div className="aurora-gradient-2" />
      </div>

      {/* STICKY HEADER SECTION - Locked as requested */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
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
              <p className="streak-glass-banner__sub">
                Mark your habits done. Log today only.
              </p>
            </div>
            <button type="button" className="streak-glass-banner__close" onClick={dismissStreakBanner} aria-label="Dismiss">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center', marginBottom: '-10px' }}>
          <StreakCard 
            streak={streakCount} 
            weekData={getWeekDays()} 
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          padding: '12px 20px 8px 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h2 style={{
              fontSize: '16px',
              fontWeight: '900',
              color: '#FFFFFF',
              letterSpacing: '0.04em',
              margin: 0,
              textTransform: 'uppercase'
            }}>
              DAILY ACTIONS
            </h2>
            <p style={{
              fontSize: '11px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.3)',
              margin: 0
            }}>
              {todayDoneCount}/{todayTotalCount}
            </p>
          </div>

          <button
            onClick={() => setShowAllModal(true)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              fontWeight: '800',
              color: '#00E676',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}>
            MANAGE
          </button>
        </div>

        {(() => {
          // Dynamic category chips: Only show categories that have routines scheduled for today
          const routinesForToday = routines.filter(r => r.days.includes(todayKey));
          const userCategories = ['All', ...new Set(routinesForToday.map(r => r.category).filter(Boolean))];
          
          return (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px 12px 16px', scrollbarWidth: 'none' }} className="no-scrollbar">
              {userCategories.map(cat => {
                const isSelected = filterChip === cat.toUpperCase() || (filterChip === 'ALL' && cat === 'All');
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterChip((cat === 'All' ? 'ALL' : cat.toUpperCase()) as RoutineFilterChip)}
                    style={{
                      background: isSelected ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.05)',
                      border: isSelected ? '1px solid rgba(0,232,122,0.3)' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: isSelected ? '#00E87A' : 'rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {getCategoryTabIcon(cat)}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* SCROLLABLE CARDS */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        marginTop: '12px'
      }} className="bouncing-scroll">
        {loading ? (
          <div className="routine-syncing">Syncing…</div>
        ) : routines.length === 0 ? (
          <button type="button" className="routine-empty-tile" onClick={() => setShowModal(true)}>
            Add your first habit.
          </button>
        ) : orderedForToday.length === 0 ? (
          <p className="routine-filter-empty">
            No habits scheduled today.
          </p>
        ) : (
          orderedForToday.map((routine) => (
            <HabitCard 
              key={routine.id}
              habit={routine}
              isCompleted={!!routine.completed}
              onToggle={() => toggleCompletion(routine)}
            />
          ))
        )}
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 700,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowModal(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)'
            }}
          />

          {/* Modal */}
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
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0 0' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }}/>
            </div>

            {/* Header row */}
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
      {/* Centralized Manage Popup (Bottom Sheet) */}
      {showAllModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 800,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setShowAllModal(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          />

          {/* Bottom Sheet */}
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
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Header */}
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

            {/* Habit List */}
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
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid rgba(255,255,255,0.06)', 
                      borderRadius: '18px', 
                      padding: '16px'
                    }}
                  >
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '12px', 
                      background: 'rgba(255,255,255,0.05)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: '18px'
                    }}>
                      {getCategoryIcon(r.category)}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#FFFFFF', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{r.title}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{r.category}</p>
                    </div>

                    <button 
                      onClick={() => setConfirmDelete(r.id)} 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '10px', 
                        background: 'transparent', 
                        border: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#FF3B30' }}>delete</span>
                    </button>
                  </div>
                ))}
                
                {routines.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)' }}>
                    No habits created yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <>
          <div
            onClick={() => setConfirmDelete(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1100, backdropFilter: 'blur(4px)' }}
          />

          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '280px', background: '#1A1F1B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '24px 20px 20px 20px', zIndex: 1101, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '22px' }}>🗑️</div>

            <p style={{ fontSize: '17px', fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: '8px' }}>Delete Habit?</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: '1.5', marginBottom: '24px' }}>This habit and its history will be permanently removed.</p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ flex: 1, height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  const idToDelete = confirmDelete;
                  setConfirmDelete(null);
                  if (idToDelete) {
                    void handleDeleteRoutine(idToDelete);
                  }
                }}
                style={{ flex: 1, height: '46px', borderRadius: '14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
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

        @keyframes spin {
          to { transform: rotate(360deg) }
        }

        @keyframes modalUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes modalGlow {
          0%,100% {
            box-shadow:
              0 0 20px rgba(0,232,122,0.15),
              0 -4px 40px rgba(0,0,0,0.8);
          }
          50% {
            box-shadow:
              0 0 40px rgba(0,232,122,0.25),
              0 -4px 40px rgba(0,0,0,0.8);
          }
        }
        @keyframes inputFocus {
          from {
            box-shadow:
              inset 3px 3px 8px
              rgba(0,0,0,0.8);
          }
          to {
            box-shadow:
              inset 3px 3px 8px
              rgba(0,0,0,0.8),
              0 0 0 1px rgba(0,232,122,0.5),
              0 0 16px rgba(0,232,122,0.2);
          }
        }
        @keyframes shimmerActivate {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        @keyframes dayGlow {
          0%,100% {
            box-shadow:
              0 0 8px rgba(0,232,122,0.5);
          }
          50% {
            box-shadow:
              0 0 16px rgba(0,232,122,0.8),
              0 0 32px rgba(0,232,122,0.3);
          }
        }
        @keyframes chipHover {
          from { transform: scale(1) }
          to { transform: scale(0.96) }
        }

        @keyframes completePulse {
          }
        }
        @keyframes cardPop {
          0% { transform: scale(1); opacity: 1 }
          50% { transform: scale(1.05); opacity: 0.8 }
          100% { transform: scale(0.9); opacity: 0 }
        }
        .habit-pop-out {
          animation: cardPop 0.3s ease forwards;
        }

        @keyframes pathGlow {
          0%,100% { opacity: 0.3 }
          50% { opacity: 0.7 }
        }
        @keyframes cardComplete {
          0% { opacity: 0 }
          100% { opacity: 1 }
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

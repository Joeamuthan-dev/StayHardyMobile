import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { useLanguage } from '../context/LanguageContext';
import { isWeb } from '../utils/platform';
import { supabase } from '../supabase';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistRoutinesRaw, persistRoutineLogsList, loadRoutinesRawStale, loadRoutineLogsListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import { ProductivityService } from '../lib/ProductivityService';
import CategorySelector from '../components/CategorySelector';
import ProBlurGate from '../components/ProBlurGate';
import { useSubscription } from '../context/SubscriptionContext';


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





const HABIT_SUGGESTION_CATEGORIES: Record<string, { emoji: string; habits: string[] }> = {
  'Morning': {
    emoji: '🌅',
    habits: [
      'Wake up before 7 AM', 'Drink water after waking', '5 min stretching',
      'Meditation (5–10 min)', 'Write today\'s goals', 'Read 5 pages',
      'Go for a walk', 'Workout', 'Plan your day', 'No phone for first 30 mins'
    ]
  },
  'Health': {
    emoji: '💪',
    habits: [
      'Drink 2L water', '10 min stretching', 'Walk 6000 steps', 'Workout',
      'Eat fruits', 'No junk food today', '7-8 Hours Sleep', 'Track calories',
      'Posture check', 'Take vitamins'
    ]
  },
  'Mind': {
    emoji: '🧘',
    habits: [
      'Meditation', 'Gratitude journaling', 'Deep breathing',
      'No social media for 1 hour', 'Read a book', 'Listen to a podcast',
      'Write journal', 'Positive affirmations', 'Digital detox', 'Early sleep'
    ]
  },
  'Productivity': {
    emoji: '🎯',
    habits: [
      'Plan tomorrow today', 'Complete top 3 tasks', 'No procrastination',
      'Focus session (25 min)', 'Clean workspace', 'Reply to important emails',
      'Track expenses', 'Learn something new', 'Organize files', 'Review goals'
    ]
  },
  'Learning': {
    emoji: '📚',
    habits: [
      'Read 10 pages', 'Watch educational video', 'Practice coding',
      'Learn new word', 'Study 30 minutes', 'Work on side project',
      'Write notes', 'Practice typing', 'Learn finance', 'Skill development'
    ]
  },
  'Finance': {
    emoji: '💰',
    habits: [
      'Track expenses', 'Save money today', 'No unnecessary spending',
      'Learn investing', 'Check budget', 'Record income',
      'Avoid impulse buying', 'Plan monthly budget'
    ]
  },
  'Social': {
    emoji: '👥',
    habits: [
      'Call parents', 'Talk to a friend', 'Family time', 'Help someone',
      'Networking', 'No negative talk', 'Meet new people', 'Clean room'
    ]
  },
  'Discipline': {
    emoji: '⚡',
    habits: [
      'Restart today', 'Don\'t skip twice', 'Small progress today',
      'Wake up on time', 'One task at a time', 'No zero day',
      '5 min rule', 'Start again', 'Discipline over mood', 'Keep the streak alive'
    ]
  }
};



const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Growth': '#6366F1',
    'Health': '#00E87A',
    'Home': '#F59E0B',
    'Mindset': '#8B5CF6',
    'Social': '#EC4899',
    'Work': '#3B82F6',
    'Hobby': '#F59E0B',
    'Learning': '#06B6D4',
    'Comeback': '#FF6B35',
  };
  const randoms = ['#F97316', '#06B6D4', '#84CC16', '#EF4444', '#A855F7'];
  return colors[category] || randoms[Math.floor(Math.random() * randoms.length)];
};

const getCategoryIcon = (category: string): React.ReactNode => {
  const c = 'rgba(255,255,255,0.72)';
  switch (category) {
    case 'General':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="12,5 13.8,11 12,12 10.2,11" fill={c} stroke="none"/>
          <polygon points="12,19 10.2,13 12,12 13.8,13" fill={c} fillOpacity={0.35} stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill={c} fillOpacity={0.6} stroke="none"/>
        </svg>
      );
    case 'Comeback':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,17 8,12 12,15 21,6"/>
          <polyline points="16,6 21,6 21,11"/>
          <circle cx="3" cy="17" r="1.8" fill={c} fillOpacity={0.4} stroke="none"/>
        </svg>
      );
    case 'Growth':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V14"/>
          <path d="M12 14c0 0-5-1.5-5-7 0 0 2-3 5-1.5C15 4 17 7 17 7c0 5.5-5 7-5 7z" fill={c} fillOpacity={0.2}/>
          <path d="M12 18c0 0-3-1-4-3" strokeOpacity={0.5}/>
        </svg>
      );
    case 'Health':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={c} fillOpacity={0.2}/>
          <path d="M8 12h2l1-2 2 4 1-2h2" strokeWidth={1.2}/>
        </svg>
      );
    case 'Hobby':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={c} fillOpacity={0.7} stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case 'Home':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={c} fillOpacity={0.2}/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'Learning':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill={c} fillOpacity={0.2}/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill={c} fillOpacity={0.2}/>
        </svg>
      );
    case 'Mindset':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14z" fill={c} fillOpacity={0.2}/>
          <line x1="9" y1="18" x2="15" y2="18"/>
          <line x1="10" y1="22" x2="14" y2="22"/>
        </svg>
      );
    case 'Social':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={c} fillOpacity={0.2}/>
          <line x1="8" y1="10" x2="16" y2="10" strokeOpacity={0.5}/>
          <line x1="8" y1="14" x2="13" y2="14" strokeOpacity={0.5}/>
        </svg>
      );
    case 'Work':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" fill={c} fillOpacity={0.15}/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          <line x1="2" y1="12" x2="22" y2="12" strokeOpacity={0.35}/>
        </svg>
      );
    case 'Content':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill={c} fillOpacity={0.2}/>
        </svg>
      );
    case 'Finance':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" fill={c} fillOpacity={0.15}/>
          <path d="M12 6v1.5"/>
          <path d="M12 16.5V18"/>
          <path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3s2.5 1.5 2.5 3a2.5 2.5 0 0 1-5 0"/>
        </svg>
      );
    case 'Fitness':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="9" width="4" height="6" rx="1" fill={c} fillOpacity={0.3}/>
          <rect x="18" y="9" width="4" height="6" rx="1" fill={c} fillOpacity={0.3}/>
          <rect x="5.5" y="10.5" width="3" height="3" rx="0.5" fill={c} fillOpacity={0.5} stroke="none"/>
          <rect x="15.5" y="10.5" width="3" height="3" rx="0.5" fill={c} fillOpacity={0.5} stroke="none"/>
          <line x1="8.5" y1="12" x2="15.5" y2="12" strokeWidth={2.5}/>
        </svg>
      );
    case 'Creative':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2v-.5c0-.55.45-1 1-1H17c2.76 0 5-2.24 5-5C22 6.48 17.52 2 12 2z" fill={c} fillOpacity={0.15}/>
          <circle cx="8.5" cy="8.5" r="1.5" fill={c} stroke="none"/>
          <circle cx="14.5" cy="8.5" r="1.5" fill={c} stroke="none"/>
          <circle cx="8" cy="14" r="1.5" fill={c} stroke="none"/>
          <circle cx="15.5" cy="13.5" r="1.5" fill={c} fillOpacity={0.55} stroke="none"/>
        </svg>
      );
    case 'Travel':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13"/>
          <path d="M22 2L15 22 11 13 2 9l20-7z" fill={c} fillOpacity={0.2}/>
        </svg>
      );
    case 'Custom':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4" fill={c} fillOpacity={0.25}/>
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3" fill={c} fillOpacity={0.4} stroke="none"/>
        </svg>
      );
  }
};






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
  switch (cat) {
    case 'All':
    case 'ALL':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'Health':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case 'Work':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      );
    case 'Social':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'Growth':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'Mindset':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
        </svg>
      );
    case 'Home':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'Hobby':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
        </svg>
      );
    case 'Learning':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0 -4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
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
  const days = ['MON', 'TUE', 'WED',
    'THU', 'FRI', 'SAT', 'SUN']

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
        }} />

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
                      strokeDashoffset="0" />
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
              }} />
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
  const { isPro } = useSubscription();
  const { setLoading: setGlobalLoading, setLoadingText } = useLoading();
  useLanguage();
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const isTogglingRef = useRef(false);
  const toggleTimeoutRef = useRef<any>(null);


  useEffect(() => {
    const handleOpenCreateRoutine = () => setShowModal(true);
    window.addEventListener('open-create-routine', handleOpenCreateRoutine);
    return () => window.removeEventListener('open-create-routine', handleOpenCreateRoutine);
  }, []);

  useEffect(() => {
    if (!showModal) {
      setSuggestionCategory(null);
    }
  }, [showModal]);



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



  const dismissStreakBanner = useCallback(() => {
    setStreakBannerLeaving(true);
    window.setTimeout(() => setStreakBannerMounted(false), 420);
  }, []);

  // Form State
  const [title, setTitle] = useState('');

  const [selectedIcon, setSelectedIcon] = useState('fitness_center');
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const [suggestionCategory, setSuggestionCategory] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState('');



  const persistRoutineCaches = useCallback(async (uid: string, r: RoutineData[], l: RoutineLog[]) => {
    const rawRows: RoutineRow[] = r.map(({ completed, missed, isActiveToday, ...rest }) => rest as RoutineRow);
    await persistRoutinesRaw(uid, rawRows);
    await persistRoutineLogsList(uid, l);
    await ProductivityService.recalculate(uid);
  }, []);







  const getWeekDays = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
        return;
      }
      if (!user?.id) {
        setRoutines([]);
        setLogs([]);
        return;
      }
      // Background sync - do not block UI
      const performSync = async () => {
        try {
          const rawR = await loadRoutinesRawStale<RoutineRow>(user.id);
          const rawL = await loadRoutineLogsListStale<RoutineLog>(user.id);
          if (rawR !== null && rawL !== null) {
            // FIX: Do not overwrite optimistic toggle state with stale cache data
            if (!isTogglingRef.current) {
              const { mappedRoutines, logs } = mapFetchedToRoutineState(rawR, rawL, user.id);
              setLogs(logs);
              setRoutines(mappedRoutines);
            }
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

          // FIX: Do not overwrite optimistic toggle state with network fetch data
          if (!isTogglingRef.current) {
            const { mappedRoutines, logs } = mapFetchedToRoutineState(rrows, logsArr, user.id);
            setLogs(logs);
            setRoutines(mappedRoutines);
          }
        } catch (err) {
          console.error('Error fetching data:', err);
        } finally {
          if (isPro) {
            setGlobalLoading(false);
          }
        }
      };

      void performSync();
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
      setSuggestionCategory(null);
      setShowSuggestions(false);
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
      setSuggestionCategory(null);
      setShowSuggestions(false);
      void fetchRoutinesAndLogs({ force: true });
      if (user?.id) void ProductivityService.recalculate(user.id);
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
      await persistRoutineCaches(user.id, routines.map((r) => r.id === routine.id ? { ...r, completed: isNowCompleted } : r), isNowCompleted ? (logs.some((l) => l.routine_id === routine.id && l.completed_at === today) ? logs : [...logs, { routine_id: routine.id, completed_at: today }]) : logs.filter((l) => !(l.routine_id === routine.id && l.completed_at === today)));
      void invalidateUserStatsCache();
      void syncWidgetData();
      triggerGlobalRefresh();
      return;
    }

    try {
      if (isNowCompleted) {
        // FIX: Use upsert instead of insert to handle duplicate logs gracefully.
        // Unique constraint is on (routine_id, completed_at).
        // ignoreDuplicates: true means if the log already exists, silently skip — no error thrown.
        const { error } = await supabase.from('routine_logs').upsert([{
          routine_id: routine.id,
          user_id: user.id,
          completed_at: today,
          created_at: new Date().toISOString()
        }], { onConflict: 'routine_id,completed_at', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routine_logs')
          .delete()
          .eq('routine_id', routine.id)
          .eq('user_id', user.id)
          .eq('completed_at', today);
        if (error) throw error;
      }

      // FIX: Persist updated state to local cache after confirmed DB write.
      // Without this, navigating away and back reloads stale cache and
      // shows habits as uncompleted even though DB is correct.
      const nextRoutines = routines.map((r) =>
        r.id === routine.id ? { ...r, completed: isNowCompleted } : r
      );
      const nextLogs = isNowCompleted
        ? (logs.some(l => l.routine_id === routine.id && l.completed_at === today)
            ? logs
            : [...logs, { routine_id: routine.id, completed_at: today }])
        : logs.filter(l => !(l.routine_id === routine.id && l.completed_at === today));
      // Await cache write so stayhardy_refresh reads fresh data
      await persistRoutineCaches(user.id, nextRoutines, nextLogs);

      void syncWidgetData();
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
    } catch (err) {
      // FIX: Log the actual error message for diagnosability
      console.error('Failed to sync routine status:', (err as any)?.message || JSON.stringify(err), err);
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
      await persistRoutineCaches(user.id, nextR, nextL);
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
      return;
    }
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      await persistRoutineCaches(user.id, nextR, nextL);
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Error deleting routine:', err);
      setRoutines(prevR);
      setLogs(prevL);
    }
  };



  return (
    <ProBlurGate featureName="Habits">
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 8px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>DAILY ACTIONS</h2>
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{todayDoneCount}/{todayTotalCount}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isWeb && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-create-routine'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#00E87A', border: 'none', borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: '800', color: '#000', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> New Habit
                </button>
              )}
              <button onClick={() => setShowAllModal(true)} style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: '800', color: '#00E676', cursor: 'pointer' }}>MANAGE</button>
            </div>
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
          {routines.length === 0 ? (
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
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 700,
            display: 'flex',
            alignItems: 'center', // CHANGED
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', // CHANGED
            paddingTop: 'env(safe-area-inset-top, 20px)', // CHANGED
            paddingLeft: '12px', // CHANGED
            paddingRight: '12px', // CHANGED
            boxSizing: 'border-box' // CHANGED
          }}>
            <div onClick={() => setShowModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} />
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                background: 'rgba(5,5,5,0.97)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '32px', // CHANGED
                border: '1px solid rgba(0,232,122,0.35)',
                // borderBottom: 'none', // REMOVED
                paddingBottom: '32px', // CHANGED
                animation: 'modalUp 0.4s cubic-bezier(0.34,1.56,0.64,1), modalGlow 3s ease-in-out infinite',
                maxHeight: 'calc(100vh - 180px)', // CHANGED
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0 0' }}><div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 20px 20px' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: '#00E87A', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>ACTIVATION SEQUENCE</p>
                  <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>New Habit</h2>
                </div>
                <div onClick={() => setShowModal(false)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
                  </svg>
                </div>
              </div>

              <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
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
                      onFocus={() => { setFocusedField('name'); setShowSuggestions(true); }}
                      onBlur={() => { setFocusedField(''); setTimeout(() => setShowSuggestions(false), 200); }}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', caretColor: '#00E87A', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Smart Habit Finder — shown only when input is focused */}
                {showSuggestions && (
                <div onMouseDown={e => e.preventDefault()}>
                  <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', margin: '0 0 10px 0' }}>⚡ SUGGESTIONS</p>

                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {Object.keys(HABIT_SUGGESTION_CATEGORIES).map(cat => {
                      const isSelected = suggestionCategory === cat;
                      return (
                        <div
                          key={cat}
                          onClick={() => setSuggestionCategory(isSelected ? null : cat)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isSelected ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.04)',
                            border: '1px solid ' + (isSelected ? 'rgba(0,232,122,0.5)' : 'rgba(255,255,255,0.1)'),
                            borderRadius: '20px',
                            padding: '8px 14px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(0,232,122,0.3)' : 'none'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{HABIT_SUGGESTION_CATEGORIES[cat].emoji}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? '#00E87A' : 'rgba(255,255,255,0.6)' }}>{cat}</span>
                        </div>
                      );
                    })}
                  </div>

                  {suggestionCategory && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                      {HABIT_SUGGESTION_CATEGORIES[suggestionCategory].habits.map((habit, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setTitle(habit);
                            setSuggestionCategory(null);
                            setShowSuggestions(false);
                          }}
                          style={{
                            background: 'rgba(0,232,122,0.07)',
                            border: '1px solid rgba(0,232,122,0.25)',
                            borderRadius: '20px',
                            padding: '7px 14px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'rgba(255,255,255,0.75)',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {habit}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}

                <div>
                  <CategorySelector
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    <label style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>REPEAT ON</label>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{selectedDays.length} days selected</span>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                    <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', height: '1px', background: 'linear-gradient(90deg, rgba(0,232,122,0.15), rgba(0,232,122,0.05))', zIndex: 0 }} />
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                      const isSelected = selectedDays.includes(day);
                      const label = ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i];
                      return (
                        <div key={i} onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(x => x !== day) : [...prev, day])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', position: 'relative', zIndex: 1, cursor: 'pointer' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? 'linear-gradient(135deg, #00E87A, #00C563)' : 'linear-gradient(145deg, #0d0d0d, #151515)', border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isSelected ? '0 0 16px rgba(0,232,122,0.7), 0 0 32px rgba(0,232,122,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'inset 3px 3px 6px rgba(0,0,0,0.6), inset -1px -1px 3px rgba(255,255,255,0.02)', transition: 'all 0.25s ease', animation: isSelected ? 'dayGlow 2s ease-in-out infinite' : 'none' }}>
                            <span style={{ fontSize: '11px', fontWeight: '900', color: isSelected ? '#000000' : 'rgba(255,255,255,0.25)' }}>{label}</span>
                          </div>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSelected ? '#00E87A' : 'transparent', boxShadow: isSelected ? '0 0 6px rgba(0,232,122,0.8)' : 'none', transition: 'all 0.2s ease' }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {[{ label: 'Every Day', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }, { label: 'Weekdays', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }, { label: 'Weekends', days: ['Sat', 'Sun'] }].map((preset, i) => (
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
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000', animation: 'spin 0.8s linear infinite' }} />
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
            alignItems: 'center', // CHANGED
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)', // CHANGED
            paddingTop: 'env(safe-area-inset-top, 20px)', // CHANGED
            paddingLeft: '12px', // CHANGED
            paddingRight: '12px', // CHANGED
            boxSizing: 'border-box' // CHANGED
          }}>
            <div onClick={() => setShowAllModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'relative',
                width: '100%',
                background: '#0D0D0D',
                borderRadius: '32px', // CHANGED
                border: '1px solid #00E676', // CHANGED
                paddingBottom: '24px', // CHANGED
                maxHeight: 'calc(100vh - 180px)', // CHANGED
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
                        background: 'linear-gradient(145deg, #111411, #0d0f0d)',
                        border: '1px solid rgba(0,232,122,0.15)',
                        borderRadius: '18px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.5), inset -1px -1px 3px rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.4)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Category icon */}
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(0,232,122,0.08)',
                        border: '1px solid rgba(0,232,122,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0
                      }}>
                        {getCategoryIcon(r.category)}
                      </div>

                      {/* Title + category */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          fontWeight: '800',
                          color: '#FFFFFF',
                          letterSpacing: '-0.2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {r.title}
                        </p>
                        <p style={{
                          margin: '2px 0 0 0',
                          fontSize: '10px',
                          fontWeight: '600',
                          color: 'rgba(255,255,255,0.3)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}>
                          {r.category || 'General'} · {r.days.length === 7 ? 'Every Day' : r.days.join(', ')}
                        </p>
                      </div>

                      {/* Trash icon delete button */}
                      <button
                        onClick={() => handleDeleteRoutine(r.id)}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '12px',
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                          boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.4)'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}


        <style>{`
            .streak-glass-banner { position: relative; display: flex; align-items: center; gap: 0.75rem; padding: 1rem; border-radius: 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(16px); }
            .streak-glass-banner__sparkle { color: #6ee7b7; font-size: 20px !important; }
            .streak-glass-banner__copy { flex: 1; }
            .streak-glass-banner__head { margin: 0; font-size: 0.9rem; font-weight: 900; color: #fff; }
            .streak-glass-banner__sub { margin: 0; font-size: 0.7rem; color: rgba(255,255,255,0.6); }
            .streak-glass-banner__close { background: none; border: none; padding: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.4); transition: color 0.2s; }
            .streak-glass-banner__close:hover { color: #fff; }
            .routine-syncing { text-align: center; font-size: 13px; color: rgba(255,255,255,0.4); }
            .routine-empty-tile { width: 100%; padding: 30px; border: 1px dashed rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.4); border-radius: 16px; cursor: pointer; }
            .routine-filter-empty { text-align: center; padding: 40px; color: rgba(255,255,255,0.3); font-size: 13px; }
          `}</style>
      </div>
    </ProBlurGate>
  );
};

export default Routine;

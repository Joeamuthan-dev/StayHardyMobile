// src/hooks/useBadges.ts
import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { BADGE_COLORS } from '../components/BadgeIcons';

export interface BadgeDef {
  key: string;
  color: string;
  name: string;
  description: string;
  requiredStreak: number;
}

// All milestone badges in order
export const BADGE_DEFS: BadgeDef[] = [
  { key: 'streak_7',   color: BADGE_COLORS.streak_7,   name: '7-Day Streak',     description: '7 days straight. Consistency is a superpower.',   requiredStreak: 7   },
  { key: 'streak_15',  color: BADGE_COLORS.streak_15,  name: '15-Day Grind',     description: 'Two weeks of discipline. Keep pushing.',            requiredStreak: 15  },
  { key: 'streak_30',  color: BADGE_COLORS.streak_30,  name: '30-Day Champion',  description: "A full month. You're built different.",             requiredStreak: 30  },
  { key: 'streak_50',  color: BADGE_COLORS.streak_50,  name: '50-Day Legend',    description: '50 days. Your habits are forged in steel.',         requiredStreak: 50  },
  { key: 'streak_100', color: BADGE_COLORS.streak_100, name: '100-Day Warrior',  description: '100 days. Elite tier. Bow to no one.',              requiredStreak: 100 },
  { key: 'streak_150', color: BADGE_COLORS.streak_150, name: '150-Day Immortal', description: '150 days. Most quit at day 1.',                    requiredStreak: 150 },
  { key: 'streak_200', color: BADGE_COLORS.streak_200, name: '200-Day God Mode', description: '200 days. You ARE Stay Hardy.',                    requiredStreak: 200 },
  { key: 'streak_250', color: BADGE_COLORS.streak_250, name: '250-Day Ascended', description: '250 days. A different species entirely.',           requiredStreak: 250 },
  { key: 'streak_300', color: BADGE_COLORS.streak_300, name: '300-Day Diamond',  description: '300 days. Pressure made you a diamond.',           requiredStreak: 300 },
];

export interface EarnedBadge extends BadgeDef {
  earned_at: string;
  popup_shown: boolean;
}

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function localDateStr(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
}

async function computeHabitStreak(userId: string): Promise<number> {
  const windowDays = 365;
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);
  const startStr = localDateStr(windowStart);

  const [{ data: routinesData }, { data: logsData }] = await Promise.all([
    supabase.from('routines').select('id, days').eq('user_id', userId),
    supabase.from('routine_logs')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', startStr),
  ]);

  const routines = (routinesData ?? []) as { id: string; days: string[] }[];
  const logDays = new Set((logsData ?? []).map((l: { completed_at: string }) => l.completed_at));

  let streak = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = localDateStr(d);
    const dayName = daysOfWeek[d.getDay()];
    const scheduled = routines.filter(r => r.days?.includes(dayName)).length;

    if (logDays.has(ds)) {
      streak++;
    } else {
      if (i === 0) continue; // today not yet done — don't break
      if (scheduled === 0) continue; // rest day — don't break
      break;
    }
  }
  return streak;
}

export function useBadges() {
  const [pendingBadges, setPendingBadges] = useState<EarnedBadge[]>([]);
  const [allEarned, setAllEarned] = useState<EarnedBadge[]>([]);

  const checkAndAwardBadges = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const streak = await computeHabitStreak(userId);
    if (streak === 0) return;

    const { data: existingData } = await supabase
      .from('user_badges')
      .select('badge_key, earned_at, popup_shown')
      .eq('user_id', userId);

    const existing = existingData ?? [];
    const earnedKeys = new Set(existing.map((b: { badge_key: string }) => b.badge_key));

    const toAward = BADGE_DEFS.filter(
      bd => streak >= bd.requiredStreak && !earnedKeys.has(bd.key)
    );

    if (toAward.length > 0) {
      await supabase.from('user_badges').upsert(
        toAward.map(bd => ({ user_id: userId, badge_key: bd.key, popup_shown: false })),
        { onConflict: 'user_id,badge_key' },
      );
    }

    const { data: allData } = await supabase
      .from('user_badges')
      .select('badge_key, earned_at, popup_shown')
      .eq('user_id', userId)
      .order('earned_at', { ascending: true });

    const earnedList: EarnedBadge[] = (allData ?? []).map(
      (row: { badge_key: string; earned_at: string; popup_shown: boolean }) => {
        const def = BADGE_DEFS.find(d => d.key === row.badge_key) ?? {
          key: row.badge_key, color: '#00E87A', name: row.badge_key, description: '', requiredStreak: 0,
        };
        return { ...def, earned_at: row.earned_at, popup_shown: row.popup_shown };
      }
    );

    setAllEarned(earnedList);
    setPendingBadges(earnedList.filter(b => !b.popup_shown));
  }, []);

  const markBadgeSeen = useCallback(async (badgeKey: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    await supabase
      .from('user_badges')
      .update({ popup_shown: true })
      .eq('user_id', userId)
      .eq('badge_key', badgeKey);

    setPendingBadges(prev => prev.filter(b => b.key !== badgeKey));
    setAllEarned(prev => prev.map(b => b.key === badgeKey ? { ...b, popup_shown: true } : b));
  }, []);

  return { pendingBadges, allEarned, checkAndAwardBadges, markBadgeSeen };
}

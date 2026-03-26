import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';
import { calculateProductivityScore } from '../utils/productivity';
import WidgetDataPlugin, { type WidgetDataPayload } from '../plugins/widgetDataPlugin';

export type { WidgetDataPayload };

async function buildWidgetPayload(userId: string): Promise<WidgetDataPayload | null> {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  const todayDate = new Date();
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const localTodayStr = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDayStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

  const [{ data: score }, { data: tasksData }, { data: routinesData }, { data: logsData }, { data: goalsData }] =
    await Promise.all([
      supabase.rpc('get_productivity_score', {
        p_user_id: userId,
        p_day_name: currentDayName,
        p_today_str: localTodayStr,
      }),
      supabase.from('tasks').select('id, title, status, priority').eq('userId', userId),
      supabase.from('routines').select('id, title, days').eq('user_id', userId),
      supabase
        .from('routine_logs')
        .select('routine_id, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', startDayStr),
      supabase.from('goals').select('id, name, status, progress').eq('userId', userId),
    ]);

  const scoreRow = score as
    | {
        tasks_progress?: number;
        routines_progress?: number;
        goals_progress?: number;
        overall_score?: number;
        tasks_total?: number;
        tasks_completed?: number;
        routines_total?: number;
        routines_completed?: number;
      }
    | null
    | undefined;

  const tasks = tasksData ?? [];

  const routines = (routinesData ?? []) as { id: string; title: string; days: string[] }[];

  const routineLogs = (logsData ?? []) as { routine_id: string; completed_at: string }[];

  const goals = (goalsData ?? []) as { id: string; name: string; status: string; progress?: number }[];

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

  const tasksTotal = scoreRow?.tasks_total ?? tasks.length;
  const tasksCompleted = scoreRow?.tasks_completed ?? tasks.filter((t) => t.status === 'completed').length;
  const activeRoutinesTodayCount =
    scoreRow?.routines_total ?? routines.filter((r) => r.days?.includes(currentDayName)).length;
  const completedRoutinesToday =
    scoreRow?.routines_completed ?? routineLogs.filter((l) => l.completed_at === localTodayStr).length;

  const routinesTotal = activeRoutinesTodayCount;
  const routinesCompleted = completedRoutinesToday;

  const tasksProgress =
    scoreRow?.tasks_progress ??
    (tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100) : 0);
  const routinesProgress =
    scoreRow?.routines_progress ??
    (activeRoutinesTodayCount > 0 ? Math.round((completedRoutinesToday / activeRoutinesTodayCount) * 100) : 0);
  const avgGoalProgress =
    scoreRow?.goals_progress ??
    (goals.length > 0
      ? Math.round(
          goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : Number(g.progress) || 0), 0) / goals.length,
        )
      : 0);

  const productivityScore =
    scoreRow?.overall_score ??
    calculateProductivityScore({
      tasksProgress,
      routinesProgress,
      goalsProgress: avgGoalProgress,
    });

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const sortedPending = [...pendingTasks].sort((a, b) => {
    const pA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
    const pB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
    return pB - pA;
  });
  const topPendingTask = sortedPending[0]?.title?.trim() || '';

  return {
    streak: currentStreak,
    tasksCompleted,
    tasksTotal,
    routinesCompleted,
    routinesTotal,
    productivityScore: Math.round(Number(productivityScore) || 0),
    topPendingTask,
  };
}

/** Pushes latest StayHardy stats to the Android home screen widget (native only). */
export async function syncWidgetData(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    const payload = await buildWidgetPayload(userId);
    if (!payload) return;

    await WidgetDataPlugin.updateWidgetData(payload);
  } catch (e) {
    console.warn('[syncWidgetData]', e);
  }
}

import { loadTasksListStale, loadGoalsListStale, loadRoutinesRawStale, loadRoutineLogsListStale } from './listCaches';
import { calculateProductivityScore } from '../utils/productivity';
import { CacheManager } from './cacheManager';

export interface ProductivityScoreData {
  tasks_progress: number;
  routines_progress: number;
  goals_progress: number;
  overall_score: number;
  tasks_total: number;
  tasks_completed: number;
  routines_total: number;
  routines_completed: number;
  goals_total: number;
}

export class ProductivityService {
  /**
   * Recalculates the user's unified productivity score entirely from offline-first local 
   * indexedDB layers, ensuring the percentage math applies seamlessly and immediately.
   */
  static async recalculate(userId: string): Promise<ProductivityScoreData> {
    const tasks = (await loadTasksListStale<any>(userId)) || [];
    const goals = (await loadGoalsListStale<any>(userId)) || [];
    const routines = (await loadRoutinesRawStale<any>(userId)) || [];
    const logs = (await loadRoutineLogsListStale<any>(userId)) || [];

    // 1. Tasks Match
    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter((t: any) => t.status === 'completed').length;
    const tasksProgress = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;

    // 2. Goals Math
    const goalsTotal = goals.length;
    let goalsSum = 0;
    goals.forEach((g: any) => {
      goalsSum += (g.status === 'completed' ? 100 : (g.progress || 0));
    });
    const goalsProgress = goalsTotal > 0 ? Math.round(goalsSum / goalsTotal) : 0;

    // 3. Routines Math (Habits)
    const today = new Date();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDayName = daysOfWeek[today.getDay()];
    // Get local timezone-safe string YYYY-MM-DD
    const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Only count routines scheduled for today
    const routinesToday = routines.filter((r: any) => r.days?.includes(currentDayName)).length;
    const logsToday = logs.filter((l: any) => l.completed_at === localTodayStr).length;
    const routinesProgress = routinesToday > 0 ? Math.round((logsToday / routinesToday) * 100) : 0;

    // 4. Extract Final 50/30/20 Rating
    const overallScore = calculateProductivityScore({
      tasksProgress,
      routinesProgress,
      goalsProgress
    });

    const scoreData: ProductivityScoreData = {
      tasks_progress: tasksProgress,
      routines_progress: routinesProgress,
      goals_progress: goalsProgress,
      overall_score: overallScore,
      tasks_total: tasksTotal,
      tasks_completed: tasksCompleted,
      routines_total: routinesToday,
      routines_completed: logsToday,
      goals_total: goalsTotal
    };

    // 5. Save statically
    await CacheManager.saveToCache('global_productivity_score', { user_id: userId, score: scoreData }, null);

    // 6. Push event downstream instantly
    window.dispatchEvent(new CustomEvent('productivity_sync', { detail: scoreData }));

    return scoreData;
  }

  /**
   * Safe fetch for application mounts so UI instantly renders prior to background syncing.
   */
  static async getStoredScore(userId: string): Promise<ProductivityScoreData | null> {
    const snap = await CacheManager.getStaleCache<{ user_id: string; score: ProductivityScoreData }>('global_productivity_score');
    if (snap?.user_id === userId && snap.score) {
      return snap.score;
    }
    return null;
  }
}

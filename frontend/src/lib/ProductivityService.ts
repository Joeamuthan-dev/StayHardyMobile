import { loadTasksListStale, loadGoalsListStale, loadRoutinesRawStale, loadRoutineLogsListStale } from './listCaches';
import { calculateProductivityScore } from '../utils/productivity';
import { CacheManager } from './cacheManager';
import { supabase } from '../supabase';

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
    const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    const routinesToday = routines.filter((r: any) => r.days?.includes(currentDayName)).length;
    const logsToday = logs.filter((l: any) => l.completed_at === localTodayStr).length;
    const routinesProgress = routinesToday > 0 ? Math.round((logsToday / routinesToday) * 100) : 0;

    // 4. Role-aware Score Calculation
    // Fetch user role from Supabase users table
    // Unified formula for all users: Routines 50%, Goals 30%, Tasks 20%
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

    // 5. Save to local cache manager (async)
    void CacheManager.saveToCache('global_productivity_score', { user_id: userId, score: scoreData }, null);

    // 6. Save to localStorage synchronously for instant retrieval on reload
    localStorage.setItem('ps_score_' + userId, String(overallScore));
    localStorage.setItem('ps_score_ts_' + userId, String(Date.now()));

    // 7. Update Supabase users table for persistence across devices
    void supabase
      .from('users')
      .update({ productivity_score: overallScore })
      .eq('id', userId);

    // 8. Push events downstream instantly
    window.dispatchEvent(new CustomEvent('productivity_sync', { detail: scoreData }));
    window.dispatchEvent(new CustomEvent('stayhardy_refresh'));

    return scoreData;
  }

  /**
   * Safe fetch for application mounts so UI instantly renders prior to background syncing.
   */
  static async getStoredScore(userId: string): Promise<ProductivityScoreData | null> {
    // 1. Try localStorage first (fastest, survives reload)
    try {
      const local = localStorage.getItem('ps_score_' + userId);
      if (local) return { overall_score: Number(local) } as ProductivityScoreData;
    } catch (e) {
      console.error('Error reading score from localStorage:', e);
    }

    // 2. Fallback to CacheManager
    const snap = await CacheManager.getStaleCache<{ user_id: string; score: ProductivityScoreData }>('global_productivity_score');
    if (snap?.user_id === userId && snap.score) {
      return snap.score;
    }
    return null;
  }
}

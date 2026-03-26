import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import BottomNav from '../components/BottomNav';

type TabFilter = 'all' | 'tasks' | 'goals';
type DatePreset = 'all' | 'month' | '30d' | 'custom';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt?: string;
  image_url?: string;
}

interface Goal {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function completionTime(iso?: string, fallback?: string) {
  const t = new Date(iso || fallback || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function inRange(t: number, start: Date | null, end: Date | null) {
  if (!start || !end) return true;
  return t >= start.getTime() && t <= end.getTime();
}

function categoryPillClass(cat: string): string {
  const u = (cat || '').toUpperCase();
  if (u.includes('WORK')) return 'hist-cat-pill--blue';
  if (u.includes('PERSONAL') || u.includes('HOME') || u.includes('HEALTH')) return 'hist-cat-pill--green';
  return 'hist-cat-pill--slate';
}

/** Swipe left to reveal delete (touch) */
const SwipeDeleteRow: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
  disabled?: boolean;
}> = ({ children, onDelete, disabled }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState(0);
  const dragRef = useRef({ active: false, startX: 0, startDx: 0 });
  const maxOpen = 76;

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const t = e.touches[0];
    dragRef.current = { active: true, startX: t.clientX, startDx: dx };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current.active || disabled) return;
    const t = e.touches[0];
    const delta = t.clientX - dragRef.current.startX;
    let next = dragRef.current.startDx + delta;
    if (next > 0) next = 0;
    if (next < -maxOpen) next = -maxOpen;
    setDx(next);
  };
  const onTouchEnd = () => {
    if (!dragRef.current.active || disabled) return;
    dragRef.current.active = false;
    setDx((d) => (d < -maxOpen / 2 ? -maxOpen : 0));
  };

  return (
    <div className="hist-swipe-wrap" ref={wrapRef}>
      <div className="hist-swipe-actions">
        <button type="button" className="hist-swipe-del-btn" onClick={onDelete} aria-label="Delete">
          <span className="material-symbols-outlined">delete</span>
        </button>
      </div>
      <div
        className="hist-swipe-front"
        style={{ transform: `translateX(${dx}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

const Planner: React.FC = () => {
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const [isSidebarHidden, setIsSidebarHidden] = useState(
    () => localStorage.getItem('sidebarHidden') === 'true',
  );
  const toggleSidebar = () => {
    setIsSidebarHidden((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarHidden', next.toString());
      return next;
    });
  };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const [totalTasksCount, setTotalTasksCount] = useState(0);
  const [totalGoalsCount, setTotalGoalsCount] = useState(0);

  const [isTasksExpanded, setIsTasksExpanded] = useState(true);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(true);

  const [tab, setTab] = useState<TabFilter>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const rangeBounds = useMemo(() => {
    const now = new Date();
    if (datePreset === 'all') return { start: null as Date | null, end: null as Date | null };
    if (datePreset === 'month') {
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { start, end };
    }
    if (datePreset === '30d') {
      const start = startOfDay(new Date(now));
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now) };
    }
    if (datePreset === 'custom' && customStart && customEnd) {
      return { start: startOfDay(new Date(customStart)), end: endOfDay(new Date(customEnd)) };
    }
    return { start: null, end: null };
  }, [datePreset, customStart, customEnd]);

  const chipLabel = useMemo(() => {
    if (datePreset === 'all') return 'ALL TIME';
    if (datePreset === 'month') return 'THIS MONTH';
    if (datePreset === '30d') return 'LAST 30 DAYS';
    if (datePreset === 'custom' && customStart && customEnd) return 'CUSTOM';
    return 'DATE RANGE';
  }, [datePreset, customStart, customEnd]);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [
      { data: taskRows },
      { count: tc },
      { data: goalRows },
      { count: gc },
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, category, createdAt, updatedAt, image_url')
        .eq('userId', user.id)
        .eq('status', 'completed')
        .order('updatedAt', { ascending: false })
        .limit(400),
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('status', 'completed'),
      supabase
        .from('goals')
        .select('id, name, status, createdAt, updatedAt')
        .eq('userId', user.id)
        .eq('status', 'completed')
        .order('updatedAt', { ascending: false })
        .limit(400),
      supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('status', 'completed'),
    ]);

    if (taskRows) setTasks(taskRows as Task[]);
    if (tc !== null) setTotalTasksCount(tc);
    if (goalRows) setGoals(goalRows as Goal[]);
    if (gc !== null) setTotalGoalsCount(gc);
    } catch (e) {
      console.error('Planner fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setLoading]);

  useEffect(() => {
    fetchAll();
    if (!user?.id) return;

    const ch1 = supabase
      .channel('planner_tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `userId=eq.${user.id}` },
        () => fetchAll(),
      )
      .subscribe();
    const ch2 = supabase
      .channel('planner_goals')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals', filter: `userId=eq.${user.id}` },
        () => fetchAll(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user?.id, fetchAll]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const ts = completionTime(t.updatedAt, t.createdAt);
      if (!inRange(ts, rangeBounds.start, rangeBounds.end)) return false;
      return true;
    });
  }, [tasks, rangeBounds]);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const ts = completionTime(g.updatedAt, g.createdAt);
      if (!inRange(ts, rangeBounds.start, rangeBounds.end)) return false;
      return true;
    });
  }, [goals, rangeBounds]);

  const monthStart = useMemo(() => startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), []);

  const summary = useMemo(() => {
    const taskThisMonth = tasks.filter(
      (t) => completionTime(t.updatedAt, t.createdAt) >= monthStart.getTime(),
    ).length;
    const goalThisMonth = goals.filter(
      (g) => completionTime(g.updatedAt, g.createdAt) >= monthStart.getTime(),
    ).length;
    const completedThisMonth = taskThisMonth + goalThisMonth;

    return { completedThisMonth };
  }, [tasks, goals, monthStart]);

  const groupByDay = <T extends { updatedAt?: string; createdAt: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    items.forEach((item) => {
      const raw = item.updatedAt || item.createdAt;
      const d = new Date(raw);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return map;
  };

  const groupedGoalsMap = groupByDay(filteredGoals);

  function pad(n: number) {
    return String(n).padStart(2, '0');
  }

  function formatGroupLabel(isoDay: string) {
    const d = new Date(isoDay + 'T12:00:00');
    return d
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      .toUpperCase();
  }

  const groupedTasks = groupByDay(filteredTasks);

  const taskDayKeys = [...groupedTasks.keys()].sort((a, b) => b.localeCompare(a));
  const goalDayKeys = [...groupedGoalsMap.keys()].sort((a, b) => b.localeCompare(a));

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error(error);
      fetchAll();
    }
  };

  const deleteGoal = async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) {
      console.error(error);
      fetchAll();
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'pending', updatedAt: new Date().toISOString() })
      .eq('id', task.id);
    if (error) {
      console.error(error);
      fetchAll();
    }
  };

  const toggleGoalStatus = async (goal: Goal) => {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    const { error } = await supabase
      .from('goals')
      .update({ status: 'pending', updatedAt: new Date().toISOString() })
      .eq('id', goal.id);
    if (error) {
      console.error(error);
      fetchAll();
    }
  };

  const showTasks = tab === 'all' || tab === 'tasks';
  const showGoals = tab === 'all' || tab === 'goals';

  let cardIndex = 0;

  return (
    <div className={`page-shell hist-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .hist-page {
          padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
        }
        @media (max-width: 767px) {
          .hist-page.page-shell {
            padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
          }
        }
        @media (min-width: 768px) {
          .hist-page.page-shell {
            padding-top: 12px;
          }
        }
        .hist-aurora { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .hist-inner {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 0.45rem;
        }
        .hist-premium-header {
          position: relative;
          display: flex;
          flex-direction: column;
          margin-bottom: 0.85rem;
          padding: 0;
          overflow: visible;
        }
        .hist-premium-header__row--nav {
          position: relative;
          display: block;
          width: 100%;
          min-height: 52px;
          overflow: visible;
        }
        .hist-premium-header__nav-left {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 44px;
          height: 44px;
          pointer-events: auto;
        }
        .hist-premium-header__title-block {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 0 60px;
          text-align: center;
          overflow: visible;
        }
        .hist-premium-title {
          font-family: 'Syne', system-ui, sans-serif;
          font-size: clamp(24px, 7vw, 30px);
          font-weight: 900;
          letter-spacing: 2px;
          margin: 0;
          color: #ffffff;
          line-height: 1.1;
          white-space: nowrap;
          text-align: center;
          width: 100%;
          overflow: visible;
        }
        .hist-premium-tagline {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #00e87a;
          text-align: center;
          margin: 4px 0 0;
          line-height: 1.35;
        }
        .hist-header-icon-btn {
          opacity: 0.55;
        }

        .hist-tabs-wrap {
          margin: 1rem 0 0.85rem;
          display: flex;
          align-items: center;
          gap: 0.45rem;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .hist-tabs-wrap::-webkit-scrollbar { display: none; }
        .hist-tab {
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          padding: 0.5rem 0.85rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.35);
          color: rgba(148, 163, 184, 0.95);
          cursor: pointer;
          transition: box-shadow 0.25s, border-color 0.25s, color 0.2s, background 0.2s;
        }
        .hist-tab--active {
          color: #ecfdf5;
          background: rgba(16, 185, 129, 0.18);
          border-color: rgba(52, 211, 153, 0.45);
          box-shadow: 0 0 18px rgba(74, 222, 128, 0.28);
        }
        .hist-date-chip {
          margin-left: auto;
          flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(52, 211, 153, 0.3);
          background: rgba(16, 185, 129, 0.1);
          color: #4ade80;
          cursor: pointer;
        }

        .hist-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .hist-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 0.4rem 0.7rem;
          border-radius: 999px;
        }
        .hist-pill--green {
          color: #4ade80;
          border: 1px solid rgba(52, 211, 153, 0.35);
          background: rgba(16, 185, 129, 0.12);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.12);
        }
        .hist-pill--muted {
          color: rgba(148, 163, 184, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
        }

        .hist-section {
          margin-bottom: 1.5rem;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(8, 10, 18, 0.55);
          overflow: hidden;
        }
        .hist-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 1rem 1.1rem;
          cursor: pointer;
          user-select: none;
          background: rgba(0, 0, 0, 0.2);
          transition: background 0.2s;
        }
        .hist-section-head:active { background: rgba(255, 255, 255, 0.03); }
        .hist-section-head-left {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }
        .hist-section-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .hist-section-icon--tasks {
          background: rgba(16, 185, 129, 0.15);
          color: #4ade80;
          border: 1px solid rgba(52, 211, 153, 0.25);
        }
        .hist-section-icon--goals {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        .hist-section-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: 0.02em;
        }
        .hist-section-title--tasks { color: #4ade80; }
        .hist-section-title--goals { color: #fbbf24; }
        .hist-count-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          padding: 0.2rem 0.5rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(226, 232, 240, 0.9);
        }
        .hist-chevron {
          color: #94a3b8;
          transition: transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
          flex-shrink: 0;
        }
        .hist-chevron--open {
          transform: rotate(180deg);
        }
        .hist-section-body {
          padding: 0 1rem 1.15rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          animation: histExpand 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes histExpand {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hist-day-pill {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(148, 163, 184, 0.95);
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(12px);
          margin: 0.85rem 0 0.65rem;
        }

        .hist-swipe-wrap {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
          margin-bottom: 0.65rem;
        }
        .hist-swipe-actions {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 76px;
          display: flex;
          align-items: stretch;
          justify-content: center;
          background: linear-gradient(90deg, transparent, rgba(127, 29, 29, 0.5));
        }
        .hist-swipe-del-btn {
          width: 100%;
          border: none;
          background: #dc2626;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .hist-swipe-front {
          position: relative;
          z-index: 1;
          transition: transform 0.08s linear;
          touch-action: pan-y;
        }

        .hist-card {
          position: relative;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(6, 8, 14, 0.92);
          padding: 0.85rem 1rem;
          overflow: hidden;
          box-shadow: inset 4px 0 0 rgba(52, 211, 153, 0.25);
        }
        .hist-card--goal {
          box-shadow: inset 4px 0 0 rgba(251, 191, 36, 0.35);
        }
        .hist-card-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.12;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(251, 191, 36, 0.4) 0, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(250, 204, 21, 0.35) 0, transparent 35%),
            radial-gradient(circle at 70% 80%, rgba(245, 158, 11, 0.3) 0, transparent 38%);
        }
        .hist-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.45rem;
        }
        .hist-cat-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 0.25rem 0.45rem;
          border-radius: 999px;
          border: 1px solid transparent;
        }
        .hist-cat-pill--green {
          color: #86efac;
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(52, 211, 153, 0.35);
        }
        .hist-cat-pill--blue {
          color: #93c5fd;
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(96, 165, 250, 0.35);
        }
        .hist-cat-pill--slate {
          color: #cbd5e1;
          background: rgba(51, 65, 85, 0.35);
          border-color: rgba(100, 116, 139, 0.35);
        }
        .hist-card-title {
          font-size: 0.92rem;
          font-weight: 800;
          color: rgba(226, 232, 240, 0.72);
          text-decoration: line-through;
          text-decoration-thickness: 2px;
          text-decoration-color: rgba(148, 163, 184, 0.45);
          margin: 0 0 0.55rem;
          position: relative;
          z-index: 1;
        }
        .hist-done-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.02em;
          padding: 4px 10px;
          border-radius: 20px;
          border: 1px solid rgba(0, 232, 122, 0.2);
          color: #00e87a;
          background: rgba(0, 232, 122, 0.1);
          position: relative;
          z-index: 1;
        }
        .hist-done-chip--gold {
          border-color: rgba(251, 191, 36, 0.45);
          color: #fde68a;
          background: rgba(245, 158, 11, 0.12);
        }

        .hist-card-enter {
          animation: histCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes histCardIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hist-empty {
          text-align: center;
          padding: 2.5rem 1.25rem;
        }
        .hist-empty-emoji {
          font-size: 3rem;
          opacity: 0.35;
          display: block;
          margin-bottom: 0.75rem;
        }
        .hist-empty-title {
          font-weight: 900;
          font-size: 1rem;
          color: #e2e8f0;
          margin: 0 0 0.4rem;
        }
        .hist-empty-sub {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.95);
          margin: 0;
          line-height: 1.45;
        }

        .hist-filter-overlay {
          position: fixed;
          inset: 0;
          z-index: 9400;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .hist-filter-sheet {
          width: 100%;
          max-width: 520px;
          border-radius: 20px 20px 0 0;
          background: rgba(12, 14, 22, 0.95);
          border: 1px solid rgba(52, 211, 153, 0.15);
          padding: 1rem 1.15rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
        }
        .hist-filter-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: #94a3b8;
          margin-bottom: 0.75rem;
        }
        .hist-preset-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .hist-preset-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 0.65rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          color: #e2e8f0;
          cursor: pointer;
        }
        .hist-preset-btn--on {
          border-color: rgba(52, 211, 153, 0.45);
          color: #4ade80;
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.15);
        }
        .hist-custom-row {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }
        .hist-custom-row input {
          flex: 1;
          min-width: 120px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          color: #fff;
          padding: 0.5rem 0.65rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.75rem;
        }
      `}</style>

      <div className="aurora-bg hist-aurora">
        <div className="aurora-gradient-1" />
        <div className="aurora-gradient-2" />
      </div>

      <div className="hist-inner">
        <header className="hist-premium-header">
          <div className="hist-premium-header__row hist-premium-header__row--nav">
            <div className="hist-premium-header__nav-left">
              <button
                type="button"
                className="notification-btn desktop-only-btn hist-header-icon-btn"
                title={isSidebarHidden ? 'Show sidebar' : 'Focus mode'}
                aria-label="Toggle sidebar"
                onClick={toggleSidebar}
              >
                <span className="material-symbols-outlined">
                  {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
                </span>
              </button>
            </div>
            <div className="hist-premium-header__title-block">
              <h1 className="hist-premium-title">HISTORY</h1>
              <p className="hist-premium-tagline">YOUR JOURNEY · YOUR PROOF</p>
            </div>
          </div>
        </header>

        <div className="hist-tabs-wrap">
          {(['all', 'tasks', 'goals'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`hist-tab${tab === t ? ' hist-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'all' ? 'ALL' : t.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            className="hist-date-chip"
            onClick={() => setFilterSheetOpen(true)}
          >
            {chipLabel}
          </button>
        </div>

        <div className="hist-summary">
          <span className="hist-pill hist-pill--green">
            {summary.completedThisMonth} COMPLETED THIS MONTH
          </span>
          <span className="hist-pill hist-pill--muted">
            {totalTasksCount + totalGoalsCount} IN ARCHIVE
          </span>
        </div>

        <main>
          {showTasks && (
            <section className="hist-section">
              <div
                className="hist-section-head"
                role="button"
                tabIndex={0}
                onClick={() => setIsTasksExpanded((e) => !e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsTasksExpanded((x) => !x);
                  }
                }}
              >
                <div className="hist-section-head-left">
                  <span className="hist-section-icon hist-section-icon--tasks material-symbols-outlined">
                    task_alt
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="hist-section-title hist-section-title--tasks">Completed Tasks</h2>
                  </div>
                  <span className="hist-count-badge">{filteredTasks.length}</span>
                </div>
                <span
                  className={`material-symbols-outlined hist-chevron${isTasksExpanded ? ' hist-chevron--open' : ''}`}
                >
                  expand_more
                </span>
              </div>
              {isTasksExpanded && (
                <div className="hist-section-body">
                  {taskDayKeys.length === 0 ? (
                    <div className="hist-empty">
                      <span className="hist-empty-emoji" aria-hidden>
                        ✅
                      </span>
                      <p className="hist-empty-title">Nothing here yet</p>
                      <p className="hist-empty-sub">Complete a task from your list to see it shine here.</p>
                    </div>
                  ) : (
                    taskDayKeys.map((dayKey) => (
                      <div key={dayKey}>
                        <div className="hist-day-pill">{formatGroupLabel(dayKey)}</div>
                        {(groupedTasks.get(dayKey) || []).map((item) => {
                          const done = item.updatedAt || item.createdAt;
                          const delay = cardIndex++ * 55;
                          const cat = (item.category || 'GENERAL').toUpperCase();
                          return (
                            <SwipeDeleteRow key={item.id} onDelete={() => deleteTask(item.id)}>
                              <div
                                className="hist-card hist-card-enter"
                                style={{ animationDelay: `${delay}ms` }}
                              >
                                <div className="hist-card-top">
                                  <span className={`hist-cat-pill ${categoryPillClass(cat)}`}>{cat}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleTaskStatus(item)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                  }}
                                >
                                  <p className="hist-card-title">{item.title}</p>
                                </button>
                                {item.image_url && (
                                  <div
                                    style={{
                                      borderRadius: 12,
                                      overflow: 'hidden',
                                      marginBottom: 8,
                                      opacity: 0.55,
                                      maxHeight: 100,
                                    }}
                                  >
                                    <img
                                      src={item.image_url}
                                      alt=""
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                )}
                                <div className="hist-done-chip">
                                  ✓ DONE{' '}
                                  {new Date(done).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                            </SwipeDeleteRow>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {showGoals && (
            <section className="hist-section">
              <div
                className="hist-section-head"
                role="button"
                tabIndex={0}
                onClick={() => setIsGoalsExpanded((e) => !e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsGoalsExpanded((x) => !x);
                  }
                }}
              >
                <div className="hist-section-head-left">
                  <span className="hist-section-icon hist-section-icon--goals material-symbols-outlined">
                    emoji_events
                  </span>
                  <h2 className="hist-section-title hist-section-title--goals">Completed Goals</h2>
                  <span className="hist-count-badge">{filteredGoals.length}</span>
                </div>
                <span
                  className={`material-symbols-outlined hist-chevron${isGoalsExpanded ? ' hist-chevron--open' : ''}`}
                >
                  expand_more
                </span>
              </div>
              {isGoalsExpanded && (
                <div className="hist-section-body">
                  {goalDayKeys.length === 0 ? (
                    <div className="hist-empty">
                      <span className="hist-empty-emoji" aria-hidden>
                        🏆
                      </span>
                      <p className="hist-empty-title">Nothing here yet</p>
                      <p className="hist-empty-sub">Complete your first goal to see it here.</p>
                    </div>
                  ) : (
                    goalDayKeys.map((dayKey) => (
                      <div key={dayKey}>
                        <div className="hist-day-pill">{formatGroupLabel(dayKey)}</div>
                        {(groupedGoalsMap.get(dayKey) || []).map((item) => {
                          const done = item.updatedAt || item.createdAt;
                          const delay = cardIndex++ * 55;
                          return (
                            <SwipeDeleteRow key={item.id} onDelete={() => deleteGoal(item.id)}>
                              <div
                                className="hist-card hist-card--goal hist-card-enter"
                                style={{ animationDelay: `${delay}ms` }}
                              >
                                <div className="hist-card-stars" aria-hidden />
                                <div className="hist-card-top">
                                  <span
                                    className="hist-section-icon hist-section-icon--goals material-symbols-outlined"
                                    style={{ width: 36, height: 36, fontSize: 20 }}
                                  >
                                    emoji_events
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleGoalStatus(item)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                  }}
                                >
                                  <p className="hist-card-title">{item.name}</p>
                                </button>
                                <div className="hist-done-chip hist-done-chip--gold">
                                  <span className="material-symbols-outlined">emoji_events</span>
                                  ACHIEVED{' '}
                                  {new Date(done).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                            </SwipeDeleteRow>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {filterSheetOpen && (
        <div
          className="hist-filter-overlay"
          role="presentation"
          onClick={() => setFilterSheetOpen(false)}
        >
          <div className="hist-filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="hist-filter-title">DATE RANGE</div>
            <div className="hist-preset-grid">
              {(
                [
                  ['all', 'ALL TIME'],
                  ['month', 'THIS MONTH'],
                  ['30d', 'LAST 30 DAYS'],
                  ['custom', 'CUSTOM'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className={`hist-preset-btn${datePreset === val ? ' hist-preset-btn--on' : ''}`}
                  onClick={() => setDatePreset(val)}
                >
                  {label}
                </button>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="hist-custom-row">
                <input
                  type="date"
                  aria-label="Start date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <input
                  type="date"
                  aria-label="End date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            )}
            <button
              type="button"
              className="hist-preset-btn hist-preset-btn--on"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => setFilterSheetOpen(false)}
            >
              APPLY
            </button>
          </div>
        </div>
      )}

      <BottomNav isHidden={isSidebarHidden} hideFloatingShelf={filterSheetOpen} hideMobileNavChrome={filterSheetOpen} />
    </div>
  );
};

export default Planner;

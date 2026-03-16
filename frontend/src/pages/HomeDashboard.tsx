import React, { useState, useEffect, useMemo } from 'react';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt?: string;
  category: string;
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
}

const HomeDashboard: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };
  const { language } = useLanguage();
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'Tamil' ? 'காலை வணக்கம்' : 'Good Morning';
    if (hour < 18) return language === 'Tamil' ? 'மதிய வணக்கம்' : 'Good Afternoon';
    return language === 'Tamil' ? 'மாலை வணக்கம்' : 'Good Evening';
  };
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);




  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      // Fetch Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('userId', user.id);
      if (tasksData) setTasks(tasksData);

      // Fetch Routines
      const { data: routinesData } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id);
      if (routinesData) setRoutines(routinesData);

      // Fetch Routine Logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDayStr = thirtyDaysAgo.getFullYear() + '-' + String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + String(thirtyDaysAgo.getDate()).padStart(2, '0');

      const { data: logsData } = await supabase
        .from('routine_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDayStr);
      if (logsData) setRoutineLogs(logsData);

      // Fetch Goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
      if (goalsData) setGoals(goalsData);
    };

    fetchData();
  }, [user]);

  // Derived Data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const topPendingTasks = [...pendingTasks].sort((a, b) => {
    const pA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
    const pB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
    return pB - pA;
  }).slice(0, 4);

  const upcomingReminders = useMemo(() => {
    try {
      const key = `reminders_${user?.id || 'guest'}`;
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      const all: { id: string; date: string; title: string }[] = JSON.parse(stored);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const todayStr = now.toISOString().split('T')[0];
      const limit = new Date(now); limit.setDate(limit.getDate() + 3);
      const limitStr = limit.toISOString().split('T')[0];
      return all
        .filter(r => r.date >= todayStr && r.date <= limitStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch { return []; }
  }, [user?.id]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDate = new Date();
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const activeRoutinesTodayCount = routines.filter(r => r.days?.includes(currentDayName)).length;

  const completedRoutinesToday = routineLogs.filter(l => l.completed_at === localTodayStr).length;

  let currentStreak = 0;
  const uniqueLogDaysSet = new Set(routineLogs.map(l => l.completed_at));
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const checkStr = new Date(checkDate.getTime() - (checkDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const checkDayName = daysOfWeek[checkDate.getDay()];
    const scheduledThatDay = routines.filter(r => r.days?.includes(checkDayName)).length;
    
    if (uniqueLogDaysSet.has(checkStr)) {
      currentStreak++;
    } else {
      if (i === 0) continue; // Today missing doesn't break streak yet
      if (scheduledThatDay === 0) continue; // Not scheduled, doesn't break streak
      break; // Scheduled but missed
    }
  }




  const activeGoals = goals.filter(g => g.status === 'pending').slice(0, 3);

  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', updatedAt: new Date().toISOString() } : t));
    
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed', updatedAt: new Date().toISOString() })
      .eq('id', taskId);

    if (error) {
      console.error('Error completing task:', error);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending' } : t));
    }
    setCompletingTaskId(null);
  };
  
  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        @media (min-width: 769px) { .shortcut-btn-label { display: block !important; } }
        @media (max-width: 768px) { 
          .shortcut-btn-label { display: none !important; } 
          .shortcut-btn { position: relative; }
          .shortcut-btn:active::after { content: attr(data-label); position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background: #0b0f19; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; white-space: nowrap; z-index: 100; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        }

        .today-focus-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        @media (max-width: 600px) {
          .today-focus-grid { grid-template-columns: 1fr; }
        }

        .focus-tile {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #000000 !important;
          padding: 1rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          position: relative;
        }
        .focus-tile:hover {
          transform: translateY(-4px) scale(1.02);
          background: #050508 !important;
        }
        @keyframes run-bobble {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-3px) rotate(-8deg); }
        }
        .focus-tile:hover .running-animation {
          animation: run-bobble 0.45s infinite ease-in-out;
        }
        @keyframes target-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15) rotate(5deg); }
        }
        .focus-tile:hover .goals-animation {
          animation: target-pulse 0.45s infinite ease-in-out;
        }
        @keyframes clip-swing {
          0%, 100% { transform: rotate(0); }
          50% { transform: rotate(-12deg); }
        }
        .focus-tile:hover .tasks-animation {
          animation: clip-swing 0.45s infinite ease-in-out;
        }
        @keyframes fire-flicker {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          30% { transform: scale(1.12) rotate(-2deg); opacity: 1; filter: drop-shadow(0 0 5px #ef4444); }
          50% { transform: scale(0.95) rotate(1deg); opacity: 0.85; }
          80% { transform: scale(1.08) rotate(-1deg); opacity: 1; }
        }
        .fire-animation {
          animation: fire-flicker 0.4s infinite ease-in-out;
        }

        /* Border Glow Accents */
        .tasks-tile { border-color: rgba(59, 130, 246, 0.2); }
        .tasks-tile:hover { 
          border-color: rgba(59, 130, 246, 0.6); 
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15); 
        }
        .routine-tile { border-color: rgba(168, 85, 247, 0.2); }
        .routine-tile:hover { 
          border-color: rgba(168, 85, 247, 0.6); 
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.15); 
        }
        .goals-tile { border-color: rgba(245, 158, 11, 0.2); }
        .goals-tile:hover { 
          border-color: rgba(245, 158, 11, 0.6); 
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.15); 
        }

        .focus-icon-bg {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.3s ease;
        }
        .focus-tile:hover .focus-icon-bg {
          transform: scale(1.1) rotate(5deg);
        }

        .tasks-tile .focus-icon-bg { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .routine-tile .focus-icon-bg { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
        .goals-tile .focus-icon-bg { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

        .focus-icon-bg .material-symbols-outlined {
          font-size: 1.5rem;
          font-variation-settings: 'FILL' 1;
        }

        .focus-content { text-align: left; }
        .focus-value {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ffffff;
          line-height: 1;
        }
        .focus-label {
          font-size: 0.6rem;
          font-weight: 900;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.1em;
          margin-top: 0.3rem;
        }

        /* ── Routine Snapshot Styles ── */
        .routine-snapshot-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        @media (max-width: 480px) {
          .routine-snapshot-grid { grid-template-columns: 1fr; }
        }

        .snapshot-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: #000000 !important;
          padding: 1.25rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .snapshot-card:hover {
          transform: translateY(-4px);
          background: #050508 !important;
        }

        .snapshot-icon-container {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .progress-card { border-color: rgba(16, 185, 129, 0.15); }
        .progress-card:hover { border-color: rgba(16, 185, 129, 0.5); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1); }
        
        .streak-card { border-color: rgba(239, 68, 68, 0.15); }
        .streak-card:hover { border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.1); }
        .streak-card .snapshot-icon-container { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .streak-card .snapshot-icon-container .material-symbols-outlined { font-variation-settings: "'FILL' 1"; }

        .snapshot-value { font-size: 1.25rem; font-weight: 900; color: #ffffff; }
        .snapshot-value.highlighted { color: #f87171; }
        .snapshot-label { font-size: 0.6rem; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-top: 0.2rem; }

        /* ── Goals Progress Styles ── */
        .goal-progress-card {
          background: #000000 !important;
          padding: 1.25rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .goal-progress-card:hover {
          transform: translateY(-4px);
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
        }

        /* ── Modern Dashboard Overrides ── */
        .neon-box {
          background: rgba(8, 8, 12, 0.5);
          backdrop-filter: blur(20px) saturate(160%);
          border-radius: 1.5rem;
          padding: 1.5rem;
          margin-bottom: 0.75rem;
          position: relative;
          overflow: hidden;
        }
        .neon-box::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 1.5rem;
          padding: 1px;
          background: linear-gradient(135deg, #00f2fe 0%, #a855f7 50%, #ff4b2b 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.3;
        }

        .floating-shortcuts-bar {
          position: fixed;
          bottom: 1.25rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.25rem;
          background: rgba(6, 6, 8, 0.85);
          backdrop-filter: blur(25px) saturate(180%);
          padding: 0.4rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.03);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
          z-index: 999;
          max-width: 90%;
        }

        .shelf-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.6rem 0.85rem;
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .shelf-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.03);
          transform: translateY(-1px);
        }
        .shelf-btn:active { transform: scale(0.96); }
        .shelf-btn .material-symbols-outlined {
          font-size: 1.15rem;
          font-variation-settings: 'FILL' 1;
        }

        @media (max-width: 600px) {
          .inner-tasks-grid { grid-template-columns: 1fr !important; }
          .floating-shortcuts-bar { width: calc(100% - 2rem); justify-content: space-around; }
          .shelf-btn { padding: 0.6rem 0.5rem; font-size: 0.65rem; gap: 0.2rem; }
        }

        .focus-tile {
          display: flex;
          align-items: center;
          gap: 0.75rem !important;
          padding: 1rem 1.25rem !important;
          border-radius: 1.25rem !important;
        }

        @media (max-width: 650px) {
          .upcoming-goals-grid { grid-template-columns: 1fr !important; }
        }

        @media (min-width: 769px) {
          .desktop-split-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            align-items: stretch;
          }
          .desktop-split-grid .neon-box { margin-bottom: 0 !important; }
        }
      `}</style>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>
      
      <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
             {getTimeGreeting()}, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.05em', marginTop: '0.3rem', textTransform: 'uppercase' }}>
            {(() => {
              const now = new Date();
              const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
              const month = now.toLocaleDateString('en-US', { month: 'long' });
              const day = now.getDate();
              return `Today is ${dayName}, ${month} ${day}`;
            })()}
          </p>
          <p style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.03em', marginTop: '0.2rem', opacity: 0.8 }}>
            {(() => {
              const now = new Date();
              const year = now.getFullYear();
              const endOfYear = new Date(year, 11, 31);
              const diff = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return `${diff} days left in ${year} — make them count.`;
            })()}
          </p>
          
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleSidebar}
            className="notification-btn desktop-only-btn"
            title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar (Focus Mode)"}
            data-tooltip={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
            style={{
              ...(isSidebarHidden ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' } : {}),
              opacity: 0.5
            }}
          >
            <span className="material-symbols-outlined">
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>
        </div>
      </header>

      <main style={{ paddingBottom: '6rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.5rem' }}>
        
        {/* 1. Today's Focus Outer Neon Box */}
        <div className="neon-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>Today's Focus</h2>
          </div>

          <div className="today-focus-grid">
            <div className="focus-tile tasks-tile" onClick={() => navigate('/dashboard')}>
              <div className="focus-icon-bg">
                <span className="material-symbols-outlined tasks-animation">assignment_turned_in</span>
              </div>
              <div className="focus-content">
                <div className="focus-value">{pendingTasks.length}</div>
                <div className="focus-label">Tasks</div>
              </div>
            </div>

            <div className="focus-tile routine-tile" onClick={() => navigate('/routine')}>
              <div className="focus-icon-bg">
                <span className="material-symbols-outlined running-animation">directions_run</span>
              </div>
              <div className="focus-content">
                <div className="focus-value">{completedRoutinesToday}/{activeRoutinesTodayCount}</div>
                <div className="focus-label">Routine</div>
              </div>
            </div>

            <div className="focus-tile goals-tile" onClick={() => navigate('/goals')}>
              <div className="focus-icon-bg">
                <span className="material-symbols-outlined goals-animation">emoji_events</span>
              </div>
              <div className="focus-content">
                <div className="focus-value">{activeGoals.length}</div>
                <div className="focus-label">Goals</div>
              </div>
            </div>
          </div>

          {/* Inner Tasks List Row inside container box row frame */}
          <div className="inner-tasks-grid" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
            {topPendingTasks.length > 0 ? topPendingTasks.map(t => (
              <div key={t.id} className="inner-task-row" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 0.85rem', borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }} onClick={() => handleCompleteTask(t.id)}>
                <div onClick={(e) => { e.stopPropagation(); handleCompleteTask(t.id); }} style={{ width: '1.2rem', height: '1.2rem', borderRadius: '50%', border: '2.2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, background: completingTaskId === t.id ? '#10b981' : 'transparent', transition: 'background 0.2s ease' }}>
                  {completingTaskId === t.id && <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', color: '#000', fontVariationSettings: "'wght' 800" }}>check</span>}
                </div>
                <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <span style={{ fontSize: '0.6rem', fontWeight: 900, background: t.priority === 'High' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: t.priority === 'High' ? '#ef4444' : '#f59e0b', padding: '0.15rem 0.5rem', borderRadius: '0.5rem' }}>{t.priority}</span>
              </div>
            )) : <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', gridColumn: 'span 2', padding: '0.75rem' }}>No pending actions today.</div>}

            {/* Upcoming Reminders Hook below task list setup grid frame */}
            {upcomingReminders.length > 0 && (
              <div style={{ gridColumn: 'span 2', marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#10b981', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Upcoming Reminders (3 Days)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {upcomingReminders.map((r, i) => (
                    <div key={i} onClick={() => navigate('/calendar')} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.01)', cursor: 'pointer' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%', fontWeight: 700 }}>{r.title}</span>
                      <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>{r.date.split('-').slice(1).join('/')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Split Grid wrapper starting node down to Goal Snap closes inclusive triggers flawlessly forwards */}
        <div className="desktop-split-grid">

        {/* 2. Today Routine Neon Box */}
        <div className="neon-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>Today Routine</h2>
            <button onClick={() => navigate('/routine')} style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>View Routine</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="neon-inner-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem 1rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.01)' }}>
              <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="15" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="3"></circle>
                  <circle cx="20" cy="20" r="15" fill="transparent" stroke="#10b981" strokeWidth="3" strokeDasharray={`${activeRoutinesTodayCount > 0 ? ((completedRoutinesToday || 0) / activeRoutinesTodayCount) * 100 : 0} ${100 - (activeRoutinesTodayCount > 0 ? ((completedRoutinesToday || 0) / activeRoutinesTodayCount) * 100 : 0)}`} strokeDashoffset="22" strokeLinecap="round" />
                </svg>
                <span className="material-symbols-outlined" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1rem', color: '#10b981', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff' }}>
                   {completedRoutinesToday || 0} / {activeRoutinesTodayCount || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.1rem' }}>
                   Completed
                </div>
              </div>
            </div>

            <div className="neon-inner-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.01)', padding: '0.85rem 1rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.01)' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <span className="material-symbols-outlined fire-animation" style={{ fontSize: '1.2rem', fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>{currentStreak} Day Streak</div>
                <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700, marginTop: '0.1rem' }}>Keep it going! 🔥</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Upcoming Goals Snapshot Neon Box */}
        <div className="neon-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>Goals Snapshot</h2>
            <button onClick={() => navigate('/goals')} style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase' }}>View Goals</button>
          </div>

          <div className="upcoming-goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {([...goals].filter(g => g.status === 'pending').sort((a, b) => {
               if (!a.targetDate) return 1;
               if (!b.targetDate) return -1;
               return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
            }).slice(0, 3).map(goal => {
               let daysLeftStr = 'No due date';
               let isOverdue = false;
               if (goal.targetDate) {
                 const diffDays = Math.ceil((new Date(goal.targetDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                 isOverdue = diffDays < 0;
                 daysLeftStr = isOverdue ? `${Math.abs(diffDays)} Days Overdue` : `${diffDays} Days Left`;
               }

               return (
                  <div key={goal.id} className="neon-inner-card goal-card-inner" onClick={() => navigate('/goals')} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.01)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', background: 'rgba(0, 242, 254, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00f2fe', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>track_changes</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{goal.name}</div>
                    </div>

                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${goal.progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #00f2fe, #a855f7)', borderRadius: '3px' }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem' }}>
                      <div style={{ color: '#00f2fe', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>schedule</span>
                        {daysLeftStr}
                      </div>
                      <div style={{ color: '#94a3b8', fontWeight: 900 }}>{goal.progress || 0}%</div>
                    </div>
                  </div>
               );
            }))}
          </div>
          {goals.filter(g => g.status === 'pending').length === 0 && <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>No active goals. Time to set some!</div>}
        </div>

        </div>


        {/* 3. Floating Shortcuts Bar edge shelf row setups below */}
        <div className="floating-shortcuts-bar">
          <button onClick={() => navigate('/dashboard')} className="shelf-btn"><span className="material-symbols-outlined">check_circle</span>Task</button>
          <button onClick={() => navigate('/goals')} className="shelf-btn"><span className="material-symbols-outlined">star</span>Goal</button>
          <button onClick={() => navigate('/routine')} className="shelf-btn"><span className="material-symbols-outlined">calendar_today</span>Routine</button>
          <button onClick={() => navigate('/stats')} className="shelf-btn"><span className="material-symbols-outlined">insights</span>Stats</button>
        </div>




      </main>
      <BottomNav isHidden={isSidebarHidden} />
    </div>
  );
};

export default HomeDashboard;

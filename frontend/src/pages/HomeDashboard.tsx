import React, { useState, useEffect, useMemo, useCallback } from 'react';
import BottomNav from '../components/BottomNav';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { calculateProductivityScore } from '../utils/productivity';
import WhyStayHardyModal from '../components/WhyStayHardyModal';

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
  createdAt: string;
}

const HomeDashboard: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };
  const { language } = useLanguage();
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'Tamil' ? 'போருக்குத் தயார்' : 'Awaken — Grind Starts';
    if (hour < 18) return language === 'Tamil' ? 'தொடர்ந்து முன்னேறு' : 'Stay Relentless';
    return language === 'Tamil' ? 'வெற்றியுடன் முடி' : 'Earn Your Rest';
  };
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);




  const fetchData = useCallback(async () => {
    if (!user?.id) return;

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
  }, [user?.id]);

  useEffect(() => {
    fetchData();
    
    // First-time intro logic (Only show once globally per user)
    const checkAndShowIntro = async () => {
      // Small delay to let user load fully if needed
      if (!user) return;
      
      const { data } = await supabase.auth.getUser();
      const hasSeenIntro = data.user?.user_metadata?.has_seen_stay_hardy_intro;
      
      if (!hasSeenIntro) {
        setTimeout(() => {
          setIsFirstTime(true);
          setIsIntroOpen(true);
        }, 1500); // Slight delay for better entrance
      }
    };
    checkAndShowIntro();
  }, [fetchData, user]);

  const handleCloseIntro = async () => {
    setIsIntroOpen(false);
    
    // Save to database so it never shows again across devices
    if (user?.id) {
      await supabase.auth.updateUser({
        data: { has_seen_stay_hardy_intro: true }
      });
    }
  };
  
  // Automatic Daily Reset Check at Midnight
  useEffect(() => {
    const checkMidnight = () => {
      const lastCheck = localStorage.getItem('last_dashboard_reset_date');
      const today = new Date().toLocaleDateString();
      if (lastCheck && lastCheck !== today) {
        console.log('Midnight detected. Resetting dashboard data.');
        fetchData();
      }
      localStorage.setItem('last_dashboard_reset_date', today);
    };

    const interval = setInterval(checkMidnight, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived Data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const localTodayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const topPendingTasks = [...pendingTasks].sort((a, b) => {
    const pA = a.priority === 'High' ? 3 : a.priority === 'Medium' ? 2 : 1;
    const pB = b.priority === 'High' ? 3 : b.priority === 'Medium' ? 2 : 1;
    return pB - pA;
  }).slice(0, 2);

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





  // Productivity Chart Data
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const tasksProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const routinesProgress = activeRoutinesTodayCount > 0 ? Math.round((completedRoutinesToday / activeRoutinesTodayCount) * 100) : 0;

  const totalGoalsCount = goals.length;
  const avgGoalProgress = totalGoalsCount > 0 
    ? Math.round(goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : (g.progress || 0)), 0) / totalGoalsCount) 
    : 0;


  // Productivity logic with weights: Routines (60%), Tasks (20%), Goals (20%)
  const overallProgress = calculateProductivityScore({
    tasksProgress,
    routinesProgress,
    goalsProgress: avgGoalProgress
  });

  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  // Dynamic data for 5% intervals
  const progressIntervals = [
    { min: 0, tag: 'Warming Up', quote: 'Every journey starts with a single pulse.' },
    { min: 5, tag: 'Getting Started', quote: 'Small steps lead to massive destinations.' },
    { min: 10, tag: 'First Gear', quote: 'Traction gained. Keep the wheels turning.' },
    { min: 15, tag: 'Movement', quote: 'You are no longer standing still.' },
    { min: 20, tag: 'Building Heat', quote: 'Heat is building. Don\'t cool down now.' },
    { min: 25, tag: 'Momentum', quote: 'Your momentum is becoming a force.' },
    { min: 30, tag: 'In Motion', quote: 'Rhythm found. Keep your breath steady.' },
    { min: 35, tag: 'Rising Up', quote: 'You\'re climbing. The view gets better.' },
    { min: 40, tag: 'Consistent', quote: 'Consistency is your greatest weapon.' },
    { min: 45, tag: 'Disciplined', quote: 'Halfway there. Sacrifice the comfort.' },
    { min: 50, tag: 'Locked In', quote: 'Locked in. Silence the distractions.' },
    { min: 55, tag: 'Focused', quote: 'Focus is a muscle. Flex it harder.' },
    { min: 60, tag: 'Strong Pace', quote: 'Strong pace. Your body follows your mind.' },
    { min: 65, tag: 'Hard Work', quote: 'True progress happens in the grind.' },
    { min: 70, tag: 'Elite Force', quote: 'Elite effort detected. Stay relentless.' },
    { min: 75, tag: 'High Speed', quote: 'Speed is addictive. Don\'t let up.' },
    { min: 80, tag: 'Beast Mode', quote: 'Beast mode engaged. Destroy the list.' },
    { min: 85, tag: 'Unstoppable', quote: 'Unstoppable. The finish line is scared.' },
    { min: 90, tag: 'Legendary', quote: 'Legendary status approaching. Push!' },
    { min: 95, tag: 'Near Perfect', quote: 'Near perfection. Finish with pride.' },
    { min: 100, tag: 'Stayed Hardy', quote: 'You stayed Hardy. You won today.' },
  ];

  const currentProgressData = [...progressIntervals].reverse().find(i => overallProgress >= i.min) || progressIntervals[0];

  const getMotivationalTagline = () => currentProgressData.quote;
  const getStatusTagline = () => currentProgressData.tag;

  const showQuote = () => {
    let quote = "";
    if (overallProgress <= 20) {
      quote = "Every journey starts with the first step.";
    } else if (overallProgress <= 50) {
      quote = "Keep running. Momentum is building.";
    } else if (overallProgress <= 80) {
      quote = "You are making strong progress.";
    } else if (overallProgress < 100) {
      quote = "Almost there. Stay Hardy.";
    } else {
      quote = "You made it today. Great work.";
    }
    setActiveQuote(quote);
  };

  const handleRunnerAction = () => {
    showQuote();
    // For mobile or click, we might want it to persist slightly longer or auto-dismiss
    setTimeout(() => setActiveQuote(null), 3000);
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

        @keyframes runner-run {
          0%, 100% { transform: scaleX(-1) translateY(0) rotate(0); }
          50% { transform: scaleX(-1) translateY(-3px) rotate(-3deg); }
        }
        .runner-indicator {
          position: absolute;
          top: 0;
          transition: left 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 100;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transform: translateY(-90%) translateX(-50%);
        }
        .runner-icon {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
          animation: runner-run 1.2s infinite ease-in-out;
          display: block;
          user-select: none;
          line-height: 1;
          transform: scaleX(-1);
        }
        .runner-3d-shadow {
          width: 14px;
          height: 3px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          filter: blur(1.5px);
          opacity: 0.5;
        }
        .quote-bubble {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          color: #000000;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 900;
          white-space: nowrap;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          animation: quote-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin-bottom: 12px;
          z-index: 101;
        }
        .quote-bubble::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 6px;
          border-style: solid;
          border-color: #ffffff transparent transparent transparent;
        }
        @keyframes quote-pop {
          0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        .journey-track {
          position: relative;
          height: 16px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          margin: 60px 0 30px;
          overflow: visible;
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
        }
        .journey-segment {
          height: 100%;
          transition: width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        .journey-milestone {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          top: 50%;
          transform: translateY(-50%);
        }
        .home-arrival-message {
          position: absolute;
          top: -45px;
          right: -20px;
          background: #10b981;
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.65rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          animation: quote-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          white-space: nowrap;
        }
        .home-arrival-message::after {
          content: "";
          position: absolute;
          top: 100%;
          right: 25px;
          border-width: 5px;
          border-style: solid;
          border-color: #10b981 transparent transparent transparent;
        }
        .journey-segment::after {
          content: "";
          position: absolute;
          top: 0; right: 0; bottom: 0; left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: flow 2s infinite linear;
        }
        @keyframes flow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .journey-label {
          position: absolute;
          top: 20px;
          font-size: 0.6rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
          opacity: 0.6;
        }
        .productivity-journey-container {
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.03);
          margin-top: 0.5rem;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 480px) {
          .chart-wrapper {
            width: 180px;
            height: 180px;
          }
        }
        .legend-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
        }
        .legend-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background: #000000;
          border-radius: 1.25rem;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .legend-card:hover {
          transform: translateX(6px);
          background: #050508;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
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
          transition: opacity 0.3s ease;
        }

        .clickable-neon-box {
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .clickable-neon-box:hover {
          transform: translateY(-4px);
          background: rgba(12, 12, 18, 0.6) !important;
        }
        .clickable-neon-box:hover::before {
          opacity: 0.6;
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
        .inner-task-row:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          transform: translateX(4px);
        }
        .reminder-row-link {
          transition: all 0.2s ease;
        }
        .reminder-row-link:hover {
          background: rgba(16, 185, 129, 0.08) !important;
          border-color: rgba(16, 185, 129, 0.2) !important;
          transform: translateX(4px);
        }

        @media (max-width: 768px) {
          .status-tagline-container {
            display: none !important;
          }
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

          <div className="productivity-journey-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Score</span>
                <div style={{ fontSize: '2.2rem', fontWeight: 950, color: '#ffffff', lineHeight: 1, marginTop: '0.2rem' }}>
                   {overallProgress}%
                </div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600, margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                  {getMotivationalTagline()}
                </p>
              </div>
              <div className="status-tagline-container" style={{ textAlign: 'right' }}>
                <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {getStatusTagline()}
                  </span>
                </div>
              </div>
            </div>

            <div className="journey-track">
              {/* Milesone indicators for cleaner structure */}
              <div className="journey-milestone" style={{ left: '25%' }}></div>
              <div className="journey-milestone" style={{ left: '50%' }}></div>
              <div className="journey-milestone" style={{ left: '75%' }}></div>

              {/* Runner Character */}
              <div 
                className="runner-indicator" 
                style={{ left: `${overallProgress}%` }} 
                onClick={handleRunnerAction}
                onMouseEnter={showQuote}
                onMouseLeave={() => setActiveQuote(null)}
                onTouchStart={handleRunnerAction}
              >
                {activeQuote && <div className="quote-bubble" style={{ bottom: '130%', marginBottom: '8px' }}>{activeQuote}</div>}
                <span className="runner-icon">🏃</span>
              </div>

              {/* Progress Segments - Weighted Visualization */}
              <div className="journey-segment" style={{ width: `${tasksProgress * 0.2}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px', boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)' }}></div>
              <div className="journey-segment" style={{ width: `${routinesProgress * 0.6}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)' }}></div>
              <div className="journey-segment" style={{ width: `${avgGoalProgress * 0.2}%`, background: 'linear-gradient(90deg, #ef4444, #f87171)', borderTopRightRadius: overallProgress === 100 ? '20px' : 0, borderBottomRightRadius: overallProgress === 100 ? '20px' : 0, boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' }}></div>

                {overallProgress === 100 && <div className="home-arrival-message" style={{ top: '-40px' }}>You are home</div>}
              </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '1.5rem', padding: '0 0.5rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                 <span style={{ color: '#94a3b8', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                 <span style={{ color: '#94a3b8', fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Routines</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                 <span style={{ color: '#94a3b8', fontSize: '0.66rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goals</span>
               </div>
            </div>
          </div>

          {/* Inner Tasks List Row inside container box row frame */}
          {topPendingTasks.length > 0 && (
            <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, margin: '1rem 0 0.25rem 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Top 2 Pending Tasks
            </p>
          )}
          <div className="inner-tasks-grid" style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
            {topPendingTasks.length > 0 ? topPendingTasks.map((t, index) => {
              const taglines = ["Still waiting 👀", "Pending... don't ignore 😏", "This needs your attention"];
              const taglinePos = (t.id.length + index) % taglines.length;
              const dynamicTagline = taglines[taglinePos];
              
              return (
                <div key={t.id} className="inner-task-row" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 0.85rem', borderRadius: '0.85rem', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => navigate('/dashboard')}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#10b981', opacity: 0.7, flexShrink: 0, marginTop: '0.1rem' }}>assignment</span>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: '0.15rem' }}>{dynamicTagline}</div>
                  </div>
                  {/* Priority is intentionally hidden from this view */}
                </div>
              );
            }) : <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '0.75rem' }}>No pending actions today.</div>}
          </div>

          {/* Upcoming Reminders Hook below task list setup grid frame */}
          {upcomingReminders.length > 0 && (
            <div style={{ marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#10b981', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Upcoming Reminders (3 Days)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {upcomingReminders.map((r, i) => (
                  <Link key={i} to="/calendar" className="reminder-row-link" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.01)', cursor: 'pointer', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', maxWidth: '75%', overflow: 'hidden' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: '#10b981', opacity: 0.8 }}>notifications</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>{r.title}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800 }}>{r.date.split('-').slice(1).join('/')}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Split Grid wrapper starting node down to Goal Snap closes inclusive triggers flawlessly forwards */}
        <div className="desktop-split-grid">

        {/* 2. Today Routine Neon Box */}
        <div className="neon-box clickable-neon-box" onClick={() => navigate('/routine')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>Today Routine</h2>
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
        <div className="neon-box clickable-neon-box" onClick={() => navigate('/goals')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.05em' }}>Goals Snapshot</h2>

          </div>

          <div className="upcoming-goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {([...goals].filter(g => g.status === 'pending').sort((a, b) => {
               if (!a.targetDate) return 1;
               if (!b.targetDate) return -1;
               return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
            }).slice(0, 3).map(goal => {

               
                const calToday = new Date();
                calToday.setHours(0, 0, 0, 0);
                const calTarget = new Date(goal.targetDate);
                calTarget.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((calTarget.getTime() - calToday.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = goal.targetDate && diffDays < 10;
                let daysLeftStr = 'No due date';
                if (goal.targetDate) {
                  if (diffDays === 0) daysLeftStr = 'Overdue Today';
                  else if (diffDays < 0) daysLeftStr = `${Math.abs(diffDays)} Days Overdue`;
                  else daysLeftStr = `${diffDays} Days Left`;
                }

               return (
                  <div key={goal.id} className="neon-inner-card goal-card-inner" style={{ padding: '0.85rem', background: isUrgent ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.01)', borderRadius: '1.25rem', border: isUrgent ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem', transition: 'all 0.3s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>track_changes</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{goal.name}</div>
                    </div>



                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem' }}>
                      <div style={{ color: isUrgent ? '#ef4444' : '#00f2fe', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }}>schedule</span>
                        {daysLeftStr}
                      </div>
                    </div>
                  </div>
               );
            }))}
          </div>
          {goals.filter(g => g.status === 'pending').length === 0 && <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '1rem' }}>No active goals. Time to set some!</div>}
        </div>

        </div>






      </main>
      <BottomNav isHidden={isSidebarHidden} />
      <WhyStayHardyModal 
        isOpen={isIntroOpen} 
        onClose={handleCloseIntro} 
        isFirstTime={isFirstTime}
      />
    </div>
  );
};

export default HomeDashboard;

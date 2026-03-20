import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateProductivityScore, getScoreLabels } from '../utils/productivity';

interface Task {
  id: string;
  status: 'pending' | 'completed';
  category: string;
  createdAt: string;
  updatedAt?: string;
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
  updatedAt?: string;
}


const CategoryProgressBars: React.FC<{ data: any[] }> = ({ data }) => {
  if (data.length === 0) return null;

  const getPerformance = (score: number) => {
    if (score <= 10) return { emoji: '🐢', label: 'Barely Moving', verdict: "Are we working… or hibernating?", color: '#8B0000' };
    if (score <= 20) return { emoji: '🐌', label: 'Slow Starter', verdict: "Movement detected… very slow movement.", color: '#FF0000' };
    if (score <= 30) return { emoji: '🚶', label: 'Getting Started', verdict: "Okay… at least you're moving now.", color: '#FF4500' };
    if (score <= 40) return { emoji: '🚲', label: 'Warming Up', verdict: "Pedaling slowly, but heading somewhere.", color: '#FF8C00' };
    if (score <= 50) return { emoji: '🛵', label: 'Momentum Building', verdict: "Alright, the engine just started.", color: '#FFC107' };
    if (score <= 60) return { emoji: '🏃', label: 'In Motion', verdict: "Now we're talking. Keep running.", color: '#9ACD32' };
    if (score <= 70) return { emoji: '🏍️', label: 'Fast Lane', verdict: "Speed is picking up. Stay focused.", color: '#4CAF50' };
    if (score <= 80) return { emoji: '🐎', label: 'Charging Forward', verdict: "Power and momentum. Nice work.", color: '#009688' };
    if (score <= 90) return { emoji: '🐆', label: 'Speed Beast', verdict: "That’s serious productivity speed.", color: '#2196F3' };
    return { emoji: '/images/dragon-legend.png', isImage: true, label: 'THE LEGEND', verdict: "Absolute monster productivity. You are THE LEGEND!", color: '#7B1FA2' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%', boxSizing: 'border-box' }}>
      {data.map((stat) => {
        const { emoji, label, verdict, color, isImage } = getPerformance(stat.rate);
        return (
          <div key={stat.name} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '0.02em' }}>{stat.name}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'color 0.5s ease' }}>{label}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{stat.completed}/{stat.total} Tasks</span>
              </div>
            </div>

            <div style={{ position: 'relative', height: '18px', background: 'var(--background-dark)', borderRadius: '30px', overflow: 'visible', border: '2px solid var(--glass-border)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
              {/* Road Markings */}
              <div style={{ position: 'absolute', top: '50%', left: '10px', right: '10px', height: '2px', borderTop: '2px dashed var(--border-color)', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
              
              {/* Progress Fill */}
              <div 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  height: '100%', 
                  width: `${stat.rate}%`, 
                  backgroundSize: '200% 100%',
                  backgroundImage: `linear-gradient(90deg, ${color}, ${color}dd, white, ${color}dd, ${color})`,
                  animation: 'colorShift 3s linear infinite',
                  borderRadius: '30px',
                  boxShadow: `0 0 20px ${color}44`,
                  transition: 'width 2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 2,
                  overflow: 'hidden'
                }} 
              >
                {/* Dash animation for the filled road */}
                <div style={{ position: 'absolute', top: '50%', left: '10px', right: '10px', height: '2px', borderTop: '2px dashed rgba(255,255,255,0.3)', transform: 'translateY(-50%)' }} />
                {/* Glossy Reflection */}
                <div style={{ position: 'absolute', top: '10%', left: '2%', right: '2%', height: '25%', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', filter: 'blur(1px)' }} />
              </div>

              {/* Character & Speech Bubble */}
              <div 
                style={{ 
                  position: 'absolute', 
                  left: `${stat.rate}%`, 
                  top: '50%', 
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingBottom: '40px' 
                }}
              >
                {/* Speech Bubble */}
                <div style={{ 
                  background: 'var(--primary)', 
                  color: '#064e3b', 
                  padding: '3px 8px', 
                  borderRadius: '12px', 
                  fontSize: '0.7rem', 
                  fontWeight: 900,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  marginBottom: '6px',
                  animation: 'bounce 2s infinite',
                  position: 'relative'
                }}>
                  %{stat.rate}
                  <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--primary)' }} />
                </div>
                
                <span style={{ 
                  fontSize: '2.5rem', 
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))', 
                  transform: 'translateY(18px)',
                  animation: stat.rate > 80 ? 'float 3s ease-in-out infinite' : 'none',
                  display: 'inline-block'
                }}>
                  {isImage ? (
                    <img src={emoji} alt="Legend" style={{ width: '80px', height: '80px', transform: 'translateY(-10px)' }} />
                  ) : emoji}
                </span>
              </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '1.25rem', padding: '0 0.5rem', fontStyle: 'italic', opacity: 0.9 }}>
              "{verdict}"
            </p>
          </div>
        );
      })}
      
      
    </div>
  );
};

const PerformanceGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const width = 280;
  const height = 160;
  const cx = width / 2;
  const cy = height - 10;
  const radius = 100;
  const stroke = 24;
  
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width, height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: '45%', textAlign: 'center', width: '100%', transform: 'translateY(-50%)' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, lineHeight: 1 }}>{score}%</h2>
        <p style={{ fontSize: '0.75rem', fontWeight: 900, color: score > 70 ? '#10b981' : score > 30 ? '#fbbf24' : '#ef4444', letterSpacing: '0.25em', textTransform: 'uppercase', marginTop: '0.5rem' }}>{label}</p>
      </div>
    </div>
  );
};

const ActivityTrendChart: React.FC<{ data: any[]; days: number; setDays: (d: number) => void }> = ({ data, days, setDays }) => {
  return (
    <div className="glass-card" style={{ padding: '2rem 1.5rem', height: '320px', display: 'flex', flexDirection: 'column' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
         <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Task & Goal Activity</span>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', margin: '4px 0 0' }}>Insights Trend</h4>
            <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '2px 0 0', fontWeight: 700 }}>Excludes Routines</p>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Tasks</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>
                <span style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>Goals</span>
              </div>
            </div>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
              <button 
                onClick={() => setDays(7)}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontSize: '10px', 
                  fontWeight: 900, 
                  cursor: 'pointer',
                  background: days === 7 ? 'var(--primary)' : 'transparent',
                  color: days === 7 ? '#064e3b' : '#64748b',
                  transition: 'all 0.3s'
                }}
              >7D</button>
              <button 
                onClick={() => setDays(30)}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontSize: '10px', 
                  fontWeight: 900, 
                  cursor: 'pointer',
                  background: days === 30 ? 'var(--primary)' : 'transparent',
                  color: days === 30 ? '#064e3b' : '#64748b',
                  transition: 'all 0.3s'
                }}
              >30D</button>
            </div>
          </div>
       </div>

       <div style={{ width: '100%', height: '220px' }}>
         <ResponsiveContainer width="100%" height="100%">
           <AreaChart data={data}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorGoals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} 
                dy={10} 
                interval={days === 7 ? 0 : 6} 
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                contentStyle={{ 
                  background: "rgba(15, 23, 42, 0.9)", 
                  border: "1px solid var(--glass-border)", 
                  borderRadius: "12px", 
                  fontSize: "11px", 
                  fontWeight: 800, 
                  color: "white", 
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5)", 
                  textTransform: "uppercase" 
                }} 
                itemStyle={{ padding: "2px 0" }} 
                cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2 }} 
                formatter={(value: any, name: any) => [value, name]}
              />
              <Area 
                type="monotone" 
                dataKey="tasks" 
                name="Tasks" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorTasks)" 
                animationDuration={2000} 
              />
              <Area 
                type="monotone" 
                dataKey="goals" 
                name="Goals" 
                stroke="#ef4444" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorGoals)" 
                animationDuration={2000} 
              />
           </AreaChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
};

const Stats: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const { user } = useAuth();
  const [scoreData, setScoreData] = useState<{
    tasks_progress: number;
    routines_progress: number;
    goals_progress: number;
    overall_score: number;
    tasks_total?: number;
    tasks_completed?: number;
    routines_total?: number;
    routines_completed?: number;
    goals_total?: number;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAllData = async () => {
      // 1. Fetch Productivity Score calculated in DB
      const daysOfWeek = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
      const todayDate = new Date();
      const currentDayName = daysOfWeek[todayDate.getDay()];
      const localTodayStr = new Date(todayDate.getTime() - (todayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      const { data: score, error: scoreErr } = await supabase.rpc('get_productivity_score', {
        p_user_id: user.id,
        p_day_name: currentDayName,
        p_today_str: localTodayStr
      });
      if (scoreErr) console.error('Score RPC error:', scoreErr);
      else if (score) setScoreData(score);

      // Fetch Tasks
      const { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select('id, status, category, createdAt, updatedAt')
        .eq('userId', user.id);
      if (taskErr) console.error('Supabase fetch error:', taskErr);
      else if (tasksData) setTasks(tasksData as Task[]);

      // Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('name')
        .eq('userId', user.id);
      if (catErr) console.warn('Categories fetch error:', catErr.message);
      else if (catData) setDbCategories(catData.map(c => c.name));

      // Fetch Routines
      const { data: routinesData } = await supabase
        .from('routines')
        .select('id, title, days')
        .eq('user_id', user.id);
      if (routinesData) setRoutines(routinesData as Routine[]);

      // Fetch Routine Logs (last 30 days is enough for trend and streak calculations)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDayStr = thirtyDaysAgo.getFullYear() + '-' + String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + String(thirtyDaysAgo.getDate()).padStart(2, '0');

      const { data: logsData } = await supabase
        .from('routine_logs')
        .select('routine_id, completed_at')
        .eq('user_id', user.id)
        .gte('completed_at', startDayStr);
      if (logsData) setRoutineLogs(logsData as RoutineLog[]);

      // Fetch Goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, name, targetDate, status, progress, createdAt, updatedAt')
        .eq('userId', user.id);
      if (goalsData) setGoals(goalsData as Goal[]);
    };

    fetchAllData();

    const tasksChannel = supabase
        .channel('stats_tasks_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `userId=eq.${user.id}` }, () => {
          fetchAllData();
        })
        .subscribe();

    const categoriesChannel = supabase
        .channel('stats_categories_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `userId=eq.${user.id}` }, () => {
          fetchAllData();
        })
        .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [user]);

  const defaultCategories = ['Personal', 'Content', 'Health', 'Business'];
  const allCategories = Array.from(new Set([
    ...defaultCategories,
    ...dbCategories,
    ...tasks.map((t: Task) => t.category)
  ])).filter(c => c && c !== '');
    
  const totalGoals = scoreData?.goals_total ?? goals.length;
  const activeGoalsCount = goals.filter(g => g.status === 'pending').length;
  const overdueGoalsCount = goals.filter(g => g.status === 'pending' && g.targetDate && new Date(g.targetDate).getTime() < new Date().setHours(0,0,0,0)).length;
  const avgGoalProgress = scoreData?.goals_progress ?? (totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.status === 'completed' ? 100 : (g.progress || 0)), 0) / totalGoals) : 0);

  const totalUserTasks = scoreData?.tasks_total ?? tasks.length;
  const completedUserTasks = scoreData?.tasks_completed ?? tasks.filter((t: Task) => t.status === 'completed').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const taskCompletionRate = scoreData?.tasks_progress ?? (totalUserTasks > 0 ? Math.round((completedUserTasks / totalUserTasks) * 100) : 0);

  const totalRoutines = routines.length;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDate = new Date();
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const activeRoutinesTodayCount = scoreData?.routines_total ?? routines.filter(r => r.days?.includes(currentDayName)).length;

  const localTodayStr = new Date(todayDate.getTime() - (todayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const routinesCompletedToday = scoreData?.routines_completed ?? routineLogs.filter(l => l.completed_at === localTodayStr).length;
  const todayRoutineRate = scoreData?.routines_progress ?? (activeRoutinesTodayCount > 0 ? Math.round((routinesCompletedToday / activeRoutinesTodayCount) * 100) : 0);

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

  const startDateForConsistency = new Date();
  startDateForConsistency.setHours(0,0,0,0);
  let expectedRoutinesLast7Days = 0;
  for(let i=0; i<7; i++) {
    const d = new Date(startDateForConsistency);
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    expectedRoutinesLast7Days += routines.filter(r => r.days?.includes(dayName)).length;
  }
  
  const last7DaysLogs = routineLogs.filter(l => {
    const d = new Date(l.completed_at);
    return (startDateForConsistency.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
  });
  const weeklyConsistency = expectedRoutinesLast7Days > 0 ? Math.min(100, Math.round((last7DaysLogs.length / expectedRoutinesLast7Days) * 100)) : 0;

  const dynamicTodayScore = scoreData?.overall_score ?? calculateProductivityScore({
    tasksProgress: taskCompletionRate,
    routinesProgress: todayRoutineRate,
    goalsProgress: avgGoalProgress
  });

  const historicalData = useMemo(() => {
    const data = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = d.getTime();
      const nextDayStart = dayStart + 24 * 60 * 60 * 1000;


      const tasksCompleted = tasks.filter(t => {
        if (t.status !== 'completed' || !t.updatedAt) return false;
        const uDate = new Date(t.updatedAt).getTime();
        return uDate >= dayStart && uDate < nextDayStart;
      }).length;


      const goalsCompleted = goals.filter(g => {
        if (g.status !== 'completed' || !g.updatedAt) return false;
        const uDate = new Date(g.updatedAt).getTime();
        return uDate >= dayStart && uDate < nextDayStart;
      }).length;

      data.push({
        name: dayStr,
        tasks: tasksCompleted,
        goals: goalsCompleted
      });
    }
    return data;
  }, [tasks, routines, routineLogs, goals, trendDays]);

  const categoryStats = allCategories.map(cat => {
    const catTasks = tasks.filter((t: Task) => (t.category || 'Focus') === cat);
    const catCompleted = catTasks.filter((t: Task) => t.status === 'completed').length;
    return {
      name: cat,
      total: catTasks.length,
      completed: catCompleted,
      rate: catTasks.length > 0 ? Math.round((catCompleted / catTasks.length) * 100) : 0
    };
  }).filter(stat => stat.total > 0)
    .sort((a, b) => b.total - a.total).slice(0, 10);

  const { label, verdict, icon } = getScoreLabels(dynamicTodayScore, totalUserTasks + totalGoals + totalRoutines);

  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(18px) translateX(0); }
          50% { transform: translateY(10px) translateX(5px); }
        }
        @keyframes colorShift {
          0% { background-position: 0% 0%; }
          100% { background-position: -200% 0%; }
        }
        .stats-top-split {
          display: grid;
          grid-template-columns: 3fr 7fr;
          gap: 1.5rem;
        }
        @media (max-width: 768px) {
          .stats-top-split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header style={{ padding: '2.5rem 2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>Productivity Stats</h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
            Combined Performance Metrics
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

      <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1rem 5rem' }}>
        {/* Top Split Section */}
        <div className="stats-top-split">
          {/* Gauge Section */}
          <div className="glass-card" style={{ padding: '2.5rem 1.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <PerformanceGauge score={dynamicTodayScore} label={label} />
          </div>

          {/* New Trend Chart Section */}
          <ActivityTrendChart data={historicalData} days={trendDays} setDays={setTrendDays} />
        </div>

        {/* Verdict Section */}
        <div className="glass-card" style={{ padding: '1.75rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
             <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '1.5rem' }}>{icon}</span>
             <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>The Verdict</span>
          </div>
          <p style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            "{verdict}"
          </p>
        </div>

        {/* Summary Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Tasks Metrics */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
             <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span className="material-symbols-outlined" style={{color: '#10b981'}}>checklist</span> Tasks Insight
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{totalUserTasks}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Completed</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{completedUserTasks}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>{pendingCount}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Rate</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6' }}>{taskCompletionRate}%</div>
               </div>
             </div>
          </div>

          {/* Goals Metrics */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
             <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span className="material-symbols-outlined" style={{color: '#a855f7'}}>star</span> Goals Insight
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{totalGoals}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{activeGoalsCount}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Overdue</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444' }}>{overdueGoalsCount}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6' }}>{avgGoalProgress}%</div>
               </div>
             </div>
          </div>

          {/* Routines Metrics */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
             <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <span className="material-symbols-outlined" style={{color: '#3b82f6'}}>calendar_check</span> Routines Insight
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Created</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>{totalRoutines}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Done Today</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>{routinesCompletedToday}</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Consistency</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6' }}>{weeklyConsistency}%</div>
               </div>
               <div>
                 <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Streak</span>
                 <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f59e0b' }}>{currentStreak}</div>
               </div>
             </div>
          </div>
        </div>

        {/* Category Insight Section */}
        <section style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Category Insight</h3>
          </div>
          
          {categoryStats.length > 0 ? (
            <div className="glass-card" style={{ padding: '2.5rem 1.5rem' }}>
              <CategoryProgressBars data={categoryStats} />
            </div>
          ) : (
            <div className="glass-card" style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', marginBottom: '1rem' }}>analytics</span>
              <p style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '9px' }}>Empty Data</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav isHidden={isSidebarHidden} />
    </div>
  );
};

export default Stats;


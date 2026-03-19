import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import BottomNav from '../components/BottomNav';
import { supabase } from '../supabase';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LineChart,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  YAxis,
  Legend
} from 'recharts';

interface RoutineData {
  id: string;
  title: string;
  days: string[];
  color: string;
  icon: string;
  category: string;
  completed?: boolean;
  missed?: boolean;
}

interface RoutineLog {
  routine_id: string;
  completed_at: string;
}

const ROUTINE_ICONS = [
  // Sleep & Rest
  'bed', 'nightlight', 'dark_mode', 'alarm', 'snooze',
  // Food & Drink
  'restaurant', 'lunch_dining', 'local_cafe', 'coffee', 'water_drop', 'nutrition',
  // Gym & Fitness
  'fitness_center', 'directions_run', 'sports_gymnastics', 'exercise', 'sports_martial_arts',
  // Yoga & Mindfulness
  'self_improvement', 'spa', 'emoji_nature',
  // Work & Job
  'work', 'laptop_mac', 'business_center', 'schedule', 'task_alt',
  // Content & Video
  'play_circle', 'videocam', 'mic', 'photo_camera', 'edit_note',
  // Travel
  'flight', 'directions_car', 'commute', 'hiking', 'map',
  // Learning & Growth
  'menu_book', 'school', 'psychology', 'language', 'lightbulb',
  // Social & People
  'people', 'chat', 'handshake', 'family_restroom', 'volunteer_activism',
  // Health
  'favorite', 'local_hospital', 'pill', 'medical_information',
  // Home & Daily
  'home', 'cleaning_services', 'shower', 'wb_sunny', 'timer',
];


const DEFAULT_CATEGORIES = ['Health', 'Work', 'Mindset', 'Growth', 'Home', 'Social'];

type TimeRange = '7d' | '1m' | '3m' | '6m' | '1y';

const SortableRoutineCard: React.FC<{ routine: RoutineData; toggleCompletion: (r: any) => void }> = ({ routine, toggleCompletion }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: routine.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`routine-card-new ${(routine as any).completed ? 'completed' : ''}`}>
      <div className="card-accent" style={{ background: routine.color }}></div>
      <div className="card-main-content">
        <div className="card-icon-wrapper" style={{ border: `1px solid ${routine.color}30`, color: routine.color }}>
          <span className="material-symbols-outlined">{routine.icon}</span>
        </div>
        <div className="card-text-content" style={{ minWidth: 0, flex: 1 }}>
          <div className="card-category-strip"><span className="category-dot" style={{ background: routine.color }}></span>{routine.category}</div>
          <h3 className="card-title">{routine.title}</h3>
        </div>
      </div>
      <div className="card-actions-wrapper" style={{ flexShrink: 0 }}>
        <div
          className={`physical-toggle ${(routine as any).completed ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleCompletion(routine); }}
        >
          <div className="toggle-bg-icons"><span className="material-symbols-outlined cross">close</span><span className="material-symbols-outlined check">check</span></div>
          <div className="toggle-knob"></div>
        </div>
      </div>
    </div>
  );
};

const Routine: React.FC = () => {
  const { user } = useAuth();
  useLanguage();
  // const navigate = useNavigate();
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);

  // Statistics State
  const [activeStatCategory, setActiveStatCategory] = useState('All');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [showEncouragement, setShowEncouragement] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowEncouragement(false), 20000);
    return () => clearTimeout(timer);
  }, []);

  // Form State
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#10b981');
  const [selectedIcon, setSelectedIcon] = useState('fitness_center');
  const [selectedCategory, setSelectedCategory] = useState('Health');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRoutines((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(`routine_order_${user?.id}`, JSON.stringify(reordered.map(r => r.id)));
        return reordered;
      });
    }
  };

  const categories = useMemo(() => {
    const fromRoutines = Array.from(new Set(routines.map(r => r.category)));
    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...fromRoutines]));
    return merged.sort();
  }, [routines]);

  const toggleSidebar = () => {
    const newState = !isSidebarHidden;
    setIsSidebarHidden(newState);
    localStorage.setItem('sidebarHidden', newState.toString());
  };

  const fetchRoutinesAndLogs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: routinesData, error: rError } = await supabase.from('routines').select('*').eq('user_id', user.id);
      if (rError) throw rError;
      const now = new Date();
      let daysToFetch = 7;
      if (timeRange === '7d') daysToFetch = 7;
      else if (timeRange === '1m') daysToFetch = 30;
      else if (timeRange === '3m') daysToFetch = 90;
      else if (timeRange === '6m') daysToFetch = 180;
      else if (timeRange === '1y') daysToFetch = 365;
      const startDate = new Date();
      startDate.setDate(now.getDate() - daysToFetch);
      const startDayStr = startDate.toISOString().split('T')[0];
      const { data: logsData, error: lError } = await supabase.from('routine_logs').select('routine_id, completed_at').eq('user_id', user.id).gte('completed_at', startDayStr);
      if (lError) throw lError;
      setLogs(logsData || []);
      const todayStr = now.toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayDayName = dayNames[now.getDay()];
      const yesterdayDayName = dayNames[yesterday.getDay()];
      const completedIdsToday = new Set((logsData || []).filter(l => l.completed_at === todayStr).map(l => l.routine_id));
      const completedIdsYesterday = new Set((logsData || []).filter(l => l.completed_at === yesterdayStr).map(l => l.routine_id));
      const mapped = (routinesData || []).map((r: any) => {
        const isActiveToday = r.days.includes(todayDayName);
        const isCompletedToday = completedIdsToday.has(r.id);
        const isActiveYesterday = r.days.includes(yesterdayDayName);
        const isCompletedYesterday = completedIdsYesterday.has(r.id);
        const isMissedYesterday = isActiveYesterday && !isCompletedYesterday;
        return { ...r, completed: isCompletedToday, missed: isMissedYesterday, isActiveToday };
      });

      const savedOrder = localStorage.getItem(`routine_order_${user.id}`);
      if (savedOrder) {
        try {
          const orderArray = JSON.parse(savedOrder);
          mapped.sort((a, b) => {
            const idxA = orderArray.indexOf(a.id);
            const idxB = orderArray.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        } catch (err) { console.error('Error parsing saved order:', err); }
      }

      setRoutines(mapped);
    } catch (err) { console.error('Error fetching data:', err); } finally { setLoading(false); }
  }, [user?.id, timeRange]);

  useEffect(() => { fetchRoutinesAndLogs(); }, [fetchRoutinesAndLogs]);

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
  const lineChartData = useMemo(() => {
    const result = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const useMonthlyAggregation = (timeRange !== '7d' && timeRange !== '1m');
    const activeCategories = Array.from(new Set(routines.map(r => r.category)));

    if (useMonthlyAggregation) {
      let monthsToCover = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
      for (let i = monthsToCover - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const xAxisLabel = `${monthsShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
        const dataPoint: any = { date: xAxisLabel };
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        activeCategories.forEach(cat => {
          const catRoutines = routines.filter(r => r.category === cat);
          let monthScheduled = 0;
          let monthCompleted = 0;
          for (let day = new Date(monthStart); day <= monthEnd && day <= now; day.setDate(day.getDate() + 1)) {
            const dayName = days[day.getDay()];
            const dStr = day.toISOString().split('T')[0];
            const scheduledToday = catRoutines.filter(r => r.days.includes(dayName));
            monthScheduled += scheduledToday.length;
            const completedToday = logs.filter(l => {
              const routine = catRoutines.find(r => r.id === l.routine_id);
              return l.completed_at === dStr && !!routine;
            }).length;
            monthCompleted += completedToday;
          }
          dataPoint[cat] = monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : 0;
        });
        result.push(dataPoint);
      }
    } else {
      const daysToCover = timeRange === '7d' ? 7 : 30;
      for (let i = daysToCover - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        const xAxisLabel = `${monthsShort[d.getMonth()]} ${d.getDate()}`;
        const dataPoint: any = { date: xAxisLabel };
        activeCategories.forEach(cat => {
          const scheduled = routines.filter(r => r.category === cat && r.days.includes(dayName));
          const completedCount = logs.filter(l => {
            const routine = routines.find(r => r.id === l.routine_id);
            return l.completed_at === dStr && routine?.category === cat;
          }).length;
          dataPoint[cat] = scheduled.length > 0 ? Math.round((completedCount / scheduled.length) * 100) : 0;
        });
        result.push(dataPoint);
      }
    }
    return result;
  }, [logs, routines, timeRange]);

  const categoryAverages = useMemo(() => {
    return categories.map(cat => {
      const catRoutines = routines.filter(r => r.category === cat);
      if (catRoutines.length === 0) return { category: cat, average: 0, color: '#64748b' };
      let totalPoints = 0;
      let completedPoints = 0;
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let daysBack = timeRange === '7d' ? 7 : timeRange === '1m' ? 30 : timeRange === '3m' ? 90 : timeRange === '6m' ? 180 : 365;
      for (let i = 0; i < daysBack; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = dayNames[d.getDay()];
        const scheduledToday = catRoutines.filter(r => r.days.includes(dayName));
        totalPoints += scheduledToday.length;
        const completedToday = logs.filter(l => {
          const routine = catRoutines.find(r => r.id === l.routine_id);
          return l.completed_at === d.toISOString().split('T')[0] && !!routine;
        }).length;
        completedPoints += completedToday;
      }
      return { category: cat, average: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0, color: catRoutines[0]?.color || '#10b981' };
    }).filter(c => routines.some(r => r.category === c.category));
  }, [routines, logs, categories, timeRange]);

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !title) return;
    const finalCategory = isAddingNewCategory ? newCategory : selectedCategory;
    try {
      const { error } = await supabase.from('routines').insert([{ user_id: user.id, title, days: selectedDays, color, icon: selectedIcon, category: finalCategory }]).select();
      if (error) throw error;
      setShowModal(false); setTitle(''); setSelectedIcon('fitness_center'); setIsAddingNewCategory(false); setNewCategory(''); fetchRoutinesAndLogs();
    } catch (err: any) { alert(`Failed to create routine: ${err.message}`); }
  };

  const toggleCompletion = async (routine: RoutineData) => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    const isNowCompleted = !routine.completed;

    // 1. Optimistically update routines state for instant UI feedback
    setRoutines(prev => prev.map(r =>
      r.id === routine.id ? { ...r, completed: isNowCompleted } : r
    ));

    // 2. Optimistically update logs state to keep charts in sync without a reload
    if (isNowCompleted) {
      setLogs(prev => {
        const exists = prev.find(l => l.routine_id === routine.id && l.completed_at === today);
        if (exists) return prev;
        return [...prev, { routine_id: routine.id, completed_at: today }];
      });
    } else {
      setLogs(prev => prev.filter(l => !(l.routine_id === routine.id && l.completed_at === today)));
    }

    try {
      if (isNowCompleted) {
        const { error } = await supabase.from('routine_logs').insert([{
          routine_id: routine.id,
          user_id: user.id,
          completed_at: today
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
      // Note: Removed fetchRoutinesAndLogs() to prevent full list re-render/Syncing state
    } catch (err) {
      console.error('Failed to sync routine status:', err);
      // Revert state on failure
      setRoutines(prev => prev.map(r =>
        r.id === routine.id ? { ...r, completed: !isNowCompleted } : r
      ));
      if (isNowCompleted) {
        setLogs(prev => prev.filter(l => !(l.routine_id === routine.id && l.completed_at === today)));
      } else {
        setLogs(prev => [...prev, { routine_id: routine.id, completed_at: today }]);
      }
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this routine?')) return;
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      setRoutines(prev => prev.filter(r => r.id !== id));
    } catch (err) { console.error('Error deleting routine:', err); }
  };


  return (
    <div className={`page-shell routine-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg"><div className="aurora-gradient-1"></div><div className="aurora-gradient-2"></div></div>

      <header className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div><h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>Routines</h1><p style={{ color: '#10b981', fontSize: '0.75rem', margin: '4px 0 0 0', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily discipline. High performance.</p></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={toggleSidebar} className="notification-btn desktop-only-btn" style={{ opacity: 0.5 }}><span className="material-symbols-outlined">{isSidebarHidden ? 'side_navigation' : 'fullscreen'}</span></button>
          <button onClick={() => setShowModal(true)} className="notification-btn" style={{ background: '#10b981', color: 'white' }}><span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>add</span></button>
        </div>
      </header>

      <div className="routine-content-grid" style={{ display: 'grid', gridTemplateColumns: '0.75fr 1.25fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Daily Action */}
        <section className="routine-daily-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>Daily Actions</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowAllModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>View All</button>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                  border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_circle</span>
                Create Routine
              </button>
            </div>
          </div>

          {showEncouragement && (
            <div className="encouragement-banner">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '20px' }}>auto_awesome</span>
                <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: '1.4', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Start your streak! Habit logs are only available for the <strong style={{ color: 'var(--text-main)' }}>current day</strong>.
                  Login daily to keep your momentum high and your charts growing. 🚀
                </p>
              </div>
              <button onClick={() => setShowEncouragement(false)} className="close-banner-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Syncing...</div> : routines.length === 0 ? <div onClick={() => setShowModal(true)} style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1.25rem', border: '2px dashed rgba(255,255,255,0.1)', textAlign: 'center', cursor: 'pointer' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 800 }}>Add your first habit.</p></div> : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={routines.filter(r => r.days.includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()])).map(r => r.id)} strategy={verticalListSortingStrategy}>
                  {routines
                    .filter(routine => routine.days.includes(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]))
                    .map(routine => (
                      <SortableRoutineCard key={routine.id} routine={routine} toggleCompletion={toggleCompletion} />
                    ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </section>

        {/* Right Side: Chart and Consistency with Grouped Controls */}
        <section className="routine-right-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card chart-section-card" style={{ padding: '1.5rem', borderRadius: '1.5rem', minHeight: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Routine Consistency</h2>
              <div className="range-filter-container">
                {(['7d', '1m', '3m', '6m', '1y'] as TimeRange[]).map(range => <button key={range} onClick={() => setTimeRange(range)} className={`range-btn ${timeRange === range ? 'active' : ''}`}>{range.toUpperCase()}</button>)}
              </div>
            </div>

            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingTop: '10px' }} />
                  {activeStatCategory === 'All' ? categoryAverages.map(cat => (
                    <Line key={cat.category} type="monotone" dataKey={cat.category} stroke={cat.color} strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                  )) : <Line type="monotone" dataKey={activeStatCategory} stroke={categoryAverages.find(c => c.category === activeStatCategory)?.color || '#10b981'} strokeWidth={4} dot={false} activeDot={{ r: 6 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-category-divider" style={{ marginTop: '1rem' }}>
              <button onClick={() => setActiveStatCategory('All')} className={`cat-btn-inner all-cat-btn ${activeStatCategory === 'All' ? 'active' : ''}`}><span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>grid_view</span></button>
              {categoryAverages.map(cat => (
                <button key={cat.category} onClick={() => setActiveStatCategory(cat.category)} className={`cat-btn-inner ${activeStatCategory === cat.category ? 'active' : ''}`} style={{ '--cat-color': cat.color } as any}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>{routines.find(r => r.category === cat.category)?.icon || 'category'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {categoryAverages.map(cat => (
              <div key={cat.category} className="glass-card" style={{ padding: '1rem', borderRadius: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" /><circle cx="20" cy="20" r="17" stroke={cat.color} strokeWidth="4" fill="none" strokeDasharray={`${2 * Math.PI * 17 * (cat.average / 100)} ${2 * Math.PI * 17}`} strokeLinecap="round" transform="rotate(-90 20 20)" /></svg>
                  <span style={{ position: 'absolute', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-main)' }}>{cat.average}%</span>
                </div>
                <div><div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-main)' }}>{cat.category}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800 }}>Consistency</div></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', padding: '2rem', borderRadius: '2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}><h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>New Routine</h2><button onClick={() => setShowModal(false)} className="notification-btn"><span className="material-symbols-outlined">close</span></button></div>
            <form onSubmit={handleCreateRoutine} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group"><label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>WHAT'S THE HABIT?</label><input autoFocus className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 5 AM Run" required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} /></div>
              <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.75rem', display: 'block' }}>CATEGORY</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>{categories.map(cat => <div key={cat} onClick={() => { setSelectedCategory(cat); setIsAddingNewCategory(false); }} className={`form-cat-pill ${!isAddingNewCategory && selectedCategory === cat ? 'active' : ''}`}>{cat}</div>)}<div onClick={() => setIsAddingNewCategory(true)} className={`form-cat-pill add-custom ${isAddingNewCategory ? 'active' : ''}`}> + Custom </div></div>
                {isAddingNewCategory && <input className="form-input" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Category Name..." style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} />}
              </div>
              <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>ICON</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: '0.5rem', maxHeight: '140px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>{ROUTINE_ICONS.map(iconName => <div key={iconName} onClick={() => setSelectedIcon(iconName)} className={`form-icon-option ${selectedIcon === iconName ? 'active' : ''}`} style={{ '--active-color': color } as any}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{iconName}</span></div>)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>COLOR</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {['#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#14b8a6'].map(c => (
                      <div
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer',
                          border: color === c ? '2px solid white' : '2px solid transparent',
                          boxShadow: color === c ? `0 0 10px ${c}` : 'none',
                          transition: 'all 0.2s'
                        }}
                      />
                    ))}
                    <div style={{ position: 'relative', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--text-secondary)', cursor: 'pointer' }}>palette</span>
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        style={{
                          position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="input-group"><label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>REPEAT ON</label><div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} onClick={() => { if (selectedDays.includes(day)) setSelectedDays(prev => prev.filter(d => d !== day)); else setSelectedDays(prev => [...prev, day]); }} className={`repeat-day-pill ${selectedDays.includes(day) ? 'active' : ''}`} style={{ '--active-color': color } as any}> {day[0]} </div>)}</div></div>
              </div>
              <button type="submit" className="glow-btn-primary" style={{ height: '3.25rem', borderRadius: '1.25rem', marginTop: '0.5rem' }}><span>Activate Routine</span></button>
            </form>
          </div>
        </div>
      )}
      {showAllModal && (
        <div onClick={() => setShowAllModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#040914', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.5rem', width: '100%', maxWidth: '400px', padding: '1.5rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'white' }}>Manage Routines</h3>
              <button onClick={() => setShowAllModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {routines.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color || '#10b981', flexShrink: 0 }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{r.icon || 'fitness_center'}</span></div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        color: 'white',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        wordBreak: 'break-word'
                      }}>{r.title}</div>
                      <div style={{ fontSize: '0.6rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.category}</div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteRoutine(r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span></button>
                </div>
              ))}
              {routines.length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.8rem' }}>No routines created yet.</div>}
            </div>
          </div>
        </div>
      )}
      <BottomNav isHidden={isSidebarHidden} />
      <style>{`
        .routine-page { padding-bottom: 8rem; }
        .encouragement-banner {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.1);
          border-radius: 1rem;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          animation: slideDownIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .close-banner-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .light-mode .close-banner-btn { color: rgba(0, 0, 0, 0.2); }
        .close-banner-btn:hover { color: var(--text-main); }

        .range-filter-container {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          padding: 0.2rem;
          border-radius: 0.75rem;
          gap: 0.15rem;
        }
        .light-mode .range-filter-container {
          background: rgba(0, 0, 0, 0.04);
        }
        .range-btn { padding: 0.3rem 0.6rem; border-radius: 0.5rem; border: none; font-size: 0.65rem; font-weight: 800; background: transparent; color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; }
        .range-btn.active { background: rgba(255,255,255,0.1); color: #fff; }
        .light-mode .range-btn { color: rgba(0, 0, 0, 0.4); }
        .light-mode .range-btn.active { background: rgba(0, 0, 0, 0.08); color: #000; }
        
        .cat-btn-inner { width: 36px; height: 36px; border-radius: 10px; border: none; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .light-mode .cat-btn-inner { background: rgba(0, 0, 0, 0.03); color: rgba(0, 0, 0, 0.3); }
        .cat-btn-inner.active { background: var(--cat-color, var(--primary)); color: #fff; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .light-mode .cat-btn-inner.active:not([style*="--cat-color"]) { background: var(--primary); color: #fff; }
        
        .chart-category-divider {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: 1rem;
          padding-top: 1rem;
          display: flex;
          gap: 0.4rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .light-mode .chart-category-divider {
          border-top-color: rgba(0, 0, 0, 0.05);
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

        .routine-card-new {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 1.25rem;
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(8px);
        }

        /* Light Mode Card Support */
        .light-mode .chart-section-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .light-mode .routine-card-new {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }
        .light-mode .routine-card-new:hover {
          background: #ffffff;
          border-color: rgba(16, 185, 129, 0.2);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
        }
        .light-mode .card-icon-wrapper {
          background: rgba(0, 0, 0, 0.02);
        }
        .light-mode .card-category-strip {
          color: rgba(0, 0, 0, 0.4);
        }
        .light-mode .physical-toggle {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.05);
        }
        .light-mode .toggle-knob {
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .light-mode .completed .card-title {
          color: rgba(0, 0, 0, 0.2);
        }
        
        .routine-card-new:hover {
          background: rgba(30, 41, 59, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
        }
        .routine-card-new.completed {
          background: rgba(16, 185, 129, 0.04);
          border-color: rgba(16, 185, 129, 0.1);
        }
        .card-accent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          opacity: 0.8;
        }
        .card-main-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 0;
        }
        .card-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          transition: all 0.3s;
        }
        .card-icon-wrapper span { font-size: 20px; }
        .card-text-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }
        .card-category-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 900;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.05em;
        }
        .category-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .card-title {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-main);
          transition: all 0.3s;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-word;
        }
        .completed .card-title {
          color: rgba(255, 255, 255, 0.3);
          text-decoration: line-through;
        }
        .card-actions-wrapper {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .physical-toggle {
          width: 52px;
          height: 26px;
          background: rgba(0,0,0,0.4);
          border-radius: 13px;
          position: relative;
          cursor: pointer;
          border: 1.5px solid rgba(255,255,255,0.05);
          overflow: hidden;
          transition: all 0.3s;
          display: flex;
          align-items: center;
        }
        .toggle-bg-icons {
          position: absolute;
          width: 100%;
          display: flex;
          justify-content: space-between;
          padding: 0 6px;
          box-sizing: border-box;
          opacity: 0.3;
          pointer-events: none;
          transition: all 0.3s;
        }
        .toggle-bg-icons span { font-size: 14px; font-weight: 900; }
        .toggle-bg-icons .cross { color: #ef4444; }
        .toggle-bg-icons .check { color: #10b981; }
        .toggle-knob {
          width: 18px;
          height: 18px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          left: 3px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 2;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        .physical-toggle.active {
          background: rgba(16, 185, 129, 0.2);
          border-color: rgba(16, 185, 129, 0.3);
        }
        .physical-toggle.active .toggle-knob {
          transform: translateX(26px);
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .physical-toggle.active .toggle-bg-icons { opacity: 0.6; }
        .physical-toggle.active .check {
          animation: checkPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .physical-toggle:active .toggle-knob {
          transform: scale(0.85);
        }
        .routine-card-new.completed {
          animation: cardPop 0.4s ease-out;
        }
        @keyframes cardPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
        
        @media (max-width: 1024px) {
          .routine-content-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 1.5rem !important;
          }
          .routine-right-section {
            display: contents !important;
          }
          .routine-daily-actions { order: 1; }
          .chart-section-card { order: 2; }
          .stats-grid { order: 3; }
        }
        
        @media (max-width: 480px) {
          .chart-section-card {
            padding: 1rem !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};
export default Routine;

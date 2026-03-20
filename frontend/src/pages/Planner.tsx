import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

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

const Planner: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [totalTasksCount, setTotalTasksCount] = useState(0);
  const [totalGoalsCount, setTotalGoalsCount] = useState(0);
  const [isTasksExpanded, setIsTasksExpanded] = useState(true);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchTasks = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0,0,0,0);
      const yesterdayStr = yesterday.toISOString();

      // 1. Fetch filtered list for display (Today + Yesterday)
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, category, createdAt, updatedAt, image_url')
        .eq('userId', user.id)
        .eq('status', 'completed')
        .gte('updatedAt', yesterdayStr)
        .order('updatedAt', { ascending: false });
      if (data) setTasks(data as Task[]);

      // 2. Fetch total historical count
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('status', 'completed');
      if (count !== null) setTotalTasksCount(count);
    };

    const fetchGoals = async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0,0,0,0);
      const yesterdayStr = yesterday.toISOString();

      // 1. Fetch filtered list for display (Today + Yesterday)
      const { data } = await supabase
        .from('goals')
        .select('id, name, status, createdAt, updatedAt')
        .eq('userId', user.id)
        .eq('status', 'completed')
        .gte('updatedAt', yesterdayStr)
        .order('updatedAt', { ascending: false });
      if (data) setGoals(data);

      // 2. Fetch total historical count
      const { count } = await supabase
        .from('goals')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('status', 'completed');
      if (count !== null) setTotalGoalsCount(count);
    };

    fetchTasks();
    fetchGoals();

    const tasksChannel = supabase
      .channel('planner_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `userId=eq.${user.id}` }, () => fetchTasks())
      .subscribe();

    const goalsChannel = supabase
      .channel('goals_history_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `userId=eq.${user.id}` }, () => fetchGoals())
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(goalsChannel);
    };
  }, [user]);


  const deleteTask = async (id: string) => {
    try {
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== id));

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task:', err);
      // Trigger a re-fetch to sync back if delete failed
      const { data } = await supabase.from('tasks').select('id, title, status, category, createdAt, updatedAt, image_url').eq('userId', user?.id).order('createdAt', { ascending: false });
      if (data) setTasks(data as Task[]);
    }
  };





  const groupItemsByDate = (itemsToGroup: any[]) => {
    const groups: { [key: string]: any[] } = {};
    itemsToGroup.forEach(item => {
      const date = new Date(item.updatedAt || item.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const groupedTasks = groupItemsByDate(tasks);
  const groupedGoals = groupItemsByDate(goals.map(g => ({ ...g, title: g.name })));
  const taskDates = Object.keys(groupedTasks).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const goalDates = Object.keys(groupedGoals).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = 'pending';
    try {
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== task.id));

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
        .eq('id', task.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error unticking task:', err);
      // Re-fetch on error
      const { data } = await supabase.from('tasks').select('id, title, status, category, createdAt, updatedAt, image_url').eq('userId', user?.id).eq('status', 'completed').order('updatedAt', { ascending: false });
      if (data) setTasks(data as Task[]);
    }
  };

  const toggleGoalStatus = async (goal: any) => {
    const newStatus = 'pending';
    try {
      // Optimistic update
      setGoals(prev => prev.filter(g => g.id !== goal.id));

      const { error } = await supabase
        .from('goals')
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
        .eq('id', goal.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error unticking goal:', err);
      // Re-fetch on error
      const { data } = await supabase.from('goals').select('id, name, status, createdAt, updatedAt').eq('userId', user?.id).eq('status', 'completed').order('updatedAt', { ascending: false });
      if (data) setGoals(data);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      await supabase.from('goals').delete().eq('id', id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  return (
    <div className="page-shell">
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>History</h1>
            <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
              Completed & Archived
            </p>
          </div>
        </div>
      </header>

      <main>
        <div className="history-dual-layout">
          {/* Completed Tasks Section */}
          <section className="history-column-card">
            <div 
              className="history-section-header" 
              onClick={() => setIsTasksExpanded(!isTasksExpanded)}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">task_alt</span> Completed Tasks
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 700, marginLeft: '0.2rem' }}>({totalTasksCount})</span>
              </h2>
              <span className="material-symbols-outlined dropdown-icon" style={{ transform: isTasksExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                keyboard_arrow_down
              </span>
            </div>

            {isTasksExpanded && (
              <div className="history-section-content">
                {taskDates.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No completed tasks found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {taskDates.map(dateKey => (
                      <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>{dateKey}</h3>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                        </div>
                        <div className="task-grid timeline-grid">
                          {groupedTasks[dateKey].map((item: any) => (
                            <div key={item.id} className="glass-card task-card completed" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.1)', opacity: 0.8 }}>
                              <div className="task-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div 
                                    className="checkbox-custom checked" 
                                    onClick={(e) => { e.stopPropagation(); toggleTaskStatus(item); }}
                                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: 'white' }}>check</span>
                                  </div>
                                  <span className="task-card-category" style={{ opacity: 0.6 }}>{item.category || 'Focus'}</span>
                                </div>
                                <button style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', opacity: 0.5 }} onClick={() => deleteTask(item.id)}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                </button>
                              </div>
                              <div>
                                <h4 className="task-card-title strike-through" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{item.title}</h4>
                                {item.image_url && (
                                  <div style={{ width: '100%', height: '100px', borderRadius: '0.75rem', overflow: 'hidden', margin: '0.5rem 0', opacity: 0.6 }}><img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)' }} /></div>
                                )}
                                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}><span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>check_circle</span> Done {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Completed Goals Section */}
          <section className="history-column-card">
            <div 
              className="history-section-header" 
              onClick={() => setIsGoalsExpanded(!isGoalsExpanded)}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined">emoji_events</span> Completed Goals
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 700, marginLeft: '0.2rem' }}>({totalGoalsCount})</span>
              </h2>
              <span className="material-symbols-outlined dropdown-icon" style={{ transform: isGoalsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                keyboard_arrow_down
              </span>
            </div>

            {isGoalsExpanded && (
              <div className="history-section-content">
                {goalDates.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>No completed goals found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {goalDates.map(dateKey => (
                      <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>{dateKey}</h3>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                        </div>
                        <div className="task-grid timeline-grid">
                          {groupedGoals[dateKey].map((item: any) => (
                            <div key={item.id} className="glass-card completed-goal-card" style={{ padding: '1.25rem', borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', opacity: 0.8, position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div 
                                    className="checkbox-custom checked goal-check" 
                                    onClick={(e) => { e.stopPropagation(); toggleGoalStatus(item); }}
                                    style={{ width: '20px', height: '20px', minWidth: '20px' }}
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '0.8rem', color: 'white' }}>check</span>
                                  </div>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Goal</span>
                                </div>
                                <button style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', opacity: 0.5 }} onClick={() => deleteGoal(item.id)}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                </button>
                              </div>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#94a3b8', margin: '0 0 0.5rem 0', textDecoration: 'line-through' }}>{item.title}</h4>
                              <div style={{ position: 'absolute', right: '1rem', bottom: '1rem', opacity: 0.3 }}><span style={{ fontSize: '2rem' }}>🏆</span></div>
                              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}><span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>emoji_events</span> Unlocked {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>


      <style>{`
        .checkbox-custom {
          width: 22px;
          height: 22px;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .checkbox-custom.checked {
          background: #10b981;
          border-color: #10b981;
        }
        .task-card.completed {
          opacity: 0.7;
          transition: all 0.3s;
        }
        .task-card.completed:hover {
          opacity: 1;
        }
        .strike-through {
          text-decoration: line-through;
        }
        .timeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .checkbox-custom.checked.goal-check {
          background: #f59e0b;
          border-color: #f59e0b;
        }

        /* History Dual Layout Grid */
        .history-dual-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: start;
        }

        @media (min-width: 900px) {
          .history-dual-layout {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* History Column Cards */
        .history-column-card {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255,255,255, 0.05);
          border-radius: 1.25rem;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        
        .history-column-card:hover {
           border-color: rgba(255,255,255, 0.08);
        }

        .history-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          user-select: none;
          background: rgba(0,0,0,0.1);
          transition: background 0.2s ease;
        }

        .history-section-header:hover {
          background: rgba(255,255,255,0.02);
        }

        .dropdown-icon {
          color: #64748b;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .history-section-content {
          padding: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.03);
          animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <BottomNav />
    </div>
  );
};

export default Planner;

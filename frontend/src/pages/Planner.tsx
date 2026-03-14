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
  const [showAll, setShowAll] = useState(true);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });
      
      if (error) console.error('Supabase fetch error:', error);
      else if (data) setTasks(data as Task[]);
    };

    fetchTasks();

    const channel = supabase
      .channel('planner_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks',
        filter: `userId=eq.${user.id}`
      }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      const { data } = await supabase.from('tasks').select('*').eq('userId', user?.id).order('createdAt', { ascending: false });
      if (data) setTasks(data as Task[]);
    }
  };



  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
        .eq('id', task.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling status:', err);
      // fetchTasks is not directly available here in the same way, but we could trigger it
      // Let's assume the subscription handles the rollback if the update fails or just re-fetch
      const { data } = await supabase.from('tasks').select('*').eq('userId', user?.id).order('createdAt', { ascending: false });
      if (data) setTasks(data as Task[]);
    }
  };


  const groupTasksByDate = (tasksToGroup: Task[]) => {
    const groups: { [key: string]: Task[] } = {};
    tasksToGroup.forEach(task => {
      const date = new Date(task.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(task);
    });
    return groups;
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const pendingGrouped = groupTasksByDate(pendingTasks);
  const completedGrouped = groupTasksByDate(completedTasks);

  const pendingDates = Object.keys(pendingGrouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const completedDates = Object.keys(completedGrouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="page-shell">
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>AllTasks</h1>
            <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
              Archived & Active
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setShowAll(!showAll)}
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '14px', 
                background: showAll ? '#10b981' : 'var(--card-bg)', 
                border: 'none', 
                color: showAll ? '#064e3b' : 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <span className="material-symbols-outlined">{showAll ? 'visibility' : 'visibility_off'}</span>
            </button>
            <div 
              onClick={() => window.location.href = '/settings'}
              style={{ 
                width: '44px', 
                height: '44px', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                fontWeight: 900, 
                cursor: 'pointer',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {pendingDates.map(dateKey => {
            const isToday = dateKey === new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
            const displayDate = isToday ? 'Today' : dateKey;
            const groupTasks = pendingGrouped[dateKey];

            return (
              <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>{displayDate}</h3>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                </div>

                <div className="task-grid timeline-grid">
                  {groupTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="glass-card task-card"
                      style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        borderColor: 'rgba(239, 68, 68, 0.15)',
                        opacity: 1
                      }}
                    >
                      <div className="task-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div 
                            className="checkbox-custom"
                            onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}
                          >
                            {/* Empty for pending */}
                          </div>
                          <span className={`task-card-priority priority-${task.priority || 'Medium'}-badge`}>
                            {task.priority || 'Medium'}
                          </span>
                          <span className="task-card-category">
                            {task.category || 'Focus'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                            onClick={() => deleteTask(task.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                          </button>
                        </div>
                      </div>

                      <div style={{ cursor: 'pointer' }} onClick={() => toggleTaskStatus(task)}>
                        <h4 className="task-card-title" style={{ color: 'var(--text-main)' }}>{task.title}</h4>
                        {task.image_url && (
                          <div style={{ width: '100%', height: '140px', borderRadius: '1rem', overflow: 'hidden', margin: '0.75rem 0', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <img src={task.image_url} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        {task.description && (
                          <p className="task-card-note" style={{ color: 'var(--text-secondary)' }}>{task.description}</p>
                        )}
                        
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', opacity: 0.8 }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>calendar_today</span>
                            Created {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {completedTasks.length > 0 && showAll && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.1)',
                  borderRadius: '1.25rem',
                  color: '#10b981',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>check_circle</span>
                  <span style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Completed archive ({completedTasks.length})
                  </span>
                </div>
                <span className="material-symbols-outlined" style={{ 
                  transition: 'transform 0.3s ease',
                  transform: isCompletedExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                }}>
                  expand_more
                </span>
              </button>

              {isCompletedExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
                  {completedDates.map(dateKey => (
                    <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>{dateKey}</h3>
                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                      </div>

                      <div className="task-grid timeline-grid">
                        {completedGrouped[dateKey].map((task) => (
                          <div 
                            key={task.id} 
                            className="glass-card task-card completed"
                            style={{
                              background: 'rgba(16, 185, 129, 0.03)',
                              borderColor: 'rgba(16, 185, 129, 0.1)',
                              opacity: 0.8
                            }}
                          >
                            <div className="task-card-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div 
                                  className="checkbox-custom checked"
                                  onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task); }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'white' }}>check</span>
                                </div>
                                <span className="task-card-category" style={{ opacity: 0.6 }}>
                                  {task.category || 'Focus'}
                                </span>
                              </div>
                              <button 
                                style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', opacity: 0.5 }}
                                onClick={() => deleteTask(task.id)}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                              </button>
                            </div>

                            <div style={{ cursor: 'pointer' }} onClick={() => toggleTaskStatus(task)}>
                              <h4 className="task-card-title strike-through" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{task.title}</h4>
                              {task.image_url && (
                                <div style={{ width: '100%', height: '100px', borderRadius: '0.75rem', overflow: 'hidden', margin: '0.5rem 0', opacity: 0.6 }}>
                                  <img src={task.image_url} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)' }} />
                                </div>
                              )}
                              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '0.8rem' }}>check_circle</span>
                                Done {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}
                              </div>
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

          {pendingDates.length === 0 && completedTasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem' }}>event_busy</span>
              <p style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '10px' }}>No tasks found</p>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Planner;

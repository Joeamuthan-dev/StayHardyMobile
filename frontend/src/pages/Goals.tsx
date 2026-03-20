import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import BottomNav from '../components/BottomNav';
import {  useLocation } from 'react-router-dom';

import { useLanguage } from '../context/LanguageContext';

interface Goal {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetDate: string;
  status: 'pending' | 'completed';
  quote: string;
  image_url?: string;
  createdAt: string;
  updatedAt?: string;
}

const motivationalQuotes = [
  "Small progress each day leads to big results.",
  "Discipline today builds the future you want.",
  "Stay focused on the goal.",
  "Your future self will thank you for what you do today.",
  "Dream big, work hard, stay focused.",
  "Success is the sum of small efforts day in and day out.",
  "The secret of getting ahead is getting started.",
  "It does not matter how slowly you go as long as you do not stop.",
  "The only way to do great work is to love what you do."
];

const Goals: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  // const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetDate, setTargetDate] = useState('');
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => {
    const newState = !isSidebarHidden;
    setIsSidebarHidden(newState);
    localStorage.setItem('sidebarHidden', newState.toString());
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('goals')
      .select('id, userId, name, description, targetDate, status, quote, image_url, createdAt, updatedAt')
      .eq('userId', user.id)
      .eq('status', 'pending')
      .order('createdAt', { ascending: false });

    if (error) console.error('Error fetching goals:', error);
    else if (data) {
      const sortedGoals = (data as Goal[]).sort((a, b) => {
        if (a.status === b.status) return 0;
        return a.status === 'pending' ? -1 : 1;
      });
      setGoals(sortedGoals);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGoals();

    if (!user?.id) return;

    const goalsChannel = supabase
      .channel('goals_page_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals', 
        filter: `userId=eq.${user.id}` 
      }, () => fetchGoals())
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
    };
  }, [fetchGoals, user?.id]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-goal') {
      setShowModal(true);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('task-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      console.error('Storage Error:', err);
      throw new Error(err.message || 'Storage connection failed');
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !name) return;

    setLoading(true);
    setError('');

    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

      const newGoal = {
        userId: user.id,
        name,
        description,
        targetDate,
        status: 'pending',
        quote: randomQuote,
        image_url: imageUrl
      };

      const { error: insertError } = await supabase.from('goals').insert([newGoal]);

      if (insertError) throw insertError;

      setName('');
      setDescription('');
      setImageFile(null);
      setTargetDate('');
      setShowModal(false);
      fetchGoals();
    } catch (err: any) {
      console.error('Error creating goal:', err);
      setError(err.message || 'Failed to create goal.');
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalStatus = async (goal: Goal) => {
    const newStatus = goal.status === 'pending' ? 'completed' : 'pending';
    const originalGoals = [...goals];

    // Optimistic Update
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g));

    try {
      // Step 1: Update status only (most likely to succeed)
      const { error: statusError } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goal.id);

      if (statusError) throw statusError;

      // Step 2: Try to update timestamp silently if possible
      // We don't throw here to avoid failing the whole status change if just the timestamp column is missing
      await supabase
        .from('goals')
        .update({ updatedAt: newStatus === 'completed' ? new Date().toISOString() : null })
        .eq('id', goal.id);
      
      fetchGoals();
    } catch (err: any) {
      console.error('Core status update failed:', err);
      setError('Failed to update goal status. Please check your connection.');
      setGoals(originalGoals); // Rollback
      fetchGoals();
    }
  };

  const deleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);
    
    if (error) console.error('Error deleting goal:', error);
    else fetchGoals();
  };

  const calculateDaysRemaining = (dateStr: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculateTimeProgress = (createdAt: string, targetDate: string, isCompleted: boolean) => {
    if (isCompleted) return 100;
    if (!targetDate || !createdAt) return 0;
    
    const start = new Date(createdAt).getTime();
    const end = new Date(targetDate).getTime();
    const now = new Date().getTime();
    
    if (end <= start) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    const progress = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    return Math.round(progress);
  };


  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{t('goals')}</h1>
            <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', marginTop: '0.25rem', textTransform: 'uppercase' }}>
              Vision. Execution. Results.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleSidebar}
            className="notification-btn desktop-only-btn"
            data-tooltip={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
            style={{
              ...(isSidebarHidden ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' } : {}),
              width: '36px', height: '36px', minWidth: '36px', opacity: 0.5
            }}
          >
            <span className="material-symbols-outlined">
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>

          <button 
            onClick={() => setShowModal(true)} 
            className="notification-btn" 
            title={t('add') + ' Goal'}
            data-tooltip={t('add') + ' Goal'}
            style={{ 
              width: '44px', 
              height: '44px', 
              minWidth: '44px', 
              background: '#10b981', 
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px', fontWeight: 'bold' }}>add</span>
          </button>
        </div>
      </header>

      {/* Active Goals Grid */}
      {goals.filter(g => g.status === 'pending').length === 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '8rem 2rem', 
          textAlign: 'center',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '2.5rem',
          border: '1px dashed rgba(255,255,255,0.1)',
          marginBottom: '2rem'
        }}>
           <div style={{ 
             width: '120px', 
             height: '120px', 
             borderRadius: '40px', 
             background: 'rgba(16, 185, 129, 0.05)', 
             display: 'flex', 
             alignItems: 'center', 
             justifyContent: 'center', 
             marginBottom: '2rem', 
             border: '1px solid rgba(16, 185, 129, 0.1)',
             boxShadow: '0 0 40px rgba(16, 185, 129, 0.05)'
           }}>
             <span className="material-symbols-outlined" style={{ fontSize: '4.5rem', color: '#10b981', opacity: 0.8 }}>rocket_launch</span>
           </div>
           <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
             Create your first dream goal
           </h2>
           <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '3rem', maxWidth: '450px', fontSize: '1.1rem', lineHeight: 1.6, fontWeight: 600 }}>
             Turn your vision into reality. Every great achievement starts with the decision to try.
           </p>
           <button 
             onClick={() => setShowModal(true)} 
             className="glow-btn-primary" 
             style={{ padding: '0 3rem', height: '4rem', borderRadius: '1.5rem', fontSize: '1.1rem', fontWeight: 900, width: 'fit-content' }}
           >
             <span>Make it Track & Happen</span>
           </button>
        </div>
      ) : (
        <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', paddingBottom: '2rem', alignItems: 'start' }}>
        {goals.filter(g => g.status === 'pending').map((goal, index) => {
          const daysLeft = calculateDaysRemaining(goal.targetDate);
          const isOverdue = daysLeft !== null && daysLeft < 0;
          const isCompleted = false;
          
          const themes = [
            { bg: 'rgba(255, 192, 203, 0.1)', accent: '#ec4899', light: 'rgba(236, 72, 153, 0.15)', text: '#f472b6' },
            { bg: 'rgba(59, 130, 246, 0.1)', accent: '#3b82f6', light: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
            { bg: 'rgba(252, 211, 77, 0.1)', accent: '#fbbf24', light: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' },
            { bg: 'rgba(34, 197, 94, 0.1)', accent: '#22c55e', light: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' }
          ];
          const theme = themes[index % themes.length];

          return (
            <div key={goal.id} className="glass-card active-goal-card" style={{ 
              padding: 0, 
              borderRadius: '2rem', 
              overflow: 'hidden', 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <div style={{ padding: '1.5rem', background: theme.bg, position: 'relative', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {isOverdue && (
                      <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 12px', borderRadius: '1rem', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Overdue
                      </span>
                    )}
                    <div style={{ 
                      background: theme.bg, 
                      border: `1px solid ${theme.accent}33`, 
                      padding: '6px 12px', 
                      borderRadius: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      backdropFilter: 'blur(5px)',
                      boxShadow: `0 4px 12px ${theme.accent}22`
                    }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: theme.text }}>{daysLeft}</span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: theme.text, textTransform: 'uppercase', opacity: 0.8 }}>Days Left</span>
                    </div>
                  </div>
                </div>
                <div style={{ marginRight: '100px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: '0.75rem 0 0.5rem', lineHeight: 1.2 }}>{goal.name}</h3>
                  {goal.description && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{goal.description}</p>
                  )}
                </div>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }} 
                    style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                    className="delete-goal-btn"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                  </button>
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                   {(() => {
                     const timeProgress = calculateTimeProgress(goal.createdAt, goal.targetDate, isCompleted);
                     return (
                       <>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                           <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Progress</span>
                           <span style={{ fontSize: '0.8rem', fontWeight: 900, color: theme.text }}>{timeProgress}%</span>
                         </div>
                         <div style={{ height: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '7px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                           <div style={{ height: '100%', width: `${timeProgress}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.text})`, borderRadius: '4px', boxShadow: `0 0 15px ${theme.accent}44`, transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                         </div>
                       </>
                     );
                   })()}
                </div>
                <div style={{ 
                  position: 'absolute', 
                  right: '1rem', 
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '100px',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.8,
                  pointerEvents: 'none'
                }}>
                  {goal.image_url ? <img src={goal.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' }}>🎯</span>}
                </div>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>Target:</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-secondary)', marginLeft: '4px' }}>{new Date(goal.targetDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleGoalStatus(goal); }} 
                  className="goal-complete-tick"
                  style={{ 
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '2px solid #10b981',
                    background: 'transparent',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    padding: 0,
                    zIndex: 20,
                    position: 'relative'
                  }}
                  title="Mark as Complete"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '28px', fontWeight: '900' }}>check</span>
                </button>
              </div>
            </div>
          );
        })}
        </div>
      )}



      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', borderRadius: '2.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{t('define_milestone')}</h2>
              <button onClick={() => setShowModal(false)} className="notification-btn"><span className="material-symbols-outlined">close</span></button>
            </div>

            {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 700 }}>{error}</div>}
            
            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('task_name')}</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('what_achieve')} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('target_date')}</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="date" 
                      className="form-input date-input-premium" 
                      value={targetDate} 
                      onChange={e => setTargetDate(e.target.value)} 
                      required 
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.05)', 
                        padding: '1rem', 
                        paddingRight: '3rem',
                        borderRadius: '1rem', 
                        color: 'var(--text-main)', 
                        width: '100%', 
                        boxSizing: 'border-box', 
                        fontWeight: 'bold',
                        fontSize: '1rem'
                      }} 
                    />
                    <span className="material-symbols-outlined" style={{ 
                      position: 'absolute', 
                      right: '1rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: '#10b981', 
                      pointerEvents: 'none',
                      fontSize: '22px'
                    }}>
                      calendar_month
                    </span>
                  </div>
                </div>
              </div>

              <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('description_vision')}</label>
                <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('path_success')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', minHeight: '80px', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', resize: 'none' }} />
                
              </div>

              <button type="submit" disabled={loading} className="glow-btn-primary" style={{ height: '3.5rem', width: '100%', borderRadius: '1.25rem' }}>
                {loading ? <span className="material-symbols-outlined rotating">sync</span> : <span>{t('add')} Goal</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav isHidden={isSidebarHidden} />
      
      <style>{`
        .goals-grid {
          display: grid;
          gap: 1.5rem;
          padding-bottom: 7rem;
        }
        @media (min-width: 1400px) {
          .goals-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 1399px) and (min-width: 1024px) {
          .goals-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 1023px) and (min-width: 640px) {
          .goals-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 639px) {
          .goals-grid { grid-template-columns: 1fr !important; }
        }
        .delete-goal-btn:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.1) !important;
          border-radius: 50%;
        }
        .glass-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .date-input-premium::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }
        .goal-complete-tick:hover {
          background: #10b981 !important;
          color: white !important;
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
        }
      `}</style>
    </div>
  );
};

export default Goals;

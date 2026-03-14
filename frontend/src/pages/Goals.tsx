import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import BottomNav from '../components/BottomNav';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
      .select('*')
      .eq('userId', user.id)
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
  }, [fetchGoals]);

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
    const { error } = await supabase
      .from('goals')
      .update({ 
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      .eq('id', goal.id);

    if (error) console.error('Error updating goal:', error);
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

  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <button onClick={() => navigate('/dashboard')} className="notification-btn" data-tooltip="Back to Dashboard" style={{ width: '40px', height: '40px' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{t('goals')}</h1>
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
            style={{ width: '36px', height: '36px', minWidth: '36px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>add</span>
          </button>
        </div>
      </header>

      {/* Goals Display Grid */}
      <div className="goals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', paddingBottom: '7rem', alignItems: 'start' }}>
        {goals.map(goal => {
          const daysLeft = calculateDaysRemaining(goal.targetDate);
          const isOverdue = daysLeft !== null && daysLeft < 0;
          const isCompleted = goal.status === 'completed';
          
          return (
            <div key={goal.id} className="glass-card" style={{ padding: 0, borderRadius: '2.5rem', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', borderLeft: `6px solid ${isCompleted ? '#10b981' : isOverdue ? '#ef4444' : '#3b82f6'}`, background: isCompleted ? 'rgba(16, 185, 129, 0.03)' : 'rgba(255, 255, 255, 0.03)' }}>
              {goal.image_url && (
                <div style={{ height: '160px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                  <img src={goal.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isCompleted ? 0.4 : 0.8 }} alt={goal.name} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, rgba(15, 23, 42, 1), transparent)' }}></div>
                </div>
              )}
              
              <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1, lineHeight: 1.2 }}>{goal.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#64748b' }}>calendar_today</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div onClick={() => toggleGoalStatus(goal)} style={{ cursor: 'pointer', color: isCompleted ? '#fbbf24' : '#64748b', transition: 'all 0.2s' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', fontVariationSettings: isCompleted ? "'FILL' 1" : "" }}>
                      star
                    </span>
                  </div>
                </div>

                {goal.description && (
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: 0, lineHeight: 1.6, opacity: isCompleted ? 0.5 : 1 }}>
                    {goal.description}
                  </p>
                )}

                <div style={{ background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '0.85rem 1rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isOverdue ? '#f87171' : '#10b981' }}>{isOverdue ? 'history' : 'timer'}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 900, color: isOverdue ? '#f87171' : '#10b981' }}>
                    {isCompleted ? "Achieved" : isOverdue ? "Overdue" : `${daysLeft} days left`}
                  </span>
                </div>

                {/* Quotes section removed */}
              </div>
            </div>
          );
        })}
      </div>

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
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('daily_goal')}</label>
                  <input type="date" className="form-input" value={targetDate} onChange={e => setTargetDate(e.target.value)} required style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.9rem 1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', margin: 0 }}>{t('description_vision')}</label>
                  <button type="button" onClick={() => document.getElementById('modal-image-upload')?.click()} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_photo_alternate</span>
                    <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>{t('add_visual')}</span>
                  </button>
                  <input id="modal-image-upload" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </div>
                <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('path_success')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', minHeight: '80px', padding: '1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', resize: 'none' }} />
                
                {imageFile && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '0.75rem', width: 'fit-content' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '0.4rem', overflow: 'hidden' }}><img src={URL.createObjectURL(imageFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Goal" /></div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981' }}>{imageFile.name}</span>
                    <button type="button" onClick={() => setImageFile(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span></button>
                  </div>
                )}
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
        @media (min-width: 1200px) {
          .goals-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
        @media (max-width: 1199px) and (min-width: 1024px) {
          .goals-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 1023px) {
          .goals-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Goals;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import BottomNav from '../components/BottomNav';


const Feedback: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [type, setType] = useState('Feature');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchFeedback = async () => {
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setRecentFeedback(data);
    };

    fetchFeedback();

    const channel = supabase
      .channel('user_feedback')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'feedback',
        filter: `user_id=eq.${user.id}`
      }, () => fetchFeedback())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert([{
        user_id: user?.id || null,
        user_name: user?.name || 'Anonymous',
        message,
        type,
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setSubmitted(true);
      setMessage('');
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => navigate('/settings')}
          className="notification-btn"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '12px'
          }}
        >
          <span className="material-symbols-outlined" style={{ color: 'white' }}>chevron_left</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'white' }}>Feedback</h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
            Help us improve StayHardy
          </p>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
    <div className="glass-card" style={{ padding: '1.5rem 2rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Feedback Type</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[
                    { name: 'Feature', color: '#10b981', textColor: '#064e3b' },
                    { name: 'Bug', color: '#ef4444', textColor: '#fff' },
                    { name: 'Other', color: '#3b82f6', textColor: '#fff' }
                  ].map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setType(t.name)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: type === t.name ? t.color : 'rgba(255,255,255,0.05)',
                        color: type === t.name ? t.textColor : '#64748b',
                        fontWeight: 900,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Your Message</label>
                <textarea
                  className="form-input"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us what's on your mind..."
                  required
                  style={{ minHeight: '120px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '1rem', marginTop: '0.5rem', padding: '1rem' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="glow-btn-primary"
                style={{ 
                  height: '3.5rem', 
                  borderRadius: '1rem', 
                  background: submitted ? 'rgba(16, 185, 129, 0.2)' : 'var(--primary)',
                  color: submitted ? '#10b981' : '#064e3b',
                  transition: 'all 0.3s ease'
                }}
              >
                {isSubmitting ? 'Sending...' : submitted ? '✅ Sent!' : 'Submit Feedback'}
              </button>
            </form>
        </div>

        {recentFeedback.length > 0 && (
          <section>
            <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Your Progress Reports</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentFeedback.map(f => (
                <div key={f.id} className="glass-card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '9px', 
                      fontWeight: 900, 
                      color: f.type === 'Bug' ? '#ef4444' : f.type === 'Other' ? '#3b82f6' : '#10b981', 
                      letterSpacing: '0.1em' 
                    }}>
                      {f.type?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '9px', color: '#475569' }}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>{f.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Feedback;

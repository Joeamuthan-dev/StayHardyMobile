import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

import BottomNav from '../components/BottomNav';

const FeedbackList: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      const { data } = await supabase
        .from('feedback')
        .select('id, userName, message, type, createdAt')
        .order('createdAt', { ascending: false })
        .limit(50);
      
      if (data) setFeedbacks(data);
      setLoading(false);
    };

    fetchFeedbacks();

    const channel = supabase
      .channel('feedback_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        fetchFeedbacks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  return (
    <div className="page-shell">
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'white' }}>User Feed</h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
            Community Voices
          </p>
        </div>
      </header>

      <main>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.5 }}>
            <span className="material-symbols-outlined animate-spin" style={{ fontSize: '2rem' }}>sync</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {feedbacks.map(f => (
              <div key={f.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {f.userName?.charAt(0) || 'A'}
                    </div>
                    <span style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{f.userName || 'Anonymous'}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>{new Date(f.createdAt).toLocaleDateString()}</span>
                </div>
                
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6' }}>{f.message}</p>
                
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.05)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {f.type || 'General'}
                  </span>
                </div>
              </div>
            ))}

            {feedbacks.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem' }}>chat_bubble_outline</span>
                <p style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '10px' }}>No entries found</p>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default FeedbackList;

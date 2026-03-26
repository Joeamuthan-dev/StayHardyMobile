import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { supabase } from '../supabase';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistGoalsList, loadGoalsListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import BottomNav from '../components/BottomNav';
import { useLocation } from 'react-router-dom';
import { ProductivityService } from '../lib/ProductivityService';
import { triggerCelebration } from '../components/CelebrationOverlay';



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



const GoalCard = ({
  goal,
  onComplete,
  onDelete
}: {
  goal: Goal;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) => {

  // Calculate days left:
  const daysLeft = goal.targetDate
    ? Math.ceil(
        (new Date(goal.targetDate).getTime() -
         new Date().getTime()) /
        (1000 * 60 * 60 * 24))
    : null

  const isOverdue = daysLeft !== null
    && daysLeft < 0

  const isUrgent = daysLeft !== null
    && daysLeft <= 3
    && daysLeft >= 0

  // Progress (days elapsed vs total):
  const progress = goal.targetDate
    ? Math.min(100, Math.max(0,
        Math.round(
          (1 - (daysLeft || 0) /
          Math.max(1,
            Math.ceil(
              (new Date(goal.targetDate).getTime()
               - new Date(goal.createdAt).getTime())
              / (1000*60*60*24)
            )
          )) * 100
        )
      ))
    : 0

  return (
    <div style={{
      margin: '0 0px 12px 0px',
      borderRadius: '24px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow:
        isOverdue
          ? '0 4px 24px rgba(239,68,68,0.2)'
          : '0 4px 24px rgba(147,51,234,0.2)'
    }}>

      {/* Mesh gradient background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: isOverdue
          ? 'linear-gradient(135deg,' +
            '#4E0000 0%,' +
            '#2E0000 100%)'
          : 'linear-gradient(135deg,' +
            '#2E004E 0%,' +
            '#1A002E 100%)',
        backgroundSize: '200% 200%',
        animation:
          'meshMove 6s ease infinite'
      }}/>

      {/* Mesh overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(' +
          'circle at 20% 20%,' +
          (isOverdue
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(147,51,234,0.2)') +
          ' 0%,transparent 60%),' +
          'radial-gradient(' +
          'circle at 80% 80%,' +
          (isOverdue
            ? 'rgba(185,28,28,0.1)'
            : 'rgba(109,40,217,0.15)') +
          ' 0%,transparent 60%)',
        pointerEvents: 'none'
      }}/>

      {/* Border */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '24px',
        border: '1px solid ' +
          (isOverdue
            ? 'rgba(239,68,68,0.3)'
            : 'rgba(147,51,234,0.4)'),
        pointerEvents: 'none'
      }}/>

      {/* Card content */}
      <div style={{
        position: 'relative',
        padding: '18px 18px 16px 18px',
        zIndex: 1
      }}>

        {/* TOP ROW — title + icon + delete */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
          gap: '12px'
        }}>

          <div style={{ flex: 1 }}>
            {/* Status badge */}
            {isOverdue && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background:
                  'rgba(239,68,68,0.2)',
                border: '1px solid ' +
                  'rgba(239,68,68,0.4)',
                borderRadius: '8px',
                padding: '2px 8px',
                marginBottom: '6px'
              }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: '#EF4444',
                  letterSpacing: '0.1em'
                }}>
                  🚨 OVERDUE
                </span>
              </div>
            )}

            {isUrgent && !isOverdue && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background:
                  'rgba(249,115,22,0.2)',
                border: '1px solid ' +
                  'rgba(249,115,22,0.4)',
                borderRadius: '8px',
                padding: '2px 8px',
                marginBottom: '6px'
              }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  color: '#F97316',
                  letterSpacing: '0.1em'
                }}>
                  ⚡ URGENT
                </span>
              </div>
            )}

            {/* Goal title */}
            <p style={{
              fontSize: '18px',
              fontWeight: '900',
              color: '#FFFFFF',
              margin: 0,
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
              paddingRight: '8px'
            }}>
              {goal.name}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Delete button */}
            <div 
              onClick={(e) => { e.stopPropagation(); onDelete(goal.id); }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>

            {/* 3D Target icon */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background:
                'rgba(147,51,234,0.2)',
              border: '1px solid ' +
                'rgba(147,51,234,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              animation:
                'targetGlow 3s ease-in-out infinite'
            }}>
              <span style={{
                fontSize: '24px'
              }}>
                🎯
              </span>
            </div>
          </div>
        </div>

        {/* PROGRESS SECTION */}
        <div style={{
          marginBottom: '16px'
        }}>

          {/* Progress label row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.1em'
            }}>
              MISSION PROGRESS
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              color: isOverdue
                ? '#EF4444'
                : '#A855F7'
            }}>
              {progress}%
            </span>
          </div>

          {/* Thick glowing progress bar */}
          <div style={{
            height: '8px',
            background:
              'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: progress + '%',
              background: isOverdue
                ? 'linear-gradient(' +
                  '90deg,' +
                  '#EF4444,#DC2626)'
                : 'linear-gradient(' +
                  '90deg,' +
                  '#A855F7,#7C3AED)',
              borderRadius: '8px',
              animation:
                'progressGlow 2s ' +
                'ease-in-out infinite',
              transition:
                'width 1s ease'
            }}/>
          </div>
        </div>

        {/* BOTTOM ROW —
            date chip + mark done */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>

          {/* Glassmorphic date chip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background:
              'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid ' +
              'rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '7px 12px'
          }}>
            <svg width="12" height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeLinecap="round">
              <rect x="3" y="4"
                width="18" height="18"
                rx="2"/>
              <line x1="16" y1="2"
                x2="16" y2="6"/>
              <line x1="8" y1="2"
                x2="8" y2="6"/>
              <line x1="3" y1="10"
                x2="21" y2="10"/>
            </svg>
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              color: isOverdue
                ? '#EF4444'
                : isUrgent
                  ? '#F97316'
                  : 'rgba(255,255,255,0.7)'
            }}>
              {daysLeft === null
                ? 'No deadline'
                : isOverdue
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0
                    ? 'Due today!'
                    : `${daysLeft}d left`}
            </span>
          </div>

          {/* Mark Done button */}
          <div
            onClick={() =>
              onComplete(goal.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background:
                'linear-gradient(' +
                '90deg,' +
                '#00E87A 0%,' +
                '#00FF88 50%,' +
                '#00E87A 100%)',
              backgroundSize: '200% auto',
              animation:
                'markDoneShimmer ' +
                '2s linear infinite',
              borderRadius: '12px',
              padding: '8px 16px',
              cursor: 'pointer',
              boxShadow:
                '0 0 16px ' +
                'rgba(0,232,122,0.4)'
            }}>
            <svg width="14" height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <polyline points=
                "20 6 9 17 4 12"/>
            </svg>
            <span style={{
              fontSize: '12px',
              fontWeight: '900',
              color: '#000000',
              letterSpacing: '0.04em'
            }}>
              Mark Done
            </span>
          </div>
        </div>

        {/* Description if exists */}
        {goal.description && (
          <p style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.35)',
            margin: '12px 0 0 0',
            lineHeight: 1.5,
            borderTop: '1px solid ' +
              'rgba(255,255,255,0.06)',
            paddingTop: '12px'
          }}>
            {goal.description}
          </p>
        )}
      </div>
    </div>
  )
}


const triggerGlobalRefresh = () => {
  window.dispatchEvent(new CustomEvent('stayhardy_refresh'));
  console.log('Global refresh triggered');
};

const Goals: React.FC = () => {
  const { user } = useAuth();
  const { setLoading: setGlobalLoading, setLoadingText } = useLoading();
  // const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetDate, setTargetDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [completedGoalsCount, setCompletedGoalsCount] = useState(0);
  const [focusedField, setFocusedField] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const justCreatedGoal = useRef(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleOpenCreateGoal = () => setShowModal(true);
    window.addEventListener('open-create-goal', handleOpenCreateGoal);
    return () => window.removeEventListener('open-create-goal', handleOpenCreateGoal);
  }, []);

  const fetchGoals = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id) return;
      setGlobalLoading(true);
      setLoadingText("Syncing Tactical Goals...");
      try {
        if (justCreatedGoal.current) return;

      const stale = await loadGoalsListStale<Goal>(user.id);
      if (stale !== null) {
        setGoals((stale as Goal[]).filter(g => g.status === 'pending'));
        setCompletedGoalsCount((stale as Goal[]).filter(g => g.status === 'completed').length);
      }

      const expired = options?.force || (await isCacheExpired(CACHE_KEYS.goals_list, CACHE_EXPIRY_MINUTES.goals_list));
      if (!expired) return;

      const { data, error } = await supabase
        .from('goals')
        .select('id, userId, name, description, targetDate, status, quote, image_url, createdAt, updatedAt')
        .eq('userId', user.id)
        .order('createdAt', { ascending: false });

      if (error) console.error('Error fetching goals:', error);
      else if (data) {
        const active = (data as Goal[]).filter(g => (g.status as string) !== 'completed' && (g.status as string) !== 'done' && (g.status as string) !== 'achieved');
        const completed = (data as Goal[]).filter(g => (g.status as string) === 'completed' || (g.status as string) === 'done' || (g.status as string) === 'achieved');
        
        setGoals(active);
        setCompletedGoalsCount(completed.length);
        void persistGoalsList(user.id, data as Goal[]);
      }
      } catch (err) {
        console.error('Error fetching goals:', err);
      } finally {
        setGlobalLoading(false);
      }
    },
    [user?.id, setGlobalLoading, setLoadingText],
  );

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
      }, () => void fetchGoals({ force: true }))
      .subscribe();

    return () => {
      supabase.removeChannel(goalsChannel);
    };
  }, [fetchGoals, user?.id]);

  useEffect(() => {
    const h = () => void fetchGoals({ force: true });
    window.addEventListener(AFTER_SYNC_FLUSH_EVENT, h);
    return () => window.removeEventListener(AFTER_SYNC_FLUSH_EVENT, h);
  }, [fetchGoals]);

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
    
    if (targetDate) {
      const selected = new Date(targetDate);
      const now = new Date();
      now.setHours(0,0,0,0);
      if (selected < now) {
        showToast('Please select a future date');
        return;
      }
    }

    setLoading(true);
    setGlobalLoading(true);
    setLoadingText("Establishing Tactical Link...");


    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const tempId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const online = await isOnline();
    if (!online && imageFile) {
      showToast('Images require a connection. Try again when online.');
      return;
    }

    const optimistic: Goal = {
      id: tempId,
      userId: user.id,
      name,
      description,
      targetDate,
      status: 'pending',
      quote: randomQuote,
      image_url: undefined, // temporary
      createdAt: nowIso,
    };

    // 1. Fully Optimistic Immediate Updates
    setGoals((prev) => [optimistic, ...prev]);
    if (user?.id) {
      loadGoalsListStale<Goal>(user.id).then((stale) => {
        if (stale) {
          persistGoalsList(user.id, [optimistic, ...stale]);
          void ProductivityService.recalculate(user.id);
        }
      });
    }

    setName('');
    setDescription('');
    setImageFile(null);
    setTargetDate('');
    setShowModal(false);

    try {
      if (!online) {
        await enqueueSync({
          action: 'create',
          entity: 'goal',
          data: {
            row: {
              userId: user.id,
              name,
              description,
              targetDate,
              status: 'pending',
              quote: randomQuote,
              image_url: '',
            },
          },
          timestamp: Date.now(),
        });
        void invalidateUserStatsCache();
        setLoading(false);
        triggerGlobalRefresh();
        return;
      }

      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const newGoal = {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        targetDate: targetDate || null,
        status: 'pending',
        quote: randomQuote,
        image_url: imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const { data, error: insertError } = await supabase
        .from('goals')
        .insert([newGoal])
        .select()
        .single();

      if (insertError) throw insertError;

      justCreatedGoal.current = true;
      if (data) {
        // Swap temp ID with real ID quietly
        const createdGoal = data as Goal;
        setGoals(prev => prev.map(g => g.id === tempId ? createdGoal : g));
        if (user?.id) {
          loadGoalsListStale<Goal>(user.id).then((stale) => {
            if (stale) {
              persistGoalsList(user.id, stale.map(g => g.id === tempId ? createdGoal : g));
            }
          });
        }
      }
      setTimeout(() => { justCreatedGoal.current = false; }, 5000);

      void invalidateUserStatsCache();
      triggerGlobalRefresh();
    } catch (err: any) {
      console.error('Error creating goal:', err);
      showToast('Error: ' + (err.message || 'Failed to create goal.'));
      // Rollback
      setGoals(prev => prev.filter(g => g.id !== tempId));
      if (user?.id) {
        loadGoalsListStale<Goal>(user.id).then((stale) => {
          if (stale) {
            persistGoalsList(user.id, stale.filter(g => g.id !== tempId));
            void ProductivityService.recalculate(user.id);
          }
        });
      }
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  const completeGoal = async (id: string) => {
    // 1. Fully Optimistic Immediate UI & Cache Update
    const completedGoal = goals.find(g => g.id === id);
    triggerCelebration('goal', completedGoal?.name);
    const originalGoals = [...goals];
    setGoals(prev => prev.filter(g => g.id !== id));
    setCompletedGoalsCount(prev => prev + 1);

    if (user?.id) {
      loadGoalsListStale<Goal>(user.id).then((stale) => {
        if (stale) {
          persistGoalsList(user.id, stale.map(g => g.id === id ? { ...g, status: 'completed' } : g));
          void ProductivityService.recalculate(user.id);
        }
      });
    }

    const online = await isOnline();
    if (!online && user?.id) {
      await enqueueSync({
        action: 'update',
        entity: 'goal',
        data: { id, patch: { status: 'completed', updatedAt: new Date().toISOString() } },
        timestamp: Date.now(),
      });
      triggerGlobalRefresh();
      return;
    }

    const { error } = await supabase
      .from('goals')
      .update({ status: 'completed', updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Goal complete failed:', error.message);
      showToast('Failed: ' + error.message);
      // Rollback
      setGoals(originalGoals);
      setCompletedGoalsCount(prev => prev - 1);
      if (user?.id) {
        loadGoalsListStale<Goal>(user.id).then((stale) => {
          if (stale) {
            persistGoalsList(user.id, stale.map(g => g.id === id ? { ...g, status: 'pending' } : g));
            void ProductivityService.recalculate(user.id);
          }
        });
      }
      return;
    }

    void syncWidgetData();
    void invalidateUserStatsCache();
    triggerGlobalRefresh();
  };

  const deleteGoal = async (goalId: string) => {
    if (!user?.id) return;
    setGoals(prev => prev.filter(g => g.id !== goalId));

    const online = await isOnline();
    if (!online) {
      await enqueueSync({
        action: 'delete',
        entity: 'goal',
        data: { id: goalId },
        timestamp: Date.now(),
      });
      void setGoals((prev) => {
        void persistGoalsList(user.id, prev);
        return prev;
      });
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
      return;
    }

    const { error } = await supabase.from('goals').delete().eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      void fetchGoals({ force: true });
    } else {
      void invalidateUserStatsCache();
      if (user?.id) {
        const stale = await loadGoalsListStale<Goal>(user.id) || [];
        persistGoalsList(user.id, stale.filter(g => g.id !== goalId));
        void ProductivityService.recalculate(user.id);
      }
      triggerGlobalRefresh();
    }
  };









  return (
    <div className="page-shell goals-page-layout" style={{ 
      background: '#000', 
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <style>{`
        @keyframes meshMove {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes targetGlow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(147,51,234,0.6)); }
          50% { filter: drop-shadow(0 0 16px rgba(167,71,254,1)); }
        }
        @keyframes progressGlow {
          0%,100% { box-shadow: 0 0 8px rgba(168,85,247,0.4); }
          50% { box-shadow: 0 0 20px rgba(168,85,247,0.8); }
        }
        @keyframes markDoneShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes portalPulse {
          0%,100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes rocketFloat {
          0%,100% { transform: translateY(0) rotate(-15deg); }
          50% { transform: translateY(-12px) rotate(-15deg); }
        }
        @keyframes metallic {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes btnGlow {
          0%,100% { box-shadow: 0 0 20px rgba(0,232,122,0.4); }
          50% { box-shadow: 0 0 40px rgba(0,232,122,0.7); }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes borderGlowGreen {
          0%,100% { border-color: rgba(0,232,122,0.2); box-shadow: 0 0 10px rgba(0,232,122,0.1); }
          50% { border-color: rgba(0,232,122,0.6); box-shadow: 0 0 20px rgba(0,232,122,0.3); }
        }
        @keyframes borderGlowPurple {
          0%,100% { border-color: rgba(124,77,255,0.3); box-shadow: 0 0 10px rgba(124,77,255,0.2); }
          50% { border-color: rgba(124,77,255,0.8); box-shadow: 0 0 20px rgba(124,77,255,0.5); }
        }
        @keyframes errorPulse {
          0%,100% { border-color: rgba(255,0,0,0.3); box-shadow: 0 0 5px rgba(255,0,0,0.2); }
          50% { border-color: rgba(255,0,0,1); box-shadow: 0 0 20px rgba(255,0,0,0.5); }
        }
        @keyframes launchShimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>

      {/* Pinned Header */}
      <div style={{
        padding: '24px 16px 16px 72px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end', 
        position: 'sticky', 
        top: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.65)', 
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <p style={{
            fontSize: '10px',
            fontWeight: '800',
            color: '#666666',
            letterSpacing: '0.15em',
            margin: '0 0 2px 0',
            textTransform: 'uppercase'
          }}>
            YOUR MISSIONS
          </p>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#FFFFFF',
            margin: 0,
            letterSpacing: '-1px',
            lineHeight: 1
          }}>
            Goals
          </h2>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '2px' // Align better with "Goals" baseline
        }}>
          <div style={{
            background: 'rgba(124, 77, 255, 0.1)',
            border: '1px solid rgba(124, 77, 255, 0.4)',
            borderRadius: '10px',
            padding: '4px 10px',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(124, 77, 255, 0.2)'
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '900',
              color: '#7C4DFF',
              margin: 0,
              lineHeight: 1
            }}>
              {goals.length} <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: '700' }}>ACTIVE</span>
            </p>
          </div>

          <div style={{
            background: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: '10px',
            padding: '4px 10px',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(0, 230, 118, 0.15)'
          }}>
            <p style={{
              fontSize: '14px',
              fontWeight: '900',
              color: '#00E676',
              margin: 0,
              lineHeight: 1
            }}>
              {completedGoalsCount} <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: '700' }}>DONE</span>
            </p>
          </div>
        </div>
      </div>

      {/* Active Goals Grid Wrapper */}
      <div 
        className="bouncing-scroll"
        style={{ 
          paddingTop: '32px', // Sticky header takes up its own space
          paddingBottom: '120px'
        }}
      >
        <style>{`
          @keyframes floatTrophy {
            0%, 100% { transform: translateY(0) rotate(-5deg); }
            50% { transform: translateY(-15px) rotate(5deg); }
          }
          @keyframes spinRingPurple {
            from { transform: rotateX(60deg) rotateY(20deg) rotateZ(0deg); }
            to { transform: rotateX(60deg) rotateY(20deg) rotateZ(360deg); }
          }
          @keyframes spinRingPurpleReverse {
            from { transform: rotateX(70deg) rotateY(-20deg) rotateZ(360deg); }
            to { transform: rotateX(70deg) rotateY(-20deg) rotateZ(0deg); }
          }
          @keyframes pulseTrophy {
            0%, 100% { box-shadow: 0 10px 30px rgba(124, 77, 255, 0.4), inset -10px -10px 20px rgba(0,0,0,0.5); }
            50% { box-shadow: 0 15px 40px rgba(124, 77, 255, 0.6), inset -10px -10px 20px rgba(0,0,0,0.6); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* ── Fix: Remove ALL default browser focus rings inside the Goal modal ── */
          .goal-modal-form input,
          .goal-modal-form input:focus,
          .goal-modal-form input:focus-visible,
          .goal-modal-form textarea,
          .goal-modal-form textarea:focus,
          .goal-modal-form textarea:focus-visible {
            outline: none !important;
            box-shadow: none !important;
            -webkit-appearance: none;
            appearance: none;
          }

          /* ── Global: caret and selection color ── */
          .goal-modal-form input,
          .goal-modal-form textarea {
            caret-color: #00E676;
          }
          .goal-modal-form input::selection,
          .goal-modal-form textarea::selection {
            background: rgba(0, 230, 118, 0.25);
            color: #FFFFFF;
          }
        `}</style>
        {goals.length === 0 ? (
          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            padding: '40px 32px',
            animation: 'fadeIn 0.5s ease-out forwards',
            overflow: 'hidden'
          }}>
            {/* Ambient Background Glow (Deep Purple to Transparent 10% Opacity) */}
            <div style={{
              position: 'absolute',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(124, 77, 255, 0.1) 0%, rgba(124, 77, 255, 0) 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0
            }}/>

            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px', // 40px spacing from sphere to headline
              animation: 'floatTrophy 6s ease-in-out infinite',
              zIndex: 1
            }}>
              {/* Central glowing orb */}
              <div style={{
                position: 'absolute',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #b388ff 0%, #7c4dff 40%, #311b92 100%)',
                animation: 'pulseTrophy 4s ease-in-out infinite',
                zIndex: 2
              }}/>
              
              {/* Outer rings */}
              <div style={{
                position: 'absolute',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '1.5px solid rgba(124, 77, 255, 0.3)',
                boxShadow: '0 0 20px rgba(124, 77, 255, 0.1)',
                animation: 'spinRingPurple 10s linear infinite',
                zIndex: 1
              }}/>
              <div style={{
                position: 'absolute',
                width: '85px',
                height: '85px',
                borderRadius: '50%',
                border: '1.5px dashed rgba(255, 255, 255, 0.2)',
                animation: 'spinRingPurpleReverse 12s linear infinite',
                zIndex: 3
              }}/>
            </div>

            <div style={{ textAlign: 'center', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '900',
                color: '#FFFFFF',
                margin: '0 0 8px 0', // 8px spacing from headline to subtitle
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                GOALS CRUSHED
              </h2>
              <p style={{
                fontSize: '15px',
                color: '#A0A0A0',
                lineHeight: 1.6,
                margin: '0 0 20px 0', // 20px spacing from subtitle to button
                maxWidth: '280px',
                textAlign: 'center'
              }}>
                All active missions accomplished. The baseline just moved up. Set your next target.
              </p>

              <style>{`
                .new-target-btn {
                  background: #00E87A;
                  color: #000000;
                  border: none;
                  border-radius: 24px;
                  padding: 16px 36px;
                  font-size: 15px;
                  font-weight: 800;
                  letter-spacing: 0.05em;
                  cursor: pointer;
                  box-shadow: 0 0 15px rgba(0, 232, 122, 0.4);
                  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                  text-transform: uppercase;
                }
                .new-target-btn:active {
                  transform: scale(0.96);
                  box-shadow: 0 0 8px rgba(0, 232, 122, 0.6);
                }
              `}</style>
              <button
                className="new-target-btn"
                onClick={() => setShowModal(true)}
              >
                + NEW TARGET
              </button>
            </div>
          </div>
        ) : (
          <div
            className="goals-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '16px', 
              padding: '0 16px 20px 16px' 
            }}
          >
            {goals.map((goal) => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onComplete={(id) => {
                  void completeGoal(id);
                }} 
                onDelete={deleteGoal} 
              />
            ))}
          </div>
        )}
      </div>



      {/* Elite Command Interface Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(15px)',

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '440px',
            background: 'rgba(18,18,18,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '28px',
            padding: '32px 24px',
            animation: 'modalSlideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            position: 'relative'
          }}>



            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div>
                <p style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: '#7C4DFF',
                  letterSpacing: '0.2em',
                  margin: '0 0 4px 0'
                }}>
                  PURSUIT OF EXCELLENCE
                </p>
                <h3 style={{
                  fontSize: '26px',
                  fontWeight: '900',
                  color: '#FFF',
                  margin: 0,
                  letterSpacing: '-1px'
                }}>
                  Define Your Goal
                </h3>
              </div>
              <div 
                onClick={() => setShowModal(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  close
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateGoal} className="goal-modal-form">
              {/* Goal Name Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.15em',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  GOAL TITLE
                </label>
                <div style={{
                  background: '#1A1A1A',
                  borderRadius: '14px',
                  border: '1px solid ' + (focusedField === 'name' ? '#7C4DFF' : 'rgba(255,255,255,0.07)'),
                  boxShadow: focusedField === 'name' ? '0 0 12px rgba(124,77,255,0.2)' : 'none',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '14px'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: focusedField === 'name' ? '#7C4DFF' : 'rgba(255,255,255,0.25)', flexShrink: 0, transition: 'color 0.25s ease' }}>my_location</span>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField('')}
                    placeholder="Capture your vision..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      padding: '14px 14px',
                      color: '#FFF',
                      fontSize: '16px',
                      fontWeight: '600',
                      outline: 'none',
                      caretColor: '#7C4DFF'
                    }}
                  />
                </div>
              </div>

              {/* Date Input — read-only, triggers native date picker */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.15em',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  TARGET DEADLINE
                </label>
                <div
                  style={{
                    background: '#1A1A1A',
                    borderRadius: '14px',
                    border: '1px solid ' + (
                      targetDate && new Date(targetDate) <= new Date()
                        ? '#FF3D00'
                        : focusedField === 'date' ? '#00E87A' : 'rgba(255,255,255,0.07)'
                    ),
                    boxShadow: focusedField === 'date' ? '0 0 12px rgba(0,232,122,0.2)' : 'none',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '14px',
                    paddingRight: '14px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  {/* Hidden real date input to trigger native picker */}
                  <input
                    type="date"
                    required
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    onFocus={() => setFocusedField('date')}
                    onBlur={() => setFocusedField('')}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                  />
                  {/* Display-only row */}
                  <span
                    style={{
                      flex: 1,
                      padding: '14px 0',
                      color: targetDate ? '#FFF' : 'rgba(255,255,255,0.3)',
                      fontSize: '16px',
                      fontWeight: '600',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  >
                    {targetDate
                      ? new Date(targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Select target date...'}
                  </span>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '22px',
                      color: targetDate ? '#00E87A' : 'rgba(255,255,255,0.25)',
                      pointerEvents: 'none',
                      transition: 'color 0.25s ease'
                    }}
                  >
                    calendar_month
                  </span>
                </div>
                {targetDate && new Date(targetDate) <= new Date() && (
                  <p style={{
                    fontSize: '11px',
                    color: '#FF3D00',
                    fontWeight: '700',
                    margin: '8px 0 0 4px',
                    letterSpacing: '0.02em'
                  }}>
                    The 1% focus on the future. Select a future date.
                  </p>
                )}
              </div>

              {/* Description Input */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.1em',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  STRATEGY (OPTIONAL)
                </label>
                <div style={{
                  background: '#1A1A1A',
                  borderRadius: '14px',
                  border: '1px solid ' + (focusedField === 'desc' ? '#00E87A' : 'rgba(255,255,255,0.07)'),
                  boxShadow: focusedField === 'desc' ? '0 0 12px rgba(0,232,122,0.15)' : 'none',
                  transition: 'all 0.25s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingLeft: '14px',
                  paddingTop: '14px'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: focusedField === 'desc' ? '#00E87A' : 'rgba(255,255,255,0.25)', flexShrink: 0, marginRight: '10px', transition: 'color 0.25s ease', marginTop: '2px' }}>explore</span>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onFocus={() => setFocusedField('desc')}
                    onBlur={() => setFocusedField('')}
                    placeholder="How will you achieve this?"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      padding: '0 14px 14px 0',
                      color: '#FFF',
                      fontSize: '15px',
                      minHeight: '90px',
                      outline: 'none',
                      resize: 'none',
                      caretColor: '#00E87A'
                    }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <style>{`
                .launch-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
                .launch-btn:not(:disabled):active { transform: scale(0.96); }
              `}</style>
              <button
                type="submit"
                className="launch-btn"
                disabled={loading || !name.trim() || !targetDate || new Date(targetDate) <= new Date()}
                style={{
                  width: '100%',
                  height: '58px',
                  background: (loading || !name.trim() || !targetDate || new Date(targetDate) <= new Date())
                    ? 'rgba(255,255,255,0.05)'
                    : '#00E87A',
                  borderRadius: '18px',
                  border: 'none',
                  color: (loading || !name.trim() || !targetDate || new Date(targetDate) <= new Date()) ? 'rgba(255,255,255,0.2)' : '#000',
                  fontSize: '15px',
                  fontWeight: '900',
                  letterSpacing: '0.1em',
                  cursor: (loading || !name.trim() || !targetDate || new Date(targetDate) <= new Date()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: (loading || !name.trim() || !targetDate || new Date(targetDate) <= new Date()) ? 'none' : '0 0 20px rgba(0,232,122,0.35), 0 8px 24px rgba(0,232,122,0.2)',
                  transition: 'background 0.25s ease, box-shadow 0.25s ease'
                }}
              >
                {loading ? (
                  <span className="material-symbols-outlined rotating" style={{ fontSize: '24px' }}>sync</span>
                ) : (
                  <>
                    <span>LAUNCH MISSION</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>rocket_launch</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confetti overlay removed */}

      {toast && (
        <div
          role="status"
          className="goal-save-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
            transform: 'translateX(-50%)',
            zIndex: 1100,
            padding: '0.5rem 1rem',
            borderRadius: '999px',
            background: 'rgba(15, 23, 42, 0.92)',
            color: '#e2e8f0',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            maxWidth: 'min(90vw, 320px)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}

      <BottomNav
        isHidden={false}
        hideFloatingShelf={showModal}
        hideMobileNavChrome={showModal}
      />
    </div>
  );
};

export default Goals;

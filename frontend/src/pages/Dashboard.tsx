import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProGate } from '../hooks/useProGate';
import ProGateModal from '../components/ProGateModal';
import { useLocation } from 'react-router-dom';
import { isWeb } from '../utils/platform';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistTasksList, loadTasksListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import { ProductivityService } from '../lib/ProductivityService';
// CelebrationOverlay import removed — task completions now use inline top toast
// isCompletedTaskToday removed — no longer used in header
import { supabase } from '../supabase';



interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';

  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt?: string;
  order_index?: number;
  image_url?: string;
}









const TaskCard = ({
  task,
  onComplete,
  onDelete,
  onEdit
}: {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}) => {

  const [justCompleted,
    setJustCompleted] = useState(false)

  const getPriorityColor = (priority: string) => {
    switch((priority || '').toLowerCase()) {
      case 'high': return '#EF4444'
      case 'medium': return '#F59E0B'
      case 'low': return '#06B6D4'
      default: return '#6B7280'
    }
  }

  const handleComplete = () => {
    if (justCompleted) return;
    setJustCompleted(true)
    setTimeout(() => {
      onComplete(task.id)
    }, 400)
  }

  const isCompleted =
    task.status === 'completed'

  return (
    <div style={{
      margin: '0 16px 8px 16px',
      background:
        'rgba(18,18,18,0.95)',
      border: '1px solid ' +
        'rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '14px 14px 14px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow:
        '0 4px 12px rgba(0,0,0,0.4),' +
        'inset 0 1px 0 ' +
        'rgba(255,255,255,0.03)',
      opacity: isCompleted ? 0.5 : 1,

      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    }} className={task.id === task.id ? 'task-live-flash' : ''}>



      {/* Neumorphic checkbox LEFT */}
      <div
        onClick={handleComplete}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          flexShrink: 0,
          cursor: 'pointer',
          background: isCompleted ||
            justCompleted
              ? 'linear-gradient(' +
                '135deg,' +
                '#00E87A,#00C563)'
              : 'linear-gradient(' +
                '145deg,' +
                '#1c1c1c,#0f0f0f)',
          boxShadow: isCompleted ||
            justCompleted
              ? '0 0 16px ' +
                'rgba(0,232,122,0.7),' +
                '0 0 32px ' +
                'rgba(0,232,122,0.3)'
              : 'inset 4px 4px 8px ' +
                'rgba(0,0,0,0.8),' +
                'inset -2px -2px 6px ' +
                'rgba(255,255,255,0.04),' +
                '0 0 0 1px ' +
                'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          animation: justCompleted
            ? 'checkPop 0.4s ease,' +
              'neonPop 0.4s ease'
            : 'none'
        }}>

        <svg width="20" height="20"
          viewBox="0 0 20 20"
          fill="none">
          <path
            d="M4 10l4.5 4.5L16 6"
            stroke={
              isCompleted || justCompleted
                ? '#000000'
                : 'rgba(255,255,255,0.15)'
            }
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition:
                'stroke 0.2s ease'
            }}/>
        </svg>
      </div>

      {/* Task content MIDDLE */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: '15px',
          fontWeight: '700',
          color: '#FFFFFF',
          margin: '0 0 4px 0',
          letterSpacing: '-0.2px',
          textDecoration: isCompleted
            ? 'line-through' : 'none',
          textDecorationColor:
            'rgba(255,255,255,0.3)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {task.title}
        </p>
        {task.description && (
          <p style={{
            fontSize: '12px',
            color: '#888888',
            margin: '4px 0 0 0',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word'
          }}>
            {task.description}
          </p>
        )}
        {/* Priority pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '6px',
          background:
            `rgba(0,232,122,0.1)`,
          borderRadius: '8px',
          padding: '2px 8px'
        }}>
          <div style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background:
              getPriorityColor(
                task.priority),
            boxShadow: `0 0 6px ${
              getPriorityColor(
                task.priority)}`
          }}/>
          <span style={{
            fontSize: '9px',
            fontWeight: '700',
            color: getPriorityColor(
              task.priority),
            letterSpacing: '0.08em',
          }}>
            {task.priority || 'Normal'}
          </span>
        </div>
      </div>

      {/* Options right side */}
      {!isCompleted && (
        <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#EF4444', cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}

      {/* Priority color bar RIGHT */}
      <div style={{
        width: '3px',
        height: '48px',
        borderRadius: '3px',
        background:
          getPriorityColor(task.priority),
        boxShadow:
          `0 0 8px ${
            getPriorityColor(
              task.priority)}80`,
        flexShrink: 0
      }}/>

      {/* Options button */}
      <div
        onClick={() => onEdit(task)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid ' +
            'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0
        }}>
        <svg width="14" height="14"
          viewBox="0 0 24 24"
          fill="rgba(255,255,255,0.4)">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </div>
    </div>
  )
}


const triggerGlobalRefresh = () => {
  window.dispatchEvent(new CustomEvent('stayhardy_refresh'));
  console.log('Global refresh triggered');
};

const Dashboard: React.FC = () => {
  const { gateOpen, gateResource, closeGate, checkAndGate } = useProGate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null); // New details state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const { t } = useLanguage();

  const [focusedField, setFocusedField] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarHidden] = useState(() => {
    return localStorage.getItem('sidebarHidden') === 'true';
  });
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const handleOpenCreateTask = () => checkAndGate('tasks', () => openModal());
    window.addEventListener('open-create-task', handleOpenCreateTask);
    return () => window.removeEventListener('open-create-task', handleOpenCreateTask);
  }, [checkAndGate]);
  const [toast, setToast] = useState<string | null>(null);
  const [taskCompleteToast, setTaskCompleteToast] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [topToastVisible, setTopToastVisible] = useState(false);
  const topToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTopToast = () => {
    if (topToastTimerRef.current) clearTimeout(topToastTimerRef.current);
    setTopToastVisible(true);
    topToastTimerRef.current = setTimeout(() => setTopToastVisible(false), 1500);
  };

  useEffect(() => {
    if (showModal || !!detailTask) {
      document.body.classList.add('sheet-open');
    } else {
      document.body.classList.remove('sheet-open');
    }
    return () => {
      document.body.classList.remove('sheet-open');
    }
  }, [showModal, detailTask]);

  const [imageUrl, setImageUrl] = useState('');
  const { user } = useAuth();
  const isCreatingTask = useRef(false);

  const fetchTasks = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id) return;
      if (isCreatingTask.current) {
        console.log('fetchTasks blocked — task creation in progress');
        return;
      }
      const cachedTasks = await loadTasksListStale<Task>(user.id);
      if (cachedTasks !== null) {
        setTasks(cachedTasks);
      }

      const expired =
        options?.force ||
        (await isCacheExpired(CACHE_KEYS.tasks_list, CACHE_EXPIRY_MINUTES.tasks_list));
      if (!expired) return;

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, description, status, priority, createdAt, updatedAt, order_index, image_url')
        .eq('userId', user.id)
        .order('order_index', { ascending: true });

      if (fetchError) console.error('Supabase fetch error:', fetchError);
      else if (data) {
        setTasks(prev => {
          const map = new Map(data.map((t: any) => [t.id, t]));
          for (const local of prev) {
            if (local.id.length > 30 && !map.has(local.id)) {
              if (Date.now() - new Date(local.createdAt).getTime() < 30000) {
                map.set(local.id, local);
              }
            }
          }
          const mergedTasks = Array.from(map.values()) as Task[];
          void persistTasksList(user.id, mergedTasks);
          return mergedTasks;
        });
      }
    },
    [user?.id],
  );



  useEffect(() => {
    if (!user?.id) return;
    fetchTasks();

    const tasksChannel = supabase
      .channel('tasks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `userId=eq.${user.id}`
      }, () => {
        void fetchTasks({ force: true });
      })
      .subscribe();



    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [user?.id, fetchTasks]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-task') {
      openModal();
      // Clear the param
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  useEffect(() => {
    const h = () => void fetchTasks({ force: true });
    window.addEventListener(AFTER_SYNC_FLUSH_EVENT, h);
    return () => window.removeEventListener(AFTER_SYNC_FLUSH_EVENT, h);
  }, [fetchTasks]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!taskCompleteToast) return;
    const id = window.setTimeout(() => setTaskCompleteToast(null), 2000);
    return () => window.clearTimeout(id);
  }, [taskCompleteToast]);

  const openModal = (task?: Task) => {
    if (task) {
      setEditTask(task);
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority || 'Medium');
      setImageUrl(task.image_url || '');
    } else {
      setEditTask(null);
      setTitle('');
      setDescription('');
      setPriority('Medium');
      setImageUrl('');
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleAddTaskFabClick = () => {
    checkAndGate('tasks', () => openModal());
  };
  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('task-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('task-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const closeModal = () => {
    setIsExiting(true);
    setTimeout(() => {
      setShowModal(false);
      setIsExiting(false);
      setEditTask(null);
      setTitle('');
      setDescription('');
    }, 400);
  };

  const showTaskSaveToast = useCallback(() => {
    setToast('Could not save. Try again.');
  }, []);

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (isLoading || isCreatingTask.current) return;
    const titleTrim = title.trim();
    if (!titleTrim) return;

    setError(null);
    setIsLoading(true);

    const snapshot = {
      title: titleTrim,
      description: description.trim(),
      priority,
      imageUrl,
      imageFile,
      editTask,

    };

    // Close modal early for optimistic feel if NOT editing? 
    // Actually the user spec has an "Adding..." state, so I should probably wait 
    // or close after success. The original logic closed it immediately.
    // I'll keep the immediate close but use isLoading for the button *before* it closes 
    // or if submission fails.
    
    // Wait, let's keep the modal OPEN until success or error if we want to show loading.
    // Original: closeModal();

    const persistEdit = async () => {
      const et = snapshot.editTask;
      if (!et) return;
      const editId = et.id;
      const previewUrl = snapshot.imageFile
        ? URL.createObjectURL(snapshot.imageFile)
        : snapshot.imageUrl;
      const optimisticPatch = {
        title: snapshot.title,
        description: snapshot.description,

        priority: snapshot.priority,
        image_url: previewUrl || undefined,
        updatedAt: new Date().toISOString(),
      };
      setTasks(prev => {
        const updated = prev.map(t => (t.id === editId ? { ...t, ...optimisticPatch } : t));
        void persistTasksList(user.id, updated);
        return updated;
      });

      try {
        let finalImageUrl = snapshot.imageUrl;
        if (snapshot.imageFile) {
          try {
            finalImageUrl = await uploadImage(snapshot.imageFile);
          } catch (uploadErr) {
            console.error('Task image upload failed:', uploadErr);
            if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            await fetchTasks({ force: true });
            showTaskSaveToast();
            return;
          }
        }



        const payload = {
          title: snapshot.title,
          description: snapshot.description,

          priority: snapshot.priority,
          image_url: finalImageUrl || null,
          updatedAt: new Date().toISOString(),
        };
        const { error: updateError } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editId);
        if (updateError) throw updateError;
        if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        setTasks(prev => {
          const updated = prev.map(t =>
            t.id === editId ? { ...t, ...payload, image_url: finalImageUrl || undefined } : t,
          );
          void persistTasksList(user.id, updated);
          return updated;
        });
        void invalidateUserStatsCache();
        triggerGlobalRefresh();
        void setTasks((prev) => {
          if (user?.id) {
            persistTasksList(user.id, prev);
            void ProductivityService.recalculate(user.id);
          }
          return prev;
        });
        setIsLoading(false);
        closeModal();
      } catch (err: any) {
        console.error('Task update failed:', err);
        setError(err.message || 'Failed to update task');
        setIsLoading(false);
        if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        const online = await isOnline();
        if (!online && user?.id) {
          const patch = {
            title: snapshot.title,
            description: snapshot.description,

            priority: snapshot.priority,
            image_url: snapshot.imageUrl || null,
            updatedAt: new Date().toISOString(),
          };
          await enqueueSync({
            action: 'update',
            entity: 'task',
            data: { id: editId, patch },
            timestamp: Date.now(),
          });
          void setTasks((prev) => {
            persistTasksList(user.id, prev);
            void ProductivityService.recalculate(user.id);
            return prev;
          });
          void invalidateUserStatsCache();
          triggerGlobalRefresh();
          return;
        }
        await fetchTasks({ force: true });
        showTaskSaveToast();
      }
    };

    const persistInsert = async () => {
      setIsLoading(true);
      setError(null);
      isCreatingTask.current = true;

      // Optimistic Update
      const tempId = crypto.randomUUID();
      const optimisticTask: Task = {
        id: tempId,
        title: snapshot.title,
        description: snapshot.description,

        priority: snapshot.priority,
        image_url: undefined, // temporary, will update if image uploads
        status: 'pending',
        order_index: tasks.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTasks(prev => {
        const next = [...prev, optimisticTask];
        if (user?.id) {
          persistTasksList(user.id, next);
          void ProductivityService.recalculate(user.id);
        }
        return next;
      });
      
      closeModal(); // UX: close instantly

      try {
        let finalImageUrl = snapshot.imageUrl;
        if (snapshot.imageFile) {
          finalImageUrl = await uploadImage(snapshot.imageFile);
        }

        const { error: insertError, data } = await supabase
          .from('tasks')
          .insert([{
            title: snapshot.title,
            description: snapshot.description,

            priority: snapshot.priority,
            image_url: finalImageUrl || null,
            userId: user!.id,
            status: 'pending' as const,
            order_index: tasks.length + 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        
        // Swap temp ID with real ID quietly
        const newTask = (data as unknown) as Task;
        let swappedTasks: Task[] = [];
        setTasks(prev => {
          swappedTasks = prev.map(t => t.id === tempId ? newTask : t);
          return swappedTasks;
        });
        // Await cache write before clearing isCreatingTask — prevents realtime
        // refetch from loading stale cache (with tempId) and creating a duplicate.
        if (user?.id && swappedTasks.length > 0) {
          await persistTasksList(user.id, swappedTasks);
        }

        void invalidateUserStatsCache();
        triggerGlobalRefresh();
      } catch (err: any) {
        console.error('Task insert failed:', err);
        // Rollback on failure
        setTasks(prev => {
          const next = prev.filter(t => t.id !== tempId);
          if (user?.id) {
            persistTasksList(user.id, next);
            void ProductivityService.recalculate(user.id);
          }
          return next;
        });
        // Re-enable button immediately so user can retry
        setIsLoading(false);
      } finally {
        // Delay releasing the guard until after the close animation (400ms)
        // so the still-visible modal button stays disabled and can't fire again.
        setTimeout(() => {
          setIsLoading(false);
          isCreatingTask.current = false;
        }, 420);
      }
    };


    if (snapshot.editTask) void persistEdit();
    else persistInsert();
  };

  const scheduleTaskCompletionExit = useCallback((taskId: string) => {
    setExitingTaskIds((prev) => new Set(prev).add(taskId));
    window.setTimeout(() => {
      setExitingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 520);
  }, []);

  const toggleTaskStatus = async (task: Task) => {
    const newStatus: 'pending' | 'completed' = task.status === 'pending' ? 'completed' : 'pending';

    if (newStatus === 'completed') {
      scheduleTaskCompletionExit(task.id);
      showTopToast();
    }

    const nextTasks = tasks.map(t => (t.id === task.id ? { ...t, status: newStatus } : t));
    setTasks(nextTasks);
    if (user?.id) {
      void persistTasksList(user.id, nextTasks);
      void ProductivityService.recalculate(user.id);
    }

    const online = await isOnline();
    if (!online && user?.id) {
      await enqueueSync({
        action: 'update',
        entity: 'task',
        data: {
          id: task.id,
          patch: { status: newStatus, updatedAt: new Date().toISOString() },
        },
        timestamp: Date.now(),
      });
      void setTasks((prev) => {
        persistTasksList(user.id, prev);
        void ProductivityService.recalculate(user.id);
        return prev;
      });
      void invalidateUserStatsCache();
      void syncWidgetData();
      triggerGlobalRefresh();
      return;
    }

    try {
      const { error: toggleError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', task.id);
      if (toggleError) throw toggleError;
      void syncWidgetData();
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
      void setTasks((prev) => {
        if (user?.id) {
          persistTasksList(user.id, prev);
          void ProductivityService.recalculate(user.id);
        }
        return prev;
      });
    } catch (err) {
      console.error('Error toggling status:', err);
      void fetchTasks({ force: true });
    }
  };

  const deleteTask = async (id: string) => {
    // 1. Fully Optimistic
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      if (user?.id) {
        persistTasksList(user.id, next);
        void ProductivityService.recalculate(user.id);
      }
      return next;
    });

    const online = await isOnline();
    if (!online && user?.id) {
      await enqueueSync({
        action: 'delete',
        entity: 'task',
        data: { id },
        timestamp: Date.now(),
      });
      void invalidateUserStatsCache();
      void syncWidgetData();
      triggerGlobalRefresh();
      return;
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      void syncWidgetData();
      void invalidateUserStatsCache();
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
      // Rollback logic (force fetch since we lost the original task inline)
      void fetchTasks({ force: true });
    }
  };

  // Category logic removed in favor of hardcoded glassmorphic UI








  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const doneCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className={`page-shell dashboard-page-layout ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{
      paddingBottom: '120px',
      background: '#000000',
      minHeight: '100vh',
      overflowY: 'auto',
      position: 'relative'
    }}>

      {/* STICKY HEADER — mirrors Goals page exactly */}
      <div style={{
        padding: isWeb ? '16px 16px 16px 16px' : 'calc(env(safe-area-inset-top, 0px) + 24px) 16px 16px 72px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isWeb ? 'center' : 'flex-end',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
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
            PERSONAL TO-DO
          </p>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '900',
            color: '#FFFFFF',
            margin: 0,
            letterSpacing: '-1px',
            lineHeight: 1
          }}>
            Tasks
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
          {isWeb && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-create-task'))}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#00E87A', border: 'none', borderRadius: '12px', padding: '8px 16px', fontSize: '13px', fontWeight: '800', color: '#000', cursor: 'pointer', marginRight: '4px' }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> New Task
            </button>
          )}
          <div style={{
            background: 'rgba(124,77,255,0.1)',
            border: '1px solid rgba(124,77,255,0.4)',
            borderRadius: '10px',
            padding: '4px 10px',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(124,77,255,0.2)'
          }}>
            <p style={{ fontSize: '14px', fontWeight: '900', color: '#7C4DFF', margin: 0, lineHeight: 1 }}>
              {pendingCount} <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: '700' }}>PENDING</span>
            </p>
          </div>
          <div style={{
            background: 'rgba(0,230,118,0.08)',
            border: '1px solid rgba(0,230,118,0.3)',
            borderRadius: '10px',
            padding: '4px 10px',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(0,230,118,0.15)'
          }}>
            <p style={{ fontSize: '14px', fontWeight: '900', color: '#00E676', margin: 0, lineHeight: 1 }}>
              {doneCount} <span style={{ fontSize: '9px', opacity: 0.6, fontWeight: '700' }}>DONE</span>
            </p>
          </div>
        </div>
      </div>


      <div
        className="bouncing-scroll"

        style={{ 
          paddingBottom: '80px',
          marginTop: '4px'
        }}
      >
        <style>{`
          @keyframes float3D {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
          }
          @keyframes spinRing {
            from { transform: rotateX(60deg) rotateY(20deg) rotateZ(0deg); }
            to { transform: rotateX(60deg) rotateY(20deg) rotateZ(360deg); }
          }
          @keyframes spinRingReverse {
            from { transform: rotateX(70deg) rotateY(-20deg) rotateZ(360deg); }
            to { transform: rotateX(70deg) rotateY(-20deg) rotateZ(0deg); }
          }
          @keyframes pulseDiamond {
            0%, 100% { transform: rotate(45deg) scale(1); box-shadow: 0 10px 30px rgba(0, 232, 122, 0.4), inset -5px -5px 15px rgba(0,0,0,0.4), inset 5px 5px 15px rgba(255,255,255,0.4); }
            50% { transform: rotate(45deg) scale(1.05); box-shadow: 0 15px 40px rgba(0, 232, 122, 0.6), inset -5px -5px 15px rgba(0,0,0,0.5), inset 5px 5px 15px rgba(255,255,255,0.5); }
          }
        `}</style>
        {(() => {
          const visibleTasks = tasks.filter(t => t.status === 'pending' || exitingTaskIds.has(t.id));
          if (tasks.length === 0 || visibleTasks.length === 0) {
            const allDone = tasks.length > 0 && tasks.every(t => t.status === 'completed');
            return (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: '40px 32px',
                gap: '32px',
                marginTop: '30px',
                animation: 'fadeIn 0.5s ease-out forwards'
              }}>
                <div style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'float3D 6s ease-in-out infinite'
                }}>
                  {/* Central 3D Diamond */}
                  <div style={{
                    position: 'absolute',
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #00FF88 0%, #008844 100%)',
                    borderRadius: '16px',
                    animation: 'pulseDiamond 4s ease-in-out infinite',
                    zIndex: 2
                  }}/>
                  
                  {/* Outer Orbit 1 */}
                  <div style={{
                    position: 'absolute',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    border: '1.5px solid rgba(0, 232, 122, 0.3)',
                    boxShadow: '0 0 15px rgba(0, 232, 122, 0.1)',
                    animation: 'spinRingReverse 12s linear infinite',
                    zIndex: 1
                  }}/>
                  
                  {/* Outer Orbit 2 */}
                  <div style={{
                    position: 'absolute',
                    width: '85px',
                    height: '85px',
                    borderRadius: '50%',
                    border: '1.5px dashed rgba(255, 255, 255, 0.2)',
                    animation: 'spinRing 8s linear infinite',
                    zIndex: 3
                  }}/>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: '#FFFFFF',
                    margin: '0 0 12px 0',
                    letterSpacing: '-0.5px'
                  }}>
                    {allDone ? "Absolute Focus. 🔥" : "Create your first task"}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.4)',
                    margin: 0,
                    lineHeight: 1.5,
                    maxWidth: '260px'
                  }}>
                    {allDone 
                      ? "You've crushed your entire list today. Enjoy the win or add more." 
                      : "Zero tasks found. Start building momentum by adding one."}
                  </p>
                </div>

                <button
                  onClick={handleAddTaskFabClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(0, 232, 122, 0.1)',
                    border: '1px solid rgba(0, 232, 122, 0.4)',
                    borderRadius: '20px',
                    padding: '16px 32px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(0,232,122,0.15), inset 0 1px 1px rgba(255,255,255,0.05)',
                    transition: 'all 0.3s ease',
                    color: '#00E87A',
                    textTransform: 'uppercase'
                  }}>
                  <span style={{ fontSize: '18px', fontWeight: '300', lineHeight: 1 }}>+</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    letterSpacing: '0.08em'
                  }}>
                    {allDone ? "ADD MORE" : "ADD TASK"}
                  </span>
                </button>
              </div>
            );
          }

          return visibleTasks
            .sort((a, b) => {
                const priorities = { 'High': 3, 'Medium': 2, 'Low': 1 };
                if (priorities[a.priority] !== priorities[b.priority]) {
                    return (priorities[b.priority] || 0) - (priorities[a.priority] || 0);
                }
                return (a.order_index || 0) - (b.order_index || 0);
            })
            .map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onComplete={() => {
                  showTopToast();
                  void toggleTaskStatus(task);
                }}
                onDelete={(id) => deleteTask(id)}
                onEdit={(t) => openModal(t)}
              />
            ));
        })()}
      </div>



      {toast && (
        <div
          role="status"
          className="task-save-toast"
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


      {/* Top pill toast — non-blocking, slides down from notch */}
      <style>{`
        @keyframes topToastIn {
          from { transform: translate(-50%, -120%); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        @keyframes topToastOut {
          from { transform: translate(-50%, 0);    opacity: 1; }
          to   { transform: translate(-50%, -120%); opacity: 0; }
        }
        .top-toast-enter { animation: topToastIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .top-toast-exit  { animation: topToastOut 0.3s ease-in forwards; }
      `}</style>
      {topToastVisible !== null && (
        <div
          role="status"
          className={topToastVisible ? 'top-toast-enter' : 'top-toast-exit'}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 16px) + 12px)',
            left: '50%',
            transform: 'translate(-50%, 0)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px 10px 14px',
            borderRadius: '999px',
            background: 'rgba(26, 26, 26, 0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid #00E87A',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 12px rgba(0,232,122,0.15)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="8" fill="#00E87A" opacity="0.15"/>
            <path d="M4 8.5l2.5 2.5L12 6" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.02em' }}>
            Task secured.
          </span>
        </div>
      )}



      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          {/* Backdrop */}
          <div
            onClick={closeModal}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          />

          {/* Modal */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              background: '#000000',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '32px 32px 0 0',
              border: '1px solid rgba(0,232,122,0.4)',
              borderBottom: 'none',
               paddingBottom: 'max(60px, env(safe-area-inset-bottom, 60px))',
              animation: isExiting 
                ? 'taskModalDown 0.4s cubic-bezier(0.32, 0, 0.67, 0) forwards'
                : 'taskModalUp 0.4s cubic-bezier(0.34,1.56,0.64,1), taskBorderGlow 3s ease-in-out infinite',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}


          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0 0' }}>
              <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }}/>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 20px 20px' }}>
              <div style={{ width: '40px' }}/>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', filter: 'drop-shadow(0 0 8px rgba(0,232,122,0.8))' }}>⚡</span>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px', animation: 'titleGlow 3s ease-in-out infinite' }}>
                  {editTask ? t('edit_task') : 'New Task'}
                </h2>
              </div>
              <div onClick={closeModal} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
                </svg>
              </div>
            </div>

            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#666666', letterSpacing: '0.12em', display: 'block', marginBottom: '8px' }}>TASK NAME</label>
                <div style={{ borderRadius: '16px', background: '#121212', border: `1px solid ${focusedField === 'title' ? 'rgba(0,232,122,0.6)' : 'rgba(255,255,255,0.07)'}`, boxShadow: focusedField === 'title' ? 'inset 4px 4px 10px rgba(0,0,0,0.8), inset -1px -1px 4px rgba(255,255,255,0.02), 0 0 0 1px rgba(0,232,122,0.3), 0 0 16px rgba(0,232,122,0.15)' : 'inset 4px 4px 10px rgba(0,0,0,0.8), inset -1px -1px 4px rgba(255,255,255,0.02)', transition: 'all 0.2s ease' }}>
                  <input type="text" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField('')} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '15px', fontWeight: '600', color: '#FFFFFF', caretColor: '#00E87A', boxSizing: 'border-box' }}/>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#666666', letterSpacing: '0.12em', display: 'block', marginBottom: '8px' }}>DESCRIPTION</label>
                <div style={{ borderRadius: '16px', background: '#121212', border: `1px solid ${focusedField === 'desc' ? 'rgba(0,232,122,0.6)' : 'rgba(255,255,255,0.07)'}`, boxShadow: focusedField === 'desc' ? 'inset 4px 4px 10px rgba(0,0,0,0.8), inset -1px -1px 4px rgba(255,255,255,0.02), 0 0 0 1px rgba(0,232,122,0.3), 0 0 16px rgba(0,232,122,0.15)' : 'inset 4px 4px 10px rgba(0,0,0,0.8), inset -1px -1px 4px rgba(255,255,255,0.02)', transition: 'all 0.2s ease' }}>
                  <textarea placeholder="Add details... (optional)" value={description} onChange={e => { setDescription(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField('')} rows={1} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: '#FFFFFF', caretColor: '#00E87A', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit', overflow: 'hidden', minHeight: '48px', transition: 'height 0.15s ease' }}/>
                </div>
              </div>



              <div>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#666666', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>PRIORITY</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#0A0A0A', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '4px', gap: '4px', boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.6)' }}>
                  {[{ value: 'High', label: 'High', activeColor: '#EF4444', activeBg: 'rgba(239,68,68,0.15)', activeBorder: 'rgba(239,68,68,0.5)', glow: '0 0 12px rgba(239,68,68,0.4)' }, { value: 'Medium', label: 'Medium', activeColor: '#F59E0B', activeBg: 'rgba(245,158,11,0.15)', activeBorder: 'rgba(245,158,11,0.5)', glow: '0 0 12px rgba(245,158,11,0.4)' }, { value: 'Low', label: 'Low', activeColor: '#06B6D4', activeBg: 'rgba(6,182,212,0.15)', activeBorder: 'rgba(6,182,212,0.5)', glow: '0 0 12px rgba(6,182,212,0.4)' }].map((p, i) => {
                    const isActive = priority === p.value;
                    return (
                      <div key={i} onClick={() => setPriority(p.value as any)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 8px', borderRadius: '12px', cursor: 'pointer', background: isActive ? p.activeBg : 'transparent', border: isActive ? `1px solid ${p.activeBorder}` : '1px solid transparent', boxShadow: isActive ? p.glow : 'none', transition: 'all 0.25s ease', animation: isActive ? 'segmentSlide 0.2s ease' : 'none' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isActive ? p.activeColor : 'rgba(255,255,255,0.2)', boxShadow: isActive ? `0 0 8px ${p.activeColor}` : 'none', transition: 'all 0.2s ease', flexShrink: 0 }}/>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: isActive ? p.activeColor : 'rgba(255,255,255,0.3)', transition: 'color 0.2s ease', letterSpacing: '-0.2px' }}>{p.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && <p style={{ fontSize: '13px', color: '#EF4444', margin: 0, textAlign: 'center', fontWeight: '500' }}>{error}</p>}
              <button
                type="button"
                onClick={handleCreateOrUpdate}
                disabled={isLoading || !title.trim()}
                style={{ width: '100%', height: '58px', borderRadius: '20px', border: 'none', cursor: isLoading || !title.trim() ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: '900', color: '#000000', letterSpacing: '0.06em', background: isLoading || !title.trim() ? 'rgba(0,232,122,0.3)' : 'linear-gradient(90deg, #00E87A 0%, #00FF88 30%, #00E87A 60%, #00C563 100%)', backgroundSize: '200% auto', animation: !isLoading && title.trim() ? 'addTaskShimmer 2s linear infinite' : 'none', boxShadow: !isLoading && title.trim() ? '0 0 24px rgba(0,232,122,0.4), 0 4px 16px rgba(0,0,0,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transform: 'translateY(0)', transition: 'transform 0.1s ease, box-shadow 0.1s ease' }}
                onMouseDown={e => { if (!isLoading && title.trim()) { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,232,122,0.3), 0 2px 8px rgba(0,0,0,0.4)'; } }}
                onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {isLoading ? (
                  <>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px solid rgba(0,0,0,0.3)', borderTop: '2.5px solid #000', animation: 'spin 0.8s linear infinite' }}/>
                    Saving...
                  </>
                ) : (
                  <><span>⚡</span><span>{editTask ? 'UPDATE TASK' : 'ADD TASK'}</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {detailTask && (
        <div className="premium-modal-overlay" onClick={() => setDetailTask(null)}>
          <div className="bottom-sheet task-detail-sheet" onClick={e => e.stopPropagation()} style={{ padding: '2rem' }}>


            <div className="sheet-handle"></div>

            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, lineHeight: 1.2 }}>
                  {detailTask.title}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>

                  <span
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      color: detailTask.priority === 'High' ? '#ef4444' : detailTask.priority === 'Medium' ? '#f59e0b' : '#10b981',
                      border: `1px solid ${detailTask.priority === 'High' ? 'rgba(239,68,68,0.2)' : detailTask.priority === 'Medium' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.75rem',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      textTransform: 'uppercase'
                    }}
                  >
                    {detailTask.priority === 'High' ? 'Game Changer' : detailTask.priority === 'Medium' ? 'Important' : 'Later'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setDetailTask(null)} 
                className="notification-btn"
                style={{ background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '50%' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {detailTask.image_url && (
              <div style={{ width: '100%', maxHeight: '240px', borderRadius: '1.25rem', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <img src={detailTask.image_url} alt={detailTask.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            {detailTask.description && (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '1.25rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {detailTask.description}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: 'auto' }}>
              <button
                onClick={() => {
                  const t = detailTask;
                  setDetailTask(null);
                  openModal(t); // Chain triggers Edit form modal
                }}
                className="glow-btn-primary"
                style={{ 
                  height: '3.5rem', 
                  borderRadius: '1.25rem', 
                  background: 'rgba(255,255,255,0.05)', 
                  color: 'var(--text-main)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  gap: '0.5rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Edit</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Delete this task?")) {
                    deleteTask(detailTask.id);
                    setDetailTask(null);
                  }
                }}
                className="glow-btn-primary"
                style={{ 
                  height: '3.5rem', 
                  borderRadius: '1.25rem', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  gap: '0.5rem'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                <span>Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
        @keyframes breathe {
          0%,100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.97);
          }
        }
        @keyframes allClearGlow {
          0%,100% {
            text-shadow:
              0 0 8px rgba(0,232,122,0.4);
          }
          50% {
            text-shadow:
              0 0 20px rgba(0,232,122,0.8),
              0 0 40px rgba(0,232,122,0.3);
          }
        }
        @keyframes checkPop {
          0% { transform: scale(0.8) }
          60% { transform: scale(1.2) }
          100% { transform: scale(1) }
        }
        @keyframes neonPop {
          0% {
            box-shadow:
              0 0 0 0 rgba(0,232,122,0.8);
          }
          100% {
            box-shadow:
              0 0 0 16px rgba(0,232,122,0);
          }
        }
        @keyframes ghostPulse {
          0%, 100% { opacity: 0.4 }
          50% { opacity: 0.7 }
        }
        @keyframes borderFlash {
          0% { opacity: 1; transform: scale(1.02) }
          100% { opacity: 0; transform: scale(1) }
        }
        @keyframes progressShimmer {
          0% { opacity: 0.5; transform: scaleX(0); transform-origin: left }
          50% { opacity: 1; transform: scaleX(1); transform-origin: left }
          51% { opacity: 1; transform: scaleX(1); transform-origin: right }
          100% { opacity: 0.5; transform: scaleX(0); transform-origin: right }
        }
        @keyframes taskModalDown {
          from { transform: translateY(0); opacity: 1 }
          to { transform: translateY(100%); opacity: 0 }
        }
        @keyframes sparkle {
          0%,100% {
            filter:
              drop-shadow(0 0 8px
              rgba(0,232,122,0.6));
            transform: rotate(0deg) scale(1);
          }
          25% {
            filter:
              drop-shadow(0 0 16px
              rgba(0,232,122,1));
            transform: rotate(5deg) scale(1.1);
          }
          75% {
            filter:
              drop-shadow(0 0 12px
              rgba(0,232,122,0.8));
            transform: rotate(-5deg) scale(1.05);
          }
        }
        @keyframes shimmerBtn {
          0% { background-position: -200% }
          100% { background-position: 200% }
        }
        .dashboard-task-summary {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          width: 100%;
          max-width: 720px;
          margin: 0 auto 12px;
          box-sizing: border-box;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .dashboard-task-summary__item {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 2px;
        }
        .dashboard-task-summary__ic {
          font-size: 18px !important;
          font-variation-settings: 'FILL' 0, 'wght' 500;
          line-height: 1;
          margin-bottom: 2px;
        }
        .dashboard-task-summary__val {
          font-family: 'Syne', system-ui, sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
        }
        .dashboard-task-summary__lbl {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 0.02em;
        }
        .dashboard-task-summary__divider {
          width: 1px;
          align-self: stretch;
          min-height: 44px;
          background: rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }
        .dashboard-task-summary__item--add {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 2px;
          background: rgba(0, 232, 122, 0.06);
          border: none;
          border-radius: 10px;
          padding: 8px 4px;
          margin: 0;
          cursor: pointer;
          font: inherit;
          transition: transform 120ms ease, background 120ms ease;
        }
        .dashboard-task-summary__item--add:active {
          transform: scale(0.95);
          background: rgba(0, 232, 122, 0.1);
        }
        .dashboard-task-summary__add-ic {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #00e87a;
          color: #000000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 232, 122, 0.3);
        }
        .dashboard-task-summary__add-ic .material-symbols-outlined {
          font-size: 20px !important;
          font-variation-settings: 'FILL' 0, 'wght' 300;
          line-height: 1;
        }
        .dashboard-task-summary__lbl--add {
          color: #00e87a !important;
          margin-top: 4px;
        }

        @keyframes tasksEmptyFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .task-card-sticky-accent {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          border-radius: 3px 0 0 3px;
          pointer-events: none;
          z-index: 1;
        }
        .task-card-sticky-cat {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 8px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .task-card-sticky--pressing {
          background: rgba(255, 255, 255, 0.07) !important;
        }
        .task-swipe-stack {
          position: relative;
          overflow: hidden;
          border-radius: 16px;
        }
        .task-swipe-reveal-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: linear-gradient(135deg, #00e87a, #00c563);
          border-radius: 0 16px 16px 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          transform-origin: right center;
        }
        .task-swipe-reveal-bg--pulse {
          animation: taskSwipeGreenPulse 0.2s ease;
        }
        .task-swipe-reveal-bg--fade {
          opacity: 0;
        }
        @keyframes taskSwipeGreenPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .task-swipe-complete-label {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          pointer-events: none;
          text-align: center;
        }
        .task-swipe-done-txt {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
        }
        .task-swipe-check-pop {
          animation: taskSwipeCheckPop 0.2s ease;
        }
        @keyframes taskSwipeCheckPop {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.15);
          }
        }
        .task-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Light Mode Overrides for Home Page Cards */
        .light-mode .task-card,
        .light-mode .task-card-sticky {
          background: #f8fafc !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
        }
        .light-mode .task-card:hover {
          background: #ffffff !important;
          border-color: rgba(16, 185, 129, 0.2) !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06) !important;
        }
        .light-mode .task-card-sticky-title {
          color: #0f172a !important;
        }
        .light-mode .task-card-sticky-desc {
          color: rgba(15, 23, 42, 0.45) !important;
        }
        .light-mode .task-card-sticky-cat {
          color: rgba(15, 23, 42, 0.5) !important;
          background: rgba(15, 23, 42, 0.05) !important;
          border-color: rgba(15, 23, 42, 0.1) !important;
        }
        .light-mode .task-card-sticky--pressing {
          background: rgba(15, 23, 42, 0.06) !important;
        }
        .light-mode .priority-column {
          background: rgba(0, 0, 0, 0.02) !important;
          border: 1px solid rgba(0, 0, 0, 0.04) !important;
        }
        .light-mode .priority-column.is-over {
          background: rgba(16, 185, 129, 0.05) !important;
        }
        .light-mode .checkbox-custom {
          border-color: rgba(0, 0, 0, 0.1) !important;
        }
        .light-mode .checkbox-custom.checked {
          background: #10b981 !important;
          border-color: #10b981 !important;
        }
        .light-mode .task-card-title.strike-through {
          color: rgba(0, 0, 0, 0.2) !important;
        }
        .light-mode .task-card-note {
          color: rgba(0, 0, 0, 0.4) !important;
        }

        /* Task Detail Modal Centering for both Desktop & Mobile as per request */
        .task-detail-sheet {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          bottom: auto !important;
          border-radius: 2rem !important;
          max-width: 480px !important;
          width: calc(100% - 2rem) !important;
          animation: sheetZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          padding: 2rem !important;
        }
        .task-detail-sheet .sheet-handle {
          display: none !important;
        }

        .task-card-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
        }

        @media (max-width: 768px) {
          .task-card-title {
            -webkit-line-clamp: 2; /* Ensure 2 lines max on mobile */
          }
        }

        @keyframes taskModalUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes taskBorderGlow {
          0%,100% { box-shadow: 0 0 16px rgba(0,232,122,0.15), 0 -4px 40px rgba(0,0,0,0.8); }
          50% { box-shadow: 0 0 32px rgba(0,232,122,0.25), 0 -4px 40px rgba(0,0,0,0.8); }
        }
        @keyframes titleGlow {
          0%,100% { text-shadow: 0 0 8px rgba(0,232,122,0.3); }
          50% { text-shadow: 0 0 16px rgba(0,232,122,0.6), 0 0 32px rgba(0,232,122,0.2); }
        }
        @keyframes addTaskShimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        @keyframes segmentSlide {
          from { opacity: 0.7 }
          to { opacity: 1 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }

        @keyframes sheetZoomIn {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      <ProGateModal open={gateOpen} resource={gateResource} onClose={closeGate} />
    </div>
  );
};

export default Dashboard;


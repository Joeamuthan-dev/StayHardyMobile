import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import BottomNav from '../components/BottomNav';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired, invalidateUserStatsCache } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { persistTasksList, loadTasksListStale } from '../lib/listCaches';
import { isOnline } from '../lib/networkStatus';
import { enqueueSync, AFTER_SYNC_FLUSH_EVENT } from '../lib/syncQueue';
import { isCompletedTaskToday } from '../lib/supportPopup';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  TouchSensor,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../supabase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt?: string;
  order_index?: number;
  image_url?: string;
}

interface SortableTaskItemProps {
  task: Task;
  onCompleteSwipe: (task: Task) => void;
  onEdit: (task: Task) => void;
}


const getPriorityAccentColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'High':
      return '#A855F7';
    case 'Medium':
      return '#F59E0B';
    case 'Low':
      return 'rgba(255,255,255,0.15)';
    default:
      return '#00E87A';
  }
};

const getCategoryColor = (category: string) => {
  const cat = (category || 'General').toLowerCase();
  const colors: Record<string, { bg: string, text: string, border: string }> = {
    work: { bg: 'rgba(56, 189, 248, 0.08)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.2)' },
    personal: { bg: 'rgba(168, 85, 247, 0.08)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.2)' },
    fitness: { bg: 'rgba(34, 197, 94, 0.08)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.2)' },
    health: { bg: 'rgba(239, 68, 68, 0.08)', text: '#f87171', border: 'rgba(239, 68, 68, 0.2)' },
    shopping: { bg: 'rgba(245, 158, 11, 0.08)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.2)' },
    finance: { bg: 'rgba(234, 179, 8, 0.08)', text: '#facc15', border: 'rgba(234, 179, 8, 0.2)' },
    growth: { bg: 'rgba(16, 185, 129, 0.08)', text: '#34d399', border: 'rgba(16, 185, 129, 0.2)' },
    urgent: { bg: 'rgba(220, 38, 38, 0.1)', text: '#f87171', border: 'rgba(220, 38, 38, 0.3)' },
  };

  if (colors[cat]) return colors[cat];

  // Default color generation based on string hash
  let hash = 0;
  for (let i = 0; i < cat.length; i++) {
    hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return {
    bg: `hsla(${h}, 70%, 50%, 0.08)`,
    text: `hsl(${h}, 70%, 75%)`,
    border: `hsla(${h}, 70%, 50%, 0.2)`
  };
};

const SWIPE_COMPLETE_THRESHOLD = 80;
const TAP_MOVE_MAX = 5;

/** Finger moved left (negative dx). Rubber-band past threshold. */
function rubberBandSwipeLeft(rawDx: number): number {
  if (rawDx >= 0) return 0;
  const t = SWIPE_COMPLETE_THRESHOLD;
  const x = rawDx;
  if (x >= -t) return x;
  return -t + (x + t) * 0.35;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task, onCompleteSwipe, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: dndTransition,
    isDragging,
  } = useSortable({ id: task.id });

  const priorityAccent = getPriorityAccentColor(task.priority);
  const suppressClickRef = useRef(false);

  const [tx, setTx] = useState(0);
  const [txTransition, setTxTransition] = useState<string | undefined>(undefined);
  const [touching, setTouching] = useState(false);
  const [axisLocked, setAxisLocked] = useState<'none' | 'h' | 'v'>('none');
  const axisLockedRef = useRef<'none' | 'h' | 'v'>('none');
  const [thresholdPulse, setThresholdPulse] = useState(false);
  const [checkPulse, setCheckPulse] = useState(false);
  const [greenFade, setGreenFade] = useState(false);
  const [preExitHighlight, setPreExitHighlight] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const swipeActiveRef = useRef(false);
  const frontRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axisLockedRef.current = axisLocked;
  }, [axisLocked]);

  const isPending = task.status === 'pending';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: dndTransition || 'all 0.2s ease',
    zIndex: isDragging ? 20 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };

  const triggerLightHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
    } catch {
      /* ignore */
    }
  };

  const resetSwipeVisual = () => {
    setTxTransition('transform 250ms cubic-bezier(0.34, 1.35, 0.64, 1)');
    setTx(0);
    setThresholdPulse(false);
    setCheckPulse(false);
    setGreenFade(false);
    setPreExitHighlight(false);
    window.setTimeout(() => setTxTransition(undefined), 260);
  };

  const runCompleteExit = () => {
    setTxTransition(undefined);
    setTx(0);
    setThresholdPulse(false);
    setCheckPulse(false);
    setPreExitHighlight(true);
    window.setTimeout(() => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 400;
      setPreExitHighlight(false);
      setTxTransition('transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)');
      setTx(-w * 1.1);
      setGreenFade(true);
      window.setTimeout(() => {
        onCompleteSwipe(task);
        setTx(0);
        setGreenFade(false);
        setTxTransition(undefined);
      }, 300);
    }, 150);
  };

  const onPointerDown = (clientX: number, clientY: number) => {
    if (!isPending || isDragging) return;
    touchRef.current = { x: clientX, y: clientY };
    setAxisLocked('none');
    swipeActiveRef.current = false;
    setTouching(true);
    setTxTransition(undefined);
  };

  const onPointerMove = (clientX: number, clientY: number) => {
    if (!isPending || isDragging || !touchRef.current) return;
    const rawDx = clientX - touchRef.current.x;
    const rawDy = clientY - touchRef.current.y;

    if (axisLockedRef.current === 'none') {
      const ax = Math.abs(rawDx);
      const ay = Math.abs(rawDy);
      if (ax <= TAP_MOVE_MAX && ay <= TAP_MOVE_MAX) return;
      if (ax > 10 || ay > 10) {
        if (ax > ay * 1.2) {
          axisLockedRef.current = 'h';
          setAxisLocked('h');
          swipeActiveRef.current = true;
        } else {
          axisLockedRef.current = 'v';
          setAxisLocked('v');
          touchRef.current = null;
          setTouching(false);
          setTx(0);
          setThresholdPulse(false);
          return;
        }
      } else return;
    }

    if (axisLockedRef.current !== 'h') return;

    if (rawDx >= 0) {
      setTx(0);
      setThresholdPulse(false);
      return;
    }

    const dx = rubberBandSwipeLeft(rawDx);
    setTx(dx);

    if (rawDx <= -SWIPE_COMPLETE_THRESHOLD && !thresholdPulse) {
      setThresholdPulse(true);
      triggerLightHaptic();
      setCheckPulse(true);
      window.setTimeout(() => setCheckPulse(false), 200);
    }
    if (rawDx > -SWIPE_COMPLETE_THRESHOLD) setThresholdPulse(false);
  };

  const onPointerUp = (clientX: number, clientY: number) => {
    if (!touchRef.current) {
      setTouching(false);
      return;
    }
    const rawDx = clientX - touchRef.current.x;
    const rawDy = clientY - touchRef.current.y;
    const locked = axisLockedRef.current;
    touchRef.current = null;
    setTouching(false);
    axisLockedRef.current = 'none';
    setAxisLocked('none');

    if (!isPending || isDragging) return;

    if (swipeActiveRef.current && locked === 'h') {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 380);
    }

    if (locked === 'h' && swipeActiveRef.current && rawDx <= -SWIPE_COMPLETE_THRESHOLD) {
      runCompleteExit();
      return;
    }

    if (!swipeActiveRef.current && Math.abs(rawDx) < TAP_MOVE_MAX && Math.abs(rawDy) < TAP_MOVE_MAX) {
      return;
    }

    resetSwipeVisual();
  };

  const titleDone =
    task.status === 'completed' || preExitHighlight;
  const revealOpacity =
    preExitHighlight || greenFade
      ? 0
      : tx >= 0
        ? 0
        : Math.min(1, Math.abs(tx) / SWIPE_COMPLETE_THRESHOLD);
  const showPressState = touching && axisLocked !== 'h';

  const accentBar = (
    <div
      className="task-card-sticky-accent"
      style={{ background: priorityAccent }}
      aria-hidden
    />
  );

  const rowContent = (
    <div
      className="task-card-sticky-inner"
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <h4
        className={`task-card-sticky-title ${titleDone ? 'strike-through' : ''}`}
        style={{
          margin: 0,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: titleDone ? 'rgba(255,255,255,0.35)' : '#FFFFFF',
          letterSpacing: -0.2,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {task.title}
      </h4>

      {task.description ? (
        <p
          className="task-card-sticky-desc"
          style={{
            margin: 0,
            marginTop: 4,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 12,
            lineHeight: 1.5,
            fontWeight: 300,
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      ) : null}

      {task.image_url ? (
        <div
          style={{
            width: '100%',
            height: '120px',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            marginTop: '0.25rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <img src={task.image_url} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : null}

      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span className="task-card-sticky-cat">
          {(task.category || 'General').toUpperCase()}
        </span>
        <span style={{ flex: 1, minWidth: 0 }} aria-hidden />
      </div>
    </div>
  );

  const frontTransform = `translateX(${tx}px)`;
  const frontMotionTransition = touching
    ? 'none'
    : [txTransition, 'background 150ms ease, border-color 150ms ease, transform 150ms ease'].filter(Boolean).join(', ');

  const stickyCardShellStyle = (isSwipe: boolean): React.CSSProperties => ({
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 16,
    padding: '14px 16px',
    overflow: 'hidden',
    background: preExitHighlight ? 'rgba(0,232,122,0.08)' : '#0F1A13',
    border: preExitHighlight
      ? '1px solid rgba(0,232,122,0.3)'
      : '1px solid rgba(255,255,255,0.08)',
    boxShadow:
      '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
    transform: showPressState && !isSwipe ? 'scale(0.99)' : undefined,
    transition: isSwipe ? 'none' : 'background 150ms ease, border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease',
  });

  const swipeFrontTransform = [frontTransform, showPressState ? 'scale(0.99)' : '']
    .filter(Boolean)
    .join(' ');

  if (!isPending) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        style={{
          ...style,
          ...stickyCardShellStyle(false),
          cursor: 'pointer',
          opacity: isDragging ? 0.7 : 1,
          zIndex: isDragging ? 20 : 'auto',
        }}
        className={`task-card-sticky task-card-modern ${task.status === 'completed' ? 'completed' : ''}`}
        onClick={() => {
          if (suppressClickRef.current) return;
          onEdit(task);
        }}
      >
        {accentBar}
        {rowContent}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        ...style,
        position: 'relative',
        borderRadius: 16,
        width: '100%',
      }}
      className="task-card-modern task-card-swipe-host"
    >
      <div
        className="task-swipe-stack"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 16,
          touchAction: 'pan-y',
        }}
      >
        <div
          className={`task-swipe-reveal-bg ${thresholdPulse ? 'task-swipe-reveal-bg--pulse' : ''} ${greenFade ? 'task-swipe-reveal-bg--fade' : ''}`}
          style={{
            opacity: greenFade ? 0 : revealOpacity,
            transition: greenFade ? 'opacity 200ms ease' : 'none',
          }}
          aria-hidden
        />
        <div
          className="task-swipe-complete-label"
          style={{
            opacity: greenFade ? 0 : revealOpacity,
            transition: greenFade ? 'opacity 200ms ease' : 'none',
          }}
          aria-hidden
        >
          <span
            className={`task-swipe-check-ic ${checkPulse ? 'task-swipe-check-pop' : ''}`}
            style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1 }}
          >
            ✓
          </span>
          <span className="task-swipe-done-txt">Done!</span>
        </div>

        <div
          ref={frontRef}
          {...listeners}
          {...attributes}
          className={`task-swipe-front task-card-sticky ${showPressState ? 'task-card-sticky--pressing' : ''}`}
          style={{
            ...stickyCardShellStyle(true),
            transform: swipeFrontTransform,
            transition: frontMotionTransition,
            zIndex: 2,
            cursor: 'pointer',
            touchAction: 'pan-y',
          }}
          onTouchStart={(e) => {
            if (e.touches.length !== 1) return;
            onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches.length !== 1) return;
            onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={(e) => {
            if (e.changedTouches.length !== 1) return;
            onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          }}
          onTouchCancel={(e) => {
            if (e.changedTouches.length !== 1) return;
            onPointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch') return;
            if (e.button !== 0) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onPointerDown(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'touch') return;
            if (!touchRef.current) return;
            onPointerMove(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === 'touch') return;
            if (!touchRef.current) return;
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            onPointerUp(e.clientX, e.clientY);
          }}
          onPointerCancel={(e) => {
            if (e.pointerType === 'touch') return;
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {
              /* ignore */
            }
            onPointerUp(e.clientX, e.clientY);
          }}
          onClick={() => {
            if (suppressClickRef.current) return;
            onEdit(task);
          }}
        >
          {accentBar}
          {rowContent}
        </div>
      </div>
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onCompleteSwipe: (task: Task) => void;
  onEdit: (task: Task) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, tasks, onCompleteSwipe, onEdit }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const groupDotColor =
    id === 'High' ? '#A855F7' : id === 'Medium' ? '#F59E0B' : 'rgba(255,255,255,0.3)';

  const getCustomTitle = () => {
    if (id === 'High') return 'GAME CHANGER';
    if (id === 'Medium') return 'IMPORTANT';
    return 'LATER';
  };

  return (
    <div
      ref={setNodeRef}
      className={`priority-column ${isOver ? 'is-over' : ''}`}
      style={{
        transition: 'all 0.2s ease',
        background: 'rgba(15,15,15,0.4)',
        border: '1px solid rgba(255,255,255,0.02)',
        borderRadius: '32px',
        padding: '1.5rem',
        height: '100%',
      }}
    >
      <div
        className="priority-column-header-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          marginTop: 16,
        }}
      >
        <div
          className="priority-column-title-pill"
          data-priority={id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: groupDotColor,
              flexShrink: 0,
            }}
          />
          {getCustomTitle()}
        </div>
        <span
          className="priority-column-count-badge"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: '22px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div 
          className="task-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '10px',
            paddingBottom: '2rem'
          }}
        >
          {tasks.map(task => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onCompleteSwipe={onCompleteSwipe}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null); // New details state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Business');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const { t, language } = useLanguage();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    return localStorage.getItem('sidebarHidden') === 'true';
  });
  /** Keep row mounted briefly after complete so checkbox animation can finish. */
  const [exitingTaskIds, setExitingTaskIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [taskCompleteToast, setTaskCompleteToast] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const { user } = useAuth();


  const fetchTasks = useCallback(
    async (options?: { force?: boolean }) => {
      if (!user?.id) return;
      const stale = await loadTasksListStale<Task>(user.id);
      if (stale !== null) setTasks(stale as Task[]);

      const expired =
        options?.force ||
        (await isCacheExpired(CACHE_KEYS.tasks_list, CACHE_EXPIRY_MINUTES.tasks_list));
      if (!expired) return;

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, description, status, category, priority, createdAt, updatedAt, order_index, image_url')
        .eq('userId', user.id)
        .order('order_index', { ascending: true });

      if (fetchError) console.error('Supabase fetch error:', fetchError);
      else if (data) {
        setTasks(data as Task[]);
        void persistTasksList(user.id, data as Task[]);
      }
    },
    [user?.id],
  );

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('name')
      .eq('userId', user.id);

    if (fetchError) {
      console.warn('Categories table might not exist yet:', fetchError.message);
      return;
    }
    if (data) setCustomCategories(data.map(c => c.name));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchTasks();
    fetchCategories();

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

    const categoriesChannel = supabase
      .channel('categories_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `userId=eq.${user.id}`
      }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [user?.id, fetchTasks, fetchCategories]);

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
      setCategory(task.category || 'Business');
      setPriority(task.priority || 'Medium');
      setImageUrl(task.image_url || '');
    } else {
      setEditTask(null);
      setTitle('');
      setDescription('');
      setCategory('Business');
      setPriority('Medium');
      setImageUrl('');
    }
    setImageFile(null);
    setShowModal(true);
  };

  const handleAddTaskFabClick = () => {
    openModal();
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
    setShowModal(false);
    setEditTask(null);
    setTitle('');
    setDescription('');
    setIsAddingCategory(false);
  };

  const showTaskSaveToast = useCallback(() => {
    setToast('Could not save. Try again.');
  }, []);

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const titleTrim = title.trim();
    if (!titleTrim) return;

    const snapshot = {
      title: titleTrim,
      description: description.trim(),
      category,
      priority,
      imageUrl,
      imageFile,
      editTask,
      customCategoriesSnapshot: [...customCategories],
    };

    closeModal();

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
        category: snapshot.category,
        priority: snapshot.priority,
        image_url: previewUrl || undefined,
        updatedAt: new Date().toISOString(),
      };
      setTasks(prev =>
        prev.map(t => (t.id === editId ? { ...t, ...optimisticPatch } : t)),
      );

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

        if (
          snapshot.category &&
          !snapshot.customCategoriesSnapshot.includes(snapshot.category) &&
          !['Personal', 'Content', 'Health', 'Business'].includes(snapshot.category)
        ) {
          await supabase
            .from('categories')
            .insert([{ userId: user.id, name: snapshot.category }])
            .select();
          setCustomCategories(prev =>
            prev.includes(snapshot.category) ? prev : [...prev, snapshot.category],
          );
        }

        const payload = {
          title: snapshot.title,
          description: snapshot.description,
          category: snapshot.category,
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
        setTasks(prev =>
          prev.map(t =>
            t.id === editId ? { ...t, ...payload, image_url: finalImageUrl || undefined } : t,
          ),
        );
        void invalidateUserStatsCache();
        void setTasks((prev) => {
          if (user?.id) void persistTasksList(user.id, prev);
          return prev;
        });
      } catch (err) {
        console.error('Task update failed:', err);
        if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
        const online = await isOnline();
        if (!online && user?.id) {
          const patch = {
            title: snapshot.title,
            description: snapshot.description,
            category: snapshot.category,
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
            void persistTasksList(user.id, prev);
            return prev;
          });
          void invalidateUserStatsCache();
          return;
        }
        await fetchTasks({ force: true });
        showTaskSaveToast();
      }
    };

    const persistInsert = () => {
      const tempId = crypto.randomUUID();
      const blobPreview = snapshot.imageFile
        ? URL.createObjectURL(snapshot.imageFile)
        : '';
      const orderIndex = tasks.length + 1;
      const optimisticTask: Task = {
        id: tempId,
        title: snapshot.title,
        description: snapshot.description,
        category: snapshot.category,
        priority: snapshot.priority,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order_index: orderIndex,
        image_url: blobPreview || snapshot.imageUrl || undefined,
      };
      setTasks(prev => [...prev, optimisticTask]);

      void (async () => {
        try {
          let finalImageUrl = snapshot.imageUrl;
          if (snapshot.imageFile) {
            try {
              finalImageUrl = await uploadImage(snapshot.imageFile);
            } catch (uploadErr) {
              console.error('Task image upload failed:', uploadErr);
              if (blobPreview.startsWith('blob:')) URL.revokeObjectURL(blobPreview);
              setTasks(p => p.filter(t => t.id !== tempId));
              showTaskSaveToast();
              return;
            }
          }

          if (
            snapshot.category &&
            !snapshot.customCategoriesSnapshot.includes(snapshot.category) &&
            !['Personal', 'Content', 'Health', 'Business'].includes(snapshot.category)
          ) {
            await supabase
              .from('categories')
              .insert([{ userId: user.id, name: snapshot.category }])
              .select();
            setCustomCategories(p =>
              p.includes(snapshot.category) ? p : [...p, snapshot.category],
            );
          }

          const newRow = {
            title: snapshot.title,
            description: snapshot.description,
            category: snapshot.category,
            priority: snapshot.priority,
            image_url: finalImageUrl || null,
            userId: user.id,
            status: 'pending' as const,
            order_index: orderIndex,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const { data, error: insertError } = await supabase
            .from('tasks')
            .insert([newRow])
            .select()
            .single();

          if (insertError) throw insertError;
          if (blobPreview.startsWith('blob:')) URL.revokeObjectURL(blobPreview);

          if (data?.id) {
            setTasks(p => {
              const next = p.map(t =>
                t.id === tempId
                  ? {
                      ...t,
                      id: data.id as string,
                      image_url:
                        (data.image_url as string | null) || finalImageUrl || undefined,
                    }
                  : t,
              );
              if (user?.id) void persistTasksList(user.id, next);
              return next;
            });
          }
          void invalidateUserStatsCache();
        } catch (err) {
          console.error('Task insert failed:', err);
          if (blobPreview.startsWith('blob:')) URL.revokeObjectURL(blobPreview);
          const online = await isOnline();
          if (!online && user?.id) {
            await enqueueSync({
              action: 'create',
              entity: 'task',
              data: {
                row: {
                  title: snapshot.title,
                  description: snapshot.description,
                  category: snapshot.category,
                  priority: snapshot.priority,
                  image_url: snapshot.imageUrl || null,
                  userId: user.id,
                  status: 'pending' as const,
                  order_index: orderIndex,
                  createdAt: optimisticTask.createdAt,
                  updatedAt: optimisticTask.updatedAt,
                },
              },
              timestamp: Date.now(),
            });
            void setTasks((prev) => {
              void persistTasksList(user.id, prev);
              return prev;
            });
            void invalidateUserStatsCache();
            return;
          }
          setTasks(p => p.filter(t => t.id !== tempId));
          showTaskSaveToast();
        }
      })();
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
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';

    if (newStatus === 'completed') {
      scheduleTaskCompletionExit(task.id);
    }

    setTasks(prev => prev.map(t => (t.id === task.id ? { ...t, status: newStatus } : t)));

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
        void persistTasksList(user.id, prev);
        return prev;
      });
      void invalidateUserStatsCache();
      void syncWidgetData();
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
      void setTasks((prev) => {
        if (user?.id) void persistTasksList(user.id, prev);
        return prev;
      });
    } catch (err) {
      console.error('Error toggling status:', err);
      void fetchTasks({ force: true });
    }
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));

    const online = await isOnline();
    if (!online && user?.id) {
      await enqueueSync({
        action: 'delete',
        entity: 'task',
        data: { id },
        timestamp: Date.now(),
      });
      void setTasks((prev) => {
        void persistTasksList(user.id, prev);
        return prev;
      });
      void invalidateUserStatsCache();
      void syncWidgetData();
      return;
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      void syncWidgetData();
      void invalidateUserStatsCache();
      void setTasks((prev) => {
        if (user?.id) void persistTasksList(user.id, prev);
        return prev;
      });
    } catch (err) {
      console.error('Error deleting task:', err);
      void fetchTasks({ force: true });
    }
  };

  const toggleSidebar = () => {
    setIsSidebarHidden(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebarHidden', String(newVal));
      return newVal;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Determine if we dropped on a container or another item
    let newPriority: 'High' | 'Medium' | 'Low' | null = null;

    if (['High', 'Medium', 'Low'].includes(overId)) {
      newPriority = overId as any;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newPriority = overTask.priority;
      }
    }

    if (overId === 'Done' || newPriority && newPriority !== activeTask.priority) {
      const isDoneDrop = overId === 'Done';

      if (isDoneDrop) {
        scheduleTaskCompletionExit(activeId);
      }

      // Optimistic update
      setTasks(prev => prev.map(t => t.id === activeId ? { 
        ...t, 
        priority: isDoneDrop ? t.priority : newPriority!,
        status: isDoneDrop ? 'completed' : 'pending' as any
      } : t));

      const updates: Record<string, unknown> = {};
      if (isDoneDrop) updates.status = 'completed';
      else updates.priority = newPriority;

      try {
        const { error: updateError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', activeId);
        if (updateError) throw updateError;
        void syncWidgetData();
        void invalidateUserStatsCache();
        void setTasks((prev) => {
          if (user?.id) void persistTasksList(user.id, prev);
          return prev;
        });
      } catch (err) {
        console.error('Task update error:', err);
        const online = await isOnline();
        if (!online && user?.id) {
          await enqueueSync({
            action: 'update',
            entity: 'task',
            data: { id: activeId, patch: updates },
            timestamp: Date.now(),
          });
          void setTasks((prev) => {
            void persistTasksList(user.id, prev);
            return prev;
          });
          void invalidateUserStatsCache();
          return;
        }
        void fetchTasks({ force: true });
      }
    } else if (activeId !== overId) {
      // Sorting within the same container
      const oldIndex = tasks.findIndex((t) => t.id === activeId);
      const newIndex = tasks.findIndex((t) => t.id === overId);
      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);

      try {
        const updates = newTasks.map((t, idx) => ({
          id: t.id,
          order_index: idx + 1
        }));
        const { error: reorderError } = await supabase.from('tasks').upsert(updates);
        if (reorderError) throw reorderError;
      } catch (err) {
        console.error('Supabase reorder error:', err);
        void fetchTasks({ force: true });
      }
    }
  };

  /* getTimeGreeting Deleted */

  const defaultCategories = ['Personal', 'Content', 'Health', 'Business'];
  const categories = Array.from(new Set([...defaultCategories, ...customCategories, ...tasks.map(t => t.category)]));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 12,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 8,
      },
    })
  );

  const taskSummaryCounts = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const later = tasks.filter((t) => t.status === 'pending' && t.priority === 'Low').length;
    const doneToday = tasks.filter(
      (t) => t.status === 'completed' && isCompletedTaskToday(t.updatedAt),
    ).length;
    return { pending, later, doneToday };
  }, [tasks]);

  return (
    <div className={`page-shell dashboard-layout ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="stats-premium-header">
        <div className="stats-header-center">
          <h1 className="stats-display-title">{(language === 'Tamil' ? t('home') : t('home').toUpperCase())}</h1>
          <div className="stats-marquee-wrap">
            <div className="stats-marquee-line" />
            <div className="stats-marquee-track" aria-hidden>
              <div className="stats-marquee-inner">
                <span>CAPTURE · PRIORITIZE · EXECUTE · CONQUER · CAPTURE · PRIORITIZE · EXECUTE · CONQUER · </span>
                <span>CAPTURE · PRIORITIZE · EXECUTE · CONQUER · CAPTURE · PRIORITIZE · EXECUTE · CONQUER · </span>
              </div>
            </div>
            <div className="stats-marquee-line" />
          </div>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="stats-header-sidebar-btn notification-btn desktop-only-btn"
          title={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar (Focus Mode)'}
          data-tooltip={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
          aria-label="Toggle sidebar"
          style={
            isSidebarHidden
              ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }
              : undefined
          }
        >
          <span className="material-symbols-outlined">{isSidebarHidden ? 'side_navigation' : 'fullscreen'}</span>
        </button>
      </header>

      <div className="dashboard-task-summary" aria-label="Task summary">
        <div className="dashboard-task-summary__item">
          <span className="material-symbols-outlined dashboard-task-summary__ic" style={{ color: 'rgba(245, 158, 11, 0.8)' }}>
            schedule
          </span>
          <span className="dashboard-task-summary__val">{taskSummaryCounts.pending}</span>
          <span className="dashboard-task-summary__lbl">Pending</span>
        </div>
        <div className="dashboard-task-summary__divider" aria-hidden />
        <div className="dashboard-task-summary__item">
          <span className="material-symbols-outlined dashboard-task-summary__ic" style={{ color: 'rgba(59, 130, 246, 0.8)' }}>
            bolt
          </span>
          <span className="dashboard-task-summary__val">{taskSummaryCounts.later}</span>
          <span className="dashboard-task-summary__lbl">Later</span>
        </div>
        <div className="dashboard-task-summary__divider" aria-hidden />
        <div className="dashboard-task-summary__item">
          <span className="material-symbols-outlined dashboard-task-summary__ic" style={{ color: '#00E87A' }}>
            check_circle
          </span>
          <span className="dashboard-task-summary__val">{taskSummaryCounts.doneToday}</span>
          <span className="dashboard-task-summary__lbl">Done Today</span>
        </div>
        <div className="dashboard-task-summary__divider" aria-hidden />
        <button
          type="button"
          className="dashboard-task-summary__item dashboard-task-summary__item--add"
          onClick={handleAddTaskFabClick}
          title={t('new_task')}
          aria-label={t('new_task')}
        >
          <span className="dashboard-task-summary__add-ic" aria-hidden>
            <span className="material-symbols-outlined">add</span>
          </span>
          <span className="dashboard-task-summary__lbl dashboard-task-summary__lbl--add">New Task</span>
        </button>
      </div>

      <div className="priority-board" style={{
        flex: 1,
        paddingBottom: '2rem',
        alignItems: 'flex-start'
      }}>
        {tasks.some((t) => t.status === 'pending') ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="priority-grid-container" style={{ width: '100%', gap: '1.25rem' }}>
              {(['High', 'Medium', 'Low'] as const).map((prio) => {
                const filteredTasks = tasks.filter(
                  (t) =>
                    t.priority === prio &&
                    (t.status === 'pending' || exitingTaskIds.has(t.id)),
                );

                if (filteredTasks.length === 0) return null;

                return (
                  <div key={prio} className="priority-column-wrapper" data-priority={prio}>
                    <DroppableColumn
                      id={prio}
                      title={prio === 'High' ? 'Game Changer' : prio === 'Medium' ? 'Important' : 'Later'}
                      tasks={filteredTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))}
                      onCompleteSwipe={(t) => {
                        setTaskCompleteToast('✓ Task completed!');
                        void toggleTaskStatus(t);
                      }}
                      onEdit={(task) => setDetailTask(task)}
                    />
                  </div>
                );
              })}
            </div>
          </DndContext>
        ) : (
          <div
            className="tasks-board-empty-all"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              animation: 'tasksEmptyFadeIn 0.45s ease forwards',
            }}
          >
            <span style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }} aria-hidden>
              ✅
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 17,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              All caught up! 🎉
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Create a new task to keep going.
            </p>
          </div>
        )}
      </div>

      <BottomNav
        isHidden={isSidebarHidden}
        hideFloatingShelf={showModal || !!detailTask}
        hideMobileNavChrome={showModal || !!detailTask}
      />

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

      {taskCompleteToast && (
        <div
          role="status"
          className="task-complete-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
            transform: 'translateX(-50%)',
            zIndex: 1101,
            padding: '0.55rem 1.15rem',
            borderRadius: '999px',
            background: 'rgba(0, 232, 122, 0.15)',
            border: '1px solid rgba(0, 232, 122, 0.3)',
            color: '#00E87A',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            maxWidth: 'min(90vw, 320px)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {taskCompleteToast}
        </div>
      )}

      {showModal && (
        <div className="premium-modal-overlay task-create-overlay" onClick={closeModal}>
          <div className="bottom-sheet task-create-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{editTask ? t('edit_task') : t('new_task')}</h2>
              <button type="button" onClick={closeModal} className="notification-btn" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="task-create-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="input-group">
                <label className="task-create-label">{t('task_name')}</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined task-create-input-icon">edit_note</span>
                  <input className="form-input task-create-input" value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="Task name..." />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="task-create-label" style={{ margin: 0 }}>{t('description')}</label>
                  <button 
                    type="button"
                    onClick={() => document.getElementById('task-image-upload')?.click()}
                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_photo_alternate</span>
                    <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>{t('add')} Image</span>
                  </button>
                  <input
                    id="task-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                </div>
                <textarea
                  className="form-input editor-textarea task-create-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Details..."
                />
                
                {(imageFile || imageUrl) && (
                  <div style={{ marginTop: '0.75rem', width: '60px', height: '60px', borderRadius: '0.75rem', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : imageUrl}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt="Task"
                    />
                    <button 
                      type="button"
                      onClick={() => { setImageFile(null); setImageUrl(''); }}
                      style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', color: 'white', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="input-group">
                <label className="task-create-label" style={{ marginBottom: '8px', display: 'block' }}>{t('categories')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {categories.map(cat => {
                    const isActive = category === cat;
                    const catColors: any = {
                      Personal: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24' },
                      Content: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa' },
                      Health: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171' },
                      Business: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981' }
                    };
                    const colors = catColors[cat] || { bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.3)', text: '#94a3b8' };

                    return (
                      <button 
                        key={cat} 
                        type="button" 
                        onClick={() => { setCategory(cat); setIsAddingCategory(false); }} 
                        style={{ 
                          padding: '0.6rem 1.25rem', 
                          fontSize: '0.75rem', 
                          fontWeight: 900, 
                          borderRadius: '1rem',
                          border: '2px solid',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          background: isActive ? colors.bg : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? colors.text : 'transparent',
                          color: isActive ? colors.text : '#64748b',
                          opacity: isActive ? 1 : 0.6,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          cursor: 'pointer'
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  {!isAddingCategory ? (
                    <button type="button" onClick={() => setIsAddingCategory(true)} className="tag-btn" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 900, padding: '0.6rem 1.25rem', borderRadius: '1rem', fontSize: '0.75rem', border: 'none', cursor: 'pointer' }}>+ {t('add')}</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                      <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Category..." style={{ background: 'var(--card-bg)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '1rem', padding: '0.75rem 1.25rem', color: 'var(--text-main)', flex: 1, fontWeight: 'bold' }} autoFocus />
                      <button type="button" onClick={() => { if (newCategoryName.trim()) { setCustomCategories(prev => [...prev, newCategoryName.trim()]); setCategory(newCategoryName.trim()); setNewCategoryName(''); setIsAddingCategory(false); } }} className="tag-btn active" style={{ padding: '0.75rem 1.5rem', borderRadius: '1rem', background: '#10b981', color: '#064e3b', fontWeight: 900 }}>{t('add')}</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="input-group">
                <label className="task-create-label" style={{ marginBottom: '8px', display: 'block' }}>{t('priority')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {(['High', 'Medium', 'Low'] as const).map(value => {
                    const isActive = priority === value;
                    const prioColors: any = {
                      High: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
                      Medium: { text: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)' },
                      Low: { text: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
                    };
                    const colors = prioColors[value];
                    
                    return (
                      <button
                        key={value} 
                        type="button" 
                        onClick={() => setPriority(value)}
                        style={{
                          padding: '0.85rem 0.5rem', 
                          borderRadius: '1.25rem', 
                          fontWeight: 900, 
                          fontSize: '0.65rem', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.1em', 
                          border: '2px solid',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: isActive ? colors.bg : 'rgba(255,255,255,0.02)',
                          borderColor: isActive ? colors.text : 'transparent',
                          color: isActive ? colors.text : '#64748b', 
                          cursor: 'pointer', 
                          opacity: isActive ? 1 : 0.5
                        }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ paddingTop: '8px' }}>
                <button 
                  type="submit" 
                  className="glow-btn-primary task-create-submit" 
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{editTask ? 'save' : 'add_task'}</span>
                  <span>{editTask ? t('update_milestone') : t('save_task')}</span>
                </button>
              </div>
            </form>
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
                      background: getCategoryColor(detailTask.category).bg,
                      color: getCategoryColor(detailTask.category).text,
                      border: `1px solid ${getCategoryColor(detailTask.category).border}`,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '0.75rem',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      textTransform: 'uppercase'
                    }}
                  >
                    {detailTask.category || 'General'}
                  </span>
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
                <span className="material-symbols-outlined">close</span>
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
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
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
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                <span>Delete</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`
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

        @keyframes sheetZoomIn {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;


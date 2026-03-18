import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import BottomNav from '../components/BottomNav';
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
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
}


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

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task, onToggle, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const priorityColor = task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'all 0.2s ease',
    zIndex: isDragging ? 20 : 'auto',
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        cursor: 'pointer',
        padding: '1.25rem',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(20,20,20,0.95), rgba(10,10,10,0.95))',
        border: '1px solid rgba(255,255,255,0.03)',
        boxShadow: `inset 4px 0 0 0 ${priorityColor}, 0 8px 20px rgba(0,0,0,0.4)`
      }}
      {...attributes}
      {...listeners}
      className={`task-card-modern ${task.status === 'completed' ? 'completed' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.checkbox-custom')) return;
        onEdit(task);
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
          e.currentTarget.style.boxShadow = `inset 4px 0 0 0 ${priorityColor}, 0 12px 25px rgba(0,0,0,0.5), -4px 0 15px ${priorityColor}33`; // Add subtle glow
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = `inset 4px 0 0 0 ${priorityColor}, 0 8px 20px rgba(0,0,0,0.4)`;
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', minWidth: 0 }}>
        <div
          className={`checkbox-custom ${task.status === 'completed' ? 'checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(task); }}
          style={{ 
            marginTop: '0.1rem',
            width: '22px', 
            height: '22px', 
            borderRadius: '50%', 
            border: task.status === 'completed' ? 'none' : '2px solid rgba(255,255,255,0.15)',
            background: task.status === 'completed' ? '#10b981' : 'rgba(255,255,255,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
        >
          {task.status === 'completed' && <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: 'white', fontWeight: 900 }}>check</span>}
        </div>
        
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <h4 
            className={`${task.status === 'completed' ? 'strike-through' : ''}`} 
            style={{ 
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 800,
              color: task.status === 'completed' ? 'rgba(255,255,255,0.3)' : '#ffffff',
              letterSpacing: '0.02em',
              lineHeight: 1.3
            }}
          >
            {task.title}
          </h4>
          
          {task.description && (
            <p style={{ 
              margin: 0, 
              color: 'rgba(255,255,255,0.4)', 
              fontSize: '0.75rem',
              lineHeight: 1.5,
              fontWeight: 600,
              textTransform: 'uppercase', 
              letterSpacing: '0.04em'
            }}>
              {task.description}
            </p>
          )}

          {task.image_url && (
            <div style={{ width: '100%', height: '120px', borderRadius: '0.75rem', overflow: 'hidden', marginTop: '0.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <img src={task.image_url} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ marginTop: '0.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.6rem',
                borderRadius: '8px',
                fontSize: '0.6rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                background: getCategoryColor(task.category).bg,
                color: getCategoryColor(task.category).text,
                border: `1px solid ${getCategoryColor(task.category).border}`,
                boxShadow: `0 2px 8px ${getCategoryColor(task.category).bg}`
              }}
            >
              {task.category || 'General'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, tasks, onToggle, onEdit }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  const getColumnIcon = () => {
    if (id === 'High') return <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1rem', marginRight: '6px' }}>!</span>;
    if (id === 'Medium') return <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: '1rem', marginRight: '6px', verticalAlign: 'middle', fontWeight: 700 }}>bar_chart</span>;
    return <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1rem', marginRight: '6px', verticalAlign: 'middle', fontWeight: 700 }}>done_all</span>;
  }

  const getCustomTitle = () => {
    if (id === 'High') return 'GAME CHANGER';
    if (id === 'Medium') return 'IMPORTANT';
    return 'LATER';
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ 
          color: '#ffffff', 
          fontSize: '0.8rem', 
          fontWeight: 900, 
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          textTransform: 'uppercase'
        }}>
          {getColumnIcon()}
          {getCustomTitle()}
        </div>
        <span 
          style={{
            background: id === 'High' ? 'rgba(239, 68, 68, 0.15)' : id === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: id === 'High' ? '#ef4444' : id === 'Medium' ? '#f59e0b' : '#10b981',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 900,
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
            gap: '1.25rem',
            paddingBottom: '2rem'
          }}
        >
          {tasks.map(task => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const EmptyDashboard: React.FC<{ onAdd: () => void, type: 'welcome' | 'completed' }> = ({ onAdd, type }) => {
  const isCompleted = type === 'completed';
  
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', minHeight: '60vh' }}>
      <div style={{ position: 'relative', marginBottom: '2.5rem' }}>
        <div className="float-animation" style={{ width: '120px', height: '120px', borderRadius: '40px', background: isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'}` }}>
          <span className="material-symbols-outlined" style={{ fontSize: '4.5rem', color: isCompleted ? '#10b981' : '#3b82f6', opacity: 0.8 }}>
            {isCompleted ? 'task_alt' : 'rocket_launch'}
          </span>
        </div>
      </div>
      <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '400px', margin: '0 0 1.5rem 0', fontWeight: 600 }}>
        {isCompleted 
          ? "All tasks completed. Great job. You cleared your focus list. Stay hungry. Stay hardy." 
          : "Welcome to Stay Hardy and your productive journey. Track your tasks and build consistency."}
      </p>
      <button
        onClick={onAdd}
        className="minimal-circle-btn"
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.02)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>add</span>
      </button>
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
  const { t } = useLanguage();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => {
    return localStorage.getItem('sidebarHidden') === 'true';
  });
  const [quote, setQuote] = useState('');
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const { user } = useAuth();


  const getDynamicQuote = useCallback((currentTasks: Task[]) => {
    const totalTasks = currentTasks.length;
    
    if (totalTasks === 0) {
      return "Start by creating your first task 🚀";
    }

    const completedTasks = currentTasks.filter(t => t.status === 'completed').length;
    const score = Math.floor((completedTasks / totalTasks) * 100);

    if (score <= 20) {
      const items = [
        "Wow… creating tasks is your hobby, not completing them?",
        "At this rate, even procrastination is disappointed.",
        "Zero percent? That's not a score, that's a cry for help.",
        "Your to-do list is starting to look like a history book."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 40) {
      const items = [
        "Good start… but are we stopping here?",
        "You’re halfway to being serious. Keep going.",
        "A slow start is still a start, but let's pick up the pace.",
        "Don't stop now, you're just starting to be useful."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 60) {
      const items = [
        "Not bad. But you can definitely do better.",
        "Consistency is missing. Fix that.",
        "Aggressively average. Let's aim higher.",
        "You're doing 'just enough' to not feel guilty. I see you."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 80) {
      const items = [
        "Now this looks promising. Keep the momentum.",
        "Discipline is kicking in. Don’t slow down.",
        "Solid work. You're outperforming 80% of the population right now.",
        "The momentum is real. Ride the wave."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    const items = [
      "Excellent. This is what focus looks like. 🔥",
      "You’re doing what most people avoid. Respect. 👑",
      "Absolute beast mode. Almost perfect.",
      "Clean sweep! Are you even human or just a well-coded bot?"
    ];
    return items[Math.floor(Math.random() * items.length)];
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('userId', user.id)
      .order('order_index', { ascending: true });

    if (fetchError) console.error('Supabase fetch error:', fetchError);
    else if (data) setTasks(data as Task[]);
  }, [user?.id]);

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
        fetchTasks();
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
    setQuote(getDynamicQuote(tasks));
  }, [tasks, getDynamicQuote]);

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

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
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
    } catch (err: any) {
      console.error('Supabase Storage Error:', err);
      throw new Error(err.message || 'Storage connection failed');
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTask(null);
    setTitle('');
    setDescription('');
    setIsAddingCategory(false);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    let currentImageUrl = imageUrl;
    
    if (imageFile) {
      try {
        currentImageUrl = await uploadImage(imageFile);
      } catch (err: any) {
        setError(`Image upload failed: ${err.message}. Please ensure the 'task-images' bucket exists and is public in Supabase.`);
        return;
      }
    }

    const taskData = {
      title,
      description,
      category,
      priority,
      image_url: currentImageUrl,
      updatedAt: new Date().toISOString()
    };

    try {
      // Ensure category is persisted
      if (category && !customCategories.includes(category) && !['Personal', 'Content', 'Health', 'Business'].includes(category)) {
        await supabase
          .from('categories')
          .insert([{ userId: user.id, name: category }])
          .select();
        // Optimistic update of local categories
        setCustomCategories(prev => [...prev, category]);
      }

      if (editTask) {
        setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...taskData } : t));
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editTask.id);
        if (updateError) throw updateError;
      } else {
        const newTask = {
          ...taskData,
          userId: user.id,
          status: 'pending',
          order_index: tasks.length + 1,
          createdAt: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('tasks')
          .insert([newTask]);

        if (insertError) throw insertError;
      }
      closeModal();
    } catch (err: any) {
      console.error('Error in handleCreateOrUpdate:', err);
      setError(err.message || 'Failed to save task to cloud.');
      fetchTasks();
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      const { error: toggleError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
        .eq('id', task.id);
      if (toggleError) throw toggleError;
    } catch (err) {
      console.error('Error toggling status:', err);
      fetchTasks(); // Rollback/Refresh on error
    }
  };

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
      fetchTasks();
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
      
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === activeId ? { 
        ...t, 
        priority: isDoneDrop ? t.priority : newPriority!,
        status: isDoneDrop ? 'completed' : 'pending' as any
      } : t));

      try {
        const updates: any = {};
        if (isDoneDrop) updates.status = 'completed';
        else updates.priority = newPriority;

        const { error: updateError } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', activeId);
        if (updateError) throw updateError;
      } catch (err) {
        console.error('Task update error:', err);
        fetchTasks();
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
        fetchTasks();
      }
    }
  };

  /* getTimeGreeting Deleted */

  const defaultCategories = ['Personal', 'Content', 'Health', 'Business'];
  const categories = Array.from(new Set([...defaultCategories, ...customCategories, ...tasks.map(t => t.category)]));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  return (
    <div className={`page-shell dashboard-layout ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{t('home')}</h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', marginTop: '0.25rem', textTransform: 'uppercase' }}>
            {quote}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {tasks.filter(t => t.status === 'pending').length > 0 && (
            <button
              onClick={() => openModal()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#10b981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>add</span>
            </button>
          )}
          <button
            onClick={toggleSidebar}
            className="notification-btn desktop-only-btn"
            title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar (Focus Mode)"}
            data-tooltip={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
            style={{
              ...(isSidebarHidden ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' } : {}),
              opacity: 0.5
            }}
          >
            <span className="material-symbols-outlined">
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>

          
        </div>
      </header>

      {error && (
        <div className="glass-card" style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '12px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="priority-board" style={{
        flex: 1,
        paddingBottom: '2rem',
        alignItems: 'flex-start'
      }}>
        {tasks.length === 0 ? (
          <div style={{ width: '100%' }}><EmptyDashboard onAdd={() => openModal()} type="welcome" /></div>
        ) : tasks.filter(t => t.status === 'pending').length === 0 ? (
          <div style={{ width: '100%' }}><EmptyDashboard onAdd={() => openModal()} type="completed" /></div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="priority-grid-container" style={{ width: '100%', gap: '1.25rem' }}>
              {(['High', 'Medium', 'Low'] as const).map(prio => {
                const filteredTasks = tasks.filter(t => t.priority === prio && t.status === 'pending');
                
                if (filteredTasks.length === 0) return null;

                return (
                  <div key={prio} className="priority-column-wrapper" data-priority={prio}>
                    <DroppableColumn
                      id={prio}
                      title={prio === 'High' ? 'Game Changer' : prio === 'Medium' ? 'Important' : 'Later'}
                      tasks={filteredTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))}
                      onToggle={toggleTaskStatus}
                      onEdit={(task) => setDetailTask(task)}
                    />
                  </div>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>

      <BottomNav isHidden={isSidebarHidden} />

      {showModal && (
        <div className="premium-modal-overlay" onClick={closeModal}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>{editTask ? t('edit_task') : t('new_task')}</h2>
              <button onClick={closeModal} className="notification-btn"><span className="material-symbols-outlined">close</span></button>
            </div>

            <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="input-group">
                <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>{t('task_name')}</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '20px' }}>edit_note</span>
                  <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required autoFocus placeholder="Task name..." style={{ background: 'var(--card-bg)', border: 'none', padding: '1rem 1rem 1rem 3rem', fontSize: '1.1rem', borderRadius: '1rem', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box', fontWeight: 'bold' }} />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', margin: 0 }}>{t('description')}</label>
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
                  className="form-input editor-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Details..."
                  style={{ background: 'var(--card-bg)', border: 'none', minHeight: '120px', padding: '1rem', fontSize: '0.9rem', borderRadius: '1rem', resize: 'none', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }}
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
                <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.75rem', display: 'block' }}>{t('categories')}</label>
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
                <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.75rem', display: 'block' }}>{t('priority')}</label>
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

              <div style={{ paddingTop: '1rem' }}>
                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="glow-btn-primary" 
                  style={{ 
                    width: '100%', 
                    height: '4rem', 
                    borderRadius: '1.25rem', 
                    fontSize: '0.9rem', 
                    fontWeight: 900, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.1em', 
                    gap: '0.75rem',
                    opacity: isUploading ? 0.7 : 1
                  }}
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined rotating" style={{ fontSize: '24px' }}>sync</span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{editTask ? 'save' : 'add_task'}</span>
                      <span>{editTask ? t('update_milestone') : t('save_task')}</span>
                    </>
                  )}
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
        .task-card {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Light Mode Overrides for Home Page Cards */
        .light-mode .task-card {
          background: #ffffff !important;
          border: 1px solid rgba(0, 0, 0, 0.08) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03) !important;
        }
        .light-mode .task-card:hover {
          background: #ffffff !important;
          border-color: rgba(16, 185, 129, 0.2) !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06) !important;
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


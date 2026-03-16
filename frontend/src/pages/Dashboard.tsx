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
  onDelete: (id: string) => void;
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

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({ task, onToggle, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeft: `4px solid ${task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981'}`,
        // We'll use a CSS class for background to allow theme overrides
      }}
      {...attributes}
      {...listeners}
      className={`glass-card task-card group ${task.status === 'completed' ? 'completed' : ''}`}
    >
      <div className="task-card-header" style={{ marginBottom: '0.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <div
            className={`checkbox-custom ${task.status === 'completed' ? 'checked' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(task); }}
          >
            {task.status === 'completed' && <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'white' }}>check</span>}
          </div>
          <h4 
            className={`task-card-title ${task.status === 'completed' ? 'strike-through' : ''}`} 
            style={{ 
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1
            }}
          >
            {task.title}
          </h4>
        </div>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
          </button>
          <button
            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
          </button>
        </div>
      </div>

      <div style={{ cursor: 'pointer', marginBottom: '0.5rem' }} onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
        {task.image_url && (
          <div style={{ width: '100%', height: '120px', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <img src={task.image_url} alt={task.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        {task.description && (
          <p className="task-card-note" style={{ margin: 0, color: 'var(--text-secondary)' }}>{task.description}</p>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <span
          className="task-card-category"
          style={{
            background: getCategoryColor(task.category).bg,
            color: getCategoryColor(task.category).text,
            borderColor: getCategoryColor(task.category).border
          }}
        >
          {task.category || 'General'}
        </span>
      </div>
    </div>
  );
};

interface DroppableColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onToggle: (task: Task) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, title, tasks, onToggle, onDelete, onEdit }) => {

  const { setNodeRef, isOver } = useDroppable({ id });


  return (
    <div
      ref={setNodeRef}
      className={`priority-column ${isOver ? 'is-over' : ''}`}
      style={{
        transition: 'all 0.2s ease',
      }}
    >
      <div className="priority-column-header">
        <div className="priority-column-title" style={{ color: 'var(--text-main)' }}>
          <span className="material-symbols-outlined" style={{
            fontSize: '1rem',
            color: id === 'High' ? '#ef4444' : id === 'Medium' ? '#fbbf24' : '#10b981'
          }}>
            {id === 'High' ? 'priority_high' : id === 'Medium' ? 'equalizer' : 'low_priority'}
          </span>
          {title}
        </div>
        <span className="column-count">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div 
          className="task-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr', 
            gap: '1rem' 
          }}
        >
          {tasks.map(task => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onDelete={onDelete}
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
    const today = new Date().setHours(0, 0, 0, 0);
    const todayCreatedTasks = currentTasks.filter(t => new Date(t.createdAt).setHours(0, 0, 0, 0) === today);
    const todayCompletedTasks = currentTasks.filter(t =>
      t.status === 'completed' &&
      t.updatedAt &&
      new Date(t.updatedAt).setHours(0, 0, 0, 0) === today
    );

    const score = todayCreatedTasks.length > 0
      ? Math.floor((todayCompletedTasks.length / todayCreatedTasks.length) * 100)
      : 0;

    if (todayCreatedTasks.length === 0) {
      return "Your to-do list is basically a cemetery at this point.";
    }

    if (score === 0) {
      const items = [
        "Is 'doing nothing' on your list? Because you're crushing it.",
        "I’ve seen statues with more productivity than you today.",
        "Your potential is currently in a deep coma. Time to wake it up.",
        "Zero percent? That's not a score, that's a cry for help.",
        "Your to-do list is starting to look like a history book.",
        "If laziness was an Olympic sport, you’d have the gold already.",
        "The only thing you've finished today is the oxygen in the room.",
        "Dreaming about success is great. Waking up and working for it is better.",
        "A journey of a thousand miles begins with... actually getting off the couch.",
        "Zero tasks done. Is your productivity on a sabbatical?"
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 20) {
      const items = [
        "Oh, look! You did something. Should I call a parade?",
        "One task down? Don't strain yourself, hero.",
        "You're moving with all the urgency of a tectonic plate.",
        "20%? My grandma moves faster while napping. Pathetic effort.",
        "A slow start is still a start, but let's pick up the pace.",
        "You've barely scratched the surface. Keep digging.",
        "The bar was on the floor, and you just barely stepped over it.",
        "Is this your 'grind mode'? Because it looks like 'idle mode'.",
        "Progress is progress, but this is dangerously close to zero.",
        "Moving like a snail on a salt flat. Pick it up!"
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 40) {
      const items = [
        "You're technically working. It’s barely visible, but it's there.",
        "Slow and steady wins the race, but you're not even in the race yet.",
        "Better than zero, I guess. Barely.",
        "Waking up? You're still half-asleep based on this progress.",
        "You're at the bottom of the mountain looking up. Start climbing.",
        "Don't stop now, you're just starting to be useful.",
        "Actually moving now. Let's see if it lasts more than five minutes.",
        "The engine is sputtering. Give it some gas.",
        "You're in the 'Participation Trophy' zone right now.",
        "Low battery energy detected. Plug into your goals."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 60) {
      const items = [
        "Aggressively average. You’re the human version of a lukewarm cup of water.",
        "Halfway there. Or halfway to giving up. We’ll see.",
        "You're doing 'just enough' to not feel guilty. I see you.",
        "Average performance. You're the human equivalent of unflavored oatmeal.",
        "The middle of the road is where the accidents happen. Pick a side.",
        "You're neither failing nor succeeding. You're just... existing.",
        "Balanced, as all things should be. But also kind of boring.",
        "Not bad, but 'not bad' doesn't build empires.",
        "You're the vanilla ice cream of productivity. Nice, but forgettable.",
        "Operating at 50% capacity. Your goals deserve 100%."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score <= 80) {
      const items = [
        "Actually getting things done? Who are you and what have you done with the owner?",
        "Don't get cocky. You still have plenty of time to fail.",
        "Impressive. For you. Which isn't saying much, but still.",
        "You're actually being useful. Don't ruin it by taking a 3-hour break.",
        "Consistency is key. You've found the key, now don't lose it.",
        "Solid work. You're outperforming 80% of the population right now.",
        "The momentum is real. Ride the wave.",
        "Keep this up and people might actually start relying on you.",
        "Serious progress detected. Stay in the zone.",
        "You're breathing down the neck of greatness. Keep pushing."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    if (score < 100) {
      const items = [
        "Absolute beast mode. Almost perfect. Key word: almost.",
        "Save some productivity for the rest of us, you overachiever.",
        "You're so close to 100% it’s actually annoying.",
        "Nearly elite. Keep that ego in check though.",
        "Focus. Execution. Domination. You're almost there.",
        "The finish line is in sight. Don't trip on your own success.",
        "You're making this look easy. Don't get lazy at the end.",
        "Elite performance detected. Keep the pressure on.",
        "The beast is awake. Don't let it go back to sleep.",
        "Almost legendary. Just a few more steps."
      ];
      return items[Math.floor(Math.random() * items.length)];
    }

    const items = [
      "100% completion? You’re definitely lying, but I’ll take it. Legend.",
      "Productivity God. Now go touch some grass, you machine.",
      "Clean sweep! Are you even human or just a well-coded bot?",
      "THE GOAT. 100% sweep. You productivity monster.",
      "Perfection achieved. Today, you are the master of your fate.",
      "Mission accomplished. Now go celebrate... by planning tomorrow.",
      "Unstoppable. Unmatched. Unbelievable. You did it.",
      "The board is empty, but your legacy is growing. Nice work.",
      "Full stack of wins today. You're the human equivalent of a victory lap.",
      "Absolute absolute monster productivity. You are THE LEGEND!"
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
                      title={`${prio} Priority`}
                      tasks={filteredTasks.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))}
                      onToggle={toggleTaskStatus}
                      onDelete={deleteTask}
                      onEdit={openModal}
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
      `}</style>
    </div>
  );
};

export default Dashboard;

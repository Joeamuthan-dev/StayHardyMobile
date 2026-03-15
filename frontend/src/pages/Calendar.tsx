import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

interface Reminder {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  time?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', time: '' });
  const [saving, setSaving] = useState(false);

  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Fetch reminders for current user
  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      if (data) setReminders(data as Reminder[]);
    };
    fetch();
  }, [user]);

  const remindersForDate = (dateStr: string) =>
    reminders.filter(r => r.date === dateStr);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const has = remindersForDate(dateStr).length > 0;
    if (has) {
      setShowViewModal(true);
    } else {
      setForm({ title: '', description: '', time: '' });
      setShowModal(true);
    }
  };

  const handleSave = async () => {
    if (!user?.id || !selectedDate || !form.title.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('reminders').insert({
        user_id: user.id,
        date: selectedDate,
        title: form.title.trim(),
        description: form.description.trim() || null,
        time: form.time || null,
      }).select().single();
      if (error) throw error;
      setReminders(prev => [...prev, data as Reminder]);
      setShowModal(false);
    } catch (err) {
      console.error('Error saving reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('reminders').delete().eq('id', id);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting reminder:', err);
    }
  };

  // Calendar grid calculation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Build grid cells: blanks + actual days
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const selectedReminders = selectedDate ? remindersForDate(selectedDate) : [];

  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .cal-day-header {
          text-align: center;
          font-size: 0.65rem;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.5rem 0;
        }
        .cal-cell {
          min-height: 72px;
          border-radius: 12px;
          padding: 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .cal-cell:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: rgba(16, 185, 129, 0.25);
        }
        .cal-cell.today {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.4);
        }
        .cal-cell.blank {
          background: transparent;
          border-color: transparent;
          cursor: default;
          pointer-events: none;
        }
        .cal-day-num {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1;
        }
        .cal-cell.today .cal-day-num {
          background: #10b981;
          color: #022c22;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }
        .cal-reminder-dot {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(16, 185, 129, 0.15);
          border-radius: 6px;
          padding: 2px 5px;
          max-width: 100%;
          overflow: hidden;
        }
        .cal-reminder-dot-circle {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
        }
        .cal-reminder-label {
          font-size: 0.55rem;
          font-weight: 800;
          color: #10b981;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .cal-cell { min-height: 50px; padding: 4px; }
          .cal-day-num { font-size: 0.7rem; }
          .cal-reminder-label { display: none; }
        }
      `}</style>

      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>Calendar</h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
            Plan. Remember. Execute.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleSidebar}
            className="notification-btn desktop-only-btn"
            title={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'}
            style={{ ...(isSidebarHidden ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' } : {}), opacity: 0.5 }}
          >
            <span className="material-symbols-outlined">
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>
        </div>
      </header>

      <main style={{ padding: '0 1rem 5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Month Navigation */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button
              onClick={prevMonth}
              className="notification-btn"
              style={{ width: '36px', height: '36px' }}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {MONTHS[currentMonth]} {currentYear}
              </div>
              {(currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) && (
                <button
                  onClick={goToToday}
                  style={{ marginTop: '4px', fontSize: '0.65rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '8px', padding: '2px 10px', fontWeight: 900, cursor: 'pointer' }}
                >
                  Back to Today
                </button>
              )}
            </div>

            <button
              onClick={nextMonth}
              className="notification-btn"
              style={{ width: '36px', height: '36px' }}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {/* Day headers */}
          <div className="cal-grid">
            {DAYS.map(d => (
              <div key={d} className="cal-day-header">{d}</div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`blank-${idx}`} className="cal-cell blank" />;
              const dateStr = toDateStr(currentYear, currentMonth, day);
              const isToday = dateStr === todayStr;
              const dayReminders = remindersForDate(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`cal-cell${isToday ? ' today' : ''}`}
                  onClick={() => handleDayClick(dateStr)}
                >
                  <span className="cal-day-num">{day}</span>
                  {dayReminders.slice(0, 2).map(r => (
                    <div key={r.id} className="cal-reminder-dot">
                      <div className="cal-reminder-dot-circle" />
                      <span className="cal-reminder-label">{r.title}</span>
                    </div>
                  ))}
                  {dayReminders.length > 2 && (
                    <span style={{ fontSize: '0.55rem', color: '#64748b', fontWeight: 800 }}>+{dayReminders.length - 2} more</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div>
          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 0.75rem 0.5rem' }}>
            Upcoming Reminders
          </h3>
          {reminders.filter(r => r.date >= todayStr).length === 0 ? (
            <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', opacity: 0.4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}>event_note</span>
              <p style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>No upcoming reminders</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reminders
                .filter(r => r.date >= todayStr)
                .slice(0, 6)
                .map(r => (
                  <div key={r.id} className="glass-card" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.1rem' }}>event</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {r.time ? ` at ${r.time}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>delete</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Reminder Modal */}
      {showModal && selectedDate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', borderRadius: '1.5rem', border: '1px solid var(--glass-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>Add Reminder</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' }}>Title *</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Team meeting, Doctor appointment..."
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' }}>Time (optional)</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' }}>Note (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Any details..."
                  rows={3}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                style={{ background: '#10b981', color: '#022c22', border: 'none', borderRadius: '12px', padding: '0.875rem', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', opacity: (!form.title.trim() || saving) ? 0.5 : 1, transition: 'all 0.2s' }}
              >
                {saving ? 'Saving...' : 'Save Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Reminders Modal */}
      {showViewModal && selectedDate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '420px', padding: '1.75rem', borderRadius: '1.5rem', border: '1px solid var(--glass-border)', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>Reminders</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => { setShowViewModal(false); setForm({ title: '', description: '', time: '' }); setShowModal(true); }}
                  className="notification-btn"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}
                  title="Add another reminder"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
                <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedReminders.map(r => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1rem' }}>event</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{r.title}</div>
                    {r.time && <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>{r.time}</div>}
                    {r.description && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>{r.description}</div>}
                  </div>
                  <button onClick={() => { handleDelete(r.id); if (selectedReminders.length <= 1) setShowViewModal(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav isHidden={isSidebarHidden} />
    </div>
  );
};

export default Calendar;

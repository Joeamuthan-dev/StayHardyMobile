import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';

interface Reminder {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => {
    setIsSidebarHidden(prev => {
      const next = !prev;
      localStorage.setItem('sidebarHidden', next.toString());
      return next;
    });
  };

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const storageKey = `reminders_${user?.id || 'guest'}`;

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setReminders(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [storageKey]);

  // Save to localStorage whenever reminders change
  const saveReminders = (updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const remindersForDate = (dateStr: string) =>
    reminders.filter(r => r.date === dateStr);

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (remindersForDate(dateStr).length > 0) {
      setShowViewModal(true);
    } else {
      setFormTitle('');
      setFormDesc('');
      setShowModal(true);
    }
  };

  const handleSave = () => {
    if (!formTitle.trim() || !selectedDate) return;
    const newReminder: Reminder = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: user?.id || 'guest',
      date: selectedDate,
      title: formTitle.trim(),
      description: formDesc.trim() || undefined,
    };
    saveReminders([...reminders, newReminder]);
    setShowModal(false);
    setFormTitle('');
    setFormDesc('');
  };

  const handleDelete = (id: string) => {
    const updated = reminders.filter(r => r.id !== id);
    saveReminders(updated);
    if (remindersForDate(selectedDate || '').filter(r => r.id !== id).length === 0) {
      setShowViewModal(false);
    }
  };

  // Calendar grid
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

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  const selectedReminders = selectedDate ? remindersForDate(selectedDate) : [];
  const upcomingReminders = reminders
    .filter(r => r.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
        }
        .cal-day-header {
          text-align: center;
          font-size: 0.6rem;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.4rem 0;
        }
        .cal-cell {
          min-height: 64px;
          border-radius: 10px;
          padding: 5px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-sizing: border-box;
        }
        .cal-cell:hover {
          background: rgba(16,185,129,0.08);
          border-color: rgba(16,185,129,0.25);
        }
        .cal-cell.today-cell {
          background: rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.35);
        }
        .cal-cell.blank-cell {
          background: transparent !important;
          border-color: transparent !important;
          cursor: default;
          pointer-events: none;
        }
        .cal-num {
          font-size: 0.78rem;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cal-cell.today-cell .cal-num {
          background: #10b981;
          color: #022c22;
        }
        .cal-dot-row {
          display: flex;
          align-items: center;
          gap: 2px;
          max-width: 100%;
          overflow: hidden;
        }
        .cal-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
        }
        .cal-dot-label {
          font-size: 0.52rem;
          font-weight: 800;
          color: #10b981;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rem-modal-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          color: var(--text-main);
          font-size: 0.9rem;
          font-weight: 600;
          box-sizing: border-box;
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .rem-modal-input:focus {
          border-color: #10b981;
        }
        @media (max-width: 480px) {
          .cal-cell { min-height: 44px; padding: 3px; }
          .cal-num { font-size: 0.65rem; width: 18px; height: 18px; }
          .cal-dot-label { display: none; }
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

        {/* Calendar Card */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>

          {/* Month Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button onClick={prevMonth} className="notification-btn" style={{ width: '36px', height: '36px' }}>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {MONTHS[currentMonth]} {currentYear}
              </div>
              {(currentMonth !== today.getMonth() || currentYear !== today.getFullYear()) && (
                <button
                  onClick={() => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); }}
                  style={{ marginTop: '3px', fontSize: '0.62rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '8px', padding: '2px 10px', fontWeight: 900, cursor: 'pointer', letterSpacing: '0.05em' }}
                >
                  Today
                </button>
              )}
            </div>
            <button onClick={nextMonth} className="notification-btn" style={{ width: '36px', height: '36px' }}>
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {/* Grid */}
          <div className="cal-grid">
            {DAYS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`b${idx}`} className="cal-cell blank-cell" />;
              const dateStr = toDateStr(currentYear, currentMonth, day);
              const isToday = dateStr === todayStr;
              const dayRems = remindersForDate(dateStr);
              return (
                <div
                  key={dateStr}
                  className={`cal-cell${isToday ? ' today-cell' : ''}`}
                  onClick={() => handleDayClick(dateStr)}
                >
                  <span className="cal-num">{day}</span>
                  {dayRems.slice(0, 2).map(r => (
                    <div key={r.id} className="cal-dot-row">
                      <div className="cal-dot" />
                      <span className="cal-dot-label">{r.title}</span>
                    </div>
                  ))}
                  {dayRems.length > 2 && (
                    <span style={{ fontSize: '0.5rem', color: '#64748b', fontWeight: 800 }}>+{dayRems.length - 2}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div>
          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 0.75rem 0.25rem' }}>
            Upcoming Reminders
          </h3>
          {upcomingReminders.length === 0 ? (
            <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center', opacity: 0.4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'block' }}>event_note</span>
              <p style={{ fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>No upcoming reminders</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingReminders.map(r => (
                <div key={r.id} className="glass-card" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1.1rem' }}>event</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Create Reminder Modal ── */}
      {showModal && selectedDate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '400px', padding: '1.75rem', borderRadius: '1.5rem', border: '1px solid var(--glass-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>New Reminder</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' }}>
                  Reminder Title *
                </label>
                <input
                  className="rem-modal-input"
                  autoFocus
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="What do you need to remember?"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.4rem' }}>
                  Note (optional)
                </label>
                <textarea
                  className="rem-modal-input"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Any extra details..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!formTitle.trim()}
                style={{
                  background: formTitle.trim() ? '#10b981' : 'rgba(16,185,129,0.2)',
                  color: formTitle.trim() ? '#022c22' : '#64748b',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.875rem',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  cursor: formTitle.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  letterSpacing: '0.05em'
                }}
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Reminders Modal ── */}
      {showViewModal && selectedDate && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="glass-card"
            style={{ width: '100%', maxWidth: '400px', padding: '1.75rem', borderRadius: '1.5rem', border: '1px solid var(--glass-border)', maxHeight: '75vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>Reminders</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => { setShowViewModal(false); setFormTitle(''); setFormDesc(''); setShowModal(true); }}
                  className="notification-btn"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', width: '32px', height: '32px' }}
                  title="Add reminder"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
                </button>
                <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedReminders.map(r => (
                <div key={r.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '1rem' }}>event</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>{r.title}</div>
                    {r.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>{r.description}</div>}
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', flexShrink: 0 }}
                  >
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

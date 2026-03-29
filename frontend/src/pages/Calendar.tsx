import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const COLOR_TAGS = ['#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#f97316'] as const;

interface Reminder {
  id: string;
  userId: string;
  date: string;
  title: string;
  description?: string;
  /** HH:mm 24h */
  time?: string;
  colorTag?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(year: number, month0: number, day: number) {
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`;
}

function parseTime(t?: string): { h: number; m: number } {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return { h: 9, m: 0 };
  const [a, b] = t.split(':').map(Number);
  return { h: Math.min(23, Math.max(0, a)), m: Math.min(59, Math.max(0, b)) };
}

type CellMeta = { day: number; inMonth: 'prev' | 'current' | 'next'; dateStr: string };

function buildCalendarCells(year: number, month0: number): CellMeta[] {
  const firstDow = new Date(year, month0, 1).getDay();
  const daysIn = new Date(year, month0 + 1, 0).getDate();
  const prevLast = new Date(year, month0, 0).getDate();
  const cells: CellMeta[] = [];

  const py = month0 === 0 ? year - 1 : year;
  const pm = month0 === 0 ? 11 : month0 - 1;
  for (let i = 0; i < firstDow; i++) {
    const d = prevLast - firstDow + 1 + i;
    cells.push({ day: d, inMonth: 'prev', dateStr: toDateStr(py, pm, d) });
  }
  for (let d = 1; d <= daysIn; d++) {
    cells.push({ day: d, inMonth: 'current', dateStr: toDateStr(year, month0, d) });
  }
  const ny = month0 === 11 ? year + 1 : year;
  const nm = month0 === 11 ? 0 : month0 + 1;
  let nd = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ day: nd, inMonth: 'next', dateStr: toDateStr(ny, nm, nd) });
    nd++;
  }
  return cells;
}

function chipStyleForDate(dateStr: string, todayStr: string): { label: string; className: string } {
  if (dateStr < todayStr) return { label: 'OVERDUE', className: 'cal-rem-chip--red' };
  if (dateStr === todayStr) return { label: 'TODAY', className: 'cal-rem-chip--today' };
  const t = new Date(todayStr + 'T12:00:00');
  const d = new Date(dateStr + 'T12:00:00');
  const diff = Math.ceil((d.getTime() - t.getTime()) / 86400000);
  if (diff <= 3) return { label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), className: 'cal-rem-chip--orange' };
  return { label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), className: 'cal-rem-chip--green' };
}

const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => {
    setIsSidebarHidden((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarHidden', next.toString());
      return next;
    });
  };

  const realNow = new Date();
  const [currentYear, setCurrentYear] = useState(realNow.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(realNow.getMonth());

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formHour, setFormHour] = useState(9);
  const [formMinute, setFormMinute] = useState(0);
  const [formColor, setFormColor] = useState<string>(COLOR_TAGS[0]);

  const storageKey = `reminders_${user?.id || 'guest'}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setReminders(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const saveReminders = useCallback(
    (updated: Reminder[]) => {
      setReminders(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    },
    [storageKey],
  );

  const todayStr = toDateStr(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const remindersForDate = useCallback(
    (dateStr: string) => reminders.filter((r) => r.date === dateStr),
    [reminders],
  );

  const monthPrefix = `${currentYear}-${pad2(currentMonth + 1)}`;
  const monthStats = useMemo(() => {
    const inMonth = reminders.filter((r) => r.date.startsWith(monthPrefix));
    const overdue = reminders.filter((r) => r.date < todayStr);
    return { count: inMonth.length, overdue: overdue.length };
  }, [reminders, monthPrefix, todayStr]);

  const sortedFeed = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.title.localeCompare(b.title);
    });
  }, [reminders]);

  const openSheetFor = (dateStr: string) => {
    setSheetDate(dateStr);
    setFormTitle('');
    const { h, m } = parseTime();
    setFormHour(h);
    setFormMinute(m);
    setFormColor(COLOR_TAGS[0]);
    setSheetOpen(true);
  };

  const openQuickAdd = () => {
    openSheetFor(todayStr);
    setCurrentYear(realNow.getFullYear());
    setCurrentMonth(realNow.getMonth());
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSheetDate(null);
  };

  const handleSave = () => {
    if (!formTitle.trim() || !sheetDate) return;
    const time = `${pad2(formHour)}:${pad2(formMinute)}`;
    const newReminder: Reminder = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: user?.id || 'guest',
      date: sheetDate,
      title: formTitle.trim(),
      time,
      colorTag: formColor,
    };
    saveReminders([...reminders, newReminder]);
    setFormTitle('');
  };

  const handleDelete = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  const goToday = () => {
    setCurrentMonth(realNow.getMonth());
    setCurrentYear(realNow.getFullYear());
  };

  const cells = useMemo(
    () => buildCalendarCells(currentYear, currentMonth),
    [currentYear, currentMonth],
  );

  const sheetReminders = sheetDate ? remindersForDate(sheetDate) : [];

  const dotForDate = (dateStr: string): 'red' | 'green' | null => {
    const rs = remindersForDate(dateStr);
    if (rs.length === 0) return null;
    const anyOverdue = dateStr < todayStr && rs.length > 0;
    if (anyOverdue) return 'red';
    return 'green';
  };

  return (
    <div className={`page-shell cal-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <style>{`
        .cal-premium-page {
          padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
        }
        @media (max-width: 767px) {
          .cal-premium-page.page-shell {
            padding-top: calc(env(safe-area-inset-top, 0px) + 12px);
          }
        }
        @media (min-width: 768px) {
          .cal-premium-page.page-shell {
            padding-top: 12px;
          }
        }
        .cal-aurora-wrap { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .cal-content {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 0 0.4rem;
        }
        /* Match Routines page header: grid row + title block + marquee */
        .cal-premium-header {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-bottom: 1rem;
          padding: 0 0.15rem;
        }
        .cal-premium-header__row--nav {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          align-items: center;
          min-height: 52px;
          width: 100%;
          gap: 0;
        }
        .cal-premium-header__nav-left {
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }
        .cal-premium-header__title-block {
          min-width: 0;
          text-align: center;
        }
        .cal-premium-title {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(2.35rem, 8vw, 3rem);
          font-weight: 400;
          letter-spacing: 0.28em;
          margin: 0;
          color: #f8fafc;
          line-height: 1;
        }
        .cal-marquee-wrap {
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .cal-marquee-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.45), transparent);
          opacity: 0.9;
        }
        .cal-marquee-track {
          overflow: hidden;
          width: 100%;
        }
        .cal-marquee-inner {
          display: flex;
          width: max-content;
          animation: calMarquee 22s linear infinite;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          color: #4ade80;
          text-shadow: 0 0 12px rgba(74, 222, 128, 0.45);
          white-space: nowrap;
        }
        .cal-marquee-inner span { padding-right: 2rem; }
        @keyframes calMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .cal-header-icon-btn {
          opacity: 0.55;
        }
        .cal-icon-btn {
          width: 38px;
          height: 38px;
          margin: 0 auto;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          color: #4ade80;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .cal-icon-btn:active {
          transform: scale(0.96);
          box-shadow: 0 0 20px rgba(52, 211, 153, 0.4);
        }
        .cal-icon-btn .material-symbols-outlined {
          font-size: 22px;
        }

        .cal-summary-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 16px;
          margin-bottom: 1rem;
        }
        .cal-summary-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          padding: 0.4rem 0.65rem;
          border-radius: 999px;
          border: 1px solid transparent;
        }
        .cal-summary-pill--green {
          color: #4ade80;
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(52, 211, 153, 0.35);
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.15);
        }
        .cal-summary-pill--red {
          color: #fecaca;
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(248, 113, 113, 0.35);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.12);
        }

        .cal-card {
          border-radius: 20px;
          padding: 1.15rem 1rem 1.25rem;
          border: 1px solid rgba(52, 211, 153, 0.14);
          background:
            radial-gradient(ellipse 85% 70% at 50% 45%, rgba(16, 185, 129, 0.1), rgba(6, 8, 14, 0.97));
          box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.35), 0 0 40px rgba(16, 185, 129, 0.04);
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 380px) {
          .cal-card { padding: 1.25rem 1.15rem 1.35rem; }
        }

        .cal-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 1.1rem;
        }
        .cal-nav-btn {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.45);
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
        }
        .cal-nav-btn .material-symbols-outlined { font-size: 24px; }
        .cal-nav-btn:active {
          transform: scale(0.94);
          box-shadow: 0 0 22px rgba(52, 211, 153, 0.45);
          border-color: rgba(52, 211, 153, 0.45);
          background: rgba(16, 185, 129, 0.12);
        }
        .cal-month-label {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(1.5rem, 5vw, 1.95rem);
          font-weight: 400;
          letter-spacing: 0.1em;
          color: #f8fafc;
          text-align: center;
          line-height: 1.05;
        }
        .cal-today-link {
          margin-top: 0.35rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.14em;
          background: rgba(16, 185, 129, 0.15);
          color: #4ade80;
          border: 1px solid rgba(52, 211, 153, 0.3);
          border-radius: 999px;
          padding: 0.3rem 0.65rem;
          cursor: pointer;
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .cal-dow {
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: rgba(52, 211, 153, 0.55);
          padding: 0.35rem 0 0.5rem;
        }
        .cal-cell {
          aspect-ratio: 1;
          max-height: 52px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(0, 0, 0, 0.28);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 5px 2px 4px;
          cursor: pointer;
          box-sizing: border-box;
          transition:
            transform 0.18s cubic-bezier(0.34, 1.2, 0.64, 1),
            box-shadow 0.2s,
            border-color 0.2s,
            background 0.2s;
        }
        .cal-cell--muted {
          opacity: 0.22;
        }
        .cal-cell:active {
          transform: scale(0.92);
        }
        .cal-cell--today {
          background: #22c55e;
          border-color: rgba(74, 222, 128, 0.8);
          box-shadow: 0 0 20px rgba(74, 222, 128, 0.45);
        }
        .cal-cell--today .cal-cell-num {
          color: #fff;
          font-weight: 900;
        }
        .cal-cell--selected:not(.cal-cell--today) {
          border: 2px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
        }
        .cal-cell-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem;
          font-weight: 700;
          color: rgba(226, 232, 240, 0.88);
          line-height: 1;
        }
        .cal-cell-dots {
          display: flex;
          gap: 3px;
          margin-top: auto;
          min-height: 6px;
          align-items: center;
          justify-content: center;
        }
        .cal-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .cal-dot--green {
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.7);
        }
        .cal-dot--red {
          background: #f87171;
          box-shadow: 0 0 8px rgba(248, 113, 113, 0.65);
        }
        .cal-cell--today .cal-dot--green {
          background: rgba(6, 78, 59, 0.92);
          box-shadow: 0 0 8px rgba(0, 0, 0, 0.35);
        }

        .cal-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.2em;
          color: rgba(226, 232, 240, 0.9);
          margin: 1.75rem 0 0.85rem;
        }
        .cal-rem-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.28);
          margin-bottom: 0.55rem;
          box-shadow: inset 4px 0 0 var(--cal-glow, rgba(52, 211, 153, 0.45));
        }
        .cal-rem-card--red { --cal-glow: rgba(248, 113, 113, 0.65); }
        .cal-rem-card--orange { --cal-glow: rgba(251, 146, 60, 0.55); }
        .cal-rem-card--green { --cal-glow: rgba(52, 211, 153, 0.5); }
        .cal-rem-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(52, 211, 153, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4ade80;
          flex-shrink: 0;
        }
        .cal-rem-icon .material-symbols-outlined { font-size: 22px; }
        .cal-rem-body { flex: 1; min-width: 0; }
        .cal-rem-title {
          font-weight: 800;
          font-size: 0.9rem;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cal-rem-chip {
          display: inline-block;
          margin-top: 0.35rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 0.3rem 0.5rem;
          border-radius: 999px;
        }
        .cal-rem-chip--today {
          color: #fecaca;
          background: rgba(239, 68, 68, 0.18);
          border: 1px solid rgba(248, 113, 113, 0.4);
        }
        .cal-rem-chip--orange {
          color: #fdba74;
          background: rgba(234, 88, 12, 0.12);
          border: 1px solid rgba(251, 146, 60, 0.35);
        }
        .cal-rem-chip--green {
          color: #86efac;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(52, 211, 153, 0.35);
        }
        .cal-rem-chip--red {
          color: #fecaca;
          background: rgba(127, 29, 29, 0.25);
          border: 1px solid rgba(248, 113, 113, 0.4);
        }
        .cal-rem-del {
          background: none;
          border: none;
          color: rgba(148, 163, 184, 0.9);
          cursor: pointer;
          padding: 6px;
          flex-shrink: 0;
          border-radius: 10px;
          transition: color 0.2s, background 0.2s;
        }
        .cal-rem-del:hover { color: #f87171; background: rgba(239, 68, 68, 0.08); }
        .cal-empty {
          text-align: center;
          padding: 2.25rem 1rem;
          border-radius: 20px;
          border: 1px dashed rgba(255, 255, 255, 0.08);
          color: rgba(148, 163, 184, 0.95);
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1.5;
        }
        .cal-empty-emoji { font-size: 2rem; display: block; margin-bottom: 0.5rem; }

        /* Bottom sheet */
        .cal-sheet-root {
          position: fixed;
          inset: 0;
          z-index: 9500;
          pointer-events: none;
          visibility: hidden;
        }
        .cal-sheet-root--open {
          pointer-events: auto;
          visibility: visible;
        }
        .cal-sheet-backdrop {
          position: absolute;
          inset: 0;
          z-index: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(8px);
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .cal-sheet-root--open .cal-sheet-backdrop {
          opacity: 1;
        }
        .cal-sheet-panel {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
          max-height: min(88vh, 620px);
          border-radius: 22px 22px 0 0;
          background: rgba(10, 12, 20, 0.82);
          backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(52, 211, 153, 0.12);
          border-bottom: none;
          padding: 0 1.1rem calc(1.1rem + env(safe-area-inset-bottom, 0px));
          transform: translateY(105%);
          transition: transform 0.52s cubic-bezier(0.32, 1.24, 0.32, 1);
          box-shadow: 0 -20px 60px rgba(0, 0, 0, 0.55);
          display: flex;
          flex-direction: column;
        }
        .cal-sheet-root--open .cal-sheet-panel {
          transform: translateY(0);
        }
        .cal-sheet-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.65), transparent);
          border-radius: 22px 22px 0 0;
        }
        .cal-sheet-handle {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.35);
          margin: 10px auto 6px;
          flex-shrink: 0;
        }
        .cal-sheet-date {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 1.65rem;
          letter-spacing: 0.06em;
          color: #f8fafc;
          text-align: center;
          margin: 0.25rem 0 0.85rem;
        }
        .cal-sheet-list {
          max-height: 120px;
          overflow-y: auto;
          margin-bottom: 0.75rem;
        }
        .cal-sheet-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.85rem;
          font-weight: 700;
          color: #e2e8f0;
        }
        .cal-sheet-input {
          width: 100%;
          box-sizing: border-box;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.35);
          padding: 1rem 1.1rem;
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          outline: none;
          margin-bottom: 1rem;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cal-sheet-input::placeholder {
          color: rgba(148, 163, 184, 0.75);
          font-weight: 600;
        }
        .cal-sheet-input:focus {
          border-color: rgba(52, 211, 153, 0.55);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
        .cal-row-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          color: rgba(148, 163, 184, 0.9);
          margin-bottom: 0.45rem;
        }
        .cal-time-row {
          display: flex;
          gap: 0.65rem;
          margin-bottom: 1rem;
        }
        .cal-time-select {
          flex: 1;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.4);
          color: #e2e8f0;
          padding: 0.65rem 0.75rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }
        .cal-color-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.1rem;
        }
        .cal-color-swatch {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .cal-color-swatch--on {
          border-color: #fff;
          box-shadow: 0 0 14px currentColor;
          transform: scale(1.08);
        }
        .cal-add-btn {
          width: 100%;
          border: none;
          border-radius: 14px;
          padding: 1rem 1.25rem;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          color: #022c22;
          background: linear-gradient(180deg, #4ade80, #16a34a);
          cursor: pointer;
          box-shadow: 0 0 28px rgba(74, 222, 128, 0.45);
          transition: transform 0.15s, filter 0.2s;
        }
        .cal-add-btn:active { transform: scale(0.98); }
        .cal-add-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>

      <div className="aurora-bg cal-aurora-wrap">
        <div className="aurora-gradient-1" />
        <div className="aurora-gradient-2" />
      </div>

      <div className="cal-content">
        <header className="cal-premium-header">
          <div className="cal-premium-header__row cal-premium-header__row--nav">
            <div className="cal-premium-header__nav-left">
              <button
                type="button"
                onClick={toggleSidebar}
                className="notification-btn desktop-only-btn cal-header-icon-btn"
                title={isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar (Focus Mode)'}
                aria-label="Toggle sidebar"
              >
                {isSidebarHidden ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                )}
              </button>
            </div>
            <div className="cal-premium-header__title-block">
              <h1 className="cal-premium-title">CALENDAR</h1>
              <div className="cal-marquee-wrap">
                <div className="cal-marquee-line" />
                <div className="cal-marquee-track" aria-hidden>
                  <div className="cal-marquee-inner">
                    <span>PLAN. EXECUTE. DISCIPLINE. REPEAT. PLAN. EXECUTE. DISCIPLINE. REPEAT. </span>
                    <span>PLAN. EXECUTE. DISCIPLINE. REPEAT. PLAN. EXECUTE. DISCIPLINE. REPEAT. </span>
                  </div>
                </div>
                <div className="cal-marquee-line" />
              </div>
            </div>
            <button type="button" className="cal-icon-btn" aria-label="Add reminder" onClick={openQuickAdd}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </header>

        <main>
          <div className="cal-summary-row">
            <span className="cal-summary-pill cal-summary-pill--green">
              {monthStats.count} REMINDERS THIS MONTH
            </span>
            {monthStats.overdue > 0 && (
              <span className="cal-summary-pill cal-summary-pill--red">
                {monthStats.overdue} OVERDUE
              </span>
            )}
          </div>

          <div className="cal-card">
            <div className="cal-nav">
              <button type="button" className="cal-nav-btn" onClick={prevMonth} aria-label="Previous month">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div>
                <div className="cal-month-label">
                  {MONTHS[currentMonth]} {currentYear}
                </div>
                {(currentMonth !== realNow.getMonth() || currentYear !== realNow.getFullYear()) && (
                  <div style={{ textAlign: 'center' }}>
                    <button type="button" className="cal-today-link" onClick={goToday}>
                      JUMP TO TODAY
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className="cal-nav-btn" onClick={nextMonth} aria-label="Next month">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div className="cal-grid">
              {DAYS.map((d) => (
                <div key={d} className="cal-dow">
                  {d}
                </div>
              ))}
              {cells.map((c) => {
                const isToday = c.dateStr === todayStr;
                const isSelected = sheetOpen && sheetDate === c.dateStr;
                const dot = dotForDate(c.dateStr);
                const muted = c.inMonth !== 'current';
                return (
                  <button
                    key={`${c.dateStr}-${c.inMonth}-${c.day}`}
                    type="button"
                    className={`cal-cell${muted ? ' cal-cell--muted' : ''}${isToday ? ' cal-cell--today' : ''}${isSelected ? ' cal-cell--selected' : ''}`}
                    onClick={() => openSheetFor(c.dateStr)}
                  >
                    <span className="cal-cell-num">{c.day}</span>
                    <div className="cal-cell-dots">
                      {dot === 'red' && <span className="cal-dot cal-dot--red" />}
                      {dot === 'green' && <span className="cal-dot cal-dot--green" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <h2 className="cal-section-label">UPCOMING REMINDERS</h2>
          {sortedFeed.length === 0 ? (
            <div className="cal-empty">
              <span className="cal-empty-emoji" aria-hidden>
                📅
              </span>
              Nothing planned yet. Tap a date to add one.
            </div>
          ) : (
            sortedFeed.map((r) => {
              const chip = chipStyleForDate(r.date, todayStr);
              const cardClass =
                r.date < todayStr || r.date === todayStr
                  ? 'cal-rem-card cal-rem-card--red'
                  : chip.className === 'cal-rem-chip--orange'
                    ? 'cal-rem-card cal-rem-card--orange'
                    : 'cal-rem-card cal-rem-card--green';
              return (
                <div key={r.id} className={cardClass}>
                  <div className="cal-rem-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={r.colorTag || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="cal-rem-body">
                    <div className="cal-rem-title">{r.title}</div>
                    <span className={`cal-rem-chip ${chip.className}`}>
                      {r.date < todayStr
                        ? 'OVERDUE'
                        : r.date === todayStr
                          ? 'TODAY'
                          : chip.label}
                      {r.time ? ` · ${r.time}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cal-rem-del"
                    aria-label="Delete reminder"
                    onClick={() => handleDelete(r.id)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              );
            })
          )}
        </main>
      </div>

      {/* Bottom sheet */}
      <div
        className={`cal-sheet-root${sheetOpen ? ' cal-sheet-root--open' : ''}`}
        aria-hidden={!sheetOpen}
      >
        <button
          type="button"
          className="cal-sheet-backdrop"
          aria-label="Close"
          onClick={closeSheet}
          style={{ border: 'none', padding: 0, cursor: 'pointer' }}
        />
        <div className="cal-sheet-panel" role="dialog" aria-modal="true" aria-label="Add reminder">
          <div className="cal-sheet-shimmer" />
          <div className="cal-sheet-handle" />
          {sheetDate && (
            <p className="cal-sheet-date">
              {new Date(sheetDate + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {sheetReminders.length > 0 && (
            <div className="cal-sheet-list">
              {sheetReminders.map((r) => (
                <div key={r.id} className="cal-sheet-item">
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                    {r.time ? ` · ${r.time}` : ''}
                  </span>
                  <button
                    type="button"
                    className="cal-rem-del"
                    aria-label="Delete"
                    onClick={() => handleDelete(r.id)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="cal-row-label" htmlFor="cal-reminder-title">
            TITLE
          </label>
          <input
            id="cal-reminder-title"
            className="cal-sheet-input"
            placeholder="What do you need to remember?"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus={sheetOpen}
          />
          <div className="cal-row-label">TIME</div>
          <div className="cal-time-row">
            <select
              className="cal-time-select"
              value={formHour}
              onChange={(e) => setFormHour(Number(e.target.value))}
              aria-label="Hour"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {pad2(i)}h
                </option>
              ))}
            </select>
            <select
              className="cal-time-select"
              value={formMinute}
              onChange={(e) => setFormMinute(Number(e.target.value))}
              aria-label="Minute"
            >
              {Array.from({ length: 60 }, (_, m) => (
                <option key={m} value={m}>
                  {pad2(m)}m
                </option>
              ))}
            </select>
          </div>
          <div className="cal-row-label">COLOR TAG</div>
          <div className="cal-color-row">
            {COLOR_TAGS.map((c) => (
              <button
                key={c}
                type="button"
                className={`cal-color-swatch${formColor === c ? ' cal-color-swatch--on' : ''}`}
                style={{ background: c, color: c }}
                aria-label={`Color ${c}`}
                onClick={() => setFormColor(c)}
              />
            ))}
          </div>
          <button type="button" className="cal-add-btn" disabled={!formTitle.trim()} onClick={handleSave}>
            ADD REMINDER
          </button>
        </div>
      </div>


    </div>
  );
};

export default Calendar;

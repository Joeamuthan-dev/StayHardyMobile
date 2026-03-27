import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import CategoryInsightCard from '../components/CategoryInsightCard';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { loadStatsPageStale, persistStatsPageCache } from '../lib/statsPageCache';
import { ProductivityService, type ProductivityScoreData } from '../lib/ProductivityService';
import { calculateProductivityScore } from '../utils/productivity';
import { loadTasksListStale, loadGoalsListStale, loadRoutinesRawStale, loadRoutineLogsListStale } from '../lib/listCaches';
import { useSubscription } from '../context/SubscriptionContext';
import { useLoading } from '../context/LoadingContext';
import { FeatureGate } from '../components/FeatureGate';

interface Task {
  id: string;
  status: 'pending' | 'completed';
  category: string;
  createdAt: string;
  updatedAt?: string;
}

interface Routine {
  id: string;
  title: string;
  days: string[];
  category: string;
}

interface RoutineLog {
  routine_id: string;
  completed_at: string;
}

interface Goal {
  id: string;
  name: string;
  targetDate: string;
  status: 'pending' | 'completed';
  progress: number;
  createdAt: string;
  updatedAt?: string;
}











// ─── COCKPIT HEATMAP ────────────────────────────────────────────────────────

const HabitHeatmap = ({
  heatmapData,
  activeRange,
  setActiveRange,
  statsData
}: {
  heatmapData: number[];
  activeRange: string;
  setActiveRange: (r: '30D' | '90D' | '1Y') => void;
  statsData: { activeDays: number; bestStreak: number; completionRate: number };
}) => {
  const getCellColor = (val: number) => {
    if (val >= 4) return '#00E87A';
    if (val === 3) return 'rgba(0,232,122,0.7)';
    if (val === 2) return 'rgba(0,232,122,0.4)';
    if (val === 1) return 'rgba(0,232,122,0.2)';
    return 'rgba(255,255,255,0.03)';
  };
  const getCellGlow = (val: number) => {
    if (val >= 3) return '0 0 4px rgba(0,232,122,0.5)';
    if (val >= 2) return '0 0 2px rgba(0,232,122,0.2)';
    return 'none';
  };
  return (
    <div style={{ margin: '0 16px 12px 16px', background: '#0A0F0D', border: '1px solid rgba(0,232,122,0.12)', borderRadius: '20px', padding: '18px', boxSizing: 'border-box' }}>
      {/* Header + range toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: 0 }}>HABIT CONSISTENCY</p>
        <div style={{ display: 'flex', background: '#060D09', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
          {(['30D','90D','1Y'] as const).map((r, i) => {
            const isActive = activeRange === r;
            return (
              <div key={i} onClick={() => setActiveRange(r)} style={{ padding: '4px 8px', borderRadius: '7px', cursor: 'pointer', background: isActive ? '#00E87A' : 'transparent', transition: 'all 0.2s ease', boxShadow: isActive ? '0 0 8px rgba(0,232,122,0.4)' : 'none' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: isActive ? '#000' : '#666', letterSpacing: '0.06em' }}>{r}</span>
              </div>
            );
          })}
        </div>
      </div>
      {/* Heatmap grid */}
      <div style={{ background: 'linear-gradient(145deg,#050a07,#080f0a)', borderRadius: '12px', padding: '12px', boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.6),inset -1px -1px 4px rgba(255,255,255,0.02)', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '0 2px' }}>
          {['JAN','APR','JUL','OCT'].map((m, i) => (
            <span key={i} style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>{m}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(26, 1fr)', gap: '2.5px' }}>
          {heatmapData.map((val, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: '2px', background: getCellColor(val), boxShadow: val > 0 ? `${getCellGlow(val)},inset 1px 1px 2px rgba(0,0,0,0.3)` : 'inset 1px 1px 2px rgba(0,0,0,0.4),inset -0.5px -0.5px 1px rgba(255,255,255,0.02)', minWidth: 0, transition: 'background 0.2s ease' }}/>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '8px' }}>
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>Less</span>
          {[0,1,2,3,4].map(v => (
            <div key={v} style={{ width: '10px', height: '10px', borderRadius: '2px', background: getCellColor(v), boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.4)' }}/>
          ))}
          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>More</span>
        </div>
      </div>
      {/* Data pill scoreboard */}
      <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,232,122,0.15)', borderRadius: '16px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pillGlow 3s ease-in-out infinite' }}>
        {[
          { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>, label: 'ACTIVE DAYS', value: statsData.activeDays },
          { icon: <span style={{ fontSize: '12px', filter: 'drop-shadow(0 0 4px rgba(255,100,0,0.8))' }}>🔥</span>, label: 'BEST STREAK', value: statsData.bestStreak },
          { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, label: 'COMPLETION', value: `${statsData.completionRate}%` }
        ].map((stat, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{stat.icon}</div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace', letterSpacing: '-0.5px', animation: 'statCountUp 0.5s ease' }}>{stat.value}</span>
            <span style={{ fontSize: '8px', fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em' }}>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── COCKPIT INSIGHT CARD ────────────────────────────────────────────────────
// ─── GLOBAL STAT CARD STYLE ──────────────────────────────────────────────────
const cardStyle = {
  margin: '0 16px 12px 16px',
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '0.5px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxSizing: 'border-box' as const
};

// ─── COCKPIT INSIGHT CARD ────────────────────────────────────────────────────
const InsightCard = ({ type, data }: {
  type: 'tasks' | 'goals' | 'habits';
  data: { 
    total?: number; 
    completed?: number; 
    pending?: number; 
    active?: number; 
    today?: number; 
    streak?: number; 
    consistency?: number 
  };
}) => {
  const configs = {
    tasks: {
      label: 'TASK INSIGHTS',
      color: '#00E87A',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00E87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
      percentage: data?.total ? Math.round((data.completed || 0) / data.total * 100) : 0,
      stats: [
        { label: 'Total', val: data.total || 0 },
        { label: 'Done', val: (data.completed || 0) },
        { label: 'Pending', val: (data.pending || 0) }
      ]
    },
    goals: {
      label: 'GOAL INSIGHTS',
      color: '#A855F7',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
      percentage: data?.total ? Math.round((data.completed || 0) / data.total * 100) : 0,
      stats: [
        { label: 'Total', val: data.total || 0 },
        { label: 'Active', val: data.active || 0 },
        { label: 'Done', val: data.completed || 0 }
      ]
    },
    habits: {
      label: 'HABIT INSIGHTS',
      color: '#00B0FF',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00B0FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
      percentage: data?.consistency || 0,
      stats: [
        { label: 'Total', val: data.total || 0 },
        { label: 'Today', val: data.today || 0 },
        { label: 'Streak', val: data.streak || 0 }
      ]
    }
  };

  const config = configs[type];
  if (!config) return null;

  return (
    <div style={{ 
      margin: '0 16px 12px 16px',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `0.5px solid ${config.color}`,
      borderRadius: '16px',
      padding: '16px 20px',
      position: 'relative',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    }}>
      {/* Top Row: Icon + Title | Percentage */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           {config.icon}
           <span style={{ 
             fontSize: '11px', 
             fontWeight: '800', 
             color: '#FFFFFF', 
             letterSpacing: '0.06em',
             fontFamily: "'DM Sans', sans-serif" 
           }}>
             {config.label}
           </span>
        </div>
        <span style={{ 
          fontSize: '24px', 
          fontWeight: '900', 
          color: '#FFFFFF',
          fontFamily: "'DM Sans', sans-serif"
        }}>
          {config.percentage}%
        </span>
      </div>

      {/* Middle Row: Inline Stats with split dividers */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '16px'
      }}>
        {config.stats.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
               <span style={{ 
                 fontSize: '10px', 
                 fontWeight: '600', 
                 color: 'rgba(255,255,255,0.4)',
                 fontFamily: "'DM Sans', sans-serif"
               }}>{s.label}:</span>
               <span style={{ 
                 fontSize: '13px', 
                 fontWeight: '800', 
                 color: '#FFFFFF',
                 fontFamily: "'DM Sans', sans-serif"
               }}>{s.val}</span>
            </div>
            {i < config.stats.length - 1 && (
              <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.08)' }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Bottom Row: Ultra-thin 4px Progress Bar */}
      <div style={{ 
        height: '4px', 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: '2px', 
        overflow: 'hidden',
        width: '100%'
      }}>
        <div style={{ 
          height: '100%', 
          width: `${config.percentage}%`, 
          background: config.color, 
          transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: `0 0 8px ${config.color}40`
        }} />
      </div>
    </div>
  );
};




// --- AEROSPACE TELEMETRY COMPONENTS ---

const ScoreGauge = ({ score }: { score: number }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 1500;
    const step = duration / (end - start || 1);
    const timer = setInterval(() => {
      start += 1;
      setDisplayed(start);
      if (start >= end) {
        clearInterval(timer);
      }
    }, step);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 80;
  const circumference = Math.PI * radius;
  const progress = score / 100;
  const dashOffset = circumference * (1 - progress);
  // Arc goes from left (angle=π) to right (angle=0) as score increases
  const angle = Math.PI * (1 - progress);
  const laserX = 100 + radius * Math.cos(Math.PI - angle);
  const laserY = 90 - radius * Math.sin(angle);

  const getBadgeTooltip = (s: number) => {
    if (s >= 90) return { label: 'PERFECT', color: '#FFD700' };
    if (s >= 75) return { label: 'ELITE', color: '#00E87A' };
    if (s >= 60) return { label: 'RISING', color: '#06B6D4' };
    if (s >= 40) return { label: 'BUILDING', color: '#F59E0B' };
    if (s >= 20) return { label: 'STARTING', color: '#F97316' };
    return { label: 'GHOST MODE', color: '#6B7280' };
  };

  const badge = getBadgeTooltip(score);

  return (
    <div style={{ ...cardStyle, padding: '24px 20px', border: '0.5px solid rgba(0,232,122,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: 0 }}>
            PRODUCTIVITY SCORE
          </p>
        </div>
        <div style={{
          background: `rgba(${badge.color.match(/.{2}/g)?.map(h => parseInt(h, 16)).join(',')},0.12)`,
          border: `1px solid ${badge.color}40`,
          borderRadius: '10px',
          padding: '4px 10px',
          fontSize: '9px',
          fontWeight: '900',
          color: badge.color,
          letterSpacing: '0.1em'
        }}>
          {badge.label}
        </div>
      </div>
      <div style={{
        background: 'linear-gradient(145deg, #050a07, #0a1408)',
        borderRadius: '16px',
        padding: '20px 16px 8px 16px',
        boxShadow: 'inset 4px 4px 16px rgba(0,0,0,0.8), inset -2px -2px 8px rgba(255,255,255,0.02)'
      }}>
        <svg viewBox="0 0 200 110" style={{ width: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00E87A" />
              <stop offset="100%" stopColor="#00BCD4" />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" strokeDasharray="4 6" />
          <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="rgba(0,232,122,0.04)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray={String(circumference)} strokeDashoffset={dashOffset} filter="url(#gaugeGlow)" style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 0, 0.64, 1)' }} />
          <circle cx={laserX} cy={laserY} r="5" fill="#00E87A" style={{ animation: 'laserPulse 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 8px rgba(0,232,122,1))' }} />
          <circle cx={laserX} cy={laserY} r="2" fill="#FFFFFF" />
          <text x="100" y="75" textAnchor="middle" style={{ fontSize: '36px', fontWeight: '900', fill: '#FFFFFF', fontFamily: 'monospace', animation: 'countUp 0.5s ease' }}>{displayed}</text>

          <text x="16" y="106" style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>0</text>
          <text x="172" y="106" style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>100</text>
        </svg>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 4px 0', letterSpacing: '0.02em', fontWeight: '500' }}>Focus on the next 1%</p>
      </div>
    </div>
  );
};

const InsightsTrend = ({ data, activeRange, setActiveRange }: { data: { tasks: number[], goals: number[], habits: number[] }, activeRange: string, setActiveRange: (r: string) => void }) => {
  const buildPath = (points: number[], w: number, h: number) => {
    if (!points?.length) return '';
    const max = Math.max(...points, 1);
    const coords = points.map((v, i) => ({
      x: (i / (points.length - 1)) * w,
      y: h - (v / max) * (h * 0.8) - h * 0.1
    }));
    return coords.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = coords[i - 1];
      const cpX = (prev.x + point.x) / 2;
      return path + ` C ${cpX} ${prev.y} ${cpX} ${point.y} ${point.x} ${point.y}`;
    }, '');
  };

  const buildAreaPath = (linePath: string, w: number, h: number) => {
    if (!linePath) return '';
    return linePath + ` L ${w} ${h} L 0 ${h} Z`;
  };

  const W = 300;
  const H = 100;
  const taskPath = buildPath(data.tasks, W, H);
  const goalPath = buildPath(data.goals, W, H);
  const habitPath = buildPath(data.habits, W, H);

  return (
    <div style={{ ...cardStyle, padding: '20px', border: '0.5px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: 0 }}>INSIGHTS TREND</p>
        <div style={{ display: 'flex', background: '#060D09', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '3px', gap: '2px', position: 'relative' }}>
          {['7D', '30D', '90D'].map((range, i) => {
            const isActive = activeRange === range;
            return (
              <div key={i} onClick={() => setActiveRange(range)} style={{ padding: '5px 10px', borderRadius: '9px', cursor: 'pointer', background: isActive ? '#00E87A' : 'transparent', transition: 'all 0.25s ease', animation: isActive ? 'segSlide 0.2s ease' : 'none', boxShadow: isActive ? '0 0 10px rgba(0,232,122,0.4)' : 'none' }}>
                <span style={{ fontSize: '10px', fontWeight: '800', color: isActive ? '#000000' : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{range}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        {[{ label: 'Tasks', color: '#00E87A' }, { label: 'Goals', color: '#A855F7' }, { label: 'Habits', color: '#06B6D4' }].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '16px', height: '2px', borderRadius: '2px', background: l.color, boxShadow: `0 0 6px ${l.color}80` }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{l.label}</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(145deg, #050a07, #080f0a)', borderRadius: '12px', padding: '12px 8px 8px 8px', boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.6)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id="taskAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00E87A" stopOpacity="0.3" /><stop offset="100%" stopColor="#00E87A" stopOpacity="0" /></linearGradient>
            <linearGradient id="goalAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A855F7" stopOpacity="0.2" /><stop offset="100%" stopColor="#A855F7" stopOpacity="0" /></linearGradient>
            <linearGradient id="habitAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" /><stop offset="100%" stopColor="#06B6D4" stopOpacity="0" /></linearGradient>
            <filter id="taskGlow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {[25, 50, 75].map((y, i) => (
            <line key={i} x1="0" y1={H - (y / 100) * H * 0.8 - H * 0.1} x2={W} y2={H - (y / 100) * H * 0.8 - H * 0.1} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 6" />
          ))}
          {taskPath && <path d={buildAreaPath(taskPath, W, H)} fill="url(#taskAreaGrad)" style={{ animation: 'auraGlow 3s ease-in-out infinite' }} />}
          {goalPath && <path d={buildAreaPath(goalPath, W, H)} fill="url(#goalAreaGrad)" style={{ animation: 'auraGlow 3s ease-in-out infinite 0.5s' }} />}
          {habitPath && <path d={buildAreaPath(habitPath, W, H)} fill="url(#habitAreaGrad)" style={{ animation: 'auraGlow 3s ease-in-out infinite 1s' }} />}
          {taskPath && <path d={taskPath} fill="none" stroke="#00E87A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#taskGlow)" style={{ filter: 'drop-shadow(0 0 4px rgba(0,232,122,0.8))' }} />}
          {goalPath && <path d={goalPath} fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(168,85,247,0.6))' }} />}
          {habitPath && <path d={habitPath} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.6))' }} />}
        </svg>
      </div>
    </div>
  );
};

const VerdictCard = ({ score, verdictText }: { score: number, verdictText: string }) => {
  const getVerdict = (s: number) => {
    if (s >= 90) return { icon: '🏆', title: 'PERFECT EXECUTION', color: '#FFD700', glow: 'rgba(255,215,0,0.3)' };
    if (s >= 75) return { icon: '⚡', title: 'ELITE PERFORMER', color: '#00E87A', glow: 'rgba(0,232,122,0.3)' };
    if (s >= 60) return { icon: '🚀', title: 'RISING FAST', color: '#06B6D4', glow: 'rgba(6,182,212,0.3)' };
    if (s >= 40) return { icon: '💪', title: 'BUILDING MOMENTUM', color: '#F59E0B', glow: 'rgba(245,158,11,0.3)' };
    if (s >= 20) return { icon: '🔥', title: 'GETTING STARTED', color: '#F97316', glow: 'rgba(249,115,22,0.3)' };
    return { icon: '👻', title: 'GHOST MODE', color: '#6B7280', glow: 'rgba(107,114,128,0.2)' };
  };
  const v = getVerdict(score);
  return (
    <div style={{ 
      ...cardStyle, 
      padding: '20px', 
      border: `0.5px solid ${v.color}40`,
      animation: 'verdictGlow 3s ease-in-out infinite', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', background: `radial-gradient(circle, ${v.glow} 0%, transparent 70%)`, pointerEvents: 'none', animation: 'godRay 3s ease-in-out infinite' }} />
      <div style={{ padding: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', fontSize: '28px', filter: `drop-shadow(0 0 12px ${v.glow})` }}>{v.icon}</div>
          <div>
            <p style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: '0 0 2px 0' }}>THE VERDICT</p>
            <p style={{ fontSize: '14px', fontWeight: '900', color: v.color, margin: 0, letterSpacing: '0.04em', fontFamily: 'monospace' }}>{v.title}</p>
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '14px' }} />
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.7, fontWeight: '400' }}>{verdictText}</p>

      </div>
    </div>
  );
};


function getScoreBadge(score: number): { emoji: string; label: string; verdict: string; fullVerdict: string; bg: string; border: string; color: string } {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  if (s === 0) return { emoji: '👻', label: 'GHOST MODE', verdict: "No tasks. No habits. No goals.", fullVerdict: "No tasks. No habits. No goals. You opened the app though — that's literally all you did.", bg: '#1a1a1a', border: 'rgba(255,255,255,0.1)', color: '#94a3b8' };
  if (s <= 5) return { emoji: '💀', label: 'FLATLINE', verdict: "Technically alive. Barely.", fullVerdict: "One task? Half a habit? This isn't productivity — this is an accident.", bg: '#2e0a0a', border: 'rgba(239,68,68,0.2)', color: '#f87171' };
  if (s <= 10) return { emoji: '🧊', label: 'COLD START', verdict: "Engine's cold.", fullVerdict: "You're doing the minimum required to say you tried. The bar is on the floor.", bg: '#2e140a', border: 'rgba(249,115,22,0.2)', color: '#fb923c' };
  if (s <= 15) return { emoji: '🐌', label: 'SNAIL PACE', verdict: "Moving... technically.", fullVerdict: "Slow. Real slow. You move like you have all the time in the world — you don't.", bg: '#2e1e0a', border: 'rgba(245,158,11,0.2)', color: '#fbbf24' };
  if (s <= 20) return { emoji: '🔆', label: 'WARMING UP', verdict: "Signs of life detected.", fullVerdict: "There's a pulse. Faint, but it's there. You've got potential buried under layers.", bg: '#1c2e0a', border: 'rgba(163,230,53,0.2)', color: '#a3e635' };
  if (s <= 25) return { emoji: '🐢', label: 'CRAWLING', verdict: "Slow and steady...", fullVerdict: "You're crawling when you should be running. Every day you delay is a day lost.", bg: '#0a2e10', border: 'rgba(74,222,128,0.2)', color: '#4ade80' };
  if (s <= 30) return { emoji: '🌱', label: 'GAINING GROUND', verdict: "Something's growing.", fullVerdict: "You're starting to build some traction. Don't let laziness take over now.", bg: '#0a2e1e', border: 'rgba(45,212,191,0.2)', color: '#2dd4bf' };
  if (s <= 35) return { emoji: '🎵', label: 'FINDING RHYTHM', verdict: "You found a beat.", fullVerdict: "Now we care. You are gaining speed. Consistency is key from here on.", bg: '#0a2a2e', border: 'rgba(34,211,238,0.2)', color: '#22d3ee' };
  if (s <= 40) return { emoji: '🏗️', label: 'BUILDING UP', verdict: "Foundation forming.", fullVerdict: "Brick by brick. You're setting up a solid day. Don't drop any.", bg: '#0a1d2e', border: 'rgba(56,189,248,0.2)', color: '#38bdf8' };
  if (s <= 45) return { emoji: '💪', label: 'GETTING REAL', verdict: "Now we're talking.", fullVerdict: "You are pushing boundaries and it shows. Keep this energy rolling.", bg: '#0d0a2e', border: 'rgba(96,165,250,0.2)', color: '#60a5fa' };
  if (s <= 50) return { emoji: '⚡', label: 'HALFWAY HERO', verdict: "Halfway there.", fullVerdict: "You crossed the midpoint. The slope is slightly easier now. Keep climbing.", bg: '#180a2e', border: 'rgba(129,140,248,0.2)', color: '#818cf8' };
  if (s <= 55) return { emoji: '🔥', label: 'ON FIRE', verdict: "Burning bright.", fullVerdict: "Now you are getting somewhere. This is what momentum feels like.", bg: '#250a2e', border: 'rgba(167,139,250,0.2)', color: '#a78bfa' };
  if (s <= 60) return { emoji: '🎯', label: 'LOCKED IN', verdict: "Focus is sharp.", fullVerdict: "Absolute focus. You are in deep state of performance. Stay there.", bg: '#2e0a25', border: 'rgba(192,132,252,0.2)', color: '#c084fc' };
  if (s <= 65) return { emoji: '🦾', label: 'CRUSHING IT', verdict: "Machine mode.", fullVerdict: "No mercy for procrastination. You are executing task after task effortlessly.", bg: '#2e0a18', border: 'rgba(232,121,249,0.2)', color: '#e879f9' };
  if (s <= 70) return { emoji: '🚀', label: 'MOMENTUM', verdict: "Hold on tight.", fullVerdict: "Escape velocity reached. You are flying through your list index Index setups.", bg: '#2e0a0d', border: 'rgba(244,114,182,0.2)', color: '#f472b6' };
  if (s <= 75) return { emoji: '🏆', label: 'ELITE LEVEL', verdict: "Top tier.", fullVerdict: "Highest performing bracket. You belong here. Defend your spot.", bg: '#2e120a', border: 'rgba(251,113,133,0.2)', color: '#fb7185' };
  if (s <= 80) return { emoji: '🦁', label: 'BEAST MODE', verdict: "Savage consistency.", fullVerdict: "Unstoppable force. You aren't just working, you are dictating your day Index Index indexing Index Index Index Index index INDEX INDEX!", bg: '#2e1c0d', border: 'rgba(252,165,165,0.2)', color: '#fca5a5' };
  if (s <= 85) return { emoji: '⚜️', label: 'LEGENDARY', verdict: "Class of your own.", fullVerdict: "Elite output. You're showing what standard self-control looks like Index Index indexing Index Index Index Index index INDEX INDEX!", bg: '#2e250a', border: 'rgba(253,224,71,0.2)', color: '#fde047' };
  if (s <= 90) return { emoji: '🌟', label: 'SUPERHUMAN', verdict: "Peak efficiency.", fullVerdict: "You are making this look incredibly easy. Exceptional output Index Index indexing Index Index Index Index index INDEX INDEX!", bg: '#202e0a', border: 'rgba(163,230,53,0.3)', color: '#a3e635' };
  if (s <= 95) return { emoji: '👑', label: 'GODLIKE', verdict: "Unrivaled.", fullVerdict: "The crown is yours. Standard setter. Maintain absolute dominion Index Index indexing Index Index Index Index index INDEX INDEX!", bg: '#0d2e0a', border: 'rgba(74,222,128,0.3)', color: '#4ade80' };
  return { emoji: '💎', label: 'PERFECT', verdict: "Flawless.", fullVerdict: "You are the ideal version of yourself. Zero complaints Index Index indexing Index Index Index Index index INDEX INDEX!", bg: '#0a2e1d', border: 'rgba(45,212,191,0.3)', color: '#2dd4bf' };
}



const Stats: React.FC = () => {
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const [heatmapRange, setHeatmapRange] = useState<'30D' | '90D' | '1Y'>('30D');


  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [trendDays, setTrendDays] = useState(7);
  const { user } = useAuth();
  const { setLoading } = useLoading();
  const { isPro } = useSubscription();
  const [scoreData, setScoreData] = useState<ProductivityScoreData | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchAllData = useCallback(async (opts?: { force?: boolean }) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (!opts?.force) {
      const expired = await isCacheExpired(CACHE_KEYS.user_stats, CACHE_EXPIRY_MINUTES.user_stats);
      if (!expired) return;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDayStr = thirtyDaysAgo.getFullYear() + '-' + String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0') + '-' + String(thirtyDaysAgo.getDate()).padStart(2, '0');

    const [{ data: tasksData, error: taskErr }, { data: catData, error: catErr }, { data: routinesData }, { data: logsData }, { data: goalsData }] = await Promise.all([
      supabase.from('tasks').select('id, status, category, createdAt, updatedAt').eq('userId', user.id),
      supabase.from('categories').select('name').eq('userId', user.id),
      supabase.from('routines').select('id, title, days, category').eq('user_id', user.id),
      supabase.from('routine_logs').select('routine_id, completed_at').eq('user_id', user.id).gte('completed_at', startDayStr),
      supabase.from('goals').select('id, name, targetDate, status, progress, createdAt, updatedAt').eq('userId', user.id),
    ]);
    if (taskErr) console.error('Supabase fetch error:', taskErr);
    if (catErr) console.warn('Categories fetch error:', catErr.message);

    if (!isMountedRef.current) return;

    const tasksArr = (tasksData ?? []) as Task[];
    const routinesArr = (routinesData ?? []) as Routine[];
    const logsArr = (logsData ?? []) as RoutineLog[];
    const goalsArr = (goalsData ?? []) as Goal[];
    const cats = catData?.map((c) => c.name) ?? [];

    setDbCategories(cats);
    setRoutines(routinesArr);
    setRoutineLogs(logsArr);
    setGoals(goalsArr);

    const calculatedScore = await ProductivityService.recalculate(user.id);
    setScoreData(calculatedScore);

    void persistStatsPageCache(user.id, { scoreData: calculatedScore ?? null, tasks: tasksArr, routines: routinesArr, routineLogs: logsArr, goals: goalsArr, dbCategories: cats });
    void syncWidgetData();
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, setLoading]);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    void (async () => {
      const snap = await loadStatsPageStale(user.id);
      if (!cancelled && snap) {
        
        const cachedScore = await ProductivityService.getStoredScore(user.id);
        if (cachedScore) {
          setScoreData(cachedScore);
        } else if (snap.scoreData) {
          setScoreData(snap.scoreData as ProductivityScoreData);
        }
        setTasks((snap.tasks ?? []) as Task[]);
        setRoutines((snap.routines ?? []) as Routine[]);
        setRoutineLogs((snap.routineLogs ?? []) as RoutineLog[]);
        setGoals((snap.goals ?? []) as Goal[]);
        setDbCategories(snap.dbCategories ?? []);
      }
      await fetchAllData({ force: false });
    })();

    const tasksChannel = supabase
      .channel('stats_tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `userId=eq.${user.id}` }, () => {
        void fetchAllData({ force: true });
      })
      .subscribe();

    const categoriesChannel = supabase
      .channel('stats_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `userId=eq.${user.id}` }, () => {
        void fetchAllData({ force: true });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(categoriesChannel);
    };
  }, [user, fetchAllData]);

  useEffect(() => {
    const handler = () => {
      console.log('Stats refreshing from global event (optimistic cache load)...');
      if (user?.id) {
        void Promise.all([
          loadTasksListStale<Task>(user.id),
          loadRoutinesRawStale<Routine>(user.id),
          loadRoutineLogsListStale<RoutineLog>(user.id),
          loadGoalsListStale<Goal>(user.id)
        ]).then(([t, r, l, g]) => {
          if (t) setTasks(t);
          if (r) setRoutines(r);
          if (l) setRoutineLogs(l);
          if (g) setGoals(g);
        });
      }
    };
    window.addEventListener('stayhardy_refresh', handler);

    const scoreHandler = (e: any) => {
      setScoreData(e.detail);
    };
    window.addEventListener('productivity_sync', scoreHandler);

    return () => {
      window.removeEventListener('stayhardy_refresh', handler);
      window.removeEventListener('productivity_sync', scoreHandler);
    };
  }, [user?.id, fetchAllData]);

  const defaultCategories = ['Personal', 'Content', 'Health', 'Business'];
  const allCategories = Array.from(
    new Set([...defaultCategories, ...dbCategories, ...tasks.map((t: Task) => t.category)]),
  ).filter((c) => c && c !== '');

  const totalGoals = goals.length;
  const activeGoalsCount = goals.filter((g) => g.status === 'pending').length;
  const completedGoalsCount = goals.filter((g) => (g.status as string) === 'completed' || (g.status as string) === 'done' || (g.status as string) === 'achieved').length;
  const avgGoalProgress = scoreData?.goals_progress ?? (totalGoals > 0 ? Math.round((completedGoalsCount / totalGoals) * 100) : 0);

  const totalUserTasks = scoreData?.tasks_total ?? tasks.length;
  const completedUserTasks = scoreData?.tasks_completed ?? tasks.filter((t: Task) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const taskCompletionRate =
    scoreData?.tasks_progress ?? (totalUserTasks > 0 ? Math.round((completedUserTasks / totalUserTasks) * 100) : 0);

  const totalRoutines = routines.length;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDate = new Date();
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const activeRoutinesTodayCount = scoreData?.routines_total ?? routines.filter((r) => r.days?.includes(currentDayName)).length;

  const localTodayStr = new Date(todayDate.getTime() - todayDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const routinesCompletedToday = scoreData?.routines_completed ?? routineLogs.filter((l) => l.completed_at === localTodayStr).length;
  const todayRoutineRate =
    scoreData?.routines_progress ??
    (activeRoutinesTodayCount > 0 ? Math.round((routinesCompletedToday / activeRoutinesTodayCount) * 100) : 0);

  let currentStreak = 0;
  const uniqueLogDaysSet = new Set(routineLogs.map((l) => l.completed_at));
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const checkStr = new Date(checkDate.getTime() - checkDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const checkDayName = daysOfWeek[checkDate.getDay()];
    const scheduledThatDay = routines.filter((r) => r.days?.includes(checkDayName)).length;

    if (uniqueLogDaysSet.has(checkStr)) {
      currentStreak++;
    } else {
      if (i === 0) continue;
      if (scheduledThatDay === 0) continue;
      break;
    }
  }

  const startDateForConsistency = new Date();
  startDateForConsistency.setHours(0, 0, 0, 0);
  let expectedRoutinesLast7Days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDateForConsistency);
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    expectedRoutinesLast7Days += routines.filter((r) => r.days?.includes(dayName)).length;
  }

  const last7DaysLogs = routineLogs.filter((l) => {
    const d = new Date(l.completed_at);
    return startDateForConsistency.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
  });
  const weeklyConsistency =
    expectedRoutinesLast7Days > 0 ? Math.min(100, Math.round((last7DaysLogs.length / expectedRoutinesLast7Days) * 100)) : 0;

  const dynamicTodayScore = scoreData?.overall_score ?? calculateProductivityScore({
    tasksProgress: taskCompletionRate,
    routinesProgress: todayRoutineRate,
    goalsProgress: avgGoalProgress
  });

  const historicalData = useMemo(() => {
    const data: { name: string; tasks: number; goals: number; habits: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = d.getTime();
      const nextDayStart = dayStart + 24 * 60 * 60 * 1000;

      const tasksCompleted = tasks.filter((t) => {
        if (t.status !== 'completed' || !t.updatedAt) return false;
        const uDate = new Date(t.updatedAt).getTime();
        return uDate >= dayStart && uDate < nextDayStart;
      }).length;

      const goalsCompleted = goals.filter((g) => {
        if (!['completed', 'done', 'achieved'].includes(g.status.toLowerCase()) || !g.updatedAt) return false;
        const uDate = new Date(g.updatedAt).getTime();
        return uDate >= dayStart && uDate < nextDayStart;
      }).length;

      const habitsCompleted = routineLogs.filter((l) => {
        const logDate = new Date(l.completed_at + 'T00:00:00').getTime();
        return logDate >= dayStart && logDate < nextDayStart;
      }).length;

      data.push({ name: dayStr, tasks: tasksCompleted, goals: goalsCompleted, habits: habitsCompleted });
    }
    return data;
  }, [tasks, goals, trendDays]);

  const categoryStats = useMemo(() => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return allCategories
      .map((cat) => {
        const catTasks = tasks.filter((t: Task) => (t.category || 'Focus') === cat);
        const catRoutines = routines.filter((r: Routine) => (r.category || 'General') === cat);

        // Core Calculation: Progress = (Habit_Completion * 0.7) + (Task_Completion * 0.3)
        let taskRate: number | null = null;
        if (catTasks.length > 0) {
          const completed = catTasks.filter((t) => t.status === 'completed').length;
          taskRate = completed / catTasks.length;
        }

        let habitRate: number | null = null;
        if (catRoutines.length > 0) {
          let expected = 0;
          let actual = 0;
          const catRoutineIds = new Set(catRoutines.map(r => r.id));

          // Last 7 days discipline
          for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dayName = daysOfWeek[d.getDay()];
            
            expected += catRoutines.filter(r => r.days?.includes(dayName)).length;
            actual += routineLogs.filter(l => l.completed_at === dStr && catRoutineIds.has(l.routine_id)).length;
          }
          habitRate = expected > 0 ? actual / expected : 0;
        }

        // Simple average fallback
        const rate = taskRate !== null ? taskRate : (habitRate !== null ? habitRate : 0);

        return {
          name: cat,
          rate: Math.round(rate * 100),
          hasTasks: taskRate !== null,
          hasHabits: habitRate !== null
        };
      })

      .filter((stat): stat is NonNullable<typeof stat> => stat !== null && (stat.hasTasks || stat.hasHabits))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  }, [tasks, routines, routineLogs, allCategories]);



  const heatMap = useMemo(() => {
    const map: Record<string, number> = {};
    routineLogs.forEach((l) => {
      if (l.completed_at) {
        map[l.completed_at] = (map[l.completed_at] || 0) + 1;
      }
    });
    return map;
  }, [routineLogs]);

  const activeDays = useMemo(() => Object.keys(heatMap).length, [heatMap]);
  const bestStreak = useMemo(() => currentStreak, [currentStreak]);

  const getDaysArray = (range: '30D' | '90D' | '1Y') => {
    const arr: string[] = [];
    const days = range === '30D' ? 30 : range === '90D' ? 90 : 364;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      arr.push(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
    }
    return arr;
  };

  return (
    <FeatureGate moduleName="Stats" isPro={!!isPro}>
      <div 
        className={`page-shell stats-premium-page ${isSidebarHidden ? 'sidebar-hidden' : ''}`} 
        style={{ 
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#080C0A',
          overflowY: 'auto'
        }}
      >
        <div className="aurora-bg">
          <div className="aurora-gradient-1" />
          <div className="aurora-gradient-2" />
        </div>

        <main 
          className="stats-premium-main bouncing-scroll" 
          style={{ 
            flex: '1', 
            padding: '112px 0 120px 0'
          }}
        >
          <ScoreGauge score={dynamicTodayScore} />

          <InsightsTrend
            data={{
              tasks: historicalData.map(d => d.tasks),
              goals: historicalData.map(d => d.goals),
              habits: historicalData.map(d => d.habits)
            }}
            activeRange={trendDays === 7 ? '7D' : trendDays === 30 ? '30D' : '90D'}
            setActiveRange={(r) => setTrendDays(r === '7D' ? 7 : r === '30D' ? 30 : 90)}
          />

          <VerdictCard
            score={dynamicTodayScore}
            verdictText={getScoreBadge(dynamicTodayScore).fullVerdict}
          />

          <HabitHeatmap
            heatmapData={getDaysArray(heatmapRange).map(d => {
              const c = heatMap[d] || 0;
              return c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c >= 3 ? 4 : 3;
            })}
            activeRange={heatmapRange}
            setActiveRange={setHeatmapRange}
            statsData={{
              activeDays: activeDays,
              bestStreak: bestStreak,
              completionRate: activeDays > 0 ? Math.round((activeDays / getDaysArray(heatmapRange).length) * 100) : 0
            }}
          />

          <InsightCard
            type="tasks"
            data={{
              total: totalUserTasks,
              completed: completedUserTasks,
              pending: pendingCount
            }}
          />

          <InsightCard
            type="goals"
            data={{
              total: totalGoals,
              active: activeGoalsCount,
              completed: completedGoalsCount
            }}
          />

          <InsightCard
            type="habits"
            data={{
              total: totalRoutines,
              today: routinesCompletedToday,
              streak: currentStreak,
              consistency: weeklyConsistency
            }}
          />

          <section className="stats-category-section" style={{ marginBottom: '20px' }}>
            <p style={{
              fontSize: '10px',
              fontWeight: '800',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.15em',
              padding: '8px 16px',
              margin: '0 0 10px 0'
            }}>
              CATEGORY INSIGHT
            </p>

            <div style={{ padding: '0 0 24px 0' }}>
              {categoryStats.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  padding: '0 16px',
                }}>
                  {categoryStats.map((cat, i) => (
                    <CategoryInsightCard
                      key={i}
                      categoryName={cat.name}
                      score={cat.rate}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ padding: '0 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>No category data available yet.</p>
                </div>
              )}
            </div>
          </section>
        </main>


        
        <style>{`
          @keyframes gaugeLoad {
            from { stroke-dashoffset: 565 }
            to { stroke-dashoffset: var(--target) }
          }
          .stats-premium-main {
            display: flex;
            flex-direction: column;
            gap: 1.15rem;
            max-width: 720px;
            margin: 0 auto;
            padding: 0 0.35rem;
          }
          /* Add other specific stats styles if needed, though most are likely global or inline already */
        `}</style>
      </div>
    </FeatureGate>
  );
};

export default Stats;

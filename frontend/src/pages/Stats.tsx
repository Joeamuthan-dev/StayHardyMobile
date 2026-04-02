import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { syncWidgetData } from '../lib/syncWidgetData';
import { isCacheExpired } from '../lib/cacheManager';
import { CACHE_KEYS, CACHE_EXPIRY_MINUTES } from '../lib/cacheKeys';
import { loadStatsPageStale, persistStatsPageCache } from '../lib/statsPageCache';
import { ProductivityService, type ProductivityScoreData } from '../lib/ProductivityService';
import { getScoreLabels } from '../utils/productivity';

import { useLoading } from '../context/LoadingContext';

interface Task {
  id: string;
  status: 'pending' | 'completed';

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
}: {
  heatmapData: number[];
  activeRange: string;
  setActiveRange: (r: '30D' | '90D' | '1Y') => void;
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




const VerdictCard = ({ score, totalItems }: { score: number; totalItems: number }) => {
  const getVerdict = (s: number) => {
    if (s >= 90) return { icon: '🏆', color: '#FFD700', glow: 'rgba(255,215,0,0.3)' };
    if (s >= 75) return { icon: '⚡', color: '#00E87A', glow: 'rgba(0,232,122,0.3)' };
    if (s >= 60) return { icon: '🚀', color: '#06B6D4', glow: 'rgba(6,182,212,0.3)' };
    if (s >= 40) return { icon: '💪', color: '#F59E0B', glow: 'rgba(245,158,11,0.3)' };
    if (s >= 20) return { icon: '🔥', color: '#F97316', glow: 'rgba(249,115,22,0.3)' };
    return { icon: '👻', color: '#6B7280', glow: 'rgba(107,114,128,0.2)' };
  };
  const v = getVerdict(score);
  const labels = useMemo(() => getScoreLabels(score, totalItems), [score, totalItems]);
  return (
    <div style={{ ...cardStyle, padding: '20px', border: `0.5px solid ${v.color}40`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '200px', background: `radial-gradient(circle, ${v.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ padding: '20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ fontSize: '28px', filter: `drop-shadow(0 0 12px ${v.glow})` }}>{v.icon}</div>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: '0 0 2px 0' }}>THE VERDICT</p>
            <p style={{ fontSize: '14px', fontWeight: 900, color: v.color, margin: 0, letterSpacing: '0.04em', fontFamily: 'monospace' }}>{labels.label}</p>
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '14px' }} />
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.7, fontWeight: 400 }}>{labels.verdict}</p>
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



// ─── STREAK MILESTONE CARD ───────────────────────────────────────────────────
const StreakMilestoneCard = ({ currentStreak, bestStreak }: { currentStreak: number; bestStreak: number }) => {
  const getStreakLabel = (s: number) => {
    if (s >= 100) return { label: 'LEGENDARY', color: '#FFD700' };
    if (s >= 60)  return { label: 'UNSTOPPABLE', color: '#00E87A' };
    if (s >= 30)  return { label: 'ON FIRE', color: '#F97316' };
    if (s >= 14)  return { label: 'MOMENTUM', color: '#06B6D4' };
    if (s >= 7)   return { label: 'BUILDING', color: '#A855F7' };
    if (s >= 1)   return { label: 'STARTED', color: '#6B7280' };
    return { label: 'START TODAY', color: '#6B7280' };
  };
  const badge = getStreakLabel(currentStreak);
  const isPB = currentStreak > 0 && currentStreak >= bestStreak;
  return (
    <div style={{ margin: '0 16px 12px 16px', background: '#0A0F0D', border: '1px solid rgba(0,232,122,0.18)', borderRadius: '20px', padding: '18px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: 0 }}>STREAK</p>
        <div style={{ background: `${badge.color}18`, border: `1px solid ${badge.color}40`, borderRadius: '10px', padding: '3px 10px', fontSize: '9px', fontWeight: 900, color: badge.color, letterSpacing: '0.1em' }}>
          {badge.label}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, background: 'linear-gradient(145deg,#050a07,#080f0a)', borderRadius: '16px', padding: '16px', boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', border: '1px solid rgba(0,232,122,0.1)' }}>
          <span style={{ fontSize: '13px', animation: 'flamePulse 1.2s ease-in-out infinite' }}>🔥</span>
          <span style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', fontFamily: 'monospace', lineHeight: 1 }}>{currentStreak}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>CURRENT</span>
          {isPB && <span style={{ fontSize: '8px', fontWeight: 800, color: '#00E87A', letterSpacing: '0.08em', background: 'rgba(0,232,122,0.1)', borderRadius: '6px', padding: '2px 6px' }}>PERSONAL BEST</span>}
        </div>
        <div style={{ flex: 1, background: 'linear-gradient(145deg,#050a07,#080f0a)', borderRadius: '16px', padding: '16px', boxShadow: 'inset 2px 2px 8px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '13px' }}>🏆</span>
          <span style={{ fontSize: '36px', fontWeight: 900, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', lineHeight: 1 }}>{bestStreak}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>BEST EVER</span>
        </div>
      </div>
    </div>
  );
};

// ─── DAY OF WEEK PATTERN CHART ───────────────────────────────────────────────
const weekBarColor = (ratio: number): string => {
  if (ratio <= 0) return 'rgba(255,255,255,0.08)';
  const r1 = [255, 59, 48], r2 = [255, 204, 0], r3 = [0, 230, 118];
  const [a, b] = ratio < 0.5 ? [r1, r2, ratio * 2] : [r2, r3, (ratio - 0.5) * 2] as [number[], number[], number];
  const t = ratio < 0.5 ? ratio * 2 : (ratio - 0.5) * 2;
  const lerp = (s: number, e: number) => Math.round(s + (e - s) * t);
  return `rgb(${lerp(a[0], b[0])},${lerp(a[1], b[1])},${lerp(a[2], b[2])})`;
};

const DayOfWeekChart = ({ data }: { data: { day: string; count: number }[] }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  const bestDayIdx = data.reduce((bi, d, i) => d.count > data[bi].count ? i : bi, 0);
  return (
    <div style={{ margin: '0 16px 12px 16px', background: '#0A0F0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '18px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: 0 }}>WEEKLY PATTERN</p>
        {data[bestDayIdx].count > 0 && (
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#00E87A', letterSpacing: '0.06em' }}>
            PEAK: {data[bestDayIdx].day.toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', padding: '0 4px' }}>
        {data.map((d, i) => {
          const ratio = max > 0 ? d.count / max : 0;
          const heightPct = ratio * 100;
          const isBest = i === bestDayIdx && d.count > 0;
          const color = weekBarColor(ratio);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${Math.max(heightPct, 4)}%`,
                background: color,
                borderRadius: '4px 4px 2px 2px',
                boxShadow: isBest ? `0 0 8px ${color}80` : 'none',
                transition: 'height 0.8s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
              <span style={{ fontSize: '9px', fontWeight: isBest ? 800 : 600, color: isBest ? '#00E87A' : 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>{d.day}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '8px 12px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
          {data[bestDayIdx].count > 0
            ? `You complete the most habits on ${data[bestDayIdx].day}s — keep that momentum.`
            : 'Complete habits to see your weekly pattern.'}
        </span>
      </div>
    </div>
  );
};

const CategoryRadarChart = ({ categories }: { categories: { name: string; rate: number }[] }) => {
  const navigate = useNavigate();
  if (categories.length === 0) {
    return (
      <div style={{ ...cardStyle, padding: '20px', border: '0.5px solid rgba(255,255,255,0.08)', margin: '0 16px 12px 16px' }}>
        <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: '0 0 12px 0' }}>CATEGORY RADAR</p>
        <p
          onClick={() => navigate('/routine')}
          style={{ fontSize: '12px', color: '#00E676', textAlign: 'center', cursor: 'pointer', margin: 0 }}
        >
          Create your first habit →
        </p>
      </div>
    );
  }

  const data = categories.map(cat => ({
    subject: cat.name.length > 9 ? cat.name.slice(0, 8) + '…' : cat.name,
    score: cat.rate,
    fullMark: 100,
  }));

  const strongest = categories[0];
  const weakest = categories[categories.length - 1];

  return (
    <div style={{ ...cardStyle, padding: '20px', border: '0.5px solid rgba(0,232,122,0.15)', margin: '0 16px 12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <p style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', margin: 0 }}>
          CATEGORY RADAR
        </p>
        <span style={{ fontSize: '9px', color: 'rgba(0,232,122,0.6)', fontWeight: '700', letterSpacing: '0.06em' }}>
          {categories.length} {categories.length === 1 ? 'CATEGORY' : 'CATEGORIES'}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <RadarChart key={categories.map(c => `${c.name}:${c.rate}`).join('|')} data={data} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#00E87A"
            fill="#00E87A"
            fillOpacity={0.18}
            strokeWidth={2}
            dot={{ fill: '#00E87A', r: 3 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '8px',
        padding: '10px 14px',
        background: 'rgba(0,232,122,0.04)',
        border: '1px solid rgba(0,232,122,0.1)',
        borderRadius: '12px'
      }}>
        <div>
          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', fontWeight: '800', letterSpacing: '0.1em', margin: '0 0 3px 0' }}>STRONGEST</p>
          <p style={{ fontSize: '13px', color: '#00E87A', fontWeight: '900', margin: 0, fontFamily: 'monospace' }}>
            {strongest.name}&nbsp;
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{strongest.rate}%</span>
          </p>
        </div>
        {categories.length > 1 && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)', fontWeight: '800', letterSpacing: '0.1em', margin: '0 0 3px 0' }}>NEEDS WORK</p>
            <p style={{ fontSize: '13px', color: '#F97316', fontWeight: '900', margin: 0, fontFamily: 'monospace' }}>
              {weakest.name}&nbsp;
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '700' }}>{weakest.rate}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
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
      supabase.from('tasks').select('id, status, createdAt, updatedAt').eq('userId', user.id),
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

    setTasks(tasksArr);
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
      await fetchAllData({ force: true });
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

    const routinesChannel = supabase
      .channel('stats_routines_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routines', filter: `user_id=eq.${user.id}` }, () => {
        void fetchAllData({ force: true });
      })
      .subscribe();

    const routineLogsChannel = supabase
      .channel('stats_routine_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_logs', filter: `user_id=eq.${user.id}` }, () => {
        void fetchAllData({ force: true });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(routinesChannel);
      supabase.removeChannel(routineLogsChannel);
    };
  }, [user, fetchAllData]);

  useEffect(() => {
    const handler = () => {
      if (user?.id) {
        void fetchAllData({ force: true });
      }
    };
    window.addEventListener('stayhardy_refresh', handler);

    const scoreHandler = (e: any) => {
      setScoreData(e.detail);
    };
    window.addEventListener('productivity_sync', scoreHandler);

    const logToggleHandler = (e: CustomEvent<{ routine_id: string; completed_at: string; action: 'add' | 'remove' }>) => {
      const { routine_id, completed_at, action } = e.detail;
      setRoutineLogs((prev) => {
        if (action === 'add') {
          if (prev.some((l) => l.routine_id === routine_id && l.completed_at === completed_at)) return prev;
          return [...prev, { routine_id, completed_at }];
        } else {
          return prev.filter((l) => !(l.routine_id === routine_id && l.completed_at === completed_at));
        }
      });
    };
    window.addEventListener('routine_log_toggled', logToggleHandler as EventListener);

    return () => {
      window.removeEventListener('stayhardy_refresh', handler);
      window.removeEventListener('productivity_sync', scoreHandler);
      window.removeEventListener('routine_log_toggled', logToggleHandler as EventListener);
    };
  }, [user?.id, fetchAllData]);

  const allCategories = Array.from(
    new Set([
      ...routines.map((r: Routine) => r.category || 'General'),
      ...dbCategories,
    ]),
  ).filter((c) => c && c !== '');

  const totalGoals = goals.length;
  const activeGoalsCount = goals.filter((g) => g.status === 'pending').length;
  const completedGoalsCount = goals.filter((g) => (g.status as string) === 'completed' || (g.status as string) === 'done' || (g.status as string) === 'achieved').length;

  const totalUserTasks = scoreData?.tasks_total ?? tasks.length;
  const completedUserTasks = scoreData?.tasks_completed ?? tasks.filter((t: Task) => t.status === 'completed').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  const totalRoutines = routines.length;
  const dynamicTodayScore = scoreData?.overall_score ?? 0;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Client-side streak calc (fallback if DB columns not yet populated)
  let clientStreak = 0;
  const uniqueLogDaysSet = new Set(routineLogs.map((l) => l.completed_at));
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - i);
    const checkStr = new Date(checkDate.getTime() - checkDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const checkDayName = daysOfWeek[checkDate.getDay()];
    const scheduledThatDay = routines.filter((r) => r.days?.includes(checkDayName)).length;

    if (uniqueLogDaysSet.has(checkStr)) {
      clientStreak++;
    } else {
      if (i === 0) continue;
      if (scheduledThatDay === 0) continue;
      break;
    }
  }
  // Use DB streak if available, otherwise fall back to client calc
  const currentStreak = (user?.currentStreak != null && user.currentStreak > 0) ? user.currentStreak : clientStreak;



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

    return allCategories
      .map((cat) => {
        const catRoutines = routines.filter((r: Routine) => (r.category || 'General') === cat);

        let habitRate: number | null = null;
        if (catRoutines.length > 0) {
          let expected = 0;
          let actual = 0;
          const catRoutineIds = new Set(catRoutines.map(r => r.id));

          // Last 7 days — use UTC date arithmetic to match how completed_at is stored
          for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setUTCDate(d.getUTCDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dayName = daysOfWeek[d.getUTCDay()];

            expected += catRoutines.filter(r => r.days?.includes(dayName)).length;
            actual += routineLogs.filter(l => l.completed_at === dStr && catRoutineIds.has(l.routine_id)).length;
          }
          habitRate = expected > 0 ? actual / expected : 0;
        }

        const rate = habitRate ?? 0;

        return {
          name: cat,
          rate: Math.round(rate * 100),
          hasHabits: habitRate !== null
        };
      })

      .filter((stat): stat is NonNullable<typeof stat> => stat !== null && stat.hasHabits)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);
  }, [routines, routineLogs, allCategories]);



  const heatMap = useMemo(() => {
    const map: Record<string, number> = {};
    routineLogs.forEach((l) => {
      if (l.completed_at) {
        map[l.completed_at] = (map[l.completed_at] || 0) + 1;
      }
    });
    return map;
  }, [routineLogs]);

  const bestStreak = (user?.bestStreak != null && user.bestStreak > 0) ? user.bestStreak : currentStreak;

  const dayOfWeekData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    routineLogs.forEach(log => {
      if (!log.completed_at) return;
      const d = new Date(log.completed_at);
      const idx = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
      counts[idx]++;
    });
    return days.map((day, i) => ({ day, count: counts[i] }));
  }, [routineLogs]);

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
          {/* 1. Streak — personal milestone, unique opener */}
          <StreakMilestoneCard currentStreak={currentStreak} bestStreak={bestStreak} />

          {/* 2. Habit Heatmap — most visual, most unique */}
          <HabitHeatmap
            heatmapData={getDaysArray(heatmapRange).map(d => {
              const c = heatMap[d] || 0;
              return c === 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c >= 3 ? 4 : 3;
            })}
            activeRange={heatmapRange}
            setActiveRange={setHeatmapRange}
          />

          {/* 3. Weekly Pattern — deeply personal, not on home */}
          <DayOfWeekChart data={dayOfWeekData} />

          {/* 4. Historical Trend */}
          <InsightsTrend
            data={{
              tasks: historicalData.map(d => d.tasks),
              goals: historicalData.map(d => d.goals),
              habits: historicalData.map(d => d.habits)
            }}
            activeRange={trendDays === 7 ? '7D' : trendDays === 30 ? '30D' : '90D'}
            setActiveRange={(r) => setTrendDays(r === '7D' ? 7 : r === '30D' ? 30 : 90)}
          />

          {/* 5. Category Radar */}
          <CategoryRadarChart categories={categoryStats} />

          {/* 6. Breakdown cards */}
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

          <VerdictCard
            score={dynamicTodayScore}
            totalItems={totalUserTasks + totalGoals + totalRoutines}
          />

        </main>


        
        <style>{`
          @keyframes gaugeLoad {
            from { stroke-dashoffset: 565 }
            to { stroke-dashoffset: var(--target) }
          }
          @keyframes flamePulse {
            0%, 100% { transform: scale(1) rotate(-8deg); filter: drop-shadow(0 0 4px rgba(255,100,0,0.8)); }
            50% { transform: scale(1.35) rotate(8deg); filter: drop-shadow(0 0 12px rgba(255,160,0,1)); }
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
  );
};

export default Stats;

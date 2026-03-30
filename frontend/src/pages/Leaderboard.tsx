// src/pages/Leaderboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCcw, Users, Shield, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  rank: number;
}

interface Routine {
  id: string;
  days: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthStr(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

const AVATAR_COLORS = [
  '#E84040', '#E87A00', '#E8C200', '#00C853', '#0091EA',
  '#7B1FA2', '#00838F', '#F06292', '#FF7043', '#26A69A',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Score computation ────────────────────────────────────────────────────────

async function computeMonthScore(userId: string): Promise<number> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const monthStart = `${monthStr}-01`;
  const today = now.toISOString().split('T')[0];

  const [{ data: routinesData }, { data: logsData }] = await Promise.all([
    supabase.from('routines').select('id, days').eq('user_id', userId),
    supabase
      .from('routine_logs')
      .select('completed_at')
      .eq('user_id', userId)
      .gte('completed_at', monthStart)
      .lte('completed_at', today),
  ]);

  const routineList: Routine[] = routinesData ?? [];
  const logCountByDay = new Map<string, number>();
  for (const log of logsData ?? []) {
    const day = log.completed_at as string;
    logCountByDay.set(day, (logCountByDay.get(day) ?? 0) + 1);
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let totalPoints = 0;
  const daysElapsed = now.getDate();

  for (let d = 1; d <= daysElapsed; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    const dayName = daysOfWeek[new Date(year, month - 1, d).getDay()];
    const scheduled = routineList.filter((r) => r.days?.includes(dayName)).length;
    if (scheduled === 0) continue;
    const completed = logCountByDay.get(dateStr) ?? 0;
    totalPoints += Math.min(10, (completed / scheduled) * 10);
  }

  return Math.round(totalPoints * 10) / 10;
}

// ─── Avatar component ─────────────────────────────────────────────────────────

interface AvatarProps {
  avatar_url: string | null;
  display_name: string;
  size: number;
}

const Avatar: React.FC<AvatarProps> = ({ avatar_url, display_name, size }) => {
  const initial = display_name.charAt(0).toUpperCase();
  const bgColor = getAvatarColor(display_name);

  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={display_name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: size * 0.4,
        fontWeight: 700,
        color: '#fff',
      }}
    >
      {initial}
    </div>
  );
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const TrophySVG: React.FC<{ size?: number; color?: string }> = ({ size = 24, color = '#FFD700' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M8 21h8M12 17v4M7 3H5C4.4 3 4 3.4 4 4v3c0 3.3 2.7 6 6 6M17 3h2c.6 0 1 .4 1 1v3c0 3.3-2.7 6-6 6M7 3h10v6c0 2.8-2.2 5-5 5s-5-2.2-5-5V3z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrownSVG: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = '#FFD700' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M2 17L4 9L8.5 13L12 6L15.5 13L20 9L22 17H2Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity="0.2"
    />
    <path d="M2 17H22" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);


const CheckSVG: React.FC<{ color?: string }> = ({ color = '#00E87A' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <path d="M5 8L7 10L11 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CrossSVG: React.FC<{ color?: string }> = ({ color = '#EF4444' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
    <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);


// ─── Skeleton row ─────────────────────────────────────────────────────────────

const SkeletonRow: React.FC<{ index: number }> = ({ index }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      borderRadius: '14px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
      marginBottom: '8px',
      animation: `pulse 1.5s ease-in-out ${index * 0.15}s infinite`,
    }}
  >
    <div style={{ width: '28px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ flex: 1, height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }} />
    <div style={{ width: '48px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }} />
  </div>
);

// ─── Not Joined View ──────────────────────────────────────────────────────────

// Reusable stat chip for the compact top row
const StatChip: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}> = ({ icon, value, label, accent }) => (
  <div style={{
    flex: 1,
    borderRadius: '14px',
    padding: '12px 8px',
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid rgba(255,255,255,0.07)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
  }}>
    <div style={{
      width: '30px', height: '30px', borderRadius: '9px',
      background: `${accent}18`,
      border: `1px solid ${accent}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
    <span style={{
      fontFamily: 'Syne, sans-serif', fontWeight: 800,
      fontSize: '18px', color: accent, lineHeight: 1,
    }}>{value}</span>
    <span style={{
      fontSize: '9px', color: 'rgba(255,255,255,0.35)',
      letterSpacing: '0.05em', lineHeight: 1.2, textAlign: 'center',
    }}>{label}</span>
  </div>
);

interface NotJoinedViewProps {
  isPro: boolean;
  hasHabits: boolean;
  joining: boolean;
  onJoin: () => void;
}

const NotJoinedView: React.FC<NotJoinedViewProps> = ({ isPro, hasHabits, joining, onJoin }) => {
  const navigate = useNavigate();
  const eligible = isPro && hasHabits;

  return (
    /* Fixed overlay — covers bottom nav entirely */
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#060606',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* subtle radial glow behind trophy */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Header ── */}
      <div style={{
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 18px 10px',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronLeft size={20} color="white" />
        </button>
      </div>

      {/* ── Hero: Trophy + tagline ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '16px 0 14px', flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(255,215,0,0.2), rgba(255,140,0,0.05))',
          border: '1px solid rgba(255,215,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(255,215,0,0.2), 0 0 80px rgba(255,215,0,0.06)',
        }}>
          <TrophySVG size={44} color="#FFD700" />
        </div>
        <p style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '10px',
          color: 'rgba(255,255,255,0.28)', letterSpacing: '0.22em',
          textTransform: 'uppercase', margin: '10px 0 0',
        }}>Compete · Earn · Dominate</p>
      </div>

      {/* ── What is Hardy Board ── */}
      <div style={{
        margin: '0 18px 10px', borderRadius: '16px', padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.07) 0%, rgba(15,15,15,0.95) 100%)',
        border: '1px solid rgba(255,215,0,0.13)',
        position: 'relative', zIndex: 1, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <TrophySVG size={14} color="#FFD700" />
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
            color: '#FFD700', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>What is Hardy Board?</span>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.55)', fontSize: '12px', lineHeight: 1.6,
          margin: 0,
        }}>
          Hardy Board is a <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>monthly habit competition</span> for Pro warriors.
          Complete your daily habits, earn points, and climb the ranks.
          The most consistent warrior wins — <span style={{ color: '#00E87A', fontWeight: 600 }}>stay hard, stay on top.</span>
        </p>
      </div>

      {/* ── 3 Compact Stat Chips ── */}
      <div style={{
        display: 'flex', gap: '8px', padding: '0 18px', flexShrink: 0,
        position: 'relative', zIndex: 1,
      }}>
        <StatChip
          icon={<Zap size={14} color="#00E87A" fill="#00E87A" />}
          value="10"
          label="max pts/day"
          accent="#00E87A"
        />
        <StatChip
          icon={<RefreshCcw size={14} color="#7EB3FF" />}
          value="↺"
          label="monthly reset"
          accent="#7EB3FF"
        />
        <StatChip
          icon={<Users size={14} color="#FFD700" />}
          value="50"
          label="warriors"
          accent="#FFD700"
        />
      </div>

      {/* ── How Points Work ── */}
      <div style={{
        margin: '10px 18px 0', borderRadius: '18px', padding: '16px',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.06) 0%, rgba(20,20,20,0.9) 100%)',
        border: '1px solid rgba(255,215,0,0.12)',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '7px',
            background: 'rgba(255,215,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={12} color="#FFD700" fill="#FFD700" />
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
            color: '#FFD700', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>How Points Work</span>
        </div>
        {[
          { pct: '100%', pts: '10 pts', color: '#00E87A', fill: 1 },
          { pct: '50%',  pts: '5 pts',  color: '#FFD700', fill: 0.5 },
          { pct: '0%',   pts: '0 pts',  color: 'rgba(255,255,255,0.25)', fill: 0.05 },
        ].map(({ pct, pts, color, fill }, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: i < 2 ? '10px' : 0,
          }}>
            {/* mini progress bar */}
            <div style={{
              width: '36px', height: '5px', borderRadius: '3px',
              background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{
                width: `${fill * 100}%`, height: '100%',
                background: color, borderRadius: '3px',
              }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', flex: 1 }}>
              Complete <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{pct}</span> of habits
            </span>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '12px', color,
            }}>{pts}</span>
          </div>
        ))}
      </div>

      {/* ── Eligibility ── */}
      <div style={{
        margin: '10px 18px 0', borderRadius: '16px', padding: '14px 16px',
        background: eligible
          ? 'linear-gradient(135deg, rgba(0,232,122,0.07), rgba(20,20,20,0.9))'
          : 'rgba(255,255,255,0.025)',
        border: eligible ? '1px solid rgba(0,232,122,0.18)' : '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: '12px',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <Shield size={18} color={eligible ? '#00E87A' : 'rgba(255,255,255,0.2)'} />
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '10px',
            color: eligible ? '#00E87A' : 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px',
          }}>Eligibility</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 9px', borderRadius: '20px',
              background: isPro ? 'rgba(0,232,122,0.1)' : 'rgba(239,68,68,0.08)',
              border: isPro ? '1px solid rgba(0,232,122,0.25)' : '1px solid rgba(239,68,68,0.2)',
            }}>
              {isPro ? <CheckSVG color="#00E87A" /> : <CrossSVG color="#EF4444" />}
              <span style={{ fontSize: '10px', color: isPro ? '#00E87A' : '#EF4444', fontWeight: 600 }}>Pro</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 9px', borderRadius: '20px',
              background: hasHabits ? 'rgba(0,232,122,0.1)' : 'rgba(239,68,68,0.08)',
              border: hasHabits ? '1px solid rgba(0,232,122,0.25)' : '1px solid rgba(239,68,68,0.2)',
            }}>
              {hasHabits ? <CheckSVG color="#00E87A" /> : <CrossSVG color="#EF4444" />}
              <span style={{ fontSize: '10px', color: hasHabits ? '#00E87A' : '#EF4444', fontWeight: 600 }}>5+ Habits</span>
            </div>
          </div>
        </div>
        {!eligible && (
          <span style={{
            fontSize: '9px', color: 'rgba(239,68,68,0.7)',
            maxWidth: '80px', textAlign: 'right', lineHeight: 1.4,
          }}>
            {!isPro ? 'Upgrade to Pro' : 'Add more habits'}
          </span>
        )}
      </div>

      {/* ── JOIN Button ── */}
      <div style={{
        padding: '12px 18px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <button
          onClick={eligible ? onJoin : undefined}
          disabled={!eligible || joining}
          style={{
            width: '100%', padding: '16px',
            borderRadius: '16px',
            background: eligible
              ? 'linear-gradient(135deg, #FFD700 0%, #FF9500 100%)'
              : 'rgba(255,255,255,0.05)',
            border: eligible ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.06)',
            color: eligible ? '#000' : 'rgba(255,255,255,0.18)',
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '14px', letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: eligible ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: eligible ? '0 0 32px rgba(255,215,0,0.4), 0 4px 16px rgba(255,150,0,0.2)' : 'none',
            transition: 'all 0.2s ease',
            opacity: joining ? 0.7 : 1,
          }}
        >
          {joining ? (
            <>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.25)', borderTop: '2px solid #000',
                animation: 'spin 0.8s linear infinite',
              }} />
              Joining...
            </>
          ) : (
            <>
              <TrophySVG size={17} color={eligible ? '#000' : 'rgba(255,255,255,0.18)'} />
              Join the Board
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

// ─── Gold Coin Points display ──────────────────────────────────────────────────

const GoldCoin: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7.5" fill="#FFD700" fillOpacity="0.9" />
    <circle cx="8" cy="8" r="5.5" fill="#FFA500" fillOpacity="0.6" />
    <circle cx="8" cy="8" r="3.5" fill="#FFD700" />
    <circle cx="6" cy="6" r="1.2" fill="white" fillOpacity="0.35" />
  </svg>
);

const PointsDisplay: React.FC<{ points: number; size?: 'sm' | 'md' | 'lg'; isMe?: boolean }> = ({
  points, size = 'md', isMe = false,
}) => {
  const fontSize = size === 'lg' ? 20 : size === 'md' ? 15 : 13;
  const coinSize = size === 'lg' ? 15 : size === 'md' ? 13 : 11;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <GoldCoin size={coinSize} />
      <span style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 700,
        fontSize,
        color: isMe ? '#00E87A' : '#FFD700',
        letterSpacing: '-0.01em',
      }}>
        {points}
      </span>
      <span style={{ fontSize: fontSize * 0.7, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>pts</span>
    </span>
  );
};

// ─── Joined / Leaderboard View ────────────────────────────────────────────────

interface JoinedViewProps {
  userId: string;
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onLeave: () => Promise<void>;
}

const JoinedView: React.FC<JoinedViewProps> = ({ userId, entries, loading, error, onRetry, onLeave }) => {
  const [showMore, setShowMore] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const now = new Date();
  const monthLabel = getMonthLabel(getMonthStr(now));

  const myEntry = entries.find((e) => e.user_id === userId);
  const rank1 = entries.find((e) => e.rank === 1);
  const rank2 = entries.find((e) => e.rank === 2);
  const rank3 = entries.find((e) => e.rank === 3);
  const top10rest = entries.filter((e) => e.rank >= 4 && e.rank <= 10);
  const beyond10 = entries.filter((e) => e.rank > 10);
  const visibleBeyond = showMore ? beyond10 : beyond10.slice(0, 20);

  // Animated podium avatar with fire/glow effect per rank
  const PodiumAvatar: React.FC<{
    entry: LeaderboardEntry;
    rank: number;
    avatarSize: number;
  }> = ({ entry, rank, avatarSize }) => {
    const isMe = entry.user_id === userId;
    const animClass = rank === 1 ? 'fire-gold' : rank === 2 ? 'fire-silver' : 'fire-bronze';
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* animated glow ring */}
        <div className={animClass} style={{
          borderRadius: '50%',
          padding: '3px',
          display: 'inline-block',
          lineHeight: 0,
        }}>
          <div style={{
            borderRadius: '50%',
            overflow: 'hidden',
            lineHeight: 0,
            border: rank === 1
              ? '2px solid rgba(255,215,0,0.6)'
              : rank === 2
              ? '2px solid rgba(192,192,192,0.5)'
              : '2px solid rgba(205,127,50,0.5)',
          }}>
            <Avatar avatar_url={entry.avatar_url} display_name={entry.display_name} size={avatarSize} />
          </div>
        </div>
        {/* rank badge */}
        <div style={{
          position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
          width: rank === 1 ? '24px' : '20px', height: rank === 1 ? '24px' : '20px',
          borderRadius: '50%',
          background: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #000',
          boxShadow: rank === 1 ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
        }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: rank === 1 ? '12px' : '10px', color: '#000',
          }}>{rank}</span>
        </div>
        {/* "You" tag for self */}
        {isMe && (
          <div style={{
            position: 'absolute', top: -8, right: -8,
            padding: '2px 5px', borderRadius: '5px',
            background: '#00E87A', border: '1px solid #00E87A',
          }}>
            <span style={{ fontSize: '8px', fontWeight: 800, color: '#000' }}>YOU</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040404',
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
      paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
      overflowY: 'auto',
    }}>

      {/* ── Board info card with Leave on the right ── */}
      <div style={{
        margin: 'calc(env(safe-area-inset-top, 0px) + 12px) 16px 16px',
        borderRadius: '14px', padding: '10px 14px',
        background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(10,10,10,0.95))',
        border: '1px solid rgba(255,215,0,0.15)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <TrophySVG size={18} color="#FFD700" />
        <div style={{ flex: 1 }}>
          <span style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 700, fontSize: '14px',
            color: '#FFD700', letterSpacing: '0.02em',
          }}>Hardy Board</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: '8px' }}>
            {monthLabel}
          </span>
        </div>
        <button onClick={() => setShowLeaveConfirm(true)} style={{
          padding: '6px 12px', borderRadius: '8px', flexShrink: 0,
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)',
          color: 'rgba(239,68,68,0.75)', fontSize: '11px', fontWeight: 700,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
          Leave
        </button>
      </div>

      {/* Leave confirmation modal */}
      {showLeaveConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 20000,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            width: '100%', maxWidth: '340px',
            background: 'linear-gradient(145deg, #0D0D0D, #0A0A0A)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '24px', padding: '28px 24px',
            boxShadow: '0 0 60px rgba(239,68,68,0.12), 0 24px 48px rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px', margin: '0 auto 16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px',
              color: '#FFFFFF', textAlign: 'center', margin: '0 0 10px',
            }}>Leave Hardy Board?</h2>
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.6,
              textAlign: 'center', margin: '0 0 24px',
            }}>
              All your board data and scores will be permanently deleted. If you rejoin, you start fresh from 0 points.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowLeaveConfirm(false)} disabled={leaving} style={{
                flex: 1, padding: '13px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
              }}>Cancel</button>
              <button
                onClick={async () => {
                  setLeaving(true);
                  try { await onLeave(); } finally {
                    setLeaving(false); setShowLeaveConfirm(false);
                  }
                }}
                disabled={leaving}
                style={{
                  flex: 1, padding: '13px', borderRadius: '14px',
                  background: leaving ? 'rgba(239,68,68,0.3)' : '#EF4444',
                  border: 'none', color: '#fff', fontSize: '14px', fontWeight: 800,
                  cursor: leaving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {leaving ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Leaving...
                  </>
                ) : 'Yes, Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: '0 16px' }}>
          <SkeletonRow index={0} /><SkeletonRow index={1} /><SkeletonRow index={2} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '0 16px' }}>
          <div style={{
            padding: '24px', borderRadius: '16px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center',
          }}>
            <p style={{ color: 'rgba(239,68,68,0.9)', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
            <button onClick={onRetry} style={{
              padding: '10px 20px', borderRadius: '10px', background: '#EF4444',
              border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Retry</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <TrophySVG size={52} color="#FFD700" />
          <p style={{ color: '#FFD700', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '18px', marginTop: '16px', marginBottom: '8px' }}>
            Be the first warrior!
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No one on the board yet. Lead the charge!</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {/* ── TOP 3 PODIUM ── */}
          <div style={{
            padding: '0 16px 4px',
            background: 'linear-gradient(180deg, rgba(255,215,0,0.05) 0%, transparent 100%)',
          }}>
            {/* Rank 1 — center, elevated, fire animated */}
            {rank1 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                marginBottom: '4px', position: 'relative',
              }}>
                {/* fire glow backdrop */}
                <div style={{
                  position: 'absolute', top: 0, width: '160px', height: '160px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,180,0,0.18) 0%, rgba(255,80,0,0.08) 50%, transparent 70%)',
                  animation: 'fireGlow 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
                <CrownSVG size={30} color="#FFD700" />
                <div style={{ marginTop: '4px' }}>
                  <PodiumAvatar entry={rank1} rank={1} avatarSize={90} />
                </div>
                <p style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px',
                  color: '#FFFFFF', margin: '12px 0 4px', textAlign: 'center',
                  maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {rank1.user_id === userId ? 'You' : rank1.display_name}
                </p>
                <PointsDisplay points={rank1.points} size="lg" isMe={rank1.user_id === userId} />
              </div>
            )}

            {/* Rank 2 + Rank 3 side by side */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {[rank2, rank3].map((entry, idx) => {
                const rank = idx === 0 ? 2 : 3;
                if (!entry) return <div key={rank} style={{ flex: 1 }} />;
                const isMe = entry.user_id === userId;
                return (
                  <div key={entry.user_id} style={{
                    flex: 1, borderRadius: '18px', padding: '14px 12px',
                    background: rank === 2
                      ? 'linear-gradient(145deg, rgba(192,192,192,0.08), rgba(10,10,10,0.9))'
                      : 'linear-gradient(145deg, rgba(205,127,50,0.08), rgba(10,10,10,0.9))',
                    border: rank === 2
                      ? '1px solid rgba(192,192,192,0.18)'
                      : '1px solid rgba(205,127,50,0.18)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  }}>
                    <PodiumAvatar entry={entry} rank={rank} avatarSize={64} />
                    <p style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '13px',
                      color: '#FFFFFF', margin: '6px 0 0', textAlign: 'center',
                      maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {isMe ? 'You' : entry.display_name}
                    </p>
                    <PointsDisplay points={entry.points} size="sm" isMe={isMe} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── YOUR RANK — always visible ── */}
          <div style={{ padding: '14px 16px 0' }}>
            <div style={{
              borderRadius: '16px',
              background: myEntry
                ? 'linear-gradient(90deg, rgba(0,232,122,0.15) 0%, rgba(0,232,122,0.04) 100%)'
                : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(0,232,122,0.22)',
              padding: '13px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              {myEntry ? (
                <>
                  <Avatar avatar_url={myEntry.avatar_url} display_name={myEntry.display_name} size={40} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#00E87A', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', margin: 0 }}>
                      YOUR RANK
                    </p>
                    <p style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 600, margin: '2px 0 0' }}>
                      {myEntry.display_name}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                      <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 600, fontSize: '13px', color: '#00E87A', opacity: 0.7 }}>#</span>
                      <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 800, fontSize: '28px', color: '#00E87A' }}>{myEntry.rank}</span>
                    </p>
                    <div style={{ marginTop: '2px' }}>
                      <PointsDisplay points={myEntry.points} size="sm" isMe />
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textAlign: 'center', flex: 1 }}>
                  No habits logged yet this month
                </p>
              )}
            </div>
          </div>

          {/* ── RANKS 4–10 — prominent cards ── */}
          {top10rest.length > 0 && (
            <div style={{ padding: '16px 16px 0' }}>
              <p style={{
                color: 'rgba(255,255,255,0.2)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 10px',
              }}>Top 10</p>
              {top10rest.map((entry) => {
                const isMe = entry.user_id === userId;
                return (
                  <div key={entry.user_id} style={{
                    padding: '12px 14px', borderRadius: '16px', marginBottom: '8px',
                    background: isMe
                      ? 'linear-gradient(90deg, rgba(0,232,122,0.1), rgba(0,232,122,0.02))'
                      : 'rgba(255,255,255,0.035)',
                    border: isMe
                      ? '1px solid rgba(0,232,122,0.22)'
                      : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <span style={{
                      minWidth: '32px', textAlign: 'center',
                      display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center', gap: '1px',
                    }}>
                      <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 500, fontSize: '10px', color: isMe ? '#00E87A' : 'rgba(255,255,255,0.25)', opacity: 0.8 }}>#</span>
                      <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 800, fontSize: '18px', color: isMe ? '#00E87A' : 'rgba(255,255,255,0.5)' }}>{entry.rank}</span>
                    </span>
                    <Avatar avatar_url={entry.avatar_url} display_name={entry.display_name} size={44} />
                    <span style={{
                      flex: 1, fontSize: '14px', fontWeight: isMe ? 700 : 500,
                      color: isMe ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {isMe ? 'You' : entry.display_name}
                    </span>
                    <PointsDisplay points={entry.points} size="sm" isMe={isMe} />
                  </div>
                );
              })}
            </div>
          )}

          {/* ── RANKS 11–50 — compact list ── */}
          {beyond10.length > 0 && (
            <div style={{ padding: '16px 16px 0' }}>
              <p style={{
                color: 'rgba(255,255,255,0.2)', fontSize: '9px', fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 8px',
              }}>Rankings</p>
              {visibleBeyond.map((entry) => {
                const isMe = entry.user_id === userId;
                return (
                  <div key={entry.user_id} style={{
                    padding: '8px 12px', borderRadius: '12px', marginBottom: '5px',
                    background: isMe ? 'rgba(0,232,122,0.06)' : 'rgba(255,255,255,0.02)',
                    border: isMe ? '1px solid rgba(0,232,122,0.15)' : '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    <span style={{
                      minWidth: '26px', textAlign: 'center',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
                      color: isMe ? '#00E87A' : 'rgba(255,255,255,0.25)',
                    }}>{entry.rank}</span>
                    <Avatar avatar_url={entry.avatar_url} display_name={entry.display_name} size={32} />
                    <span style={{
                      flex: 1, fontSize: '12px', fontWeight: isMe ? 600 : 400,
                      color: isMe ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {isMe ? 'You' : entry.display_name}
                    </span>
                    <span style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px',
                      color: isMe ? '#00E87A' : 'rgba(255,215,0,0.6)',
                    }}>{entry.points}pts</span>
                  </div>
                );
              })}
              {beyond10.length > 20 && !showMore && (
                <button onClick={() => setShowMore(true)} style={{
                  width: '100%', padding: '11px', borderRadius: '12px', marginTop: '4px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Show More ({beyond10.length - 20} more)
                </button>
              )}
            </div>
          )}

          <p style={{
            textAlign: 'center', color: 'rgba(255,255,255,0.1)',
            fontSize: '10px', margin: '20px 16px 0',
          }}>
            Scores update when members visit Hardy Board
          </p>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fireGlow {
          0%,100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .fire-gold {
          animation: fireGoldRing 1.8s ease-in-out infinite;
        }
        .fire-silver {
          animation: fireSilverRing 2.2s ease-in-out infinite;
        }
        .fire-bronze {
          animation: fireBronzeRing 2.5s ease-in-out infinite;
        }
        @keyframes fireGoldRing {
          0%,100% { box-shadow: 0 0 0 3px rgba(255,215,0,0.5), 0 0 20px rgba(255,160,0,0.5), 0 0 40px rgba(255,80,0,0.25); }
          50% { box-shadow: 0 0 0 4px rgba(255,215,0,0.9), 0 0 35px rgba(255,160,0,0.8), 0 0 60px rgba(255,50,0,0.4); }
        }
        @keyframes fireSilverRing {
          0%,100% { box-shadow: 0 0 0 2px rgba(192,192,192,0.4), 0 0 14px rgba(192,192,192,0.3); }
          50% { box-shadow: 0 0 0 3px rgba(220,220,220,0.7), 0 0 24px rgba(200,200,200,0.5); }
        }
        @keyframes fireBronzeRing {
          0%,100% { box-shadow: 0 0 0 2px rgba(205,127,50,0.4), 0 0 12px rgba(205,127,50,0.25); }
          50% { box-shadow: 0 0 0 3px rgba(220,150,60,0.7), 0 0 22px rgba(205,127,50,0.45); }
        }
      `}</style>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const { isPro } = useSubscription();

  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  const isProUser = isPro || isAdmin;

  const [joined, setJoined] = useState<boolean | null>(null); // null = loading
  const [hasHabits, setHasHabits] = useState(false);
  const [joining, setJoining] = useState(false);

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);

  // ── Check membership + habits on mount; auto-kick if ineligible ──────────
  useEffect(() => {
    if (!user?.id) return;
    const check = async () => {
      const [memberRes, habitRes] = await Promise.all([
        supabase
          .from('leaderboard_members')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('routines')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      const habitCount = habitRes.count ?? 0;
      const isMember = memberRes.data !== null;
      const meetsRequirements = isProUser && habitCount >= 5;

      // Auto-kick: if they're a member but no longer eligible, remove them silently
      if (isMember && !meetsRequirements) {
        await supabase
          .from('leaderboard_members')
          .update({ is_active: false })
          .eq('user_id', user.id);
        setJoined(false);
      } else {
        setJoined(isMember && meetsRequirements);
      }

      setHasHabits(habitCount >= 5);
    };
    check();
  }, [user?.id, isProUser]);

  // ── Load + refresh leaderboard ────────────────────────────────────────────
  const loadLeaderboard = useCallback(async () => {
    if (!user?.id) return;

    const monthStr = getMonthStr(new Date());
    const cacheKey = `lb_${monthStr}_${user.id}`;

    // 1. Show cache immediately — no spinner if we have fresh data
    let hasCachedData = false;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const { entries: cached, ts } = JSON.parse(raw) as { entries: LeaderboardEntry[]; ts: number };
        if (Date.now() - ts < 5 * 60 * 1000) {
          setEntries(cached);
          hasCachedData = true;
        }
      }
    } catch { /* ignore bad cache */ }

    // Only block with spinner when there is nothing cached to show
    if (!hasCachedData) setLoadingBoard(true);
    setBoardError(null);

    try {
      // 2. Fetch members + stored scores only — 2 queries, fast
      const [membersRes, scoresRes] = await Promise.all([
        supabase
          .from('leaderboard_members')
          .select('user_id, display_name, avatar_url')
          .eq('is_active', true),
        supabase
          .from('leaderboard_scores')
          .select('user_id, points')
          .eq('month', monthStr),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (scoresRes.error) throw scoresRes.error;

      const scoreMap = new Map<string, number>();
      for (const s of scoresRes.data ?? []) {
        scoreMap.set(s.user_id, Number(s.points));
      }

      const merged: Omit<LeaderboardEntry, 'rank'>[] = (membersRes.data ?? []).map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        avatar_url: m.avatar_url ?? null,
        points: scoreMap.get(m.user_id) ?? 0,
      }));

      merged.sort((a, b) => b.points - a.points);
      const ranked: LeaderboardEntry[] = merged.map((e, i) => ({ ...e, rank: i + 1 }));
      setEntries(ranked);
      setLoadingBoard(false);

      // Cache for instant next open
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ entries: ranked, ts: Date.now() }));
      } catch { /* storage full — ignore */ }

      // 3. Compute own score in background — does NOT block the board display
      computeMonthScore(user.id).then((myScore) => {
        supabase.from('leaderboard_scores').upsert(
          { user_id: user.id, month: monthStr, points: myScore, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,month' },
        ).then(() => {
          // Silently update own score in the visible list
          setEntries((prev) => {
            const updated = prev.map((e) =>
              e.user_id === user.id ? { ...e, points: myScore } : e
            );
            updated.sort((a, b) => b.points - a.points);
            return updated.map((e, i) => ({ ...e, rank: i + 1 }));
          });
        });
      });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setBoardError(msg);
      setLoadingBoard(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (joined === true) {
      loadLeaderboard();
    }
  }, [joined, loadLeaderboard]);

  // ── Join handler ──────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!user?.id) return;
    setJoining(true);
    try {
      const displayName = user.name || user.email.split('@')[0] || 'Warrior';
      const { error } = await supabase.from('leaderboard_members').upsert(
        {
          user_id: user.id,
          display_name: displayName,
          avatar_url: user.avatarUrl ?? null,
          is_active: true,
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      setJoined(true);
    } catch (err: unknown) {
      console.error('Failed to join leaderboard:', err);
    } finally {
      setJoining(false);
    }
  };

  // ── Leave handler ─────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (!user?.id) return;
    // Delete all scores first, then membership
    await Promise.all([
      supabase.from('leaderboard_scores').delete().eq('user_id', user.id),
      supabase.from('leaderboard_members').delete().eq('user_id', user.id),
    ]);
    setJoined(false);
    setEntries([]);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (joined === null) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '3px solid rgba(255,215,0,0.2)',
            borderTop: '3px solid #FFD700',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!joined) {
    return (
      <NotJoinedView
        isPro={isProUser}
        hasHabits={hasHabits}
        joining={joining}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <JoinedView
      userId={user?.id ?? ''}
      entries={entries}
      loading={loadingBoard}
      error={boardError}
      onRetry={loadLeaderboard}
      onLeave={handleLeave}
    />
  );
};

export default Leaderboard;

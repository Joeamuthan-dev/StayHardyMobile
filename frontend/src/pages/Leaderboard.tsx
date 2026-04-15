// src/pages/Leaderboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Info } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

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
}

const JoinedView: React.FC<JoinedViewProps> = ({ userId, entries, loading, error, onRetry }) => {
  const [showMore, setShowMore] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
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

      {/* ── Board info card with Info + Leave on the right ── */}
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
        <button onClick={() => setShowInfo(true)} style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
          <Info size={15} color="rgba(255,255,255,0.5)" />
        </button>
      </div>

      {/* Info modal */}
      {showInfo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 20000,
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }} onClick={() => setShowInfo(false)}>
          <div style={{
            width: '100%', maxWidth: '360px',
            background: 'linear-gradient(145deg, #0D0D0D, #0A0A0A)',
            border: '1px solid rgba(255,215,0,0.2)',
            borderRadius: '24px', padding: '24px',
            boxShadow: '0 0 60px rgba(255,215,0,0.08), 0 24px 48px rgba(0,0,0,0.6)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrophySVG size={16} color="#FFD700" />
              <span style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '12px',
                color: '#FFD700', letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1,
              }}>What is Hardy Board?</span>
              <button onClick={() => setShowInfo(false)} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', lineHeight: 1 }}>×</span>
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
              Hardy Board is a <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>monthly habit competition</span> for Pro warriors.
              Complete your daily habits, earn points, and climb the ranks.
              The most consistent warrior wins — <span style={{ color: '#00E87A', fontWeight: 600 }}>stay hard, stay on top.</span>
            </p>
            {/* How Points Work */}
            <div style={{
              borderRadius: '14px', padding: '14px',
              background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.1)',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Zap size={12} color="#FFD700" fill="#FFD700" />
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '10px',
                  color: '#FFD700', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>How Points Work</span>
              </div>
              {[
                { pct: '100%', pts: '10 pts', color: '#00E87A', fill: 1 },
                { pct: '50%',  pts: '5 pts',  color: '#FFD700', fill: 0.5 },
                { pct: '0%',   pts: '0 pts',  color: 'rgba(255,255,255,0.25)', fill: 0.05 },
              ].map(({ pct, pts, color, fill }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: i < 2 ? '8px' : 0 }}>
                  <div style={{ width: '32px', height: '4px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${fill * 100}%`, height: '100%', background: color, borderRadius: '3px' }} />
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', flex: 1 }}>
                    Complete <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{pct}</span> of habits
                  </span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '11px', color }}>{pts}</span>
                </div>
              ))}
            </div>
            {/* Chips */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'rgba(0,232,122,0.06)', border: '1px solid rgba(0,232,122,0.15)', textAlign: 'center' }}>
                <p style={{ color: '#00E87A', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', margin: 0 }}>10</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: '2px 0 0' }}>max pts/day</p>
              </div>
              <div style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'rgba(126,179,255,0.06)', border: '1px solid rgba(126,179,255,0.15)', textAlign: 'center' }}>
                <p style={{ color: '#7EB3FF', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', margin: 0 }}>↺</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: '2px 0 0' }}>monthly reset</p>
              </div>
              <div style={{ flex: 1, padding: '8px', borderRadius: '10px', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', textAlign: 'center' }}>
                <p style={{ color: '#FFD700', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '13px', margin: 0 }}>Pro</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: '2px 0 0' }}>members only</p>
              </div>
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

// ─── Supabase query with timeout (prevents indefinite hang) ──────────────────

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ]);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Leaderboard: React.FC = () => {
  const { user } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>(() => {
    // Hydrate from cache immediately on mount — zero wait time
    if (!user?.id) return [];
    try {
      const monthStr = getMonthStr(new Date());
      const raw = sessionStorage.getItem(`lb_${monthStr}_${user.id}`);
      if (raw) {
        const { entries: cached } = JSON.parse(raw) as { entries: LeaderboardEntry[]; ts: number };
        if (cached?.length > 0) return cached;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const retryCountRef = React.useRef(0);

  // ── Ensure membership (fire-and-forget, non-blocking) ──
  useEffect(() => {
    if (!user?.id) return;
    const displayName = user.name || user.email.split('@')[0] || 'Warrior';
    void supabase.from('leaderboard_members').upsert(
      { user_id: user.id, display_name: displayName, avatar_url: user.avatarUrl ?? null, is_active: true },
      { onConflict: 'user_id' }
    );
  }, [user?.id]);

  // ── Load + refresh leaderboard (with auto-retry) ────────────────────────
  const loadLeaderboard = useCallback(async () => {
    if (!user?.id) return;

    const monthStr = getMonthStr(new Date());
    const cacheKey = `lb_${monthStr}_${user.id}`;

    // Show cache immediately — no spinner if we have any cached data
    const hasCachedData = entries.length > 0;
    if (!hasCachedData) setLoadingBoard(true);
    setBoardError(null);

    try {
      // Fetch members + stored scores in parallel — 8s timeout
      const [membersRes, scoresRes] = await withTimeout(
        Promise.all([
          supabase
            .from('leaderboard_members')
            .select('user_id, display_name, avatar_url')
            .eq('is_active', true),
          supabase
            .from('leaderboard_scores')
            .select('user_id, points')
            .eq('month', monthStr),
        ]),
        8000,
      );

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
      retryCountRef.current = 0;

      // Cache for instant next open
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ entries: ranked, ts: Date.now() }));
      } catch { /* storage full */ }

      // Compute own score in background — does NOT block the board
      computeMonthScore(user.id).then((myScore) => {
        supabase.from('leaderboard_scores').upsert(
          { user_id: user.id, month: monthStr, points: myScore, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,month' },
        ).then(() => {
          setEntries((prev) => {
            const updated = prev.map((e) =>
              e.user_id === user.id ? { ...e, points: myScore } : e
            );
            updated.sort((a, b) => b.points - a.points);
            return updated.map((e, i) => ({ ...e, rank: i + 1 }));
          });
          // Update cache with fresh score
          try {
            setEntries((latest) => {
              sessionStorage.setItem(cacheKey, JSON.stringify({ entries: latest, ts: Date.now() }));
              return latest;
            });
          } catch { /* ignore */ }
        });
      });

    } catch (err: unknown) {
      // Auto-retry once on transient failure
      if (retryCountRef.current < 1) {
        retryCountRef.current += 1;
        setTimeout(() => loadLeaderboard(), 1500);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setBoardError(msg);
      setLoadingBoard(false);
    }
  }, [user?.id, entries.length]);

  // Load immediately — no membership gate needed, route is Pro-only
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <JoinedView
      userId={user?.id ?? ''}
      entries={entries}
      loading={loadingBoard}
      error={boardError}
      onRetry={() => { retryCountRef.current = 0; loadLeaderboard(); }}
    />
  );
};

export default Leaderboard;

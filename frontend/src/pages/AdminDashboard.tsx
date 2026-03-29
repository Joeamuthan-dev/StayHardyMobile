import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { isAdminHubUser } from '../config/adminOwner';
import {
  maskEmail,
  aggregateDailyRevenue,
  ADMIN_ANALYTICS_CACHE_MS,
  shortPaymentId,
  type ProMembershipCounts,
} from '../lib/adminProAnalytics';
import { invokeEdgeFunctionWithUserJwt } from '../lib/invokeEdgeFunction';
import { getEdgeFunctionErrorMessage } from '../lib/edgeFunctionError';
import { invokeDeleteUserAccount } from '../lib/accountDeletion';
import { useAppSettings } from '../hooks/useAppSettings';
import { CacheManager, CACHE_KEYS } from '../lib/smartCacheManager';

/** Yellow-green admin accent (distinct from user neon green) */
const ADM = {
  accent: '#c8ff3d',
  accentDim: 'rgba(200, 255, 61, 0.45)',
  gold: '#e8c547',
  goldDim: 'rgba(232, 197, 71, 0.35)',
};

const ADMIN_USERS_PAGE_SIZE = 10;
const TIPS_ADMIN_CACHE_MS = 10 * 60 * 1000;

const supportCategories = [
  { value: 'signup_issue', label: '📝 Signup Issue' },
  { value: 'login_issue', label: '🔐 Login Issue' },
  { value: 'payment_issue', label: '💳 Payment Issue' },
  { value: 'bug_report', label: '🐛 Bug Report' },
  { value: 'feature_request', label: '✨ Feature Request' },
  { value: 'account_issue', label: '👤 Account Issue' },
  { value: 'performance_issue', label: '⚡ Performance Issue' },
  { value: 'data_issue', label: '📊 Data Issue' },
  { value: 'notification_issue', label: '🔔 Notification Issue' },
  { value: 'other', label: '💬 Other' }
];

function useCountUp(target: number, durationMs = 1000, enabled = true): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setValue(Math.round(target));
      return;
    }
    startRef.current = null;
    const end = Math.max(0, Math.round(target));
    const step = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(end * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs, enabled]);

  return value;
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 52;
  const h = 22;
  const pad = 2;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
      const y = pad + (1 - v / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="admin-mini-spark" aria-hidden>
      <defs>
        <linearGradient id="admin-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts}
      />
    </svg>
  );
}

/** Relative time from ISO date (e.g. account created_at). */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return 'Just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    if (startOf(d).getTime() === startOf(now).getTime()) return 'Today';
    return `${hr}h ago`;
  }
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function productivityScoreColor(score: number): string {
  if (score <= 30) return '#EF4444';
  if (score <= 60) return '#F59E0B';
  return '#00E87A';
}

function adminInitialAvatarStyle(name: string): { bg: string; color: string } {
  const palette: { bg: string; color: string }[] = [
    { bg: 'rgba(59, 130, 246, 0.35)', color: '#93c5fd' },
    { bg: 'rgba(232, 197, 71, 0.35)', color: '#fde68a' },
    { bg: 'rgba(168, 85, 247, 0.35)', color: '#e9d5ff' },
    { bg: 'rgba(200, 255, 61, 0.25)', color: '#d9ff7a' },
    { bg: 'rgba(244, 114, 182, 0.35)', color: '#fbcfe8' },
    { bg: 'rgba(34, 211, 238, 0.3)', color: '#a5f3fc' },
  ];
  let h = 0;
  const s = name || 'U';
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % palette.length;
  return palette[h];
}

function FilterPill({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: `1px solid ${active ? color : '#333'}`,
        background: active ? `${color}22` : 'transparent',
        color: active ? color : '#888',
        fontSize: '13px',
        fontWeight: active ? 700 : 400,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {label}
      <span
        style={{
          background: active ? color : '#333',
          color: active ? '#000' : '#666',
          borderRadius: '10px',
          padding: '1px 7px',
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </button>
  );
}

const AdminDashboard: React.FC = () => {
  const [isSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const { user } = useAuth();
  const { loadSettings } = useAppSettings();
  const navigate = useNavigate();
  const [_stats, setStats] = useState({ users: 0, tasks: 0, goals: 0, routines: 0, globalTasks: 0, globalRoutines: 0, globalTasksCompleted: 0 }); void _stats;
  const [users, setUsers] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'today' | 'revenue' | 'tips' | 'users' | 'feedback' | 'settings'
  >('overview');
  const [resetPinModal, setResetPinModal] = useState<{ show: boolean, userId: string, userName: string }>({ show: false, userId: '', userName: '' });
  const [deleteUserModal, setDeleteUserModal] = useState<{ show: boolean, userId: string, userName: string }>({ show: false, userId: '', userName: '' });
  const [newPinInput, setNewPinInput] = useState(['', '', '', '']);
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  const [chartData, setChartData] = useState<any[]>([]);
  const [feedbackActiveFilter, setFeedbackActiveFilter] = useState<'all' | 'feature' | 'support' | 'pro'>('all');
  const [feedbackSortOrder, setFeedbackSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [totalFeedbackCount, setTotalFeedbackCount] = useState(0);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [respondModal, setRespondModal] = useState<{ show: boolean; item: any | null; note: string }>({
    show: false,
    item: null,
    note: '',
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'verified' | 'pending' | 'pro'>('all');
  const [userSortOrder, setUserSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [proCount, setProCount] = useState(0);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const userFetchGenRef = useRef(0);

  const [annoTitle, setAnnoTitle] = useState('');
  const [annoMessage, setAnnoMessage] = useState('');
  const [annoCategory, setAnnoCategory] = useState<'update' | 'feature' | 'maintenance' | 'urgent' | 'general'>(
    'update'
  );
  const [isPosting, setIsPosting] = useState(false);
  const [annoTarget, setAnnoTarget] = useState<'all' | 'pro' | 'basic'>('all');
  const [announcements, setAnnouncements] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      category: string;
      is_active: boolean;
      posted_by: string | null;
      created_at: string;
      updated_at: string | null;
    }>
  >([]);

  const [proCounts, setProCounts] = useState<ProMembershipCounts>({ total: 0, last30: 0, last7: 0 });
  const [proPrevWeek, setProPrevWeek] = useState(0);
  const [adminNotifCount, setAdminNotifCount] = useState(0);
  const proOverviewCacheRef = useRef<{ at: number; data: ProMembershipCounts; prevWeek: number } | null>(null);

  const [todayData, setTodayData] = useState<{
    signups: number;
    proUpgrades: number;
    tickets: number;
    recentSignups: any[];
    recentTickets: any[];
  }>({ signups: 0, proUpgrades: 0, tickets: 0, recentSignups: [], recentTickets: [] });
  const [todayLoading, setTodayLoading] = useState(false);

  const [revenueSummary, setRevenueSummary] = useState({
    totalRevenue: 0,
    last30Revenue: 0,
    monthNewMembers: 0,
  });
  const [revenueTransactions, setRevenueTransactions] = useState<
    Array<{
      id: string;
      name: string | null;
      email: string | null;
      payment_id: string | null;
      payment_amount: number | null;
      pro_purchase_date: string | null;
    }>
  >([]);
  const [revenueBarData, setRevenueBarData] = useState<{ name: string; revenue: number }[]>([]);
  const revenueCacheRef = useRef<{
    at: number;
    summary: typeof revenueSummary;
    tx: typeof revenueTransactions;
    bar: { name: string; revenue: number }[];
  } | null>(null);

  type TipsRecentRow = {
    id: string;
    user_email: string;
    amount: number;
    razorpay_payment_id: string | null;
    tipped_at: string;
  };
  type TipsTopRow = { user_email: string; total_tipped: number; tip_count: number };
  const [tipsFinancial, setTipsFinancial] = useState({
    totalInr: 0,
    supporters: 0,
    thisMonthInr: 0,
    lastMonthInr: 0,
  });
  const [tipsBreakdown, setTipsBreakdown] = useState<Array<{ amount: number; cnt: number }>>([]);
  const [tipsRecent, setTipsRecent] = useState<TipsRecentRow[]>([]);
  const [tipsTop, setTipsTop] = useState<TipsTopRow[]>([]);
  const [tipsLoadErr, setTipsLoadErr] = useState('');
  const [tipsLoading, setTipsLoading] = useState(false);
  const tipsCacheRef = useRef<{
    at: number;
    financial: typeof tipsFinancial;
    breakdown: typeof tipsBreakdown;
    recent: TipsRecentRow[];
    top: TipsTopRow[];
  } | null>(null);

  const fetchTodayData = useCallback(async () => {
    if (!user || !isAdminHubUser(user)) return;
    setTodayLoading(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStr = todayStart.toISOString();

      const [{ count: signups }, { count: proUpgrades }, { count: tickets }, { data: recentSignups }, { data: recentTickets }] =
        await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_pro', true).gte('pro_purchase_date', todayStr),
          supabase.from('feedback').select('id', { count: 'exact', head: true }).gte('created_at', todayStr),
          supabase.from('users').select('id, name, email, is_pro, role, created_at').gte('created_at', todayStr).order('created_at', { ascending: false }).limit(10),
          supabase.from('feedback').select('id, user_name, user_email, message, type, created_at').gte('created_at', todayStr).order('created_at', { ascending: false }).limit(10),
        ]);

      setTodayData({
        signups: signups ?? 0,
        proUpgrades: proUpgrades ?? 0,
        tickets: tickets ?? 0,
        recentSignups: recentSignups ?? [],
        recentTickets: recentTickets ?? [],
      });
    } catch (e) {
      console.error('fetchTodayData:', e);
    } finally {
      setTodayLoading(false);
    }
  }, [user]);

  const fetchTipsTab = useCallback(async () => {
    if (!user || !isAdminHubUser(user)) return;
    const now = Date.now();
    if (
      tipsCacheRef.current &&
      now - tipsCacheRef.current.at < TIPS_ADMIN_CACHE_MS
    ) {
      setTipsFinancial(tipsCacheRef.current.financial);
      setTipsBreakdown(tipsCacheRef.current.breakdown);
      setTipsRecent(tipsCacheRef.current.recent);
      setTipsTop(tipsCacheRef.current.top);
      return;
    }
    setTipsLoadErr('');
    setTipsLoading(true);
    try {
      const { data, error, response } = await invokeEdgeFunctionWithUserJwt('admin-tips', {});
      if (error) {
        console.error('Admin tips Edge Function error:', error, { data, response });
        setTipsLoadErr(
          await getEdgeFunctionErrorMessage(error, data, response, { paymentContext: false })
        );
        return;
      }
      const payload = data as {
        error?: string;
        financial?: {
          totalInr?: number;
          supporters?: number;
          thisMonthInr?: number;
          lastMonthInr?: number;
        };
        amountBreakdown?: unknown;
        recent?: TipsRecentRow[];
        topSupporters?: unknown;
      };
      if (typeof payload?.error === 'string' && payload.error.trim() && payload.financial == null) {
        console.error('Admin tips payload error:', payload.error);
        setTipsLoadErr(payload.error);
        return;
      }
      const fin = payload.financial ?? {};
      const financial = {
        totalInr: Number(fin.totalInr ?? 0),
        supporters: Number(fin.supporters ?? 0),
        thisMonthInr: Number(fin.thisMonthInr ?? 0),
        lastMonthInr: Number(fin.lastMonthInr ?? 0),
      };
      const rawBr = Array.isArray(payload.amountBreakdown) ? payload.amountBreakdown : [];
      const breakdown = rawBr.map((r: unknown) => {
        const o = r as { amount?: number; cnt?: number };
        return { amount: Number(o.amount ?? 0), cnt: Number(o.cnt ?? 0) };
      });
      const recent = Array.isArray(payload.recent) ? payload.recent : [];
      const rawTop = Array.isArray(payload.topSupporters) ? payload.topSupporters : [];
      const top = rawTop.map((r: unknown) => {
        const o = r as { user_email?: string; total_tipped?: number; tip_count?: number };
        return {
          user_email: String(o.user_email ?? ''),
          total_tipped: Number(o.total_tipped ?? 0),
          tip_count: Number(o.tip_count ?? 0),
        };
      });
      setTipsFinancial(financial);
      setTipsBreakdown(breakdown);
      setTipsRecent(recent as TipsRecentRow[]);
      setTipsTop(top);
      tipsCacheRef.current = {
        at: now,
        financial,
        breakdown,
        recent: recent as TipsRecentRow[],
        top,
      };
    } catch (err) {
      console.error('Tips tab catch:', err);
      setTipsLoadErr(err instanceof Error ? err.message : 'Failed to load tips.');
    } finally {
      setTipsLoading(false);
    }
  }, [user]);

  const fetchProMembershipCounts = useCallback(async (): Promise<ProMembershipCounts> => {
    const now = Date.now();
    if (
      proOverviewCacheRef.current &&
      now - proOverviewCacheRef.current.at < ADMIN_ANALYTICS_CACHE_MS
    ) {
      setProPrevWeek(proOverviewCacheRef.current.prevWeek);
      return proOverviewCacheRef.current.data;
    }
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const d14 = new Date();
    d14.setDate(d14.getDate() - 14);
    const [totalR, last30R, last7R, prevWeekR] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_pro', true),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_pro', true)
        .gte('pro_purchase_date', d30.toISOString()),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_pro', true)
        .gte('pro_purchase_date', d7.toISOString()),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_pro', true)
        .gte('pro_purchase_date', d14.toISOString())
        .lt('pro_purchase_date', d7.toISOString()),
    ]);
    const data: ProMembershipCounts = {
      total: totalR.count ?? 0,
      last30: last30R.count ?? 0,
      last7: last7R.count ?? 0,
    };
    const pw = prevWeekR.count ?? 0;
    setProPrevWeek(pw);
    proOverviewCacheRef.current = { at: now, data, prevWeek: pw };
    return data;
   }, []);

  const fetchRevenueTab = useCallback(async () => {
    if (!user || !isAdminHubUser(user)) return;
    const now = Date.now();
    if (
      revenueCacheRef.current &&
      now - revenueCacheRef.current.at < ADMIN_ANALYTICS_CACHE_MS
    ) {
      setRevenueSummary(revenueCacheRef.current.summary);
      setRevenueTransactions(revenueCacheRef.current.tx);
      setRevenueBarData(revenueCacheRef.current.bar);
      return;
    }

    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Fetch all pro users with actual payment amounts
    const [allProRows, pro30Rows, monthC] = await Promise.all([
      supabase.from('users').select('payment_amount, pro_purchase_date').eq('is_pro', true),
      supabase.from('users').select('payment_amount').eq('is_pro', true).gte('pro_purchase_date', d30.toISOString()),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_pro', true).gte('pro_purchase_date', startOfMonth.toISOString()),
    ]);

    // Sum actual payment_amount — skip nulls (RevenueCat purchases without stored amount)
    const totalRevenue = (allProRows.data ?? []).reduce((s, r) => s + (r.payment_amount ?? 0), 0);
    const last30Revenue = (pro30Rows.data ?? []).reduce((s, r) => s + (r.payment_amount ?? 0), 0);

    const summary = {
      totalRevenue,
      last30Revenue,
      monthNewMembers: monthC.count ?? 0,
    };
    setRevenueSummary(summary);

    // Transactions — show ALL pro members, not just Razorpay
    const { data: txRows } = await supabase
      .from('users')
      .select('id, name, email, payment_id, payment_amount, pro_purchase_date')
      .eq('is_pro', true)
      .not('pro_purchase_date', 'is', null)
      .order('pro_purchase_date', { ascending: false })
      .limit(20);

    setRevenueTransactions(txRows ?? []);

    // Bar chart — use actual payment_amount per day
    const { data: dayRows } = await supabase
      .from('users')
      .select('pro_purchase_date, payment_amount')
      .eq('is_pro', true)
      .not('pro_purchase_date', 'is', null)
      .gte('pro_purchase_date', d30.toISOString());

    const barRows = (dayRows ?? []).map((r) => ({
      date: r.pro_purchase_date as string,
      amount: r.payment_amount ?? 0,
    }));
    const bar = aggregateDailyRevenue(barRows, 30).map(({ name, revenue }) => ({ name, revenue }));
    setRevenueBarData(bar);

    revenueCacheRef.current = {
      at: now,
      summary,
      tx: txRows ?? [],
      bar,
    };
  }, [user]);

  const loadAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.error('loadAnnouncements', error);
      return;
    }
    setAnnouncements(data ?? []);
  }, []);

  const handlePostAnnouncement = useCallback(async () => {
    if (!annoTitle.trim()) {
      window.alert('Please add a title.');
      return;
    }
    if (!annoMessage.trim() || annoMessage.trim().length < 10) {
      window.alert('Message too short (at least 10 characters).');
      return;
    }
    setIsPosting(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: annoTitle.trim(),
          message: annoMessage.trim(),
          category: annoCategory,
          target_audience: annoTarget,
          is_active: true,
          posted_by: user?.email ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) setAnnouncements((prev) => [data, ...prev]);
      setAnnoTitle('');
      setAnnoMessage('');
      setAnnoCategory('update');
      setAnnoTarget('all');
      await CacheManager.invalidate(CACHE_KEYS.ANNOUNCEMENTS_LIST);
      window.alert('Announcement posted.');
    } catch (e) {
      console.error(e);
      window.alert('Failed to post announcement.');
    } finally {
      setIsPosting(false);
    }
  }, [annoTitle, annoMessage, annoCategory, annoTarget, user?.email]);

  const toggleAnnouncementActive = useCallback(
    async (id: string) => {
      const item = announcements.find((a) => a.id === id);
      if (!item) return;
      const next = !item.is_active;
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        window.alert(error.message);
        return;
      }
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: next } : a)));
      await CacheManager.invalidate(CACHE_KEYS.ANNOUNCEMENTS_LIST);
    },
    [announcements]
  );

  const deleteAnnouncement = useCallback(async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      console.error('[deleteAnnouncement]', error.message);
      return;
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    await CacheManager.invalidate(CACHE_KEYS.ANNOUNCEMENTS_LIST);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(userSearchQuery), 400);
    return () => clearTimeout(handler);
  }, [userSearchQuery]);

  const fetchUserCounts = useCallback(async () => {
    const [all, verified, pending, pro] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('email_confirmed', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('email_confirmed', false),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_pro', true),
    ]);
    setTotalUsersCount(all.count || 0);
    setVerifiedCount(verified.count || 0);
    setPendingCount(pending.count || 0);
    setProCount(pro.count || 0);
  }, []);

  const enrichUsersWithStats = useCallback(async (userData: any[]) => {
    const { data: rpcCounts } = await supabase.rpc('get_global_counts');
    const tasks = (rpcCounts?.tasks || []).map((t: any) => ({
      created_at: t.created_at,
      userId: t.userId,
      status: t.status,
      progress: t.progress,
    }));
    const goals = (rpcCounts?.goals || []).map((g: any) => ({
      created_at: g.created_at,
      userId: g.userId,
      status: g.status,
      progress: g.progress,
    }));
    const routines = (rpcCounts?.routines || []).map((r: any) => ({
      created_at: r.created_at,
      userId: r.userId,
    }));

    setStats((prev) => ({
      ...prev,
      tasks: tasks.length,
      goals: goals.length,
      routines: routines.length,
      globalTasks: rpcCounts?.total_tasks || 0,
      globalTasksCompleted: rpcCounts?.pending_tasks || 0,
      globalRoutines: rpcCounts?.total_routines || 0,
      users: totalUsersCount || prev.users,
    }));

    const userActivityMap: Record<string, { tasks: number; goals: number; routines: number; productivityScore: number }> =
      {};
    userData.forEach((u) => {
      userActivityMap[u.id] = { tasks: 0, goals: 0, routines: 0, productivityScore: 0 };
    });
    tasks.forEach((t: any) => {
      if (userActivityMap[t.userId]) userActivityMap[t.userId].tasks++;
    });
    goals.forEach((g: any) => {
      if (userActivityMap[g.userId]) userActivityMap[g.userId].goals++;
    });
    routines.forEach((r: any) => {
      if (userActivityMap[r.userId]) userActivityMap[r.userId].routines++;
    });
    userData.forEach((u) => {
      const uTasks = tasks.filter((t: any) => t.userId === u.id);
      const uGoals = goals.filter((g: any) => g.userId === u.id);
      const uRoutines = routines.filter((r: any) => r.userId === u.id);
      const tasksProgress =
        uTasks.length > 0 ? (uTasks.filter((t: any) => t.status === 'completed').length / uTasks.length) * 100 : 0;
      const goalsProgress =
        uGoals.length > 0
          ? uGoals.reduce(
              (acc: number, g: any) => acc + (g.status === 'completed' ? 100 : Number(g.progress) || 0),
              0
            ) / uGoals.length
          : 0;
      const routinesProgress = uRoutines.length > 0 ? 100 : 0;
      const score = Math.round(routinesProgress * 0.6 + tasksProgress * 0.2 + goalsProgress * 0.2);
      if (userActivityMap[u.id]) userActivityMap[u.id].productivityScore = score;
    });
    return userData.map((u: any) => ({
      ...u,
      stats: userActivityMap[u.id] || { tasks: 0, goals: 0, routines: 0, productivityScore: 0 },
    }));
  }, [totalUsersCount]);

  const fetchUsers = useCallback(
    async (filter: 'all' | 'verified' | 'pending' | 'pro', pageNum: number, reset = false) => {
      if (!user || !isAdminHubUser(user)) return;
      const gen = ++userFetchGenRef.current;
      if (reset) {
        setUsers([]);
        setPage(0);
        setHasMoreUsers(true);
        setUsersLoading(true);
      } else {
        setUsersLoadingMore(true);
      }
      try {
        let query = supabase
          .from('users')
          .select(
            'id, name, email, role, is_pro, status, email_confirmed, created_at, avatar_url, pro_purchase_date'
          )
          .order('created_at', { ascending: userSortOrder === 'oldest' })
          .range(pageNum * ADMIN_USERS_PAGE_SIZE, (pageNum + 1) * ADMIN_USERS_PAGE_SIZE - 1);

        if (filter === 'verified') query = query.eq('email_confirmed', true);
        else if (filter === 'pending') query = query.eq('email_confirmed', false);
        else if (filter === 'pro') query = query.eq('is_pro', true);

        if (debouncedSearch.trim()) {
          query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.error('Fetch error:', error);
          return;
        }
        if (userFetchGenRef.current !== gen) return;
        const enriched = await enrichUsersWithStats(data || []);
        if (userFetchGenRef.current !== gen) return;
        if (reset) setUsers(enriched);
        else setUsers((prev) => [...prev, ...enriched]);
        setHasMoreUsers((data?.length || 0) === ADMIN_USERS_PAGE_SIZE);
        setPage(pageNum + 1);
      } finally {
        if (userFetchGenRef.current === gen) {
          setUsersLoading(false);
          setUsersLoadingMore(false);
        }
      }
    },
    [user, userSortOrder, debouncedSearch, enrichUsersWithStats]
  );

  const handleSearch = useCallback(
    async (query: string) => {
      if (!user || !isAdminHubUser(user)) return;
      if (!query.trim()) {
        void fetchUsers(activeFilter, 0, true);
        return;
      }
      setUsersLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select(
          'id, name, email, role, is_pro, status, email_confirmed, created_at, avatar_url, pro_purchase_date'
        )
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: userSortOrder === 'oldest' })
        .limit(20);
      if (error) {
        console.error('Search error:', error);
        setUsersLoading(false);
        return;
      }
      const enriched = await enrichUsersWithStats(data || []);
      setUsers(enriched);
      setHasMoreUsers(false);
      setUsersLoading(false);
    },
    [user, activeFilter, fetchUsers, userSortOrder, enrichUsersWithStats]
  );

  const resyncUsersList = useCallback(async () => {
    await fetchUsers(activeFilter, 0, true);
    await fetchUserCounts();
  }, [fetchUsers, fetchUserCounts, activeFilter]);

  useEffect(() => {
    if (activeTab !== 'users' || !user || !isAdminHubUser(user)) return;
    void fetchUserCounts();
    if (debouncedSearch.trim()) {
      void handleSearch(debouncedSearch);
      return;
    }
    void fetchUsers(activeFilter, 0, true);
  }, [activeTab, activeFilter, userSortOrder, debouncedSearch, user, fetchUsers, fetchUserCounts, handleSearch]);

  const fetchFeedback = useCallback(async () => {
    if (!user || !isAdminHubUser(user)) return;
    setFeedbacksLoading(true);
    try {
      // For the pro filter, resolve pro user emails first
      if (feedbackActiveFilter === 'pro') {
        const { data: proUsers } = await supabase
          .from('users')
          .select('email')
          .eq('is_pro', true);
        const proEmails = (proUsers || []).map((u: any) => u.email).filter(Boolean);
        if (proEmails.length === 0) {
          setFeedbacks([]);
          setTotalFeedbackCount(0);
          return;
        }
        const { data, error } = await supabase
          .from('feedback')
          .select('id, user_name, user_email, message, type, ticket_id, status, admin_note, admin_note_date, created_at')
          .in('user_email', proEmails)
          .order('created_at', { ascending: feedbackSortOrder === 'oldest' });
        if (error) { console.error('Error fetching pro feedback:', error); return; }
        setFeedbacks(data || []);
        setTotalFeedbackCount((data || []).length);
        return;
      }

      let query = supabase
        .from('feedback')
        .select('id, user_name, user_email, message, type, ticket_id, status, admin_note, admin_note_date, created_at')
        .order('created_at', { ascending: feedbackSortOrder === 'oldest' });
      if (feedbackActiveFilter === 'feature') {
        query = query.eq('type', 'feature');
      } else if (feedbackActiveFilter === 'support') {
        query = query.eq('type', 'support');
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching feedback:', error);
        return;
      }
      setFeedbacks(data || []);
      setTotalFeedbackCount((data || []).length);
    } finally {
      setFeedbacksLoading(false);
    }
  }, [user, feedbackSortOrder, feedbackActiveFilter]);

  const resyncFeedbackList = useCallback(async () => {
    await fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    if (!user || !isAdminHubUser(user) || activeTab !== 'feedback') return;
    void fetchFeedback();
  }, [activeTab, user, fetchFeedback]);

  useEffect(() => {
    if (user && !isAdminHubUser(user)) {
      navigate('/home');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !isAdminHubUser(user)) return;
    void (async () => {
      const { count } = await supabase.from('feedback').select('id', { count: 'exact', head: true });
      setAdminNotifCount(count ?? 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!user || !isAdminHubUser(user)) return;

    const fetchMainAdminData = async () => {
      if (activeTab === 'overview') {
        try {
          const counts = await fetchProMembershipCounts();
          setProCounts(counts);
        } catch (e) {
          console.error('Pro membership counts:', e);
        }
      }

      if (activeTab === 'overview') {
        const { data: rSignups } = await supabase
          .from('users')
          .select('id, name, created_at, role, is_pro')
          .order('created_at', { ascending: false })
          .limit(10);
        if (rSignups) setRecentSignups(rSignups);

        const chartFrom = new Date();
        chartFrom.setDate(chartFrom.getDate() - timeRange);
        const { data: chartUsers } = await supabase
          .from('users')
          .select('created_at')
          .gte('created_at', chartFrom.toISOString());

        processChartData(chartUsers || [], timeRange);

        let countQuery = supabase.from('users').select('id', { count: 'exact', head: true });
        const { count: countResult } = await countQuery;
        if (countResult !== null) setTotalUsersCount(countResult);
        setStats((prev) => ({ ...prev, users: countResult ?? prev.users }));
      }
    };

    const run = async () => {
      if (activeTab === 'revenue') {
        await fetchRevenueTab();
        return;
      }
      if (activeTab === 'tips') {
        await fetchTipsTab();
        return;
      }
      if (activeTab === 'feedback') {
        return;
      }
      if (activeTab === 'today') {
        await fetchTodayData();
        return;
      }
      if (activeTab === 'settings') {
        await loadSettings();
        await loadAnnouncements();
        return;
      }
      await fetchMainAdminData();
    };

    void run();

    const feedbackChannel = supabase
      .channel('admin_feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        void (async () => {
          const { count } = await supabase.from('feedback').select('id', { count: 'exact', head: true });
          setAdminNotifCount(count ?? 0);
          if (activeTab === 'feedback') void resyncFeedbackList();
        })();
      })
      .subscribe();

    const userChannel = supabase
      .channel('admin_users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        if (activeTab === 'users') void resyncUsersList();
        else void run();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(userChannel);
    };
  }, [
    user,
    timeRange,
    activeTab,
    fetchProMembershipCounts,
    fetchRevenueTab,
    fetchTipsTab,
    fetchTodayData,
    resyncUsersList,
    resyncFeedbackList,
    loadSettings,
    loadAnnouncements,
  ]);

  const loadMoreUsers = useCallback(() => {
    if (!hasMoreUsers || usersLoadingMore || usersLoading || users.length === 0) return;
    void fetchUsers(activeFilter, page, false);
  }, [hasMoreUsers, usersLoadingMore, usersLoading, users.length, fetchUsers, activeFilter, page]);

  const processChartData = (usersData: any[], days: number) => {
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const daySignups = usersData.filter(u => u.created_at && u.created_at.startsWith(dateStr)).length;
      data.push({ name: displayDate, signups: daySignups });
    }
    setChartData(data);
  };



  const handleResendVerification = useCallback(async (targetUser: any) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetUser.email,
      });
      if (error) throw error;
      alert(`Verification email sent to ${targetUser.email} ✅`);
    } catch (err) {
      console.error('Failed resend verification:', err);
      alert('Failed to send email ❌');
    }
  }, []);

  const handleMakePro = useCallback(async (targetUser: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_pro: true,
          pro_purchase_date: new Date().toISOString(),
        })
        .eq('id', targetUser.id);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, is_pro: true } : u)));
      alert(`${targetUser.name || 'User'} is now Pro ⚡`);
      await fetchUserCounts();
    } catch (err) {
      console.error('Failed to make pro:', err);
      alert('Failed to update ❌');
    }
  }, [fetchUserCounts]);

  const handleRevokePro = useCallback(async (targetUser: any) => {
    if (!window.confirm(`Revoke Pro from ${targetUser.name || targetUser.email}?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_pro: false, pro_purchase_date: null })
        .eq('id', targetUser.id);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, is_pro: false } : u)));
      await fetchUserCounts();
    } catch (err) {
      console.error('Failed to revoke pro:', err);
      alert('Failed to update ❌');
    }
  }, [fetchUserCounts]);

  const deleteUser = (userId: string, userName: string) => {
    setDeleteUserModal({ show: true, userId, userName });
  };

  const handleConfirmDelete = async () => {
    const { userId } = deleteUserModal;
    if (!userId) return;

    try {
      await invokeDeleteUserAccount({ targetUserId: userId, reason: 'admin_delete' });

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotalUsersCount((c) => Math.max(0, c - 1));
      setStats((prev) => ({ ...prev, users: Math.max(0, prev.users - 1) }));

      setDeleteUserModal({ show: false, userId: '', userName: '' });
      alert('User and their data have been purged successfully.');
    } catch (err) {
      console.error('Error during user purging:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete user.';
      alert(`Failed to delete user.\n\n${msg}`);
    }
  };

  const deleteFeedbackById = async (feedbackId: string) => {
    if (!feedbackId || deletingFeedbackId) return;
    if (!window.confirm('Delete this feedback permanently?')) return;
    setDeletingFeedbackId(feedbackId);
    try {
      const { data, error } = await supabase.from('feedback').delete().eq('id', feedbackId).select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        alert(
          'Could not delete this feedback. No row was removed (it may not exist, or your account may not have permission to delete it).'
        );
        return;
      }
      setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
      setTotalFeedbackCount((c) => Math.max(0, c - 1));
      setAdminNotifCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Error deleting feedback:', err);
      alert('Failed to delete feedback.');
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  const handleOpenRespond = (item: any) => {
    setRespondModal({
      show: true,
      item,
      note: item.admin_note || '',
    });
  };

  const handleSaveResponse = async () => {
    const { item, note } = respondModal;
    if (!item?.id) return;
    try {
      const { error } = await supabase
        .from('feedback')
        .update({
          admin_note: note,
          admin_note_date: new Date().toISOString(),
          status: 'in_progress',
        })
        .eq('id', item.id);
      if (error) throw error;
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, admin_note: note, status: 'in_progress' } : f))
      );
      setRespondModal({ show: false, item: null, note: '' });
      alert('Response saved ✅');
    } catch (err) {
      console.error('Failed to save response:', err);
      alert('Failed to save ❌');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
      if (error) throw error;
      setFeedbacks((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
      alert('Status updated ✅');
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update ❌');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Delete this feedback?')) return;
    await deleteFeedbackById(id);
  };

  const handleResetPin = async () => {
    const pin = newPinInput.join('');
    if (pin.length !== 4) {
      alert('Please enter a 4-digit PIN');
      return;
    }

    try {
      const { error: userTableError } = await supabase
        .from('users')
        .update({ pin: pin })
        .eq('id', resetPinModal.userId);

      if (userTableError) throw userTableError;
      
      alert(`PIN for ${resetPinModal.userName} reset successfully!`);
      setResetPinModal({ show: false, userId: '', userName: '' });
      setNewPinInput(['', '', '', '']);
    } catch (err) {
      console.error('Error resetting PIN:', err);
      alert('Failed to reset PIN.');
    }
  };

  const handlePinInputChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...newPinInput];
    newPin[index] = value;
    setNewPinInput(newPin);

    if (value && index < 3) {
      const nextInput = document.getElementById(`reset-pin-${index + 1}`);
      nextInput?.focus();
    }
  };

  const signupTrend = useMemo(() => {
    if (chartData.length < 2) return { pct: 0, up: true };
    const mid = Math.floor(chartData.length / 2);
    const first = chartData.slice(0, mid).reduce((s, d) => s + (d.signups ?? 0), 0);
    const second = chartData.slice(mid).reduce((s, d) => s + (d.signups ?? 0), 0);
    if (first === 0) return { pct: second > 0 ? 100 : 0, up: second >= first };
    const raw = Math.round(((second - first) / first) * 100);
    return { pct: Math.min(999, Math.abs(raw)), up: second >= first };
  }, [chartData]);

  const proTrend = useMemo(() => {
    if (proPrevWeek === 0) return { pct: proCounts.last7 > 0 ? 100 : 0, up: true };
    const raw = Math.round(((proCounts.last7 - proPrevWeek) / proPrevWeek) * 100);
    return { pct: Math.min(999, Math.abs(raw)), up: proCounts.last7 >= proPrevWeek };
  }, [proCounts.last7, proPrevWeek]);

  const peakSignup = useMemo(() => {
    if (!chartData.length) return { idx: -1, val: 0 };
    let idx = 0;
    let val = chartData[0].signups ?? 0;
    chartData.forEach((d, i) => {
      const s = d.signups ?? 0;
      if (s > val) {
        val = s;
        idx = i;
      }
    });
    return { idx: val > 0 ? idx : -1, val };
  }, [chartData]);

  const revenuePeakIndex = useMemo(() => {
    if (!revenueBarData.length) return -1;
    let max = -Infinity;
    let idx = 0;
    revenueBarData.forEach((d, i) => {
      if (d.revenue > max) {
        max = d.revenue;
        idx = i;
      }
    });
    return max > 0 ? idx : -1;
  }, [revenueBarData]);

  const animUsers = useCountUp(totalUsersCount, 1000, activeTab === 'overview');
  const animPro = useCountUp(proCounts.total, 1000, activeTab === 'overview');

  const sparkAllTime = useMemo(
    () => [
      Math.max(0, proCounts.total - proCounts.last30),
      Math.max(0, proCounts.total - proCounts.last7),
      proCounts.total,
    ],
    [proCounts]
  );
  const spark30 = useMemo(
    () => [0, Math.max(0, proCounts.last30 - proCounts.last7), proCounts.last30],
    [proCounts]
  );
  const spark7 = useMemo(
    () => [Math.max(0, proPrevWeek), Math.max(proCounts.last7, proPrevWeek), proCounts.last7],
    [proCounts.last7, proPrevWeek]
  );

  if (!user || !isAdminHubUser(user)) return null;

  return (
    <div className={`page-shell admin-hub-root ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="admin-hub-header">
        <div className="admin-hub-header-top">
          <div className="admin-hub-header-actions">
            <button
              type="button"
              className="admin-hub-bell"
              aria-label="Today's report"
              onClick={() => setActiveTab('today')}
            >
              <span className="material-symbols-outlined">notifications</span>
              {adminNotifCount > 0 && <span className="admin-hub-bell-badge">{adminNotifCount > 99 ? '99+' : adminNotifCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="admin-hub-tabs-card">
        <div className="admin-hub-tabs-scroll">
          {(
            [
              ['overview', 'OVERVIEW'],
              ['today', 'TODAY'],
              ['revenue', 'REVENUE'],
              ['tips', 'TIPS'],
              ['users', 'USERS'],
              ['feedback', 'SUPPORT'],
              ['settings', '⚙️ SETTINGS'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={`admin-hub-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="admin-hub-main">
        {activeTab === 'overview' && (
          <div className="admin-overview">
            <div className="admin-card admin-chart-card admin-enter" style={{ animationDelay: '0ms' }}>
              <div className="admin-chart-shimmer" aria-hidden />
              <div className="admin-chart-glow" aria-hidden />
              <div className="admin-chart-head">
                <div>
                  <p className="admin-mono-label">User activity trend</p>
                  <p className="admin-chart-sub">New users</p>
                </div>
                <div className="admin-time-filters">
                  {([7, 30] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={`admin-time-btn ${timeRange === days ? 'active' : ''}`}
                      onClick={() => setTimeRange(days)}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 4, left: -18, bottom: 4 }}>
                    <defs>
                      <linearGradient id="adminSignupsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ADM.accent} stopOpacity={0.55} />
                        <stop offset="55%" stopColor={ADM.accent} stopOpacity={0.12} />
                        <stop offset="100%" stopColor={ADM.accent} stopOpacity={0} />
                      </linearGradient>
                      <radialGradient id="adminPeakGlow" cx="50%" cy="0%" r="80%">
                        <stop offset="0%" stopColor={ADM.accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                      </radialGradient>
                      <filter id="adminGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontWeight: 600 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ stroke: 'rgba(200,255,61,0.25)', strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0];
                        return (
                          <div className="admin-chart-tooltip">
                            <span className="admin-chart-tooltip-date">{p.payload?.name}</span>
                            <span className="admin-chart-tooltip-val">{p.value} new</span>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="signups"
                      name="New users"
                      stroke={ADM.accent}
                      strokeWidth={2.25}
                      fillOpacity={1}
                      fill="url(#adminSignupsGrad)"
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#0f172a', fill: ADM.accent }}
                      dot={(props: { cx?: number; cy?: number; index?: number }) => {
                        const { cx, cy, index } = props;
                        if (index === peakSignup.idx && peakSignup.val > 0 && cx != null && cy != null) {
                          return (
                            <g>
                              <circle cx={cx} cy={cy} r={14} fill="url(#adminPeakGlow)" opacity={0.9} />
                              <circle cx={cx} cy={cy} r={6} fill={ADM.accent} stroke="#0f172a" strokeWidth={2} filter="url(#adminGlowFilter)" />
                              <title>Peak: {peakSignup.val} new users</title>
                            </g>
                          );
                        }
                        return <circle cx={cx} cy={cy} r={0} />;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="admin-stat-row">
              <div className="admin-stat-pill admin-enter" style={{ animationDelay: '80ms' }}>
                <div className="admin-stat-iconbox admin-stat-iconbox--blue">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <div className="admin-stat-num">{animUsers}</div>
                <p className="admin-stat-label">Users</p>
                <div className={`admin-trend ${signupTrend.up ? 'up' : 'down'}`}>
                  <span className="material-symbols-outlined">
                    {signupTrend.up ? 'trending_up' : 'trending_down'}
                  </span>
                  {signupTrend.pct}% <span className="admin-trend-hint">vs prior window</span>
                </div>
                <div className="admin-stat-accent admin-stat-accent--blue" />
              </div>
              <div className="admin-stat-pill admin-stat-pill--gold admin-enter" style={{ animationDelay: '160ms' }}>
                <div className="admin-stat-iconbox admin-stat-iconbox--gold">
                  <span className="material-symbols-outlined">workspace_premium</span>
                </div>
                <div className="admin-stat-num admin-stat-num--gold">{animPro}</div>
                <p className="admin-stat-label">Pro members</p>
                <div className={`admin-trend ${proTrend.up ? 'up' : 'down'}`}>
                  <span className="material-symbols-outlined">{proTrend.up ? 'trending_up' : 'trending_down'}</span>
                  {proTrend.pct}% <span className="admin-trend-hint">vs prior week</span>
                </div>
                <div className="admin-stat-accent admin-stat-accent--gold" />
              </div>
            </div>

            <div className="admin-bottom-grid">
              <div className="admin-signups-card admin-enter" style={{ animationDelay: '340ms' }}>
                <div className="admin-signups-head">
                  <h3 className="admin-signups-title">Recent signups</h3>
                  <div className="admin-signups-badges">
                    <span className="admin-live-dot" aria-hidden />
                    <span className="admin-live-badge">Live users</span>
                  </div>
                </div>
                <div className="admin-signups-list">
                  {recentSignups.map((u, rowIdx) => {
                    const av = adminInitialAvatarStyle(u.name || 'U');
                    const isNewest = rowIdx === 0;
                    return (
                      <div
                        key={u.id}
                        className={`admin-signup-row ${isNewest ? 'admin-signup-row--fresh' : ''}`}
                      >
                        <div className="admin-su-avatar" style={{ background: av.bg, color: av.color }}>
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="admin-su-meta">
                          <div className="admin-su-name">{u.name || '—'}</div>
                          <div className="admin-su-date">
                            Joined {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        <div>
                          {u.role === 'admin' ? (
                            <span className="admin-role-pill admin-role-pill--admin">Admin</span>
                          ) : u.is_pro ? (
                            <span className="admin-role-pill admin-role-pill--pro">Pro</span>
                          ) : (
                            <span className="admin-role-pill">User</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {recentSignups.length === 0 && (
                    <div className="admin-empty-hint">No users yet.</div>
                  )}
                </div>
                <button type="button" className="admin-see-all" onClick={() => setActiveTab('users')}>
                  See all users
                </button>
              </div>

              <div className="admin-revenue-card admin-enter" style={{ animationDelay: '400ms' }}>
                <div className="admin-rev-head">
                  <div className="admin-rev-title-row">
                    <span className="material-symbols-outlined admin-rev-bolt">bolt</span>
                    <h3 className="admin-rev-title">Pro members</h3>
                  </div>
                  <button type="button" className="admin-rev-pill" onClick={() => setActiveTab('revenue')}>
                    Revenue
                  </button>
                </div>
                <div className="admin-rev-rows">
                  <div className="admin-rev-row">
                    <span className="admin-rev-lbl">All time</span>
                    <div className="admin-rev-right">
                      <MiniSparkline values={sparkAllTime} color={ADM.gold} />
                      <span className="admin-rev-val">{proCounts.total}</span>
                    </div>
                  </div>
                  <div className="admin-rev-row">
                    <span className="admin-rev-lbl">New last 30 days</span>
                    <div className="admin-rev-right">
                      <MiniSparkline values={spark30} color={ADM.gold} />
                      <span className="admin-rev-val">{proCounts.last30}</span>
                    </div>
                  </div>
                  <div className="admin-rev-row">
                    <span className="admin-rev-lbl">New last 7 days</span>
                    <div className="admin-rev-right">
                      <MiniSparkline values={spark7} color={ADM.gold} />
                      <span className="admin-rev-val">{proCounts.last7}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'today' && (
          <div className="admin-today-tab">
            {todayLoading ? (
              <div className="admin-today-loading">
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: ADM.accent, animation: 'spin 1s linear infinite' }}>progress_activity</span>
              </div>
            ) : (
              <>
                <div className="admin-today-date">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>

                <div className="admin-today-kpi-row">
                  {[
                    { label: 'New Signups', value: todayData.signups, icon: 'person_add', color: ADM.accent },
                    { label: 'Pro Upgrades', value: todayData.proUpgrades, icon: 'workspace_premium', color: ADM.gold },
                    { label: 'Support Tickets', value: todayData.tickets, icon: 'support_agent', color: '#60a5fa' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="admin-today-kpi">
                      <span className="material-symbols-outlined" style={{ color: kpi.color, fontSize: 22 }}>{kpi.icon}</span>
                      <div className="admin-today-kpi-val" style={{ color: kpi.color }}>{kpi.value}</div>
                      <div className="admin-today-kpi-lbl">{kpi.label}</div>
                    </div>
                  ))}
                </div>

                <div className="admin-today-section">
                  <div className="admin-today-section-title">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: ADM.accent }}>person_add</span>
                    Signups Today
                  </div>
                  {todayData.recentSignups.length === 0 ? (
                    <div className="admin-empty-hint">No new signups today.</div>
                  ) : (
                    todayData.recentSignups.map((u) => {
                      const av = adminInitialAvatarStyle(u.name || 'U');
                      return (
                        <div key={u.id} className="admin-signup-row">
                          <div className="admin-su-avatar" style={{ background: av.bg, color: av.color }}>
                            {(u.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="admin-su-meta">
                            <div className="admin-su-name">{u.name || '—'}</div>
                            <div className="admin-su-date">{u.email}</div>
                          </div>
                          <div>
                            {u.role === 'admin' ? (
                              <span className="admin-role-pill admin-role-pill--admin">Admin</span>
                            ) : u.is_pro ? (
                              <span className="admin-role-pill admin-role-pill--pro">Pro</span>
                            ) : (
                              <span className="admin-role-pill">User</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="admin-today-section">
                  <div className="admin-today-section-title">
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#60a5fa' }}>support_agent</span>
                    Support Tickets Today
                  </div>
                  {todayData.recentTickets.length === 0 ? (
                    <div className="admin-empty-hint">No tickets today. All quiet.</div>
                  ) : (
                    todayData.recentTickets.map((t) => (
                      <div key={t.id} className="admin-today-ticket">
                        <div className="admin-today-ticket-meta">
                          <span className="admin-today-ticket-name">{t.user_name || t.user_email || '—'}</span>
                          <span className="admin-today-ticket-type">{t.type || 'feedback'}</span>
                        </div>
                        <div className="admin-today-ticket-msg">{t.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="admin-revenue-tab">
            <div className="admin-rev-kpi-grid">
              {[
                {
                  label: 'TOTAL REVENUE',
                  sub: 'All time Pro lifetime',
                  value: `₹${revenueSummary.totalRevenue.toLocaleString('en-IN')}`,
                  icon: 'payments',
                },
                {
                  label: 'LAST 30 DAYS',
                  sub: 'Successful Pro purchases',
                  value: `₹${revenueSummary.last30Revenue.toLocaleString('en-IN')}`,
                  icon: 'calendar_month',
                },
                {
                  label: 'NEW MEMBERS THIS MONTH',
                  sub: 'Calendar month',
                  value: String(revenueSummary.monthNewMembers),
                  icon: 'group_add',
                },
              ].map((c, cardIdx) => (
                <div
                  key={c.label}
                  className="admin-rev-prem-card admin-enter"
                  style={{ animationDelay: `${cardIdx * 90}ms` }}
                >
                  <div className="admin-rev-prem-card-glow" aria-hidden />
                  <div className="admin-rev-prem-card-shimmer" aria-hidden />
                  <div className="admin-rev-prem-card-top">
                    <div className="admin-rev-prem-icobox">
                      <span className="material-symbols-outlined">{c.icon}</span>
                    </div>
                    <span className="material-symbols-outlined admin-rev-prem-trend" aria-hidden>
                      trending_up
                    </span>
                  </div>
                  <p className="admin-rev-prem-label">{c.label}</p>
                  <p className="admin-rev-prem-value">{c.value}</p>
                  <p className="admin-rev-prem-sub">{c.sub}</p>
                </div>
              ))}
            </div>

            <div className="admin-rev-tx-card admin-enter" style={{ animationDelay: '280ms' }}>
              <div className="admin-rev-tx-head">
                <div className="admin-rev-tx-title-row">
                  <span className="material-symbols-outlined admin-rev-tx-receipt" aria-hidden>
                    receipt_long
                  </span>
                  <h3 className="admin-rev-tx-title">Last 10 Transactions</h3>
                </div>
                <p className="admin-rev-tx-sub">Successful Pro purchases newest first</p>
              </div>
              <div className="admin-rev-tx-scroll">
                <table className="admin-rev-tx-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>USER</th>
                      <th>SOURCE</th>
                      <th>AMOUNT</th>
                      <th>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueTransactions.map((row, idx) => {
                      const isRazorpay = !!row.payment_id && !String(row.payment_id).startsWith('rc_');
                      const dtLine = row.pro_purchase_date
                        ? new Date(row.pro_purchase_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—';
                      return (
                        <tr key={row.id} className={idx % 2 === 1 ? 'admin-rev-tx-row--alt' : undefined}>
                          <td className="admin-rev-tx-num">{idx + 1}</td>
                          <td className="admin-rev-tx-email">
                            <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.72rem' }}>{row.name || '—'}</div>
                            <div style={{ color: 'rgba(148,163,184,0.7)', fontSize: '0.65rem' }}>{maskEmail(row.email)}</div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em',
                              textTransform: 'uppercase', borderRadius: 999, padding: '2px 7px',
                              background: isRazorpay ? 'rgba(96,165,250,0.12)' : 'rgba(200,255,61,0.1)',
                              border: `1px solid ${isRazorpay ? 'rgba(96,165,250,0.3)' : 'rgba(200,255,61,0.25)'}`,
                              color: isRazorpay ? '#60a5fa' : ADM.accent,
                            }}>
                              {isRazorpay ? 'Razorpay' : 'RevenueCat'}
                            </span>
                          </td>
                          <td className="admin-rev-tx-amt">
                            {row.payment_amount != null
                              ? `₹${Number(row.payment_amount).toLocaleString('en-IN')}`
                              : <span style={{ color: 'rgba(148,163,184,0.45)', fontSize: '0.7rem' }}>via store</span>
                            }
                          </td>
                          <td className="admin-rev-tx-dt">{dtLine}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {revenueTransactions.length === 0 && (
                  <div className="admin-rev-tx-empty">No Pro purchases recorded yet.</div>
                )}
              </div>
            </div>

            <div className="admin-rev-chart-card admin-enter" style={{ animationDelay: '360ms' }}>
              <div className="admin-rev-chart-head">
                <h3 className="admin-rev-chart-title">
                  30 DAY REVENUE <span className="admin-rev-chart-curr">₹</span>
                </h3>
              </div>
              <div className="admin-rev-chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueBarData} margin={{ top: 12, right: 10, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="adminRevAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ADM.accent} stopOpacity={0.5} />
                        <stop offset="100%" stopColor={ADM.accent} stopOpacity={0} />
                      </linearGradient>
                      <filter id="adminRevPeakGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 6"
                      vertical={false}
                      stroke="rgba(255,255,255,0.06)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: 'rgba(148, 163, 184, 0.9)',
                        fontSize: 9,
                        fontWeight: 600,
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tick={{
                        fill: 'rgba(100, 116, 139, 0.95)',
                        fontSize: 9,
                        fontWeight: 600,
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(200, 255, 61, 0.25)',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                      }}
                      formatter={(v) => [`₹${Number(v ?? 0)}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={ADM.accent}
                      strokeWidth={2.5}
                      fill="url(#adminRevAreaGrad)"
                      dot={(dotProps: { cx?: number; cy?: number; index?: number }) => {
                        const { cx, cy, index } = dotProps;
                        if (
                          index === undefined ||
                          cx === undefined ||
                          cy === undefined ||
                          index !== revenuePeakIndex ||
                          revenuePeakIndex < 0
                        ) {
                          return null;
                        }
                        return (
                          <g key="rev-peak-dot">
                            <circle cx={cx} cy={cy} r={10} fill="none" stroke={ADM.accent} strokeOpacity={0.35} />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={5}
                              fill={ADM.accent}
                              filter="url(#adminRevPeakGlow)"
                            />
                          </g>
                        );
                      }}
                      activeDot={{ r: 5, fill: ADM.accent, stroke: '#0f172a', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="admin-rev-chart-caption">Data based on last 50 purchases.</p>
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="admin-revenue-tab admin-tips-tab">
            {tipsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: ADM.accent, animation: 'spin 1s linear infinite' }}>progress_activity</span>
              </div>
            ) : tipsLoadErr ? (
              <p className="admin-tips-err" style={{ color: '#f87171', marginBottom: '1rem' }}>
                {tipsLoadErr}
              </p>
            ) : (
              <><div className="admin-rev-kpi-grid">
              {[
                {
                  label: 'TOTAL TIPS',
                  sub: 'All time (successful)',
                  value: `₹${tipsFinancial.totalInr.toLocaleString('en-IN')}`,
                  icon: 'favorite',
                  trendUp: tipsFinancial.thisMonthInr > tipsFinancial.lastMonthInr,
                },
                {
                  label: 'SUPPORTERS',
                  sub: 'Unique users who tipped',
                  value: String(tipsFinancial.supporters),
                  icon: 'groups',
                  trendUp: tipsFinancial.thisMonthInr > tipsFinancial.lastMonthInr,
                },
                {
                  label: 'THIS MONTH',
                  sub: 'Calendar month',
                  value: `₹${tipsFinancial.thisMonthInr.toLocaleString('en-IN')}`,
                  icon: 'calendar_month',
                  trendUp: tipsFinancial.thisMonthInr > tipsFinancial.lastMonthInr,
                },
              ].map((c, cardIdx) => (
                <div
                  key={c.label}
                  className="admin-rev-prem-card admin-enter"
                  style={{ animationDelay: `${cardIdx * 90}ms` }}
                >
                  <div className="admin-rev-prem-card-glow" aria-hidden />
                  <div className="admin-rev-prem-card-shimmer" aria-hidden />
                  <div className="admin-rev-prem-card-top">
                    <div className="admin-rev-prem-icobox">
                      <span className="material-symbols-outlined">{c.icon}</span>
                    </div>
                    <span
                      className={`material-symbols-outlined admin-rev-prem-trend ${c.trendUp ? '' : 'admin-rev-prem-trend--muted'}`}
                      aria-hidden
                    >
                      {c.trendUp ? 'trending_up' : 'trending_flat'}
                    </span>
                  </div>
                  <p className="admin-rev-prem-label">{c.label}</p>
                  <p className="admin-rev-prem-value">{c.value}</p>
                  <p className="admin-rev-prem-sub">{c.sub}</p>
                </div>
              ))}
            </div>

            <div className="admin-tips-breakdown admin-enter" style={{ animationDelay: '200ms' }}>
              <p className="admin-mono-label" style={{ marginBottom: '0.65rem' }}>
                Tips by amount
              </p>
              <div className="admin-tips-pill-row">
                {(() => {
                  const preset = { 29: 0, 49: 0, 99: 0 };
                  let custom = 0;
                  for (const row of tipsBreakdown) {
                    if (row.amount === 29) preset[29] += row.cnt;
                    else if (row.amount === 49) preset[49] += row.cnt;
                    else if (row.amount === 99) preset[99] += row.cnt;
                    else custom += row.cnt;
                  }
                  return (
                    <>
                      <span className="admin-tips-pill">₹29: {preset[29]} supporters</span>
                      <span className="admin-tips-pill">₹49: {preset[49]} supporters</span>
                      <span className="admin-tips-pill">₹99: {preset[99]} supporters</span>
                      <span className="admin-tips-pill">Custom: {custom} supporters</span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="admin-rev-tx-card admin-enter admin-tips-recent-card" style={{ animationDelay: '280ms' }}>
              <div className="admin-rev-tx-head">
                <div className="admin-rev-tx-title-row">
                  <span className="material-symbols-outlined admin-rev-tx-receipt" aria-hidden>
                    volunteer_activism
                  </span>
                  <h3 className="admin-rev-tx-title">Recent supporters</h3>
                </div>
                <p className="admin-rev-tx-sub">Last 15 successful tips · newest first</p>
              </div>
              <div className="admin-rev-tx-scroll">
                <table className="admin-rev-tx-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>USER</th>
                      <th>AMOUNT</th>
                      <th>DATE</th>
                      <th>PAYMENT ID</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipsRecent.map((row, idx) => (
                      <tr key={row.id} className={idx % 2 === 1 ? 'admin-rev-tx-row--alt' : undefined}>
                        <td className="admin-rev-tx-num">{idx + 1}</td>
                        <td className="admin-rev-tx-email">{maskEmail(row.user_email)}</td>
                        <td className="admin-rev-tx-amt">₹{Number(row.amount).toLocaleString('en-IN')}</td>
                        <td className="admin-rev-tx-dt">
                          {row.tipped_at
                            ? new Date(row.tipped_at).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                        <td className="admin-rev-tx-pid" title={row.razorpay_payment_id ?? undefined}>
                          {shortPaymentId(row.razorpay_payment_id)}
                        </td>
                        <td>
                          <span className="admin-tips-status-pill">Success</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tipsRecent.length === 0 && (
                  <div className="admin-rev-tx-empty">No tips recorded yet.</div>
                )}
              </div>
            </div>

            <div className="admin-tips-leaderboard admin-enter" style={{ animationDelay: '360ms' }}>
              <p className="admin-mono-label" style={{ marginBottom: '0.65rem' }}>
                All-time top supporters
              </p>
              <div className="admin-tips-lb-list">
                {tipsTop.map((row, i) => (
                  <div key={`${row.user_email}-${i}`} className="admin-tips-lb-row">
                    <span className="admin-tips-lb-rank">{i + 1}</span>
                    <span className="admin-tips-lb-email">{maskEmail(row.user_email)}</span>
                    <span className="admin-tips-lb-amt">₹{row.total_tipped.toLocaleString('en-IN')}</span>
                    <span className="admin-tips-lb-count">{row.tip_count}×</span>
                  </div>
                ))}
                {tipsTop.length === 0 && <div className="admin-rev-tx-empty">No data yet.</div>}
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-users-tab">
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 16px',
                overflowX: 'auto',
                marginBottom: '10px',
              }}
            >
              <FilterPill
                label="All Users"
                count={totalUsersCount}
                active={activeFilter === 'all'}
                color="#00E87A"
                onClick={() => setActiveFilter('all')}
              />
              <FilterPill
                label="Verified"
                count={verifiedCount}
                active={activeFilter === 'verified'}
                color="#00E87A"
                onClick={() => setActiveFilter('verified')}
              />
              <FilterPill
                label="Pending"
                count={pendingCount}
                active={activeFilter === 'pending'}
                color="#FF9500"
                onClick={() => setActiveFilter('pending')}
              />
              <FilterPill
                label="Pro ⚡"
                count={proCount}
                active={activeFilter === 'pro'}
                color="#FFD700"
                onClick={() => setActiveFilter('pro')}
              />
            </div>

            <div className="admin-users-controls admin-enter" style={{ animationDelay: '60ms', marginTop: 0 }}>
              <div className="admin-users-search-wrap">
                <span className="material-symbols-outlined admin-users-search-ic" aria-hidden>
                  search
                </span>
                <input
                  type="text"
                  className="admin-users-search-input"
                  placeholder="Search by name or email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>

            <div className="admin-users-sort-row admin-enter" style={{ animationDelay: '110ms' }}>
              <button
                type="button"
                className="admin-users-sort-btn"
                onClick={() => setUserSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              >
                <span className="material-symbols-outlined">
                  {userSortOrder === 'newest' ? 'south' : 'north'}
                </span>
                {userSortOrder === 'newest' ? 'Newest' : 'Oldest'}
              </button>
              <div className="admin-users-total-pill">
                <span className="admin-users-total-num">{totalUsersCount}</span>
                <span className="admin-users-total-lbl">TOTAL</span>
              </div>
            </div>

            <div className="admin-users-list">
              {usersLoading && users.length === 0
                ? [0, 1, 2].map((sk) => <div key={sk} className="admin-user-skeleton-card" />)
                : users.map((u, idx) => {
                    const av = adminInitialAvatarStyle(u.name || 'U');
                    const score = u.stats?.productivityScore ?? 0;
                    const prodColor = productivityScoreColor(score);
                    const lastRel = formatRelativeTime(u.created_at);
                    const isPro = Boolean(u.is_pro);
                    const isPending = !u.email_confirmed;
                    return (
                      <div
                        key={u.id}
                        className="admin-enter"
                        style={{ animationDelay: `${Math.min(320, 160 + idx * 45)}ms` }}
                      >
                        <div
                          style={{
                            background: isPro
                              ? 'linear-gradient(135deg, #1A1500 0%, #0F0F0F 100%)'
                              : '#0F0F0F',
                            border: isPro ? '1px solid #FFD700' : isPending ? '1px solid #FF9500' : '1px solid #1A1A1A',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '12px',
                            boxShadow: isPro ? '0 0 12px #FFD70022' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="admin-v2-avatar" style={{ background: av.bg, color: av.color }}>
                              {(u.avatar_url || u.avatarUrl) && !brokenImages.has(u.id) ? (
                                <img
                                  src={u.avatar_url || u.avatarUrl}
                                  alt=""
                                  onError={() => setBrokenImages((prev) => new Set(prev).add(u.id))}
                                />
                              ) : (
                                <span>{u.name?.charAt(0).toUpperCase() || 'U'}</span>
                              )}
                            </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span className="admin-v2-name">{u.name || '—'}</span>
                                  {isPro && (
                                    <span
                                      style={{
                                        background: '#FFD700',
                                        color: '#000',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                      }}
                                    >
                                      ⚡ PRO
                                    </span>
                                  )}
                                  <span className={`admin-role-pill ${u.role === 'admin' ? 'admin-role-pill--admin' : ''}`}>
                                    {u.role === 'admin' ? 'Admin' : 'User'}
                                  </span>
                                </div>
                                <div className="admin-v2-email" title={u.email || undefined}>
                                  {u.email || '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                            <div>
                              <div className="admin-v2-stat-lbl">STATUS</div>
                              <div style={{ color: isPending ? '#FF9500' : '#00E87A', fontWeight: 700 }}>
                                {isPending ? 'Pending' : 'Active'}
                              </div>
                            </div>
                            <div>
                              <div className="admin-v2-stat-lbl">LAST ACTIVE</div>
                              <div className="admin-v2-stat-val-la">{lastRel}</div>
                            </div>
                            <div>
                              <div className="admin-v2-stat-lbl">PRODUCTIVITY</div>
                              <div className="admin-v2-stat-val-prod" style={{ color: prodColor }}>
                                {score}%
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              title="Reset PIN"
                              onClick={() => setResetPinModal({ show: true, userId: u.id, userName: u.name })}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border: '1px solid #333',
                                background: '#111',
                                color: '#d1d5db',
                                cursor: 'pointer',
                              }}
                            >
                              🔑
                            </button>
                            <button
                              type="button"
                              title="Delete User"
                              onClick={() => deleteUser(u.id, u.name)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                border: '1px solid #333',
                                background: '#111',
                                color: '#f87171',
                                cursor: 'pointer',
                              }}
                            >
                              🗑️
                            </button>
                            {!u.email_confirmed && (
                              <button
                                type="button"
                                onClick={() => void handleResendVerification(u)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#FF950022',
                                  border: '1px solid #FF9500',
                                  borderRadius: '8px',
                                  color: '#FF9500',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                📧 Resend Verification
                              </button>
                            )}
                            {!u.is_pro ? (
                              <button
                                type="button"
                                onClick={() => void handleMakePro(u)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#FFD70022',
                                  border: '1px solid #FFD700',
                                  borderRadius: '8px',
                                  color: '#FFD700',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  marginLeft: 'auto',
                                }}
                              >
                                ⚡ Make Pro
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleRevokePro(u)}
                                style={{
                                  padding: '6px 12px',
                                  background: 'rgba(239,68,68,0.1)',
                                  border: '1px solid rgba(239,68,68,0.4)',
                                  borderRadius: '8px',
                                  color: '#EF4444',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  marginLeft: 'auto',
                                }}
                              >
                                Revoke Pro
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>

            {usersLoadingMore && (
              <div className="admin-users-more-skel">
                <div className="admin-user-skeleton-card admin-user-skeleton-card--short" />
              </div>
            )}

            {hasMoreUsers && users.length > 0 && !usersLoading && (
              <button
                type="button"
                onClick={loadMoreUsers}
                disabled={usersLoadingMore}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  color: '#00E87A',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                {usersLoadingMore ? 'Loading...' : 'Load More Users'}
              </button>
            )}

            <p className="admin-users-showing">
              {usersLoading && users.length === 0
                ? 'Loading users…'
                : `Showing ${users.length} of ${totalUsersCount} users`}
            </p>

            {!usersLoading && users.length === 0 && debouncedSearch.trim() !== '' && (
              <div className="admin-users-empty">
                <span className="material-symbols-outlined admin-users-empty-ic" aria-hidden>
                  person_search
                </span>
                <p className="admin-users-empty-txt">No users found matching your search.</p>
              </div>
            )}

            {!usersLoading && users.length === 0 && debouncedSearch.trim() === '' && totalUsersCount === 0 && (
              <div className="admin-users-empty">
                <span className="material-symbols-outlined admin-users-empty-ic" aria-hidden>
                  group_off
                </span>
                <p className="admin-users-empty-txt">No users registered.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="admin-fb-tab">
            <h2
              style={{
                margin: '0 0 8px',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                color: '#f8fafc',
              }}
            >
              Support &amp; Feedback
            </h2>

            <div style={{ display: 'flex', gap: '8px', padding: '12px 0 14px' }}>
              <FilterPill
                label="All"
                count={totalFeedbackCount}
                active={feedbackActiveFilter === 'all'}
                color="#777"
                onClick={() => setFeedbackActiveFilter('all')}
              />
              <FilterPill
                label="⭐ Feature"
                count={feedbacks.filter((f) => (f.type || '').toLowerCase() === 'feature').length}
                active={feedbackActiveFilter === 'feature'}
                color="#00E87A"
                onClick={() => setFeedbackActiveFilter('feature')}
              />
              <FilterPill
                label="🎧 Support"
                count={feedbacks.filter((f) => (f.type || '').toLowerCase() === 'support').length}
                active={feedbackActiveFilter === 'support'}
                color="#FF9500"
                onClick={() => setFeedbackActiveFilter('support')}
              />
              <FilterPill
                label="⚡ PRO"
                count={feedbackActiveFilter === 'pro' ? totalFeedbackCount : 0}
                active={feedbackActiveFilter === 'pro'}
                color={ADM.gold}
                onClick={() => setFeedbackActiveFilter('pro')}
              />
            </div>

            <div className="admin-fb-toolbar admin-enter" style={{ animationDelay: '70ms', marginBottom: 10 }}>
              <button
                type="button"
                className="admin-fb-sort-btn"
                onClick={() => setFeedbackSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
              >
                <span className="material-symbols-outlined">{feedbackSortOrder === 'newest' ? 'south' : 'north'}</span>
                {feedbackSortOrder === 'newest' ? 'Newest' : 'Oldest'}
              </button>
            </div>

            <div className="admin-fb-list">
              {feedbacksLoading && feedbacks.length === 0
                ? [0, 1, 2, 3, 4].map((sk) => <div key={sk} className="admin-fb-skeleton-card" />)
                : feedbacks.map((f, idx) => {
                    const name = f.user_name || 'User';
                    const rawType = String(f.type || '').toLowerCase();
                    const isSupport = rawType === 'support';
                    const dateStr = f.created_at ? new Date(f.created_at).toLocaleString('en-IN') : '—';
                    const busy = deletingFeedbackId === f.id;
                    return (
                      <div
                        key={f.id}
                        className="admin-enter"
                        style={{ animationDelay: `${Math.min(380, 120 + idx * 48)}ms` }}
                      >
                        <div
                          style={{
                            background: isSupport ? '#1A1000' : '#0F1A14',
                            border: isSupport ? '1px solid #FF950044' : '1px solid #00E87A33',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#1A1A2E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#00E87A',
                                fontWeight: 700,
                                fontSize: '14px',
                              }}
                            >
                              {name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{name}</div>
                              <div style={{ color: '#666', fontSize: '11px' }}>{f.user_email || '—'}</div>
                            </div>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isSupport ? '#FF950022' : '#00E87A22',
                                color: isSupport ? '#FF9500' : '#00E87A',
                                border: `1px solid ${isSupport ? '#FF9500' : '#00E87A'}`,
                              }}
                            >
                              {isSupport ? '🎧 Support' : '⭐ Feature'}
                            </span>
                          </div>

                          {isSupport && f.ticket_id && (
                            <div
                              style={{
                                background: '#FF950011',
                                border: '1px solid #FF950033',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span style={{ color: '#FF9500', fontSize: '11px', fontWeight: 600 }}>🎫 Ticket:</span>
                              <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }}>
                                {f.ticket_id}
                              </span>
                              <span
                                style={{
                                  marginLeft: 'auto',
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background:
                                    f.status === 'resolved'
                                      ? '#00E87A22'
                                      : f.status === 'in_progress'
                                        ? '#007AFF22'
                                        : '#FF950022',
                                  color:
                                    f.status === 'resolved'
                                      ? '#00E87A'
                                      : f.status === 'in_progress'
                                        ? '#007AFF'
                                        : '#FF9500',
                                }}
                              >
                                {f.status === 'resolved'
                                  ? '✅ Resolved'
                                  : f.status === 'in_progress'
                                    ? '🔄 In Progress'
                                    : '⏳ Pending'}
                              </span>
                            </div>
                          )}

                          {isSupport && f.subcategory && (
                            <div style={{ color: '#FF9500', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                              {supportCategories.find((c) => c.value === f.subcategory)?.label || f.subcategory}
                            </div>
                          )}

                          <p style={{ color: '#CCC', fontSize: '14px', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                            {f.message || '—'}
                          </p>
                          <div style={{ color: '#555', fontSize: '11px', marginBottom: '12px' }}>{dateStr}</div>

                          {f.admin_note && (
                            <div
                              style={{
                                background: '#00E87A11',
                                border: '1px solid #00E87A33',
                                borderRadius: '8px',
                                padding: '10px',
                                marginBottom: '12px',
                              }}
                            >
                              <div style={{ color: '#00E87A', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                                🛡️ Admin Response:
                              </div>
                              <div style={{ color: '#CCC', fontSize: '13px' }}>{f.admin_note}</div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {isSupport && (
                              <select
                                value={f.status || 'pending'}
                                onChange={(e) => void handleUpdateStatus(f.id, e.target.value)}
                                style={{
                                  padding: '6px 10px',
                                  background: '#1A1A1A',
                                  border: '1px solid #333',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="pending">⏳ Pending</option>
                                <option value="in_progress">🔄 In Progress</option>
                                <option value="resolved">✅ Resolved</option>
                                <option value="closed">🔒 Closed</option>
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenRespond(f)}
                              style={{
                                padding: '6px 12px',
                                background: '#007AFF22',
                                border: '1px solid #007AFF',
                                borderRadius: '8px',
                                color: '#007AFF',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              💬 Respond
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDeleteFeedback(f.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#FF3B3022',
                                border: '1px solid #FF3B30',
                                borderRadius: '8px',
                                color: '#FF3B30',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginLeft: 'auto',
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>

            <p className="admin-fb-showing">
              {feedbacksLoading && feedbacks.length === 0
                ? 'Loading feedback…'
                : `${totalFeedbackCount} items`}
            </p>

            {!feedbacksLoading && feedbacks.length === 0 && (
              <div className="admin-fb-empty">
                <span className="material-symbols-outlined admin-fb-empty-ic" aria-hidden>
                  chat_bubble_outline
                </span>
                <p className="admin-fb-empty-txt">No feedback found.</p>
              </div>
            )}

            {respondModal.show && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: '#000000CC',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '480px',
                    background: '#111',
                    borderRadius: '20px',
                    padding: '24px 20px',
                    border: '1px solid #222',
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>💬 Admin Response</div>
                  {respondModal.item?.ticket_id && (
                    <div style={{ color: '#FF9500', fontSize: '12px', marginBottom: '16px' }}>
                      🎫 {respondModal.item.ticket_id}
                    </div>
                  )}
                  <textarea
                    value={respondModal.note}
                    onChange={(e) => setRespondModal((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Type your response..."
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#1A1A1A',
                      border: '1px solid #333',
                      borderRadius: '12px',
                      padding: '12px',
                      color: '#fff',
                      fontSize: '14px',
                      resize: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setRespondModal({ show: false, item: null, note: '' })}
                      style={{
                        flex: 1,
                        padding: '14px',
                        background: '#1A1A1A',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        color: '#888',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveResponse()}
                      style={{
                        flex: 2,
                        padding: '14px',
                        background: '#00E87A',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#000',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Send Response ✅
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="admin-settings-tab">
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div style={{ color: '#00E87A', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>📢 Post Announcement</div>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>Broadcast to all StayHardy users</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {(
                  [
                    ['update', '🔄 Update'],
                    ['feature', '✨ New Feature'],
                    ['maintenance', '🔧 Maintenance'],
                    ['urgent', '🚨 Urgent'],
                    ['general', '📢 General'],
                  ] as const
                ).map(([k, lab]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAnnoCategory(k)}
                    style={{
                      height: 32,
                      padding: '0 14px',
                      borderRadius: 20,
                      border:
                        annoCategory === k
                          ? `1px solid ${k === 'feature' ? 'rgba(0,232,122,0.45)' : k === 'update' ? 'rgba(99,102,241,0.45)' : k === 'maintenance' ? 'rgba(245,158,11,0.45)' : k === 'urgent' ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.3)'}`
                          : '1px solid rgba(255,255,255,0.08)',
                      background:
                        annoCategory === k
                          ? k === 'feature'
                            ? 'rgba(0,232,122,0.15)'
                            : k === 'update'
                              ? 'rgba(99,102,241,0.15)'
                              : k === 'maintenance'
                                ? 'rgba(245,158,11,0.15)'
                                : k === 'urgent'
                                  ? 'rgba(239,68,68,0.15)'
                                : 'rgba(255,255,255,0.1)'
                          : 'rgba(255,255,255,0.04)',
                      color:
                        annoCategory === k
                          ? k === 'feature'
                            ? '#00E87A'
                            : k === 'update'
                              ? '#818CF8'
                              : k === 'maintenance'
                                ? '#F59E0B'
                                : k === 'urgent'
                                  ? '#EF4444'
                                : '#fff'
                          : 'rgba(255,255,255,0.4)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {lab}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(
                  [
                    ['all', '🌐 All Users'],
                    ['pro', '⚡ Pro Only'],
                    ['basic', '👤 Basic Only'],
                  ] as const
                ).map(([k, lab]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAnnoTarget(k)}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 20,
                      border: annoTarget === k
                        ? `1px solid ${k === 'pro' ? 'rgba(0,232,122,0.5)' : k === 'basic' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.35)'}`
                        : '1px solid rgba(255,255,255,0.08)',
                      background: annoTarget === k
                        ? k === 'pro' ? 'rgba(0,232,122,0.15)' : k === 'basic' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.1)'
                        : 'rgba(255,255,255,0.04)',
                      color: annoTarget === k
                        ? k === 'pro' ? '#00E87A' : k === 'basic' ? '#818CF8' : '#fff'
                        : 'rgba(255,255,255,0.4)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {lab}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Announcement title…"
                value={annoTitle}
                onChange={(e) => setAnnoTitle(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: 14,
                  marginBottom: 10,
                  boxSizing: 'border-box',
                }}
              />
              <textarea
                placeholder="Write your announcement…"
                value={annoMessage}
                onChange={(e) => setAnnoMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  resize: 'none',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: 14,
                  marginBottom: 8,
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ color: 'rgba(148,163,184,0.9)', fontSize: 11, margin: '0 0 12px' }}>
                {annoMessage.length}/500
              </p>
              <button
                type="button"
                disabled={isPosting}
                onClick={() => void handlePostAnnouncement()}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 14,
                  border: 'none',
                  fontWeight: 800,
                  cursor: isPosting ? 'not-allowed' : 'pointer',
                  background: isPosting ? 'rgba(0,232,122,0.35)' : 'linear-gradient(135deg, #00E87A, #00C563)',
                  color: '#000',
                }}
              >
                {isPosting ? 'Posting...' : annoTarget === 'pro' ? '⚡ Post to Pro Users' : annoTarget === 'basic' ? '👤 Post to Basic Users' : '🌐 Post to All Users'}
              </button>
            </div>

            <p style={{ fontSize: 10, letterSpacing: '0.14em', color: 'rgba(148,163,184,0.85)', margin: '0 0 8px' }}>
              RECENT POSTS ({announcements.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background:
                            a.category === 'feature'
                              ? '#00E87A'
                              : a.category === 'update'
                                ? '#818CF8'
                                : a.category === 'maintenance'
                                  ? '#F59E0B'
                                  : a.category === 'urgent'
                                    ? '#EF4444'
                                  : '#94a3b8',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: 13 }}>{a.title}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(148,163,184,0.9)' }}>
                      {new Date(a.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                        title={a.is_active ? 'Hide from users' : 'Show to users'}
                      onClick={() => void toggleAnnouncementActive(a.id)}
                      style={{
                          padding: '4px 10px',
                          background: a.is_active ? '#00E87A22' : '#FF3B3022',
                          border: `1px solid ${a.is_active ? '#00E87A' : '#FF3B30'}`,
                        borderRadius: 8,
                          color: a.is_active ? '#00E87A' : '#FF3B30',
                          fontSize: 11,
                        cursor: 'pointer',
                          marginRight: '8px',
                      }}
                    >
                        {a.is_active ? '✅ Active' : '⏸ Hidden'}
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={() => void deleteAnnouncement(a.id)}
                      style={{
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 8,
                        padding: '4px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: 13, textAlign: 'center', padding: '1rem 0' }}>
                  No announcements yet.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`
        .admin-settings-tab {
          max-width: 520px;
          margin: 0 auto;
          padding: 0 0 2rem;
        }
        .admin-settings-section-label-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-settings-section-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.25), transparent);
        }
        .admin-settings-section-label {
          margin: 0;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.18em;
          color: rgba(148, 163, 184, 0.95);
          white-space: nowrap;
        }
        .admin-hub-root {
          --admin-accent: ${ADM.accent};
          --admin-gold: ${ADM.gold};
          padding-bottom: 120px;
        }
        .admin-hub-header {
          margin-bottom: 1.25rem;
          padding-top: calc(env(safe-area-inset-top, 0px) + 60px);
          padding-bottom: 0;
          padding-right: 0.75rem;
          padding-left: 0.75rem;
        }
        .admin-hub-header-top {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-bottom: 0;
        }
        .admin-hub-title-block {
          flex: 1;
          min-width: 0;
        }
        .admin-hub-title-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .admin-hub-title {
          font-family: 'Bebas Neue', 'Syne', Impact, sans-serif;
          font-size: clamp(1.65rem, 5.5vw, 2.35rem);
          letter-spacing: 0.06em;
          margin: 0;
          color: #f8fafc;
          font-weight: 700;
          line-height: 1;
          min-width: 0;
          word-break: break-word;
        }
        .admin-hub-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.52rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          padding: 0.38rem 0.65rem 0.38rem 0.55rem;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.28), rgba(120, 53, 15, 0.35));
          border: 1px solid rgba(250, 204, 21, 0.55);
          color: #fde68a;
          box-shadow:
            0 0 18px rgba(250, 204, 21, 0.4),
            0 0 36px rgba(234, 179, 8, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }
        .admin-hub-badge-shield {
          font-size: 14px !important;
          color: #facc15;
          filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.85));
        }
        .admin-hub-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-hub-bell {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.85);
          color: #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .admin-hub-bell-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #020617;
        }
        .admin-hub-tabs-card {
          margin-bottom: 1.25rem;
          padding: 0.4rem;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .admin-hub-tabs-scroll {
          display: flex;
          gap: 0.4rem;
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 2px;
        }
        .admin-hub-tabs-scroll::-webkit-scrollbar {
          display: none;
        }
        .admin-hub-tab {
          flex: 1 0 auto;
          min-width: fit-content;
          padding: 0.55rem 1rem;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: rgba(248, 250, 252, 0.52);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        }
        .admin-hub-tab.active {
          background: ${ADM.accent};
          color: #0f172a;
          box-shadow: 0 0 20px rgba(200, 255, 61, 0.35);
        }
        .admin-hub-main {
          padding-bottom: 5rem;
          padding-left: 0.25rem;
          padding-right: 0.25rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .admin-today-tab {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .admin-today-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }
        .admin-today-date {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.7);
          padding: 0 0.25rem;
        }
        .admin-today-kpi-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }
        .admin-today-kpi {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 1rem 0.75rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          text-align: center;
        }
        .admin-today-kpi-val {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 1.75rem;
          font-weight: 800;
          line-height: 1;
        }
        .admin-today-kpi-lbl {
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.6);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .admin-today-section {
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .admin-today-section-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(248, 250, 252, 0.7);
          margin-bottom: 0.25rem;
        }
        .admin-today-ticket {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .admin-today-ticket-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .admin-today-ticket-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: #f8fafc;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .admin-today-ticket-type {
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #60a5fa;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          background: rgba(96, 165, 250, 0.12);
          border: 1px solid rgba(96, 165, 250, 0.25);
          border-radius: 999px;
          padding: 0.15rem 0.5rem;
        }
        .admin-today-ticket-msg {
          font-size: 0.75rem;
          color: rgba(148, 163, 184, 0.8);
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .admin-users-tab {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .admin-users-report-card {
          position: relative;
          border-radius: 16px;
          padding: 1.15rem 1.2rem 1.05rem;
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
          border: 1px solid rgba(232, 197, 71, 0.32);
          overflow: hidden;
        }
        .admin-users-report-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(232, 197, 71, 0.15),
            rgba(250, 204, 21, 0.85),
            rgba(232, 197, 71, 0.15),
            transparent
          );
          background-size: 200% 100%;
          animation: admin-users-report-shine 3.2s ease-in-out infinite;
        }
        @keyframes admin-users-report-shine {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .admin-users-report-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #f8fafc;
          position: relative;
          z-index: 1;
        }
        .admin-users-report-sub {
          margin: 0.35rem 0 0;
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 600;
          position: relative;
          z-index: 1;
        }
        .admin-users-controls {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 0.65rem;
          align-items: stretch;
        }
        .admin-users-search-wrap {
          flex: 1 1 200px;
          min-width: 0;
          position: relative;
          display: flex;
          align-items: center;
        }
        .admin-users-search-ic {
          position: absolute;
          left: 0.75rem;
          font-size: 1.15rem;
          color: #64748b;
          pointer-events: none;
        }
        .admin-users-search-input {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.75);
          color: #f1f5f9;
          padding: 0 0.85rem 0 2.65rem;
          font-size: 0.78rem;
          font-weight: 600;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .admin-users-search-input::placeholder {
          color: #64748b;
        }
        .admin-users-search-input:focus {
          border-color: rgba(200, 255, 61, 0.45);
          box-shadow: 0 0 0 3px rgba(200, 255, 61, 0.12);
        }
        .admin-users-filter-wrap {
          position: relative;
          flex: 0 0 auto;
          min-width: 148px;
        }
        .admin-users-filter-select {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.85);
          color: #e2e8f0;
          padding: 0 2.25rem 0 0.85rem;
          font-size: 0.72rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          appearance: none;
          cursor: pointer;
          outline: none;
        }
        .admin-users-filter-select:focus {
          border-color: rgba(200, 255, 61, 0.35);
          box-shadow: 0 0 0 2px rgba(200, 255, 61, 0.1);
        }
        .admin-users-filter-chev {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          color: #94a3b8;
          pointer-events: none;
        }
        .admin-users-sort-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
        }
        .admin-users-sort-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          height: 40px;
          padding: 0 0.9rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(15, 23, 42, 0.65);
          color: #f1f5f9;
          font-size: 0.72rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .admin-users-sort-btn .material-symbols-outlined {
          font-size: 1rem;
        }
        .admin-users-sort-btn:hover {
          border-color: rgba(200, 255, 61, 0.35);
        }
        .admin-users-total-pill {
          display: inline-flex;
          align-items: baseline;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          background: ${ADM.accent};
          color: #0f172a;
          box-shadow: 0 0 22px rgba(200, 255, 61, 0.35);
        }
        .admin-users-total-num {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 1.35rem;
          letter-spacing: 0.04em;
          font-weight: 700;
          line-height: 1;
        }
        .admin-users-total-lbl {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.14em;
        }
        .admin-users-tab-tagline {
          margin: 4px 0 10px;
          text-align: center;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #00e87a;
        }
        .admin-users-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .admin-v2-user-card {
          width: 100%;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 14px;
          box-sizing: border-box;
        }
        .admin-v2-user-card--inactive {
          opacity: 0.9;
        }
        .admin-v2-user-r1 {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .admin-v2-user-r1-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        .admin-v2-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 14px;
          overflow: hidden;
        }
        .admin-v2-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .admin-v2-ident {
          min-width: 0;
          flex: 1;
        }
        .admin-v2-name {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.2;
        }
        .admin-v2-email {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.45);
          margin-top: 2px;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-v2-pro-badge {
          flex-shrink: 0;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #00e87a;
          padding: 3px 8px;
          border-radius: 10px;
          background: rgba(0, 232, 122, 0.12);
          border: 1px solid rgba(0, 232, 122, 0.3);
        }
        .admin-v2-user-r2 {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: space-between;
          gap: 0;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .admin-v2-stat-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 4px;
        }
        .admin-v2-stat-lbl {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.35);
          text-transform: uppercase;
        }
        .admin-v2-stat-val-prod {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.2;
        }
        .admin-v2-stat-val-la {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.2;
        }
        .admin-v2-stat-divider {
          width: 1px;
          align-self: stretch;
          min-height: 36px;
          background: rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }
        .admin-v2-status-hit {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
        }
        .admin-v2-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .admin-v2-user-r3 {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .admin-v2-r3-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .admin-v2-act {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 1px solid transparent;
          padding: 0;
          transition: transform 0.12s ease, opacity 0.2s;
        }
        .admin-v2-act:active {
          transform: scale(0.96);
        }
        .admin-v2-act .material-symbols-outlined {
          font-size: 18px;
        }
        .admin-v2-act--reset {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        .admin-v2-act--del {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .admin-v2-pro-btn {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 10px;
          cursor: pointer;
          border: 1px solid transparent;
          white-space: nowrap;
        }
        .admin-v2-pro-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .admin-v2-pro-btn--make {
          background: rgba(0, 232, 122, 0.1);
          border-color: rgba(0, 232, 122, 0.25);
          color: #00e87a;
        }
        .admin-v2-pro-btn--remove {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }
        .admin-user-skeleton-card {
          border-radius: 16px;
          height: 112px;
          background: linear-gradient(90deg, rgba(30, 41, 59, 0.5) 0%, rgba(51, 65, 85, 0.35) 45%, rgba(30, 41, 59, 0.5) 90%);
          background-size: 200% 100%;
          animation: admin-user-skel 1.35s ease-in-out infinite;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .admin-user-skeleton-card--short {
          height: 72px;
          max-width: 100%;
        }
        @keyframes admin-user-skel {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
        .admin-users-more-skel {
          margin-top: 0.25rem;
        }
        .admin-users-sentinel {
          height: 1px;
          width: 100%;
          margin-top: 0.25rem;
        }
        .admin-users-load-more {
          margin-top: 0.35rem;
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(200, 255, 61, 0.35);
          background: rgba(200, 255, 61, 0.08);
          color: ${ADM.accent};
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .admin-users-load-more:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .admin-users-showing {
          margin: 0.35rem 0 0;
          text-align: center;
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .admin-users-empty {
          text-align: center;
          padding: 2.5rem 1rem 1rem;
        }
        .admin-users-empty-ic {
          font-size: 2.5rem;
          color: #475569;
          display: block;
          margin: 0 auto 0.75rem;
        }
        .admin-users-empty-txt {
          margin: 0;
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }
        .admin-fb-tab {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .admin-fb-report-card {
          position: relative;
          border-radius: 16px;
          padding: 1.15rem 1.2rem 1.05rem;
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
          border: 1px solid rgba(232, 197, 71, 0.32);
          overflow: hidden;
        }
        .admin-fb-report-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(232, 197, 71, 0.15),
            rgba(250, 204, 21, 0.85),
            rgba(232, 197, 71, 0.15),
            transparent
          );
          background-size: 200% 100%;
          animation: admin-users-report-shine 3.2s ease-in-out infinite;
        }
        .admin-fb-report-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #f8fafc;
          position: relative;
          z-index: 1;
        }
        .admin-fb-report-sub {
          margin: 0.35rem 0 0;
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 600;
          position: relative;
          z-index: 1;
        }
        .admin-fb-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 0.65rem;
        }
        .admin-fb-filter-wrap {
          position: relative;
          flex: 1 1 140px;
          min-width: 0;
          max-width: 220px;
        }
        .admin-fb-filter-select {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(2, 6, 23, 0.85);
          color: #e2e8f0;
          padding: 0 2.25rem 0 0.85rem;
          font-size: 0.72rem;
          font-weight: 700;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          appearance: none;
          cursor: pointer;
          outline: none;
        }
        .admin-fb-filter-select:focus {
          border-color: rgba(200, 255, 61, 0.35);
          box-shadow: 0 0 0 2px rgba(200, 255, 61, 0.1);
        }
        .admin-fb-filter-chev {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1.1rem;
          color: #94a3b8;
          pointer-events: none;
        }
        .admin-fb-sort-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          height: 44px;
          padding: 0 0.9rem;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(15, 23, 42, 0.65);
          color: #f1f5f9;
          font-size: 0.72rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          cursor: pointer;
        }
        .admin-fb-sort-btn .material-symbols-outlined {
          font-size: 1rem;
        }
        .admin-fb-clear-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          height: 44px;
          padding: 0 0.9rem;
          border-radius: 12px;
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.06);
          color: #f87171;
          font-size: 0.68rem;
          font-weight: 800;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          cursor: pointer;
        }
        .admin-fb-clear-btn .material-symbols-outlined {
          font-size: 1rem;
        }
        .admin-fb-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .admin-fb-card {
          border-radius: 14px;
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.97));
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1rem 1.05rem 0.9rem;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
        .admin-fb-card:active {
          transform: scale(0.992);
        }
        .admin-fb-card:has(.admin-fb-del:hover),
        .admin-fb-card:has(.admin-fb-del:focus-visible) {
          box-shadow: inset 4px 0 0 0 rgba(239, 68, 68, 0.75), 0 0 22px rgba(239, 68, 68, 0.12);
        }
        .admin-fb-card-row1 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .admin-fb-user {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }
        .admin-fb-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.95rem;
          flex-shrink: 0;
        }
        .admin-fb-username {
          font-weight: 800;
          font-size: 0.88rem;
          color: #f8fafc;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .admin-fb-type-pill {
          flex-shrink: 0;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.52rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          padding: 0.38rem 0.55rem;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .admin-fb-type--feature {
          background: rgba(34, 197, 94, 0.18);
          color: #6ee7b7;
          border: 1px solid rgba(34, 197, 94, 0.45);
          box-shadow: 0 0 14px rgba(34, 197, 94, 0.2);
        }
        .admin-fb-type--bug {
          background: rgba(239, 68, 68, 0.16);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.45);
          box-shadow: 0 0 14px rgba(239, 68, 68, 0.22);
        }
        .admin-fb-type--general {
          background: rgba(59, 130, 246, 0.16);
          color: #93c5fd;
          border: 1px solid rgba(59, 130, 246, 0.45);
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.2);
        }
        .admin-fb-message {
          margin: 0 0 0.85rem;
          font-size: 0.82rem;
          line-height: 1.55;
          color: #cbd5e1;
          word-wrap: break-word;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .admin-fb-card-row3 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .admin-fb-date {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
        }
        .admin-fb-del {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(239, 68, 68, 0.45);
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .admin-fb-del .material-symbols-outlined {
          font-size: 1rem;
        }
        .admin-fb-del:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(248, 113, 113, 0.65);
          color: #fecaca;
        }
        .admin-fb-del:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .admin-fb-skeleton-card {
          border-radius: 14px;
          height: 132px;
          background: linear-gradient(90deg, rgba(30, 41, 59, 0.5) 0%, rgba(51, 65, 85, 0.35) 45%, rgba(30, 41, 59, 0.5) 90%);
          background-size: 200% 100%;
          animation: admin-user-skel 1.35s ease-in-out infinite;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .admin-fb-skeleton-card--short {
          height: 64px;
        }
        .admin-fb-more-skel {
          margin-top: 0.25rem;
        }
        .admin-fb-load-more {
          margin-top: 0.25rem;
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(200, 255, 61, 0.35);
          background: rgba(200, 255, 61, 0.08);
          color: ${ADM.accent};
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
        }
        .admin-fb-load-more:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .admin-fb-showing {
          margin: 0.25rem 0 0;
          text-align: center;
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .admin-fb-empty {
          text-align: center;
          padding: 2rem 1rem 0.5rem;
        }
        .admin-fb-empty-ic {
          font-size: 2.5rem;
          color: #475569;
          display: block;
          margin: 0 auto 0.75rem;
        }
        .admin-fb-empty-txt {
          margin: 0;
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 600;
        }
        .admin-overview {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .admin-enter {
          animation: admin-enter-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes admin-enter-up {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .admin-card {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
          position: relative;
          overflow: hidden;
        }
        .admin-chart-card {
          padding: 1.1rem 1rem 0.75rem;
          min-height: 300px;
        }
        .admin-chart-shimmer {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(200, 255, 61, 0.2), rgba(200, 255, 61, 0.85), rgba(200, 255, 61, 0.2), transparent);
          background-size: 200% 100%;
          animation: admin-shimmer 3.5s ease-in-out infinite;
        }
        @keyframes admin-shimmer {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .admin-chart-glow {
          position: absolute;
          top: 18%;
          left: 50%;
          width: 90%;
          height: 55%;
          transform: translate(-50%, -40%);
          background: radial-gradient(ellipse at center, rgba(200, 255, 61, 0.16) 0%, transparent 65%);
          pointer-events: none;
        }
        .admin-chart-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          position: relative;
          z-index: 1;
        }
        .admin-mono-label {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #94a3b8;
          margin: 0;
        }
        .admin-chart-sub {
          margin: 0.2rem 0 0;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }
        .admin-time-filters {
          display: flex;
          gap: 0.35rem;
          background: rgba(0, 0, 0, 0.25);
          padding: 0.2rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .admin-time-btn {
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: #64748b;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          font-weight: 800;
          cursor: pointer;
          transition: box-shadow 0.2s, background 0.2s, color 0.2s;
        }
        .admin-time-btn.active {
          background: rgba(200, 255, 61, 0.18);
          color: ${ADM.accent};
          box-shadow: 0 0 16px rgba(200, 255, 61, 0.35);
        }
        .admin-chart-area {
          height: 220px;
          position: relative;
          z-index: 1;
        }
        .admin-chart-tooltip {
          background: #0f172a;
          border: 1px solid rgba(200, 255, 61, 0.25);
          border-radius: 10px;
          padding: 0.45rem 0.65rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        }
        .admin-chart-tooltip-date {
          display: block;
          color: #94a3b8;
          font-size: 0.58rem;
          margin-bottom: 0.15rem;
        }
        .admin-chart-tooltip-val {
          color: ${ADM.accent};
          font-weight: 800;
        }
        .admin-stat-row {
          display: flex;
          gap: 0.65rem;
        }
        .admin-stat-pill {
          flex: 1;
          min-width: 0;
          border-radius: 16px;
          padding: 0.9rem 0.65rem 0.85rem;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .admin-stat-iconbox {
          width: 40px;
          height: 40px;
          margin: 0 auto 0.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .admin-stat-iconbox--blue {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.25);
        }
        .admin-stat-iconbox--gold {
          background: rgba(232, 197, 71, 0.18);
          color: #facc15;
          box-shadow: 0 0 20px rgba(232, 197, 71, 0.28);
        }
        .admin-stat-num {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 1.85rem;
          letter-spacing: 0.04em;
          color: #f8fafc;
          line-height: 1;
        }
        .admin-stat-num--gold {
          color: ${ADM.gold};
        }
        .admin-stat-label {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.55rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #64748b;
          margin: 0.35rem 0 0.4rem;
        }
        .admin-trend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          font-weight: 700;
        }
        .admin-trend.up {
          color: #4ade80;
        }
        .admin-trend.down {
          color: #f87171;
        }
        .admin-trend .material-symbols-outlined {
          font-size: 14px;
        }
        .admin-trend-hint {
          font-weight: 600;
          color: #475569;
          margin-left: 0.15rem;
        }
        .admin-stat-accent {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          border-radius: 0 0 14px 14px;
        }
        .admin-stat-accent--blue {
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.85), transparent);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.45);
        }
        .admin-stat-accent--gold {
          background: linear-gradient(90deg, transparent, rgba(232, 197, 71, 0.9), transparent);
          box-shadow: 0 0 14px rgba(232, 197, 71, 0.4);
        }
        .admin-extended-row {
          display: flex;
          gap: 0.65rem;
        }
        .admin-ext-card {
          flex: 1;
          min-width: 0;
          border-radius: 16px;
          padding: 0.85rem 0.75rem 0.65rem;
          background: rgba(15, 23, 42, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .admin-ext-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(59, 130, 246, 0.18);
          color: #93c5fd;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.45rem;
        }
        .admin-ext-icon--violet {
          background: rgba(168, 85, 247, 0.18);
          color: #d8b4fe;
        }
        .admin-ext-fraction {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 1.65rem;
          letter-spacing: 0.03em;
          color: #f1f5f9;
          line-height: 1.1;
        }
        .admin-ext-slash {
          opacity: 0.45;
          margin: 0 0.1rem;
        }
        .admin-ext-label {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.52rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #64748b;
          margin: 0.35rem 0 0.5rem;
        }
        .admin-progress-track {
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .admin-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .admin-progress-fill--blue {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.45);
        }
        .admin-progress-fill--violet {
          background: linear-gradient(90deg, #a855f7, #c084fc);
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.4);
        }
        .admin-bottom-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .admin-bottom-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            align-items: stretch;
          }
        }
        .admin-signups-card {
          border-radius: 16px;
          padding: 1rem 1rem 0.75rem;
          background: rgba(15, 23, 42, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .admin-signups-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .admin-signups-title {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
          margin: 0;
        }
        .admin-signups-badges {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .admin-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
          animation: admin-pulse 1.8s ease-in-out infinite;
        }
        @keyframes admin-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.55;
            transform: scale(0.9);
          }
        }
        .admin-live-badge {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #86efac;
          padding: 0.25rem 0.45rem;
          border-radius: 6px;
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .admin-signups-list {
          display: flex;
          flex-direction: column;
        }
        .admin-signup-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.65rem 0.35rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .admin-signup-row--fresh {
          background: linear-gradient(90deg, rgba(34, 197, 94, 0.08), transparent);
          border-radius: 10px;
          border-bottom-color: transparent;
        }
        .admin-su-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 800;
          font-size: 0.95rem;
          flex-shrink: 0;
        }
        .admin-su-meta {
          flex: 1;
          min-width: 0;
        }
        .admin-su-name {
          font-weight: 800;
          font-size: 0.85rem;
          color: #f8fafc;
        }
        .admin-su-date {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          color: #64748b;
          margin-top: 0.1rem;
        }
        .admin-role-pill {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.5rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 0.3rem 0.5rem;
          border-radius: 999px;
          background: rgba(100, 116, 139, 0.25);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        .admin-role-pill--pro {
          background: rgba(232, 197, 71, 0.15);
          color: #fde047;
          border-color: rgba(250, 204, 21, 0.45);
          box-shadow: 0 0 14px rgba(234, 179, 8, 0.25);
        }
        .admin-role-pill--admin {
          background: rgba(248, 113, 113, 0.12);
          color: #fca5a5;
          border-color: rgba(248, 113, 113, 0.35);
        }
        .admin-empty-hint {
          text-align: center;
          font-size: 0.75rem;
          color: #64748b;
          padding: 1rem;
        }
        .admin-revenue-tab {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .admin-rev-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .admin-rev-prem-card {
          position: relative;
          border-radius: 16px;
          padding: 1.15rem 1.2rem 1.05rem;
          border: 1px solid rgba(232, 197, 71, 0.45);
          background: linear-gradient(160deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.99));
          overflow: hidden;
          isolation: isolate;
        }
        .admin-rev-prem-card-glow {
          position: absolute;
          top: -22%;
          right: -18%;
          width: 58%;
          height: 68%;
          background: radial-gradient(circle at center, rgba(232, 197, 71, 0.26) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }
        .admin-rev-prem-card-shimmer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          overflow: hidden;
          z-index: 2;
        }
        .admin-rev-prem-card-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 42%;
          height: 100%;
          background: linear-gradient(
            105deg,
            transparent,
            rgba(232, 197, 71, 0.14),
            rgba(255, 250, 220, 0.08),
            transparent
          );
          animation: admin-rev-shimmer-sweep 4.8s ease-in-out infinite;
        }
        @keyframes admin-rev-shimmer-sweep {
          0% {
            transform: translateX(-120%);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          100% {
            transform: translateX(320%);
            opacity: 0;
          }
        }
        .admin-rev-prem-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
          z-index: 1;
        }
        .admin-rev-prem-icobox {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(232, 197, 71, 0.14);
          border: 1px solid rgba(232, 197, 71, 0.38);
          color: ${ADM.gold};
        }
        .admin-rev-prem-icobox .material-symbols-outlined {
          font-size: 20px;
        }
        .admin-rev-prem-trend {
          font-size: 18px;
          color: #4ade80;
          opacity: 0.92;
        }
        .admin-rev-prem-trend--muted {
          opacity: 0.35;
          color: #64748b;
        }
        .admin-rev-prem-label {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.95);
          margin: 0.55rem 0 0.35rem;
          position: relative;
          z-index: 1;
        }
        .admin-rev-prem-value {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(2rem, 8vw, 2.75rem);
          font-weight: 400;
          letter-spacing: 0.04em;
          color: ${ADM.gold};
          line-height: 1;
          margin: 0;
          text-shadow: 0 0 32px rgba(232, 197, 71, 0.38);
          position: relative;
          z-index: 1;
        }
        .admin-rev-prem-sub {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
          margin: 0.45rem 0 0;
          position: relative;
          z-index: 1;
        }
        .admin-rev-tx-card {
          border-radius: 16px;
          border: 1px solid rgba(232, 197, 71, 0.32);
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
          overflow: hidden;
        }
        .admin-rev-tx-head {
          padding: 1rem 1.15rem 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(0, 0, 0, 0.28);
        }
        .admin-rev-tx-title-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .admin-rev-tx-receipt {
          font-size: 22px;
          color: ${ADM.gold};
        }
        .admin-rev-tx-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 800;
          color: #fff;
        }
        .admin-rev-tx-sub {
          margin: 0.3rem 0 0;
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 600;
        }
        .admin-rev-tx-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .admin-rev-tx-table {
          width: 100%;
          min-width: 580px;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-rev-tx-table thead th {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #94a3b8;
          padding: 0.65rem 0.75rem;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }
        .admin-rev-tx-table tbody td {
          padding: 0.72rem 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          vertical-align: middle;
        }
        .admin-rev-tx-row--alt {
          background: rgba(255, 255, 255, 0.025);
        }
        .admin-rev-tx-num {
          color: #64748b;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
        }
        .admin-rev-tx-email {
          color: #f1f5f9;
          font-weight: 600;
          font-size: 0.8rem;
        }
        .admin-rev-tx-amt {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 800;
          color: ${ADM.gold};
          font-size: 0.82rem;
        }
        .admin-rev-tx-dt {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          color: #94a3b8;
          white-space: nowrap;
        }
        .admin-rev-tx-pid {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          color: #94a3b8;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-rev-tx-empty {
          padding: 2rem;
          text-align: center;
          color: #64748b;
          font-size: 0.78rem;
        }
        .admin-tips-pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .admin-tips-pill {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          font-weight: 700;
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
          background: rgba(0, 232, 122, 0.08);
          border: 1px solid rgba(0, 232, 122, 0.2);
          color: rgba(167, 243, 208, 0.95);
          letter-spacing: 0.04em;
        }
        .admin-tips-status-pill {
          display: inline-block;
          padding: 0.2rem 0.45rem;
          border-radius: 999px;
          font-size: 0.62rem;
          font-weight: 700;
          color: #4ade80;
          background: rgba(74, 222, 128, 0.12);
          border: 1px solid rgba(74, 222, 128, 0.35);
        }
        .admin-tips-lb-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .admin-tips-lb-row {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr) auto auto;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.65rem;
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.75rem;
        }
        .admin-tips-lb-rank {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 800;
          color: #00e87a;
        }
        .admin-tips-lb-email {
          color: #e2e8f0;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .admin-tips-lb-amt {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-weight: 800;
          color: ${ADM.gold};
          font-size: 0.72rem;
        }
        .admin-tips-lb-count {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.68rem;
          color: #94a3b8;
        }
        .admin-rev-chart-card {
          border-radius: 16px;
          border: 1px solid rgba(232, 197, 71, 0.3);
          background: linear-gradient(165deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98));
          padding: 1rem 1rem 0.85rem;
          min-height: 300px;
        }
        .admin-rev-chart-head {
          margin-bottom: 0.65rem;
        }
        .admin-rev-chart-title {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: 1.2rem;
          letter-spacing: 0.14em;
          color: #f8fafc;
          margin: 0;
          font-weight: 400;
        }
        .admin-rev-chart-curr {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.55rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          vertical-align: super;
          margin-left: 0.35rem;
          color: ${ADM.accent};
        }
        .admin-rev-chart-inner {
          height: 240px;
          width: 100%;
        }
        .admin-rev-chart-caption {
          margin: 0.65rem 0 0;
          font-size: 0.62rem;
          color: #64748b;
          font-weight: 600;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .admin-see-all {
          width: 100%;
          margin-top: 0.35rem;
          padding: 0.5rem;
          border: none;
          background: transparent;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          font-weight: 700;
          color: #4ade80;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .admin-revenue-card {
          border-radius: 16px;
          padding: 1rem 1rem 0.85rem;
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.06), rgba(15, 23, 42, 0.92));
          border: 1px solid rgba(234, 179, 8, 0.22);
          border-left: 3px solid ${ADM.gold};
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }
        .admin-rev-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.85rem;
        }
        .admin-rev-title-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .admin-rev-bolt {
          font-size: 22px;
          color: ${ADM.gold};
        }
        .admin-rev-title {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #cbd5e1;
          margin: 0;
        }
        .admin-rev-pill {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.52rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.35rem 0.55rem;
          border-radius: 999px;
          border: 1px solid rgba(234, 179, 8, 0.45);
          background: rgba(234, 179, 8, 0.12);
          color: #fde68a;
          cursor: pointer;
        }
        .admin-rev-rows {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .admin-rev-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-rev-lbl {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 0.62rem;
          color: #64748b;
          font-weight: 600;
        }
        .admin-rev-right {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }
        .admin-rev-val {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 1.05rem;
          font-weight: 800;
          color: ${ADM.gold};
          min-width: 2rem;
          text-align: right;
        }
      `}</style>



      {/* Reset PIN Modal */}
      {resetPinModal.show && (
        <div className="premium-modal-overlay centered" onClick={() => setResetPinModal({ ...resetPinModal, show: false })}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
            <div style={{ textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#BBFF00', marginBottom: '1rem' }}>lock_reset</span>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 900 }}>Reset PIN</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Set a new 4-digit PIN for <strong>{resetPinModal.userName}</strong></p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              {newPinInput.map((digit, idx) => (
                <input
                  key={idx}
                  id={`reset-pin-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinInputChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digit && idx > 0) {
                      document.getElementById(`reset-pin-${idx - 1}`)?.focus();
                    }
                  }}
                  style={{
                    width: '3.5rem',
                    height: '4rem',
                    borderRadius: '1rem',
                    border: '2px solid rgba(187, 255, 0, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#BBFF00',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setResetPinModal({ ...resetPinModal, show: false })}
                style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 900, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleResetPin}
                className="glow-btn-primary"
                style={{ flex: 2, padding: '1rem', borderRadius: '1rem', fontWeight: 900, background: '#BBFF00', color: '#064e3b' }}
              >
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUserModal.show && (
        <div className="premium-modal-overlay centered" onClick={() => setDeleteUserModal({ ...deleteUserModal, show: false })}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: '#ef4444' }}>warning</span>
              </div>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>Purge Account?</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                You are about to permanently delete <strong>{deleteUserModal.userName}</strong> and all their task history. This cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={() => setDeleteUserModal({ ...deleteUserModal, show: false })}
                style={{ flex: 1, padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'white', fontWeight: 900, cursor: 'pointer' }}
              >
                No, Keep
              </button>
              <button 
                onClick={handleConfirmDelete}
                style={{ flex: 1.5, padding: '1rem', borderRadius: '1rem', border: 'none', background: '#ef4444', color: 'white', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)' }}
              >
                Yes, Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

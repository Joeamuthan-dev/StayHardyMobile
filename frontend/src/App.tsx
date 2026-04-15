// src/App.tsx
import React, { Suspense, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isWeb } from './utils/platform';
import { App as CapApp } from '@capacitor/app';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { storage } from './utils/storage';
import { supabase } from './supabase';

// Contexts
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { PaywallProvider } from './context/PaywallContext';
import { LoadingProvider } from './context/LoadingContext';

// Badges
import { useBadges } from './hooks/useBadges';
import BadgePopup from './components/BadgePopup';

// Components & Hubs
import { isAdminHubUser } from './config/adminOwner';
import { NativeBackButton } from './components/NativeBackButton';
import PushNotificationListener from './components/PushNotificationListener';
import WidgetSyncBootstrap from './components/WidgetSyncBootstrap';
import { AuthDeepLinkHandler } from './components/AuthDeepLinkHandler';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { SideMenu } from './components/SideMenu';
import BottomNav from './components/BottomNav';
import OfflineSyncBootstrap from './components/OfflineSyncBootstrap';

// Pages — lazy loaded for code splitting (reduces initial bundle from 1.7MB)
// Only LoadingScreen and Login are eager since they're shown immediately on startup
import LoadingScreen from './pages/LoadingScreen';
import Login from './pages/Login';
import ComingSoon from './pages/ComingSoon';

const OnboardingScreen = React.lazy(() => import('./pages/OnboardingScreen'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Stats = React.lazy(() => import('./pages/Stats'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Planner = React.lazy(() => import('./pages/Planner'));
const Goals = React.lazy(() => import('./pages/Goals'));
const ForgotPIN = React.lazy(() => import('./pages/ForgotPin'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const AuthVerify = React.lazy(() => import('./pages/AuthVerify'));
const Tips = React.lazy(() => import('./pages/Tips'));
const Feedback = React.lazy(() => import('./pages/Feedback'));
const FeedbackList = React.lazy(() => import('./pages/FeedbackList'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Routine = React.lazy(() => import('./pages/Routine'));
const HomeDashboard = React.lazy(() => import('./pages/HomeDashboard'));
const Calendar = React.lazy(() => import('./pages/Calendar'));
const StayHardyUpdatesPage = React.lazy(() => import('./pages/StayHardyUpdatesPage'));
const WhyStayHardy = React.lazy(() => import('./pages/WhyStayHardy'));
const Paywall = React.lazy(() => import('./pages/Paywall'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));

// Black screen fallback — matches app background
const BlackScreen = () => (
  <div style={{
    background: '#000000',
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: '#00E676',
      boxShadow: '0 0 12px #00E676'
    }} />
  </div>
);

const GlobalNavWrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hidden on onboarding or login pages
  const isAuthPage = ['/login', '/signup', '/verify-email', '/forgot-pin', '/reset-pin', '/auth/reset', '/auth/verify', '/paywall', '/loading', '/onboarding']
    .some(p => location.pathname.toLowerCase().replace(/\/$/, '') === p);
  const showHamburger = user && !isAuthPage && !sidebarOpen && !isWeb;

  return (
    <>
      <SideMenu isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {showHamburger && (
        <div
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '16px',
            zIndex: 1500,
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
          }}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <line x1="0" y1="1" x2="18" y2="1" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="0" y1="7" x2="14" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="0" y1="13" x2="18" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
      {children}
      {user && !isAuthPage && <BottomNav isHidden={sidebarOpen} />}
    </>
  );
};

const RootRedirect = () => {
  // Web visitors (stayhardi.com) see the Coming Soon page
  // Native app (Android/iOS) proceeds normally
  if (isWeb) return <ComingSoon />;
  return <Navigate to="/loading" replace />;
};

const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '3px solid rgba(0,230,118,0.2)',
          borderTop: '3px solid #00E676',
          animation: 'spin 0.8s linear infinite',
        }}/>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    // No authenticated user → redirect to login
    // Save current location to redirect back after login if desired,
    // though the requirement says just navigate to /login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

const ProRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  if (!isPro && !isAdmin) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AdminRoute = () => {
  const { user } = useAuth();
  if (!user?.id) return <Navigate to="/login" replace />;
  if (!isAdminHubUser(user)) return <Navigate to="/home" replace />;
  return <AdminDashboard />;
};

const AppCore: React.FC = () => {
  const navigate = useNavigate();
  const { initAuth } = useAuth();
  const [authReady, setAuthReady] = useState(false);
  
  // Handle auth state stabilization
  useEffect(() => {
    // Check initial session ONCE on mount
    supabase.auth.getSession().then(() => {
      // Session check complete — auth is ready
      setAuthReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = 
      supabase.auth.onAuthStateChange((event) => {
        console.log('[Auth] Event:', event);
        
        // ONLY redirect on explicit sign out
        // NOT on initial load or token refresh
        if (event === 'SIGNED_OUT') {
          navigate('/login', { replace: true });
        }
      });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Handle deep link when app is opened from email verification link
  useEffect(() => {
    const handleDeepLink = async (data: { url: string }) => {
      const url = data.url;
      console.log('App opened with URL:', url);

      if (
        url.includes('stayhardy://auth/verify') ||
        url.includes('access_token=') ||
        url.includes('type=signup')
      ) {
        // Normalize URL for parsing if native scheme is used
        const normalizedUrl = url.replace('stayhardy://', 'https://stayhardy.app/');
        const urlObj = new URL(normalizedUrl);
        
        // Supabase tokens can be in the hash or search params
        const hashParams = new URLSearchParams(urlObj.hash.slice(1));
        const accessToken = urlObj.searchParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlObj.searchParams.get('refresh_token') || hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          console.log('Detected auth session in deep link. Authenticating...');
          const { data: sessionData, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && sessionData.user) {
            await storage.set('user_session', sessionData.user.email || '');
            await storage.remove('pending_verification_email');
            
            // Critical: Redirect to entry point or home
            navigate('/home', { replace: true });
          }
        }
      }
    };

    // Register active listener
    const subPromise = CapApp.addListener('appUrlOpen', handleDeepLink);

    // Initial check for cold boot
    CapApp.getLaunchUrl().then((result) => {
      if (result?.url) {
        handleDeepLink({ url: result.url });
      }
    });

    return () => {
      subPromise.then(sub => sub.remove());
    };
  }, [navigate]);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initAuth();
      } catch (err) {
        console.error('Core Initialization Failure:', err);
      }
    };
    initApp();
  }, [initAuth]);

  // Don't render routes until auth state is known
  if (!authReady) {
    return <BlackScreen />;
  }

  return (
    <GlobalNavWrapper>
      <AuthDeepLinkHandler />
      <PushNotificationListener />
      <OfflineSyncBootstrap />
      <WidgetSyncBootstrap />
      <InstructionalTooltipManager />
      <NativeBackButton />
      <CelebrationOverlay />
      <BadgeBootstrap />
      
      <Suspense fallback={<BlackScreen />}>
        <Routes>
          {/* Entry Point */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/loading" element={<LoadingScreen />} />
          
          {/* Onboarding & Login */}
          <Route path="/onboarding" element={<OnboardingScreen onComplete={() => {}} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-pin" element={<ForgotPIN />} />
          <Route path="/reset-pin" element={<ResetPassword />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route path="/auth/verify" element={<AuthVerify />} />
          <Route path="/auth/callback" element={<Navigate to="/login" replace />} />
          <Route path="/paywall" element={<Paywall />} />
          
          {/* Protected Hubs */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomeDashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/routine" element={<Routine />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/updates" element={<StayHardyUpdatesPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/tips" element={<Tips />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/feedback-list" element={<FeedbackList />} />
            <Route path="/welcome" element={<WhyStayHardy />} />
            <Route path="/leaderboard" element={<ProRoute><Leaderboard /></ProRoute>} />
            <Route path="/admin" element={<AdminRoute />} />
          </Route>
        </Routes>
      </Suspense>
    </GlobalNavWrapper>
  );
};

// Placeholder for missing component found in merge context
const InstructionalTooltipManager = () => null;

const BadgeBootstrap: React.FC = () => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
  const isProUser = isPro || isAdmin;

  const { pendingBadges, checkAndAwardBadges, markBadgeSeen } = useBadges();

  // Silently add Pro user to leaderboard if not already a member
  useEffect(() => {
    if (!user?.id || !isProUser) return;
    const silentJoin = async () => {
      const { data } = await supabase
        .from('leaderboard_members')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data !== null) return; // already a member
      const displayName = user.name || user.email.split('@')[0] || 'Warrior';
      await supabase.from('leaderboard_members').upsert(
        { user_id: user.id, display_name: displayName, avatar_url: user.avatarUrl ?? null, is_active: true },
        { onConflict: 'user_id' }
      );
    };
    void silentJoin();
  }, [user?.id, isProUser]);

  useEffect(() => {
    if (!user?.id || !isProUser) return;
    void checkAndAwardBadges();
  }, [user?.id, isProUser, checkAndAwardBadges]);

  useEffect(() => {
    if (!user?.id || !isProUser) return;
    const sub = CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) void checkAndAwardBadges();
    });
    return () => { sub.then(s => s.remove()); };
  }, [user?.id, isProUser, checkAndAwardBadges]);

  const userName = (user as any)?.user_metadata?.name || (user?.email?.split('@')[0] ?? 'Soldier');

  if (!user || !isProUser || pendingBadges.length === 0) return null;
  return (
    <BadgePopup
      badge={pendingBadges[0]}
      userName={userName}
      onDismiss={() => markBadgeSeen(pendingBadges[0].key)}
    />
  );
};

const Root: React.FC = () => (
  <LoadingProvider>
    <AuthProvider>
      <SubscriptionProvider>
        <PaywallProvider>
          <Sentry.ErrorBoundary
            fallback={
              <div style={{
                background: '#000',
                color: '#00E676',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '16px',
                fontFamily: 'sans-serif'
              }}>
                <h2 style={{ color: '#fff' }}>
                  Something went wrong.
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.4)',
                            fontSize: '14px' }}>
                  Our team has been notified.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    background: '#00E676',
                    color: '#000',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Reload App
                </button>
              </div>
            }
          >
            <Router>
              <ThemeProvider>
                <LanguageProvider>
                  {isWeb ? <Analytics /> : null}
                  {isWeb ? <SpeedInsights /> : null}
                  <AppCore />
                </LanguageProvider>
              </ThemeProvider>
            </Router>
          </Sentry.ErrorBoundary>
        </PaywallProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </LoadingProvider>
);

export default Root;

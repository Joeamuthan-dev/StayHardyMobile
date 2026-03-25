import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { NativeBackButton } from './components/NativeBackButton';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Planner from './pages/Planner';
import Goals from './pages/Goals';
import ForgotPin from './pages/ForgotPin';
import ResetPin from './pages/ResetPin';
import Tips from './pages/Tips';
import Feedback from './pages/Feedback';
import FeedbackList from './pages/FeedbackList';
import AdminDashboard from './pages/AdminDashboard';
import Routine from './pages/Routine';
import HomeDashboard from './pages/HomeDashboard';
import Calendar from './pages/Calendar';
import LifetimeAccess from './pages/LifetimeAccess';
import StayHardyUpdatesPage from './pages/StayHardyUpdatesPage';
import PushNotificationListener from './components/PushNotificationListener';
import WidgetSyncBootstrap from './components/WidgetSyncBootstrap';
import OfflineSyncBootstrap from './components/OfflineSyncBootstrap';
import { AuthDeepLinkHandler } from './components/AuthDeepLinkHandler';
import { isAdminHubUser } from './config/adminOwner';
import WhyStayHardy from './pages/WhyStayHardy';
import MobileNav from './components/MobileNav';
import { CelebrationOverlay } from './components/CelebrationOverlay';

const GlobalNavWrapper = ({ children, showOnboarding }: { children: React.ReactNode, showOnboarding: boolean }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage = ['/login', '/forgot-pin', '/reset-pin'].includes(location.pathname);
  const showHamburger = user && !showOnboarding && !isAuthPage && !sidebarOpen;

  return (
    <>
      {showHamburger && (
        <div
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: '52px',
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
      <MobileNav isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      {children}
    </>
  );
};


const ProtectedRoute = () => {
  const { user } = useAuth();
  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const HomeRoute = () => {
  const { user } = useAuth();
  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }
  return <HomeDashboard />;
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/home" replace />;
};

const AdminRoute = () => {
  const { user } = useAuth();
  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdminHubUser(user)) {
    return <Navigate to="/home" replace />;
  }
  return <AdminDashboard />;
};

import { canAccessStatsAndRoutine } from './lib/lifetimeAccess';

const MainTabsLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const path = location.pathname.replace(/\/+$/, '') || '/';

  const isHome = path === '/home';
  const isTasks = path === '/dashboard';
  const isGoals = path === '/goals';
  const isRoutine = path === '/routine';
  const isStats = path === '/stats';

  const isMainTab = isHome || isTasks || isGoals || isRoutine || isStats;

  if (!isMainTab) {
    return <Outlet />;
  }

  const isPro = user ? canAccessStatsAndRoutine(user) : false;

  if ((isRoutine || isStats) && !isPro) {
    return <Navigate to="/lifetime-access" replace />;
  }

  return (
    <>
      <div style={{ display: isHome ? 'block' : 'none', height: '100%' }}>
        <HomeRoute />
      </div>
      <div style={{ display: isTasks ? 'block' : 'none', height: '100%' }}>
        <Dashboard />
      </div>
      <div style={{ display: isGoals ? 'block' : 'none', height: '100%' }}>
        <Goals />
      </div>
      {isPro && (
        <>
          <div style={{ display: isRoutine ? 'block' : 'none', height: '100%' }}>
            <Routine />
          </div>
          <div style={{ display: isStats ? 'block' : 'none', height: '100%' }}>
            <Stats />
          </div>
        </>
      )}
    </>
  );
};

import LoadingScreen from './components/LoadingScreen';
import OnboardingScreen from './pages/OnboardingScreen';
import { Preferences } from '@capacitor/preferences';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [authEmergencyTimedOut, setAuthEmergencyTimedOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setShowOnboarding(false);
    }
  }, [user]);

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await Preferences.set({ key: 'onboarding_completed', value: 'true' });
    } catch (e) {}
  };

  useEffect(() => {
    if (!loading) {
      // Give the LoadingScreen animation time to breathe (at least 2.5s total)
      // Since it starts immediately on mount, we wait a bit here.
      const timer = setTimeout(() => {
        setAppReady(true);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setAuthEmergencyTimedOut(false);
      return;
    }
    const emergency = setTimeout(() => {
      console.error('EMERGENCY TIMEOUT');
      setAuthEmergencyTimedOut(true);
      // Even on timeout, we should eventually show the app or a better error
      setAppReady(true);
    }, 8000);
    return () => clearTimeout(emergency);
  }, [loading]);

  if (!appReady && !authEmergencyTimedOut) {
    return <LoadingScreen />;
  }

  if (showOnboarding && !user) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <Router>
      <GlobalNavWrapper showOnboarding={showOnboarding}>
        <AuthDeepLinkHandler />
        <PushNotificationListener />
        <OfflineSyncBootstrap />
        <WidgetSyncBootstrap />
        <NativeBackButton />
        <CelebrationOverlay />
        <Routes>
          <Route path="/login" element={<Login onBack={() => setShowOnboarding(true)} />} />
          <Route path="/forgot-pin" element={<ForgotPin />} />
          <Route path="/reset-pin" element={<ResetPin />} />
          <Route path="/" element={<RootRedirect />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainTabsLayout />}>
              <Route path="/home" element={null} />
              <Route path="/dashboard" element={null} />
              <Route path="/goals" element={null} />
              <Route path="/routine" element={null} />
              <Route path="/stats" element={null} />
              
              <Route path="/lifetime-access" element={<LifetimeAccess />} />
              <Route path="/updates" element={<StayHardyUpdatesPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/planner" element={<Planner />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/tips" element={<Tips />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/feedback-list" element={<FeedbackList />} />
              <Route path="/admin" element={<AdminRoute />} />
              <Route path="/welcome" element={<WhyStayHardy />} />
            </Route>
          </Route>
        </Routes>
      </GlobalNavWrapper>
    </Router>
  );
};

import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react"; // For React projects

const isWeb = Capacitor.getPlatform() === 'web';

const Root: React.FC = () => (
  <AuthProvider>
    <ThemeProvider>
      <LanguageProvider>
        {isWeb ? <Analytics /> : null}
        {isWeb ? <SpeedInsights /> : null}
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </AuthProvider>
);


export default Root;


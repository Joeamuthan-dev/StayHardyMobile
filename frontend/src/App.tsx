import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { NativeBackButton } from './components/NativeBackButton';
import AuthSplash from './components/AuthSplash';
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
import ProFeatureRoute from './components/ProFeatureRoute';
import PushNotificationListener from './components/PushNotificationListener';
import WidgetSyncBootstrap from './components/WidgetSyncBootstrap';
import OfflineSyncBootstrap from './components/OfflineSyncBootstrap';
import { AuthDeepLinkHandler } from './components/AuthDeepLinkHandler';
import { canAccessStatsAndRoutine } from './lib/lifetimeAccess';
import { isAdminHubUser } from './config/adminOwner';

const ProtectedRoute = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

/** Home dashboard is Pro (or admin) only; free users see the lifetime payment page instead. */
const HomeRoute = () => {
  const { user } = useAuth();
  const location = useLocation();
  const fromLifetimePurchase = Boolean(
    (location.state as { fromLifetimePurchase?: boolean } | null)?.fromLifetimePurchase
  );
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (canAccessStatsAndRoutine(user) || fromLifetimePurchase) {
    return <HomeDashboard />;
  }
  return <Navigate to="/lifetime-access" replace />;
};

const RootRedirect = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (canAccessStatsAndRoutine(user)) {
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/lifetime-access" replace />;
};

/** Admin Hub — Pro analytics & management; non-admins cannot access. */
const AdminRoute = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdminHubUser(user)) {
    return <Navigate to="/home" replace />;
  }
  return <AdminDashboard />;
};

const App: React.FC = () => {
  const { loading } = useAuth();
  if (loading) {
    return <AuthSplash />;
  }

  return (
    <Router>
      <AuthDeepLinkHandler />
      <PushNotificationListener />
      <OfflineSyncBootstrap />
      <WidgetSyncBootstrap />
      <NativeBackButton />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-pin" element={<ForgotPin />} />
        <Route path="/reset-pin" element={<ResetPin />} />
        <Route path="/" element={<RootRedirect />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomeRoute />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lifetime-access" element={<LifetimeAccess />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route element={<ProFeatureRoute />}>
            <Route path="/stats" element={<Stats />} />
            <Route path="/routine" element={<Routine />} />
          </Route>
          <Route path="/tips" element={<Tips />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/feedback-list" element={<FeedbackList />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Route>
      </Routes>
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


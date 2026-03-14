import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import Planner from './pages/Planner';
import ForgotPin from './pages/ForgotPin';
import ResetPin from './pages/ResetPin';
import Tips from './pages/Tips';
import Feedback from './pages/Feedback';
import FeedbackList from './pages/FeedbackList';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ color: '#10b981', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          StayHard — Grinding…
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};


const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-pin" element={<ForgotPin />} />
        <Route path="/reset-pin" element={<ResetPin />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/tips" element={<Tips />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/feedback-list" element={<FeedbackList />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
};

import { ThemeProvider } from './context/ThemeContext';

import { LanguageProvider } from './context/LanguageContext';

const Root: React.FC = () => (
  <AuthProvider>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </AuthProvider>
);

export default Root;

import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';
import ProPaywall from '../components/ProPaywall';

const LifetimeAccess: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!shouldShowLifetimeUpsell(user)) {
    return <Navigate to="/home" replace />;
  }

  return <ProPaywall currentUser={user} onClose={() => navigate('/home')} />;
};

export default LifetimeAccess;

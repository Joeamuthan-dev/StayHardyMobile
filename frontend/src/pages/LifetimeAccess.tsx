import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shouldShowLifetimeUpsell } from '../lib/lifetimeAccess';

const LifetimeAccess: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!shouldShowLifetimeUpsell(user)) {
    return <Navigate to="/home" replace />;
  }

  return <Navigate to="/paywall" replace />;
};

export default LifetimeAccess;

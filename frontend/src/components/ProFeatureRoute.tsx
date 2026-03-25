import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine } from '../lib/lifetimeAccess';
import ProPaywall from './ProPaywall';

/** Stats & Routine — requires admin or Lifetime (is_pro). */
const ProFeatureRoute: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }

  const isPro = canAccessStatsAndRoutine(user);

  if (isPro) {
    return <Outlet />;
  }

  return <ProPaywall onClose={() => navigate('/home')} />;
};

export default ProFeatureRoute;

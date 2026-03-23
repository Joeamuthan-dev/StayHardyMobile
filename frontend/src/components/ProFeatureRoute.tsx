import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessStatsAndRoutine } from '../lib/lifetimeAccess';

/** Stats & Routine — requires admin or Lifetime (is_pro). */
const ProFeatureRoute: React.FC = () => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (canAccessStatsAndRoutine(user)) {
    return <Outlet />;
  }
  return <Navigate to="/lifetime-access" replace />;
};

export default ProFeatureRoute;

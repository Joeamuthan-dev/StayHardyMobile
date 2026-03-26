import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

/** Protected route for Pro features. */
const ProFeatureRoute: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();

  if (authLoading || subLoading) return null;

  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }

  if (!isPro) {
    return <Navigate to="/paywall" replace />;
  }

  return <Navigate to="/home" replace />; // This is just a placeholder, the child routes should be navigated to.
};

export default ProFeatureRoute;

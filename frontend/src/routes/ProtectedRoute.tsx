import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';

export const ProtectedRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();

  // Show nothing while checking status to prevent flashes
  if (authLoading || subLoading) return null;

  if (!user?.id) {
    return <Navigate to="/login" replace />;
  }

  if (!isPro) {
    return <Navigate to="/paywall" replace />;
  }

  return <Outlet />;
};

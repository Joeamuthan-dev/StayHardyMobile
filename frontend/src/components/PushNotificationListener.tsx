import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

/**
 * Handles notification tap (cold/warm start) on native — navigates using FCM data.route.
 * Must render inside Router.
 */
const PushNotificationListener: React.FC = () => {
  const navigate = useNavigate();
  const handleRef = useRef<{ remove: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let cancelled = false;
    void (async () => {
      const h = await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
        const d = event.notification?.data as Record<string, unknown> | undefined;
        const raw = d?.route;
        const route = typeof raw === 'string' ? raw : undefined;
        if (route) navigate(route);
      });
      if (!cancelled) handleRef.current = h;
    })();

    return () => {
      cancelled = true;
      void handleRef.current?.remove();
    };
  }, [navigate]);

  return null;
};

export default PushNotificationListener;

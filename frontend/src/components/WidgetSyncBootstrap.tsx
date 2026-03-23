import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAuth } from '../context/AuthContext';
import { syncWidgetData } from '../lib/syncWidgetData';

/**
 * Initial + resume sync for the Android StayHardy widget.
 */
const WidgetSyncBootstrap: React.FC = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || Capacitor.getPlatform() !== 'android') return;
    void syncWidgetData();
  }, [user?.id, loading]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let remove: (() => void) | undefined;
    void App.addListener('resume', () => {
      void syncWidgetData();
    }).then((handle) => {
      remove = () => void handle.remove();
    });
    return () => {
      remove?.();
    };
  }, []);

  return null;
};

export default WidgetSyncBootstrap;

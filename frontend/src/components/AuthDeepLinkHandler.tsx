import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../supabase';

function isAuthConfirmationUrl(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes('stayhardy://login') ||
    u.includes('stayhardy://auth') ||
    u.includes('access_token') ||
    u.includes('type=signup') ||
    u.includes('type=email') ||
    (u.includes('stayhardy.com') && u.includes('/auth'))
  );
}

function parseTokensFromUrl(url: string): { access_token: string | null; refresh_token: string | null } {
  let params = new URLSearchParams();
  const hashIdx = url.indexOf('#');
  if (hashIdx !== -1) {
    params = new URLSearchParams(url.slice(hashIdx + 1));
  }
  if (!params.get('access_token')) {
    try {
      const parsed = new URL(url);
      params = new URLSearchParams(parsed.search.replace(/^\?/, ''));
    } catch {
      /* ignore */
    }
  }
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  };
}

/**
 * Native: handles stayhardy://login and https://stayhardy.com/auth/* after email confirmation.
 * Establishes session briefly to complete verification, signs out locally so user logs in with PIN.
 */
export function AuthDeepLinkHandler() {
  const navigate = useNavigate();
  const lastProcessedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const processUrl = async (url: string | undefined) => {
      if (!url || !isAuthConfirmationUrl(url)) return;
      if (lastProcessedUrlRef.current === url) return;
      lastProcessedUrlRef.current = url;

      const { access_token, refresh_token } = parseTokensFromUrl(url);
      if (access_token && refresh_token) {
        try {
          await supabase.auth.setSession({ access_token, refresh_token });
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          console.error('[AuthDeepLink] session from URL failed', e);
        }
      }

      navigate('/login', { replace: true, state: { emailVerified: true } });
    };

    let sub: { remove: () => Promise<void> } | undefined;
    void App.addListener('appUrlOpen', ({ url }) => {
      void processUrl(url);
    }).then((s) => {
      sub = s;
    });

    void App.getLaunchUrl().then((res) => {
      if (res?.url) void processUrl(res.url);
    });

    return () => {
      void sub?.remove();
    };
  }, [navigate]);

  return null;
}

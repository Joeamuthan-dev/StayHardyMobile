import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';

interface AuthContextType {
  user: { id: string; name?: string; email: string; role?: string; avatarUrl?: string } | null;
  loading: boolean;
  logout: () => Promise<void>;
  updateUserMetadata: (metadata: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<{ 
    id: string; 
    name?: string; 
    email: string; 
    role?: string; 
    avatarUrl?: string;
  } | null>(() => {
    const saved = localStorage.getItem('user');
    if (!saved) return null;
    try { return JSON.parse(saved); } catch { return null; }
  });

  const updateUserMetadata = (metadata: any) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...metadata };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  // If we already have a cached user, start with loading=false so the app shows immediately on refresh
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem('user');
    return !saved; // only show loading screen when no cached user
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          setUser(null);
          localStorage.removeItem('user');
          setLoading(false);
          return;
        }

        const meta = authUser.user_metadata || {};
        const emailFilename = `${authUser.email?.replace(/@/g, '_at_')}.jpg`;
        const { data: { publicUrl: emailBasedUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(emailFilename);

        const baseData = {
          id: authUser.id,
          name: meta.name || '',
          email: authUser.email || '',
          avatarUrl: meta.avatar_url || meta.avatarUrl || meta.avatar || emailBasedUrl || '',
          role: authUser.email?.toLowerCase().trim() === 'joe@gmail.com' ? 'admin' : 'user'
        };

        if (baseData.avatarUrl && !baseData.avatarUrl.includes('?t=')) {
          baseData.avatarUrl = `${baseData.avatarUrl}?t=${Date.now()}`;
        }

        setUser(baseData);
        localStorage.setItem('user', JSON.stringify(baseData));

        // Background DB augment — don't block navigation
        supabase.from('users').select('name, role, avatar_url').eq('id', authUser.id).single()
          .then(({ data: dbData, error: dbError }) => {
            if (dbData && !dbError) {
              const finalData = {
                ...baseData,
                name: dbData.name || baseData.name,
                role: dbData.role || baseData.role,
                avatarUrl: dbData.avatar_url || baseData.avatarUrl
              };
              setUser(finalData);
              localStorage.setItem('user', JSON.stringify(finalData));
            }
          });
      } catch (err) {
        console.error('Auth Profile Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Run immediately but don't block UI if cache exists
    fetchUserProfile(); 

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setLoading(true);
        fetchUserProfile();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
        setLoading(false);
      } else {
        // Handle INITIAL_SESSION or silent events to ensure the loader clears
        if (!session) {
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      logout, 
      updateUserMetadata
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

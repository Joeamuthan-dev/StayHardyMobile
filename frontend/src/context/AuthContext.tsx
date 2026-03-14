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
    
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  });


  const updateUserMetadata = (metadata: any) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...metadata };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // 1. Get the freshest user data from Supabase Auth
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authUser) {
          console.log('No auth user found, clearing state');
          setUser(null);
          localStorage.removeItem('user');
          return;
        }

        const meta = authUser.user_metadata || {};
        
        // Construct fallback URL based on email (new standard)
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

        // Ensure we add cache buster to the constructed URL
        if (baseData.avatarUrl && !baseData.avatarUrl.includes('?t=')) {
          baseData.avatarUrl = `${baseData.avatarUrl}?t=${Date.now()}`;
        }

        // 2. Set initial state from metadata immediately
        setUser(baseData);
        localStorage.setItem('user', JSON.stringify(baseData));

        // 3. Try to augment with DB data
        const { data: dbData, error: dbError } = await supabase
          .from('users')
          .select('name, role, avatar_url, pin')
          .eq('id', authUser.id)
          .single();
        
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
      } catch (err) {
        console.error('Auth Profile Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Initial check
    fetchUserProfile();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth state change event:', event);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        fetchUserProfile();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
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

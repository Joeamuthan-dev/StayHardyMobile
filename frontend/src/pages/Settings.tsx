import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import BottomNav from '../components/BottomNav';
import { supabase } from '../supabase';
import SupportModal from '../components/SupportModal';


const Settings: React.FC = () => {
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === 'true');
  const toggleSidebar = () => { setIsSidebarHidden(prev => { const next = !prev; localStorage.setItem('sidebarHidden', next.toString()); return next; }); };
  const { user, logout, updateUserMetadata } = useAuth();
  const navigate = useNavigate();


  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  // const [snapshotStats, setSnapshotStats] = useState({ completedTasks: 0, routineStreak: 0, activeGoals: 0 });

  const [showConfirmReset, setShowConfirmReset] = useState<{ show: boolean; type: 'tasks' | 'routines' | 'stats' | 'delete' | '' }>({ show: false, type: '' });

  // React.useEffect(() => { ... fetchStats removed });



  const handleExportData = async () => {
    if (!user?.id) return;
    try {
      const { data: tasks } = await supabase.from('tasks').select('*').eq('userId', user.id);
      const { data: goals } = await supabase.from('goals').select('*').eq('userId', user.id);
      const { data: routines } = await supabase.from('routines').select('*').eq('userId', user.id);
      const { data: logs } = await supabase.from('routine_logs').select('*').eq('userId', user.id);
      const { data: feedback } = await supabase.from('feedback').select('*').eq('userId', user.id);
      const exportData = { createdAt: new Date().toISOString(), user: { id: user.id, email: user.email, name: user.name }, tasks: tasks || [], goals: goals || [], routines: routines || [], routine_logs: logs || [], feedback: feedback || [] };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a'); link.download = `stayhardy_data_${user.name || 'user'}.json`; link.href = URL.createObjectURL(blob); link.click();
    } catch (err) { console.error('Export failed:', err); }
  };

  const handleResetData = async () => {
    if (!user?.id || !showConfirmReset.type) return;
    try {
      if (showConfirmReset.type === 'tasks') { await supabase.from('tasks').delete().eq('userId', user.id); }
      else if (showConfirmReset.type === 'routines') { await supabase.from('routines').delete().eq('user_id', user.id); }
      else if (showConfirmReset.type === 'stats') { await supabase.from('routine_logs').delete().eq('user_id', user.id); }
      else if (showConfirmReset.type === 'delete') {
         await supabase.from('tasks').delete().eq('userId', user.id); await supabase.from('goals').delete().eq('userId', user.id);
         await supabase.from('routines').delete().eq('userId', user.id); await supabase.from('routine_logs').delete().eq('userId', user.id);
         await supabase.from('feedback').delete().eq('user_id', user.id); await supabase.from('users').delete().eq('id', user.id);
         await logout(); navigate('/login'); return;
      }
      alert('Action completed successfully!');
      setShowConfirmReset({ show: false, type: '' });
    } catch (err) { console.error('Reset failed:', err); }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUpdatePin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pinStr = newPin.join('');
    const confirmPinStr = confirmPin.join('');

    if (pinStr.length < 4) {
      setPinError('PIN must be 4 digits');
      return;
    }
    if (pinStr !== confirmPinStr) {
      setPinError('PINs do not match');
      return;
    }

    setIsUpdatingPin(true);
    setPinError('');
    try {
      const securePass = pinStr + "_secure_pin";
      
      const { error: authError } = await supabase.auth.updateUser({
        password: securePass
      });

      if (authError) throw authError;

      if (user?.id) {
        const { error: dbError } = await supabase
          .from('users')
          .update({
            pin: pinStr, // Store new PIN in DB
            updatedAt: new Date().toISOString()
          })
          .eq('id', user.id);
        
        if (dbError) console.error('DB update error:', dbError);
        
        // Update local storage if PIN was remembered
        if (localStorage.getItem('remembered_pin')) {
          localStorage.setItem('remembered_pin', pinStr);
        }
      }

      setPinSuccess(true);
      setTimeout(() => {
        setShowPinModal(false);
        setPinSuccess(false);
        setNewPin(['', '', '', '']);
        setConfirmPin(['', '', '', '']);
      }, 2000);
    } catch (err: any) {
      console.error('PIN update error:', err);
      setPinError(err.message || 'Failed to update PIN. Try logging in again.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Standard profile pic size (400x400 max)
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Image processing failed'));
            },
            'image/jpeg',
            0.85 // 85% quality - sweet spot for weight vs quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // 1. Instant Optimistic UI Update
    const localPreviewUrl = URL.createObjectURL(file);
    updateUserMetadata({ avatarUrl: localPreviewUrl });

    setIsUploading(true);
    console.log('Starting profile sync for:', user.email);

    try {
      // 2. Background Compression
      const compressedBlob = await compressImage(file);
      const filename = `${user.email.replace(/@/g, '_at_')}.jpg`;
      const compressedFile = new File([compressedBlob], filename, { type: 'image/jpeg' });

      // 3. Verify Bucket and Upload
      // We'll try to list one file just to check if the bucket is reachable
      const { error: bucketError } = await supabase.storage.from('avatars').list('', { limit: 1 });
      if (bucketError) {
        console.error('Bucket "avatars" check failed. Error:', bucketError.message);
        throw new Error(`Storage bucket error: ${bucketError.message}`);
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filename, compressedFile, { upsert: true });

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // 4. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      console.log('Syncing URL to profiles:', finalUrl);

      // 5. Sync with Auth Metadata
      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: finalUrl,
          avatarUrl: finalUrl
        }
      });
      if (updateAuthError) console.error('Auth metadata sync failed:', updateAuthError.message);

      // 6. Sync with Database Table
      const { error: dbUpdateError } = await supabase
        .from('users')
        .update({ avatar_url: finalUrl })
        .eq('id', user.id);
      
      if (dbUpdateError) {
        console.warn('Database table sync failed (might be missing avatar_url column):', dbUpdateError.message);
      }

      // 7. Final Local Sync
      updateUserMetadata({ avatarUrl: finalUrl });
      console.log('Profile sync complete!');

    } catch (err: any) {
      console.error('Critical Sync Failure:', err);
      // We don't alert the user as requested, but the logs will show the truth.
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`page-shell ${isSidebarHidden ? 'sidebar-hidden' : ''}`}>
      <div className="aurora-bg">
        <div className="aurora-gradient-1"></div>
        <div className="aurora-gradient-2"></div>
      </div>

      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',  marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--text-main)' }}>Settings</h1>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>
            Account & Preferences
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={toggleSidebar}
            className="notification-btn desktop-only-btn"
            title={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar (Focus Mode)"}
            data-tooltip={isSidebarHidden ? "Show Sidebar" : "Hide Sidebar"}
            style={{
              ...(isSidebarHidden ? { background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' } : {}),
              opacity: 0.5
            }}
          >
            <span className="material-symbols-outlined">
              {isSidebarHidden ? 'side_navigation' : 'fullscreen'}
            </span>
          </button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Profile Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem', position: 'relative' }}>
          <div 
            onClick={() => document.getElementById('avatar-input')?.click()}
            onMouseEnter={e => {
              const overlay = e.currentTarget.querySelector('.avatar-hover-overlay') as HTMLElement;
              if (overlay) overlay.style.opacity = '1';
            }}
            onMouseLeave={e => {
              const overlay = e.currentTarget.querySelector('.avatar-hover-overlay') as HTMLElement;
              if (overlay) overlay.style.opacity = '0';
            }}
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '24px', 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontWeight: 900, 
              fontSize: '2rem',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
            
            {/* Loading Spinner */}
            {isUploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <span className="material-symbols-outlined rotating" style={{ fontSize: '28px', color: '#10b981' }}>sync</span>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="avatar-hover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.3s ease', backdropFilter: 'blur(2px)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'white' }}>add_a_photo</span>
            </div>
          </div>
          <input 
            id="avatar-input"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{user?.name || 'User'}</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.email || 'No email'}</p>
          </div>
          {user?.role === 'admin' && (
             <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>Admin</span>
          )}
        </div>



        {/* Section: Support & Growth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>Growth & Feedback</h3>
          
          <button 
            onClick={() => navigate('/feedback')}
            className="glass-card" 
            style={{ width: '100%', border: '1px solid var(--glass-border)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>rate_review</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Send Feedback</span>
            </div>
            <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '1.2rem' }}>chevron_right</span>
          </button>

          <button 
            onClick={() => {
              console.log('Opening Support Modal');
              setShowSupportModal(true);
            }}
            className="glass-card" 
            style={{ width: '100%', border: '1px solid var(--glass-border)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#ec4899' }}>favorite</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Support This App</span>
            </div>
            <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '1.2rem' }}>chevron_right</span>
          </button>
        </div>

        {/* Section: Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>Security</h3>
          
          <button 
            onClick={() => setShowPinModal(true)}
            className="glass-card" 
            style={{ width: '100%', border: '1px solid var(--glass-border)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>lock_reset</span>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>Change Access PIN</span>
            </div>
            <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '1.2rem' }}>chevron_right</span>
          </button>
        </div>





        {/* Section: Data & Privacy Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>Data Management & Privacy</h3>
          <div className="glass-card" style={{ padding: '0.5rem' }}>
            <button onClick={handleExportData} style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><span className="material-symbols-outlined" style={{ color: '#10b981' }}>download</span><span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Export My Data</span></div>
              <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '1.2rem' }}>chevron_right</span>
            </button>
            <button onClick={() => setShowConfirmReset({ show: true, type: 'delete' })} style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><span className="material-symbols-outlined">person_remove</span><span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Delete Account</span></div>
              <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '1.2rem' }}>chevron_right</span>
            </button>
          </div>
        </div>

        {/* Section: Reset Data Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '0.5rem', marginBottom: '0.25rem' }}>Danger Zone</h3>
          <div className="glass-card" style={{ padding: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            {['tasks', 'routines', 'stats'].map((type, index) => (
              <button key={type} onClick={() => setShowConfirmReset({ show: true, type: type as any })} style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', borderTop: index > 0 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}><span className="material-symbols-outlined">restart_alt</span><span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Reset {type.charAt(0).toUpperCase() + type.slice(1)}</span></div>
                <span className="material-symbols-outlined" style={{ color: '#64748b', fontSize: '1.2rem' }}>chevron_right</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reset Confirmation Modal Info */}
        {showConfirmReset.show && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }}>warning</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff' }}>Are you absolutely sure?</h2>
              <p style={{ fontSize: '0.81rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.5rem' }}>This action cannot be undone. All your {showConfirmReset.type} will be permanently erased.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowConfirmReset({ show: false, type: '' })} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleResetData} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="glass-card" 
          style={{ width: '100%', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#ef4444', cursor: 'pointer', marginTop: '1rem', background: 'rgba(239, 68, 68, 0.05)' }}
        >
          <span className="material-symbols-outlined">{isLoggingOut ? 'sync' : 'logout'}</span>
          <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>{isLoggingOut ? 'Logging out...' : 'Logout Session'}</span>
        </button>


        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#475569', marginTop: '2rem' }}>
          StayHardy v1.2.0 • Build 2026.03.13
        </p>
      </main>

      <BottomNav isHidden={isSidebarHidden} />

      <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="premium-modal-overlay" onClick={() => !isUpdatingPin && setShowPinModal(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>Update Access PIN</h2>
              <button disabled={isUpdatingPin} onClick={() => setShowPinModal(false)} className="notification-btn">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {pinSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>check</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>PIN Updated!</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Your sign-in credentials have been updated.</p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>New 4-Digit PIN</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <input 
                        key={i}
                        id={`new-pin-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        className="form-input"
                        value={newPin[i]}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          const nextPin = [...newPin];
                          nextPin[i] = val.slice(-1);
                          setNewPin(nextPin);
                          if (val && i < 3) document.getElementById(`new-pin-${i+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !newPin[i] && i > 0) document.getElementById(`new-pin-${i-1}`)?.focus();
                        }}
                        style={{ width: '3.5rem', height: '3.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900, borderRadius: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      />
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>Confirm New PIN</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <input 
                        key={i}
                        id={`conf-pin-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        className="form-input"
                        value={confirmPin[i]}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '');
                          const nextPin = [...confirmPin];
                          nextPin[i] = val.slice(-1);
                          setConfirmPin(nextPin);
                          if (val && i < 3) document.getElementById(`conf-pin-${i+1}`)?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !confirmPin[i] && i > 0) document.getElementById(`conf-pin-${i-1}`)?.focus();
                        }}
                        style={{ width: '3.5rem', height: '3.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900, borderRadius: '0.75rem', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }}
                      />
                    ))}
                  </div>
                </div>

                {pinError && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>{pinError}</p>
                )}

                <button 
                  type="submit" 
                  disabled={isUpdatingPin}
                  className="glow-btn-primary" 
                  style={{ width: '100%', height: '4rem', borderRadius: '1.25rem', fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', gap: '0.75rem', marginTop: '1rem' }}
                >
                  <span className="material-symbols-outlined">{isUpdatingPin ? 'sync' : 'save'}</span>
                  <span>{isUpdatingPin ? 'Saving...' : 'Update PIN'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};


export default Settings;

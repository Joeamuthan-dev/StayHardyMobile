import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';


const MAX_LEN = 500;
const MIN_SUBMIT = 10;

const supportCategories = [
  { value: 'signup_issue', label: 'Signup Issue', icon: '📝', desc: 'Problem creating account' },
  { value: 'login_issue', label: 'Login Issue', icon: '🔐', desc: 'Cannot login to app' },
  { value: 'payment_issue', label: 'Payment Issue', icon: '💳', desc: 'Payment or billing problem' },
  { value: 'bug_report', label: 'Bug Report', icon: '🐛', desc: 'Something is not working' },
  { value: 'feature_request', label: 'Feature Request', icon: '✨', desc: 'Suggest a new feature' },
  { value: 'account_issue', label: 'Account Issue', icon: '👤', desc: 'Profile or account problem' },
  { value: 'performance_issue', label: 'Performance Issue', icon: '⚡', desc: 'App is slow or crashing' },
  { value: 'data_issue', label: 'Data Issue', icon: '📊', desc: 'Tasks or data missing' },
  { value: 'notification_issue', label: 'Notification Issue', icon: '🔔', desc: 'Reminders not working' },
  { value: 'other', label: 'Other', icon: '💬', desc: 'Something else' }
];

const StatusBadge = ({ status }: { status?: string }) => {
  const styles: any = {
    pending: { bg: '#FF950022', color: '#FF9500', label: '⏳ Pending' },
    in_progress: { bg: '#007AFF22', color: '#007AFF', label: '🔄 In Progress' },
    resolved: { bg: '#00E87A22', color: '#00E87A', label: '✅ Resolved' },
    closed: { bg: '#33333322', color: '#666', label: '🔒 Closed' }
  };
  const s = styles[status || 'pending'] || styles.pending;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '3px 10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '700'
    }}>
      {s.label}
    </span>
  );
};

const Feedback: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'feedback' | 'support'>('feedback');
  const [category, setCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);
  const [formExiting, setFormExiting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [submittedTicket, setSubmittedTicket] = useState<any>(null);
  
  // My Tickets State
  const [myTickets, setMyTickets] = useState<any[]>([]);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMyTickets = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'support')
      .order('created_at', { ascending: false });
    
    setMyTickets(data || []);
  }, [user]);

  useEffect(() => {
    fetchMyTickets();

    if (!user?.id) return;

    const channel = supabase
      .channel('user_feedback_support')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchMyTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchMyTickets]);

  const goHome = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    navigate('/home');
  }, [navigate]);

  useEffect(() => {
    if (!showSuccess || type === 'support') return; // only auto-redirect for feedback
    setCountdown(3);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          goHome();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [showSuccess, type, goHome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowError(true);

    if (!user?.id) {
      alert('Please log in first');
      return;
    }

    const trimmed = message.trim();
    if (trimmed.length < MIN_SUBMIT) return;

    if (type === 'support' && !category) return;

    setIsSubmitting(true);

    try {
      const ticketId = 'TKT-' + Date.now().toString().slice(-6);

      const payload = {
        user_id: user.id,
        user_name: (user as { name?: string })?.name || '',
        user_email: user.email || '',
        message: trimmed.slice(0, MAX_LEN),
        type: type,
        subcategory: category || 'general',
        ticket_id: ticketId,
        status: 'open',
        priority: 'normal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('Feedback payload:', JSON.stringify(payload));

      const { data, error } = await supabase
        .from('feedback')
        .insert(payload)
        .select()
        .single();

      console.log('Error:', JSON.stringify(error));
      console.log('Data:', JSON.stringify(data));

      if (error) {
        console.error('Failed:', error.message);
        alert('Failed: ' + error.message);
        setIsSubmitting(false);
        return;
      }

      console.log('Sent ✅:', ticketId);

      if (type === 'support') {
        setSubmittedTicket({ id: ticketId, category, message: trimmed });
        setFormExiting(true);
        window.setTimeout(() => { setFormExiting(false); setShowSuccess(true); }, 300);
      } else {
        setFormExiting(true);
        window.setTimeout(() => { setFormExiting(false); setShowSuccess(true); }, 300);
      }

    } catch (err: any) {
      console.error('Error:', err.message);
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDoneSupport = () => {
    setShowSuccess(false);
    setSubmittedTicket(null);
    setMessage('');
    setCategory('');
    setType('feedback');
    setShowError(false);
    navigate('/settings');
  };

  const canSubmit = message.trim().length >= MIN_SUBMIT && message.length <= MAX_LEN;
  const counterGreen = message.length >= 20;

  return (
    <div className="fb-page">
      {/* ── SUCCESS SCREEN FOR SUPPORT ── */}
      {showSuccess && submittedTicket && type === 'support' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#080C0A',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px'
        }}>
          {/* Success icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#FF950022',
            border: '2px solid #FF9500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            marginBottom: '24px'
          }}>
            🎫
          </div>
          
          <div style={{
            color: '#fff',
            fontSize: '22px',
            fontWeight: '800',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Ticket Created!
          </div>
          
          <div style={{
            color: '#666',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            We'll review your issue and get back to you soon.
          </div>
          
          {/* Ticket ID box */}
          <div style={{
            background: '#1A1A1A',
            border: '1px solid #FF9500',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#FF9500',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '2px',
              marginBottom: '6px'
            }}>
              YOUR TICKET ID
            </div>
            <div style={{
              color: '#fff',
              fontSize: '24px',
              fontWeight: '800',
              letterSpacing: '2px'
            }}>
              {submittedTicket.id}
            </div>
          </div>
          
          {/* Category */}
          <div style={{
            color: '#666',
            fontSize: '13px',
            marginBottom: '32px'
          }}>
            Category: {supportCategories.find(c => c.value === submittedTicket.category)?.label}
          </div>
          
          {/* Done button */}
          <button
            onClick={handleDoneSupport}
            style={{
              width: '100%',
              padding: '16px',
              background: '#FF9500',
              border: 'none',
              borderRadius: '14px',
              color: '#000',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Done ✅
          </button>
        </div>
      )}


      <main className="fb-main">
        <div className="fb-card">
          {!showSuccess ? (
            <form className={`fb-form ${formExiting ? 'fb-form--exit' : ''}`} onSubmit={handleSubmit} noValidate>
              
              {/* STEP 1: TYPE SELECTOR */}
              <div style={{
                display: 'flex',
                gap: '10px',
                padding: '4px',
                background: '#1A1A1A',
                borderRadius: '14px',
                marginBottom: '20px'
              }}>
                <button
                  type="button"
                  onClick={() => setType('feedback')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: type === 'feedback' ? '#00E87A' : 'transparent',
                    color: type === 'feedback' ? '#000' : '#666',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  💬 Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setType('support')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: type === 'support' ? '#FF9500' : 'transparent',
                    color: type === 'support' ? '#000' : '#666',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  🎧 Support
                </button>
              </div>

              {/* STEP 2: SUPPORT CATEGORY DROPDOWN */}
              {type === 'support' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    color: '#888',
                    fontSize: '11px',
                    fontWeight: '600',
                    letterSpacing: '1px',
                    marginBottom: '8px'
                  }}>
                    ISSUE CATEGORY
                  </div>
                  
                  {/* Trigger button */}
                  <button
                    type="button"
                    onClick={() => setShowCategoryPicker(true)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: '#1A1A1A',
                      border: `1px solid ${!category && showError ? '#FF3B30' : category ? '#FF9500' : '#333'}`,
                      borderRadius: '12px',
                      color: category ? '#fff' : '#555',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {category ? (
                        <>
                          <span style={{ fontSize: '18px' }}>
                            {supportCategories.find(c => c.value === category)?.icon}
                          </span>
                          <span>
                            {supportCategories.find(c => c.value === category)?.label}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: '#555' }}>Select issue category...</span>
                      )}
                    </span>
                    
                    {/* Arrow icon */}
                    <span style={{
                      color: '#555',
                      fontSize: '12px',
                      transform: showCategoryPicker ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}>
                      ▼
                    </span>
                  </button>
                  
                  {/* Selected description */}
                  {category && (
                    <div style={{
                      color: '#FF9500',
                      fontSize: '12px',
                      marginTop: '6px',
                      paddingLeft: '4px'
                    }}>
                      {supportCategories.find(c => c.value === category)?.desc}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: MESSAGE TEXTAREA */}
              <p className="fb-section-label fb-section-label--spaced" style={{ marginTop: '0' }}>YOUR MESSAGE</p>
              <div className="fb-textarea-wrap">
                <textarea
                  className="fb-textarea"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value.slice(0, MAX_LEN));
                    setShowError(false);
                  }}
                  placeholder={
                    type === 'feedback'
                      ? "Share your thoughts, ideas or suggestions... We read every message! 💚"
                      : "Describe your issue in detail. Include any steps to reproduce the problem..."
                  }
                  rows={5}
                  maxLength={MAX_LEN}
                  spellCheck
                />
                <span className={`fb-counter ${counterGreen ? 'fb-counter--ok' : ''}`}>
                  {message.length} / {MAX_LEN}
                </span>
              </div>
              
              {showError && message.trim().length > 0 && message.trim().length < MIN_SUBMIT && (
                <div style={{ color: '#FF3B30', fontSize: '12px', marginTop: '4px' }}>Message must be at least 10 characters.</div>
              )}

              {/* STEP 4: SUBMIT BUTTON */}
              <button
                type="submit"
                className={`fb-submit ${isSubmitting ? 'fb-submit--loading' : ''}`}
                disabled={!canSubmit || isSubmitting || (type === 'support' && !category)}
                style={{
                  background: type === 'support' && canSubmit && category ? 'linear-gradient(135deg, #FF9500, #FFB340)' : '',
                  boxShadow: type === 'support' && canSubmit && category ? '0 8px 24px rgba(255, 149, 0, 0.25)' : ''
                }}
              >
                {isSubmitting
                  ? (
                    <>
                      <span className="fb-spinner" aria-hidden />
                      Sending...
                    </>
                  )
                  : type === 'feedback'
                    ? '💬 Send Feedback'
                    : '🎫 Send Support Ticket'}
              </button>
            </form>
          ) : (
            type === 'feedback' && (
              <div className="fb-success">
                <div className="fb-success-check-wrap" aria-hidden>
                  <div className="fb-success-glow" />
                  <svg className="fb-success-svg" viewBox="0 0 24 24" fill="none">
                    <path
                      className="fb-success-path"
                      d="M 6 12 L 10.5 16.5 L 18 7"
                      pathLength={100}
                      stroke="#00E87A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>
                <h2 className="fb-success-title">Thank you! 🙏</h2>
                <p className="fb-success-msg">
                  Your feedback has been received. We read every single message and use it to make StayHardy better for you.
                </p>
                <p className="fb-success-countdown">Taking you back to Home in {countdown}s...</p>
                <button type="button" className="fb-success-skip" onClick={goHome}>
                  Go Home Now →
                </button>
              </div>
            )
          )}
        </div>

        {/* ── PART 2: MY TICKETS (SUPPORT HISTORY) ── */}
        {!showSuccess && myTickets.length > 0 && (
          <section className="fb-recent" style={{ marginTop: '32px' }}>
            <h3 className="fb-recent-title">MY TICKETS</h3>
            <div className="fb-recent-list">
              {myTickets.map(ticket => (
                <div key={ticket.id} style={{
                  background: '#0F0F0F',
                  border: '1px solid #1A1A1A',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ color: '#FF9500', fontSize: '12px', fontWeight: '700' }}>
                      🎫 {ticket.ticket_id}
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>
                  
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '6px' }}>
                    {supportCategories.find(c => c.value === ticket.subcategory)?.label || ticket.subcategory}
                  </div>
                  
                  <div style={{ color: '#CCC', fontSize: '13px', lineHeight: '1.4', marginBottom: '8px' }}>
                    {ticket.message}
                  </div>
                  
                  {ticket.admin_note && (
                    <div style={{
                      background: '#00E87A11',
                      border: '1px solid #00E87A33',
                      borderRadius: '8px',
                      padding: '10px',
                      marginTop: '8px'
                    }}>
                      <div style={{ color: '#00E87A', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>
                        🛡️ Admin Response:
                      </div>
                      <div style={{ color: '#CCC', fontSize: '13px' }}>
                        {ticket.admin_note}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ color: '#444', fontSize: '11px', marginTop: '8px' }}>
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>



      {/* BOTTOM SHEET PICKER */}
      {showCategoryPicker && (
        <>
          {/* Dark overlay */}
          <div
            onClick={() => setShowCategoryPicker(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: '#000000BB',
              zIndex: 998
            }}
          />
          
          {/* Bottom sheet */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#111111',
            borderRadius: '20px 20px 0 0',
            zIndex: 999,
            maxHeight: '75vh',
            overflowY: 'auto',
            paddingBottom: '32px',
            border: '1px solid #222'
          }}>
            
            {/* Handle bar */}
            <div style={{
              width: '40px',
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              margin: '12px auto 0'
            }} />
            
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #1A1A1A',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '16px'
                }}>
                  Issue Category
                </div>
                <div style={{
                  color: '#555',
                  fontSize: '12px',
                  marginTop: '2px'
                }}>
                  Select what best describes your issue
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryPicker(false)}
                style={{
                  background: '#1A1A1A',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#666',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* Category list */}
            <div style={{ padding: '8px 0' }}>
              {supportCategories.map((cat, index) => (
                <button
                  type="button"
                  key={cat.value}
                  onClick={() => {
                    setCategory(cat.value)
                    setShowCategoryPicker(false)
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: category === cat.value ? '#FF950015' : 'transparent',
                    border: 'none',
                    borderBottom: index < supportCategories.length - 1 ? '1px solid #1A1A1A' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    textAlign: 'left'
                  }}
                >
                  {/* Icon circle */}
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: category === cat.value ? '#FF950022' : '#1A1A1A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                    border: category === cat.value ? '1px solid #FF9500' : '1px solid #222'
                  }}>
                    {cat.icon}
                  </div>
                  
                  {/* Label + desc */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: category === cat.value ? '#FF9500' : '#fff',
                      fontWeight: '600',
                      fontSize: '14px',
                      marginBottom: '2px'
                    }}>
                      {cat.label}
                    </div>
                    <div style={{
                      color: '#555',
                      fontSize: '12px'
                    }}>
                      {cat.desc}
                    </div>
                  </div>
                  
                  {/* Check mark */}
                  {category === cat.value && (
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#FF9500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        .fb-page {
          min-height: 100dvh;
          background: #080c0a;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          padding: 20px 24px calc(120px + env(safe-area-inset-bottom, 0));
          box-sizing: border-box;
        }

        .fb-header {
          display: flex;
          align-items: center;
          gap: 12px;
          animation: fbFadeIn 0.45s ease-out forwards;
        }

        .fb-back {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          color: #fff;
        }
        .fb-back .material-symbols-outlined {
          font-size: 16px;
        }

        .fb-header-text {
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .fb-title {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 26px;
          color: #fff;
          letter-spacing: -0.5px;
          margin: 0;
          line-height: 1.15;
        }

        .fb-subtitle {
          margin: 2px 0 0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: #00e87a;
          letter-spacing: 1.5px;
        }

        .fb-subtitle-icon {
          opacity: 0.9;
        }

        .fb-main {
          margin-top: 0;
        }

        .fb-card {
          margin-top: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 20px;
          padding: 20px;
          animation: fbFadeUp 0.45s ease-out 0.2s both;
        }

        .fb-form {
          display: flex;
          flex-direction: column;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .fb-form--exit {
          opacity: 0;
          transform: translateY(20px);
        }

        .fb-section-label {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.4);
          margin: 0 0 10px;
          font-weight: 600;
        }
        .fb-section-label--spaced {
          margin-top: 10px;
          animation: fbFadeUp 0.45s ease-out 0.5s both;
        }

        .fb-textarea-wrap {
          position: relative;
          animation: fbFadeUp 0.45s ease-out 0.5s both;
        }

        .fb-textarea {
          width: 100%;
          box-sizing: border-box;
          min-height: 130px;
          max-height: 200px;
          resize: none;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          padding-bottom: 28px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.45;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .fb-textarea::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        .fb-textarea:focus {
          outline: none;
          border-color: rgba(0, 232, 122, 0.4);
          box-shadow: 0 0 0 3px rgba(0, 232, 122, 0.08);
        }

        .fb-counter {
          position: absolute;
          bottom: 10px;
          right: 12px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
        }
        .fb-counter--ok {
          color: #00e87a;
        }

        .fb-submit {
          margin-top: 20px;
          width: 100%;
          height: 52px;
          border: none;
          border-radius: 16px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          animation: fbFadeUp 0.45s ease-out 0.65s both;
        }
        .fb-submit:not(:disabled) {
          background: linear-gradient(135deg, #00e87a, #00c563);
          color: #000;
          box-shadow: 0 8px 24px rgba(0, 232, 122, 0.25);
        }
        .fb-submit:not(:disabled):hover {
          filter: brightness(1.03);
        }
        .fb-submit:disabled {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.3);
          box-shadow: none;
          cursor: not-allowed;
        }
        .fb-submit.fb-submit--loading:disabled {
          background: linear-gradient(135deg, rgba(0, 232, 122, 0.82), rgba(0, 197, 99, 0.82));
          color: #000;
          box-shadow: 0 6px 20px rgba(0, 232, 122, 0.2);
          cursor: wait;
        }

        .fb-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.2);
          border-top-color: rgba(0, 0, 0, 0.65);
          border-radius: 50%;
          animation: fbSpin 0.7s linear infinite;
        }

        @keyframes fbSpin {
          to { transform: rotate(360deg); }
        }

        .fb-success {
          text-align: center;
          padding: 8px 0 0;
          animation: fbSuccessIn 0.4s ease-out 0.35s both;
        }

        @keyframes fbSuccessIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fb-success-check-wrap {
          position: relative;
          width: 64px;
          height: 64px;
          margin: 0 auto;
        }
        .fb-success-glow {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0, 232, 122, 0.2), transparent 70%);
        }
        .fb-success-svg {
          position: relative;
          width: 64px;
          height: 64px;
          z-index: 1;
        }
        .fb-success-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: fbDrawCheck 0.8s ease-out forwards;
        }
        @keyframes fbDrawCheck {
          to { stroke-dashoffset: 0; }
        }

        .fb-success-title {
          font-family: 'Syne', system-ui, sans-serif;
          font-weight: 700;
          font-size: 26px;
          color: #fff;
          margin: 20px 0 0;
        }

        .fb-success-msg {
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.6);
          max-width: 260px;
          margin: 10px auto 0;
        }

        .fb-success-countdown {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          margin: 16px 0 0;
        }

        .fb-success-skip {
          margin-top: 12px;
          background: none;
          border: none;
          color: #00e87a;
          font-size: 12px;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 600;
          cursor: pointer;
          padding: 8px;
        }

        .fb-recent-title {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin: 0 0 12px;
          font-weight: 600;
        }

        @keyframes fbFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fbFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Feedback;

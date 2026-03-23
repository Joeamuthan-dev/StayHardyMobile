import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import BottomNav from '../components/BottomNav';

const MAX_LEN = 500;
const MIN_SUBMIT = 10;

type FeedbackType = 'Feature' | 'Bug' | 'Other';

const TYPE_CARDS: { value: FeedbackType; label: string; sub: string; icon: string }[] = [
  { value: 'Feature', label: 'Feature', sub: 'New idea', icon: 'lightbulb' },
  { value: 'Bug', label: 'Bug', sub: 'Something broken', icon: 'bug_report' },
  { value: 'Other', label: 'Other', sub: 'General', icon: 'chat_bubble' },
];

const Feedback: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [type, setType] = useState<FeedbackType>('Feature');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formExiting, setFormExiting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchFeedback = async () => {
      const { data } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setRecentFeedback(data);
    };

    fetchFeedback();

    const channel = supabase
      .channel('user_feedback')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchFeedback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const goHome = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    navigate('/home');
  }, [navigate]);

  useEffect(() => {
    if (!showSuccess) return;
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
  }, [showSuccess, goHome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < MIN_SUBMIT || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert([
        {
          user_id: user?.id || null,
          user_name: user?.name || 'Anonymous',
          message: trimmed.slice(0, MAX_LEN),
          type,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      setMessage('');
      setFormExiting(true);
      window.setTimeout(() => {
        setFormExiting(false);
        setShowSuccess(true);
      }, 300);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = message.trim().length >= MIN_SUBMIT && message.length <= MAX_LEN;
  const counterGreen = message.length >= 20;

  return (
    <div className="fb-page">
      <header className="fb-header">
        <button type="button" className="fb-back" onClick={() => navigate('/settings')} aria-label="Back">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="fb-header-text">
          <h1 className="fb-title">Feedback</h1>
          <p className="fb-subtitle">
            <span className="fb-subtitle-icon" aria-hidden>
              ✦
            </span>{' '}
            HELP US IMPROVE STAYHARDY
          </p>
        </div>
      </header>

      <main className="fb-main">
        <div className="fb-card">
          {!showSuccess ? (
            <form
              className={`fb-form ${formExiting ? 'fb-form--exit' : ''}`}
              onSubmit={handleSubmit}
              noValidate
            >
              <p className="fb-section-label">FEEDBACK TYPE</p>
              <div className="fb-type-grid">
                {TYPE_CARDS.map((t) => {
                  const isSel = type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      className={`fb-type-card ${isSel ? 'fb-type-card--selected' : ''}`}
                      onClick={() => setType(t.value)}
                    >
                      {isSel ? <span className="fb-type-dot" aria-hidden /> : null}
                      <span className="material-symbols-outlined fb-type-icon">{t.icon}</span>
                      <span className="fb-type-label">{t.label}</span>
                      <span className="fb-type-sub">{t.sub}</span>
                    </button>
                  );
                })}
              </div>

              <p className="fb-section-label fb-section-label--spaced">YOUR MESSAGE</p>
              <div className="fb-textarea-wrap">
                <textarea
                  className="fb-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
                  placeholder="What's on your mind? We read every message..."
                  rows={5}
                  maxLength={MAX_LEN}
                  spellCheck
                />
                <span className={`fb-counter ${counterGreen ? 'fb-counter--ok' : ''}`}>
                  {message.length} / {MAX_LEN}
                </span>
              </div>

              <button
                type="submit"
                className={`fb-submit ${isSubmitting ? 'fb-submit--loading' : ''}`}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="fb-spinner" aria-hidden />
                    Sending...
                  </>
                ) : (
                  'Send Feedback'
                )}
              </button>
            </form>
          ) : (
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
          )}
        </div>

        {!showSuccess && recentFeedback.length > 0 && (
          <section className="fb-recent">
            <h3 className="fb-recent-title">Your recent feedback</h3>
            <div className="fb-recent-list">
              {recentFeedback.map((f) => (
                <div key={f.id} className="fb-recent-item">
                  <div className="fb-recent-row">
                    <span
                      className={`fb-recent-type fb-recent-type--${f.type === 'Bug' ? 'bug' : f.type === 'Other' ? 'other' : 'feature'}`}
                    >
                      {String(f.type || '').toUpperCase()}
                    </span>
                    <span className="fb-recent-date">
                      {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="fb-recent-text">{f.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />

      <style>{`
        .fb-page {
          min-height: 100dvh;
          background: #080c0a;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
          padding: 20px 24px calc(100px + env(safe-area-inset-bottom, 0));
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
          margin-top: 20px;
          animation: fbFadeUp 0.45s ease-out 0.5s both;
        }

        .fb-type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          animation: fbFadeUp 0.45s ease-out 0.35s both;
        }

        .fb-type-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 12px 8px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          color: inherit;
          font: inherit;
        }
        .fb-type-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .fb-type-card--selected {
          background: rgba(0, 232, 122, 0.1);
          border-color: rgba(0, 232, 122, 0.35);
          transform: scale(1.03);
        }
        .fb-type-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00e87a;
        }
        .fb-type-icon {
          font-size: 20px !important;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 6px;
        }
        .fb-type-card--selected .fb-type-icon {
          color: #00e87a;
        }
        .fb-type-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }
        .fb-type-card--selected .fb-type-label {
          color: #fff;
        }
        .fb-type-sub {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.35);
          margin-top: 2px;
        }
        .fb-type-card--selected .fb-type-sub {
          color: rgba(0, 232, 122, 0.6);
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
          to {
            transform: rotate(360deg);
          }
        }

        .fb-success {
          text-align: center;
          padding: 8px 0 0;
          animation: fbSuccessIn 0.4s ease-out 0.35s both;
        }

        @keyframes fbSuccessIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
          to {
            stroke-dashoffset: 0;
          }
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

        .fb-recent {
          margin-top: 24px;
        }
        .fb-recent-title {
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin: 0 0 12px;
          font-weight: 600;
        }
        .fb-recent-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fb-recent-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 14px;
        }
        .fb-recent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .fb-recent-type {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
        }
        .fb-recent-type--feature {
          color: #00e87a;
        }
        .fb-recent-type--bug {
          color: #f87171;
        }
        .fb-recent-type--other {
          color: rgba(255, 255, 255, 0.5);
        }
        .fb-recent-date {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.35);
        }
        .fb-recent-text {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.45;
        }

        @keyframes fbFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fbFadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Feedback;

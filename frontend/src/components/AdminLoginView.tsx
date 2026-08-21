// src/components/AdminLoginView.tsx
//
// The web sign-in screen. The website is the marketing page plus the admin
// console, so this is an admin door — not the consumer login the native app
// shows. No sign-up link, no "the 1% starts here": anyone who reaches this
// screen either owns the app or took a wrong turn.
//
// It renders the same state the native login owns (email, pin, error, lockout)
// and calls the same submit handler, so there is exactly one auth code path.
import React from 'react';
import { formatCountdown, MAX_ATTEMPTS } from '../lib/adminSession';

interface Props {
  email: string;
  setEmail: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string;
  isLocked: boolean;
  lockMsLeft: number;
}

const AdminLoginView: React.FC<Props> = ({
  email, setEmail, pin, setPin, onSubmit, isLoading, error, isLocked, lockMsLeft,
}) => {
  const canSubmit = email.trim().length > 3 && pin.length >= 4 && !isLoading && !isLocked;

  return (
    <div className="al">
      <style>{CSS}</style>

      <div className="al__glow" aria-hidden="true" />

      <form
        className="al__card"
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(); }}
      >
        <div className="al__brand">
          <img src="/stayhardy-icon.svg" alt="" width={34} height={34} />
          <div>
            <strong>StayHardy</strong>
            <span>Admin console</span>
          </div>
        </div>

        <h1 className="al__h">Sign in</h1>
        <p className="al__sub">This area is restricted to the app owner.</p>

        <label className="al__label" htmlFor="al-email">Email</label>
        <input
          id="al-email"
          className="al__input"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          disabled={isLocked}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="al__label" htmlFor="al-pin">PIN</label>
        <input
          id="al-pin"
          className="al__input al__input--pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="••••"
          maxLength={4}
          value={pin}
          disabled={isLocked}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />

        {isLocked ? (
          <div className="al__lock" role="alert">
            <strong>Too many failed attempts.</strong>
            <span>Try again in {formatCountdown(lockMsLeft)}.</span>
          </div>
        ) : error ? (
          <p className="al__err" role="alert">{error}</p>
        ) : null}

        <button className="al__btn" type="submit" disabled={!canSubmit}>
          {isLocked
            ? `Locked · ${formatCountdown(lockMsLeft)}`
            : isLoading
              ? 'Signing in…'
              : 'Sign in'}
        </button>

        <p className="al__note">
          {MAX_ATTEMPTS} attempts, then a 5 minute lock. Sessions end after
          20 minutes of inactivity.
        </p>

        <a className="al__back" href="#/">← Back to stayhardy.com</a>
      </form>
    </div>
  );
};

const CSS = `
.al{min-height:100vh;background:#0A0C09;color:#F2F5EC;display:flex;align-items:center;justify-content:center;
 padding:24px 18px;position:relative;overflow:hidden;
 font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;}
.al *{box-sizing:border-box;}
.al__glow{position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:640px;height:440px;border-radius:50%;
 background:radial-gradient(circle,rgba(200,255,61,.13),transparent 70%);pointer-events:none;}
.al__card{position:relative;width:100%;max-width:392px;background:#151812;border:1px solid rgba(242,245,236,.09);
 border-radius:22px;padding:30px 26px 24px;box-shadow:0 28px 80px rgba(0,0,0,.6);}
.al__brand{display:flex;align-items:center;gap:11px;margin-bottom:22px;}
.al__brand img{display:block;flex:none;}
.al__brand div{display:flex;flex-direction:column;line-height:1.2;}
.al__brand strong{font-size:15px;font-weight:800;letter-spacing:-.02em;}
.al__brand span{font-size:11.5px;color:rgba(242,245,236,.5);}
.al__h{margin:0 0 5px;font-size:25px;font-weight:800;letter-spacing:-.03em;}
.al__sub{margin:0 0 24px;font-size:13.5px;color:rgba(242,245,236,.5);}
.al__label{display:block;font-size:10.5px;font-weight:800;letter-spacing:.11em;color:rgba(242,245,236,.5);
 text-transform:uppercase;margin-bottom:7px;}
.al__input{width:100%;height:46px;background:#0F120E;border:1px solid rgba(242,245,236,.12);border-radius:12px;
 padding:0 14px;color:#F2F5EC;font-size:15px;margin-bottom:16px;outline:none;
 transition:border-color .15s,box-shadow .15s;font-family:inherit;}
.al__input::placeholder{color:rgba(242,245,236,.28);}
.al__input:focus{border-color:#c8ff3d;box-shadow:0 0 0 3px rgba(200,255,61,.14);}
.al__input:disabled{opacity:.5;cursor:not-allowed;}
.al__input--pin{letter-spacing:.5em;font-size:18px;}
.al__btn{width:100%;height:47px;border:0;border-radius:12px;background:#c8ff3d;color:#0A0C09;
 font-size:14.5px;font-weight:800;cursor:pointer;margin-top:4px;
 transition:transform .15s,box-shadow .15s,opacity .15s;font-family:inherit;}
.al__btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 26px rgba(200,255,61,.24);}
.al__btn:disabled{opacity:.45;cursor:not-allowed;}
.al__err{margin:0 0 14px;font-size:13px;color:#FF6B6B;line-height:1.5;}
.al__lock{display:flex;flex-direction:column;gap:2px;margin-bottom:14px;padding:11px 13px;border-radius:11px;
 background:rgba(255,107,107,.1);border:1px solid rgba(255,107,107,.32);}
.al__lock strong{font-size:13px;color:#FF6B6B;font-weight:700;}
.al__lock span{font-size:12.5px;color:rgba(242,245,236,.6);}
.al__note{margin:14px 0 0;font-size:11.5px;line-height:1.55;color:rgba(242,245,236,.38);text-align:center;}
.al__back{display:block;margin-top:18px;text-align:center;font-size:12.5px;color:rgba(242,245,236,.5);text-decoration:none;}
.al__back:hover{color:#c8ff3d;}
@media (max-width:420px){ .al__card{padding:26px 20px 20px;} .al__h{font-size:22px;} }
`;

export default AdminLoginView;

// src/pages/Landing.tsx
//
// The marketing site. One job: convince someone to install the Android app.
//
// Deliberately has NO link to /login. The web app is retired — the product is
// the native app, and the website's only signed-in surface is the admin console,
// which the owner reaches by typing /login directly.
//
// Palette and type follow the Flutter app's Aura tokens so the site and the
// product read as one thing: lime #C4F14B on near-black #0A0C09, Inter.
//
// A note on the copy. A large part of the audience is trying to *stop* doing
// something, not only start. That is written into the page as "the one you have
// been trying to quit", without naming any particular habit: a public page that
// names it turns a private thing into something the reader has to be seen
// looking at. Nothing here promises a cure or a medical outcome — the strongest
// claim made is that 30 days of showing up is worth trying.
import React, { useEffect, useRef, useState } from 'react';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.stayhardy.app';

/* ------------------------------------------------------------------ hooks --- */

/** Adds `is-in` once the node has scrolled into view, for CSS reveal. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-in');
      return;
    }
    // The hidden state is applied here, from JS, rather than living in the
    // stylesheet. If this effect never runs the content simply shows — the
    // alternative (opacity:0 by default) means one broken script turns the
    // entire marketing page blank.
    el.classList.add('rv--armed');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`rv ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

/** Counts up to `to` when scrolled into view. */
const CountUp: React.FC<{ to: number; suffix?: string; prefix?: string }> = ({ to, suffix = '', prefix = '' }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setN(to);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1100;
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return <span ref={ref}>{prefix}{n}{suffix}</span>;
};

/* ------------------------------------------------------------------- bits --- */

const GooglePlayIcon = () => (
  <svg width="20" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M1.22 0.454C0.972 0.706 0.828 1.097 0.828 1.608V22.392C0.828 22.903 0.972 23.294 1.22 23.546L1.284 23.608L12.652 12.24V11.76L1.284 0.392L1.22 0.454Z" fill="url(#gp1)"/>
    <path d="M16.46 16.08L12.652 12.24V11.76L16.462 7.92L16.544 7.966L21.094 10.566C22.392 11.302 22.392 12.498 21.094 13.236L16.544 15.834L16.46 16.08Z" fill="url(#gp2)"/>
    <path d="M16.544 15.834L12.652 12L1.22 23.546C1.638 23.988 2.33 24.044 3.108 23.608L16.544 15.834Z" fill="url(#gp3)"/>
    <path d="M16.544 8.166L3.108 0.392C2.33 -0.044 1.638 0.012 1.22 0.454L12.652 12L16.544 8.166Z" fill="url(#gp4)"/>
    <defs>
      <linearGradient id="gp1" x1="11.6" y1="1.5" x2="-2.7" y2="15.8" gradientUnits="userSpaceOnUse"><stop stopColor="#00A0FF"/><stop offset=".26" stopColor="#00BEFF"/><stop offset=".51" stopColor="#00D2FF"/><stop offset="1" stopColor="#00E3FF"/></linearGradient>
      <linearGradient id="gp2" x1="23" y1="12" x2=".56" y2="12" gradientUnits="userSpaceOnUse"><stop stopColor="#FFE000"/><stop offset=".41" stopColor="#FFBD00"/><stop offset=".78" stopColor="#FFA500"/><stop offset="1" stopColor="#FF9C00"/></linearGradient>
      <linearGradient id="gp3" x1="14.3" y1="14.3" x2="-4.9" y2="33.4" gradientUnits="userSpaceOnUse"><stop stopColor="#FF3A44"/><stop offset="1" stopColor="#C31162"/></linearGradient>
      <linearGradient id="gp4" x1="-1.8" y1="-5.2" x2="7.4" y2="4" gradientUnits="userSpaceOnUse"><stop stopColor="#32A071"/><stop offset=".48" stopColor="#15CF74"/><stop offset="1" stopColor="#00F076"/></linearGradient>
    </defs>
  </svg>
);

const PlayButton: React.FC<{ large?: boolean }> = ({ large }) => (
  <a className={`sh-play${large ? ' sh-play--lg' : ''}`} href={PLAY_URL} target="_blank" rel="noopener noreferrer">
    <GooglePlayIcon />
    <span className="sh-play__t"><small>GET IT ON</small><strong>Google Play</strong></span>
  </a>
);

/* ---------------------------------------------------------- illustrations --- */

/** A year of check-ins. The thing people actually want to look at. */
const Heatmap: React.FC = () => {
  // Deterministic pseudo-random so the art is identical on every render and
  // between server and client — no Math.random in a render path.
  const cells = Array.from({ length: 133 }, (_, i) => {
    const v = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const r = Math.abs(v);
    return i > 118 ? 0 : r > 0.72 ? 3 : r > 0.45 ? 2 : r > 0.22 ? 1 : 0;
  });
  return (
    <div className="ill ill--heat" aria-hidden="true">
      <div className="heat">
        {cells.map((lvl, i) => (
          <i key={i} className={`heat__c heat__c--${lvl}`} style={{ animationDelay: `${(i % 19) * 26}ms` }} />
        ))}
      </div>
      <div className="ill__cap">19 weeks · 118 check-ins</div>
    </div>
  );
};

/** The focus hourglass, actually pouring. */
const Hourglass: React.FC = () => (
  <div className="ill ill--glass" aria-hidden="true">
    <svg viewBox="0 0 90 120" width="88" height="118">
      <path d="M18 8h54M18 112h54" stroke="#C4F14B" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 10c0 26 23 32 23 50s-23 24-23 50" stroke="rgba(242,245,236,.28)" strokeWidth="3" fill="none" />
      <path d="M68 10c0 26-23 32-23 50s23 24 23 50" stroke="rgba(242,245,236,.28)" strokeWidth="3" fill="none" />
      <path d="M27 16c0 20 18 28 18 44V16z" fill="#C4F14B" opacity=".85" className="hg-top" />
      <path d="M63 104c0-16-18-20-18-32v32z" fill="#C4F14B" opacity=".85" className="hg-bot" />
      <circle cx="45" cy="66" r="1.9" fill="#C4F14B" className="hg-drop" />
    </svg>
    <div className="ill__cap">Focus · 25:00</div>
  </div>
);

/** The Circle podium — top three win Pro for life. */
const Podium: React.FC = () => (
  <div className="ill ill--pod" aria-hidden="true">
    <div className="pod">
      <div className="pod__col pod__col--2"><span className="pod__n">2</span></div>
      <div className="pod__col pod__col--1"><span className="pod__crown">♛</span><span className="pod__n">1</span></div>
      <div className="pod__col pod__col--3"><span className="pod__n">3</span></div>
    </div>
    <div className="ill__cap">Top 3 this month · Pro for life</div>
  </div>
);

/* -------------------------------------------------------------- app phone --- */

const Phone: React.FC = () => (
  <div className="ph" role="img" aria-label="StayHardy home screen showing four of five habits done and a twelve day streak">
    <div className="ph__notch" />
    <div className="ph__screen">
      <div className="ph__top">
        <div>
          <div className="ph__hi">Good morning</div>
          <div className="ph__date">Today</div>
        </div>
        <div className="ph__streak">🔥 12</div>
      </div>
      <div className="ph__ring">
        <svg viewBox="0 0 120 120" width="112" height="112">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#262B21" strokeWidth="10" />
          <circle className="ph__arc" cx="60" cy="60" r="52" fill="none" stroke="#C4F14B" strokeWidth="10"
            strokeLinecap="round" strokeDasharray="327" strokeDashoffset="65" transform="rotate(-90 60 60)" />
        </svg>
        <div className="ph__rt"><strong>80%</strong><span>4 of 5</span></div>
      </div>
      {[['Workout', true], ['Read 20 pages', true], ['No scrolling till 9', true], ['Sleep by 11', true], ['Cold shower', false]].map(([l, d], i) => (
        <div className={`ph__row${d ? ' is-done' : ''}`} key={l as string} style={{ animationDelay: `${420 + i * 90}ms` }}>
          <span className="ph__box">{d ? '✓' : ''}</span>
          <span className="ph__label">{l as string}</span>
        </div>
      ))}
      <div className="ph__tabs"><span className="is-on">Home</span><span>Stats</span><span>Circle</span><span>You</span></div>
    </div>
  </div>
);

/* -------------------------------------------------------------------- page --- */

const FEATURES = [
  ['◎', 'The StayHardy Circle', 'Every user on one board each month. Fair points, everyone resets on the 1st — and the top three win Pro for life.'],
  ['⬡', 'Private circles', 'A code, your friends, one board. Set a house rule for how many habits everyone runs.'],
  ['✦', 'The habit finder', "Five taps and it builds a routine around your real day — not the day you wish you had."],
  ['⧗', 'A real hourglass', 'A focus timer that pours actual sand, and freezes the moment you pause.'],
  ['▦', 'Screen-time truth', 'Where your hours actually went, what they cost, and one honest sentence about it.'],
  ['❄', 'Streak freezes', 'Miss one day and keep the streak — but only with a freeze you earned by showing up.'],
  ['☁', 'Backup to your Drive', 'Daily backup into your own Google Drive. Ours never holds your history.'],
  ['↯', 'Built native, built fast', 'Rebuilt from scratch for Android. Full refresh-rate scrolling, instant screens.'],
];

const Landing: React.FC = () => {
  return (
    <div className="sh">
      <style>{CSS}</style>

      <header className="sh-nav">
        <div className="wrap sh-nav__in">
          <div className="brand"><img src="/stayhardy-icon.svg" alt="" width={30} height={30} /><span>StayHardy</span></div>
          <PlayButton />
        </div>
      </header>

      {/* ------------------------------------------------------------- hero */}
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="wrap hero__in">
          <div className="hero__copy">
            <span className="eyebrow">FREE ON ANDROID · MADE IN INDIA</span>
            <h1 className="h1">
              Everyone knows what<br className="br-d" /> to do.<br />
              <span className="accent">Almost nobody does it.</span>
            </h1>
            <p className="lead">
              Not another notes app you stop opening by February. StayHardy is built for
              the boring middle — day 5, day 19, the evening you nearly skipped.
              Show up, and it keeps the receipts.
            </p>
            <div className="cta"><PlayButton large /></div>
            <ul className="trust">
              <li>Free to start</li><li>Works offline</li><li>No ads</li>
            </ul>
          </div>
          <div className="hero__art"><Phone /></div>
        </div>
      </section>

      {/* ---------------------------------------------------------- problem */}
      <section className="sec sec--alt">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">BE HONEST</span>
            <h2 className="h2">You have tried tracking before</h2>
          </Reveal>
          <div className="probs">
            {[
              ['📝', 'A diary', 'Filled in for nine days. Still in the drawer.'],
              ['📊', 'An Excel sheet', 'Perfect columns. Last opened in January.'],
              ['🔔', 'Phone reminders', 'Swiped away without reading. Every day.'],
              ['🧠', 'Just remembering', 'Which is how a good week quietly becomes a lost year.'],
            ].map(([g, t, b], i) => (
              <Reveal key={t} delay={i * 70}>
                <div className="prob">
                  <span className="prob__g">{g}</span>
                  <h3>{t}</h3><p>{b}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={140}>
            <p className="sub sub--tight">
              None of them failed because you are lazy. They failed because none of them
              noticed whether you turned up.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ build/break */}
      <section className="sec">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">TWO DIRECTIONS</span>
            <h2 className="h2">Start something. Or finally stop something.</h2>
            <p className="sub">
              Most apps only count the good stuff. Plenty of us are fighting the other
              way — and that deserves the same tracking, quietly and without a lecture.
            </p>
          </Reveal>
          <div className="two">
            <Reveal>
              <div className="two__card">
                <span className="two__tag two__tag--build">BUILD</span>
                <h3>The ones you want to start</h3>
                <ul>
                  <li>Workout before work</li><li>Read 20 pages</li>
                  <li>Sleep before 11</li><li>Study 2 focused hours</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={90}>
              <div className="two__card two__card--break">
                <span className="two__tag two__tag--break">BREAK</span>
                <h3>The one you have been trying to quit</h3>
                <ul>
                  <li>No scrolling for the first hour</li><li>No smoking today</li>
                  <li>Nothing you regret at 2am</li><li>Whatever yours is</li>
                </ul>
                <p className="two__note">
                  Marked the same way as anything else. No streak shaming, no red screens —
                  a clean slate is always one day away.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- 30 days */}
      <section className="sec sec--alt">
        <div className="wrap thirty">
          <Reveal>
            <span className="eyebrow">THE ONLY ASK</span>
            <h2 className="h2">Give it <span className="accent">30 days</span></h2>
            <p className="sub">
              Not a promise of a new life — just the honest bet that a month of actually
              showing up tells you more about yourself than another year of planning to.
            </p>
          </Reveal>
          <div className="days" aria-hidden="true">
            {Array.from({ length: 30 }, (_, i) => (
              <span key={i} className="days__d" style={{ animationDelay: `${i * 40}ms` }}>{i + 1}</span>
            ))}
          </div>
          <Reveal>
            <div className="stats">
              <div className="stat"><strong><CountUp to={7} /></strong><span>habits free</span></div>
              <div className="stat"><strong><CountUp to={30} prefix="₹" /></strong><span>a month for Pro</span></div>
              <div className="stat"><strong><CountUp to={0} suffix=" ads" /></strong><span>now and later</span></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- see-it */}
      <section className="sec">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">WHAT YOU GET TO LOOK AT</span>
            <h2 className="h2">Proof, not vibes</h2>
            <p className="sub">Every screen answers one question: did you actually do it?</p>
          </Reveal>
          <div className="ills">
            <Reveal><Heatmap /></Reveal>
            <Reveal delay={90}><Hourglass /></Reveal>
            <Reveal delay={180}><Podium /></Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="sec sec--alt">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">INSIDE THE APP</span>
            <h2 className="h2">Everything, in one place</h2>
          </Reveal>
          <div className="grid">
            {FEATURES.map(([g, t, b], i) => (
              <Reveal key={t} delay={(i % 4) * 60}>
                <article className="card">
                  <span className="glyph">{g}</span>
                  <h3>{t}</h3><p>{b}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section className="sec">
        <div className="wrap">
          <Reveal>
            <span className="eyebrow">PRICING</span>
            <h2 className="h2">Less than one chai a week</h2>
            <p className="sub">
              Seven habits, the full daily loop and the Circle are free forever. Pro lifts
              the limits — and if you win a month in the Circle, you get it for life anyway.
            </p>
          </Reveal>
          <div className="tiers">
            <Reveal>
              <div className="tier">
                <h3>Free</h3>
                <div className="tier__p">₹0</div>
                <ul>
                  <li>Up to 7 habits</li><li>Goals, tasks, focus, mood</li>
                  <li>The StayHardy Circle</li><li>Local backup</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="tier tier--hero">
                <span className="tier__badge">BEST VALUE</span>
                <h3>Lifetime</h3>
                <div className="tier__p">₹499<small> once</small></div>
                <ul>
                  <li>Unlimited habits</li><li>Backup to your Google Drive</li>
                  <li>Full history and insights</li><li>Streak freezes</li>
                  <li>Larger private circles</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={160}>
              <div className="tier">
                <h3>Monthly</h3>
                <div className="tier__p">₹30<small>/mo</small></div>
                <ul>
                  <li>Everything in Pro</li><li>Cancel any time</li>
                  <li>Or ₹300 for the year</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- privacy */}
      <section className="sec sec--alt">
        <div className="wrap priv">
          <Reveal>
            <div>
              <span className="eyebrow">PRIVACY</span>
              <h2 className="h2">Your data never becomes our product</h2>
              <p className="sub sub--left">
                Habits live on your phone and work with no signal. Backups go to
                <strong> your </strong>Google Drive, into a private folder only this app
                can open. Screen-time data never leaves the device at all.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <ul className="checks">
              <li>Fully offline</li><li>Backups land in your own Drive</li>
              <li>Screen time stays on your phone</li><li>No ads, no trackers</li>
              <li>Delete your account from inside the app</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- end */}
      <section className="sec final">
        <div className="wrap">
          <Reveal>
            <h2 className="h2">Day one is always today</h2>
            <p className="sub">It takes about a minute to add your first habit.</p>
            <div className="cta cta--c"><PlayButton large /></div>
          </Reveal>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap foot__in">
          <div className="brand brand--sm"><img src="/stayhardy-icon.svg" alt="" width={22} height={22} /><span>StayHardy</span></div>
          <nav className="foot__links">
            <a href="/privacy-policy.html">Privacy</a>
            <a href="mailto:joeamuthan2@gmail.com">Contact</a>
            <a href={PLAY_URL} target="_blank" rel="noopener noreferrer">Google Play</a>
          </nav>
          <p className="foot__n">© {new Date().getFullYear()} StayHardy · Built in India</p>
        </div>
      </footer>
    </div>
  );
};

const CSS = `
.sh{--bg:#0A0C09;--sunk:#060704;--surf:#151812;--surf2:#1E221A;--hi:#262B21;
 --tx:#F2F5EC;--tx2:rgba(242,245,236,.72);--tx3:rgba(242,245,236,.5);
 --bd:rgba(242,245,236,.08);--bd2:rgba(242,245,236,.17);
 --ac:#C4F14B;--ac2:#8BE86B;--blue:#58B7FF;--warn:#FBBF24;
 background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden;
 font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
 -webkit-font-smoothing:antialiased;}
.sh *{box-sizing:border-box;}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 22px;}

/* reveal — hidden only once JS has armed it (see useReveal) */
.rv{transition:opacity .6s cubic-bezier(.2,.7,.3,1),transform .6s cubic-bezier(.2,.7,.3,1);}
.rv--armed{opacity:0;transform:translateY(20px);}
.rv--armed.is-in{opacity:1;transform:none;}

/* nav */
.sh-nav{position:sticky;top:0;z-index:30;background:rgba(10,12,9,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--bd);}
.sh-nav__in{display:flex;align-items:center;justify-content:space-between;height:62px;}
.brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:17px;letter-spacing:-.02em;}
.brand--sm{font-size:15px;}

.sh-play{display:inline-flex;align-items:center;gap:9px;text-decoration:none;background:var(--ac);color:#0A0C09;
 border-radius:999px;padding:9px 16px;font-weight:700;transition:transform .18s,box-shadow .18s;}
.sh-play:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(196,241,75,.3);}
.sh-play__t{display:flex;flex-direction:column;line-height:1.05;text-align:left;}
.sh-play__t small{font-size:9px;letter-spacing:.09em;opacity:.75;font-weight:700;}
.sh-play__t strong{font-size:13.5px;font-weight:800;}
.sh-play--lg{padding:14px 26px;}
.sh-play--lg .sh-play__t strong{font-size:17px;}

/* hero */
.hero{position:relative;padding:70px 0 80px;overflow:hidden;}
.hero__glow{position:absolute;top:-280px;left:50%;transform:translateX(-50%);width:940px;height:640px;border-radius:50%;
 pointer-events:none;background:radial-gradient(circle,rgba(196,241,75,.17),transparent 68%);}
.hero__in{position:relative;display:grid;grid-template-columns:1.07fr .93fr;gap:52px;align-items:center;}
.eyebrow{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.15em;color:var(--ac);margin-bottom:14px;}
.h1{font-size:clamp(34px,5.3vw,60px);line-height:1.05;letter-spacing:-.035em;font-weight:800;margin:0 0 18px;}
.accent{color:var(--ac);}
.lead{font-size:clamp(15.5px,1.7vw,18.5px);line-height:1.62;color:var(--tx2);margin:0 0 28px;max-width:34em;}
.cta{display:flex;gap:12px;flex-wrap:wrap;}
.cta--c{justify-content:center;}
.trust{list-style:none;display:flex;gap:20px;flex-wrap:wrap;padding:0;margin:24px 0 0;font-size:13px;color:var(--tx3);}
.trust li{position:relative;padding-left:15px;}
.trust li::before{content:'';position:absolute;left:0;top:7px;width:6px;height:6px;border-radius:50%;background:var(--ac);}

/* sections */
.sec{padding:80px 0;border-top:1px solid var(--bd);}
.sec--alt{background:var(--sunk);}
.h2{font-size:clamp(26px,3.5vw,40px);line-height:1.13;letter-spacing:-.03em;font-weight:800;margin:0 0 14px;}
.sub{font-size:16.5px;line-height:1.62;color:var(--tx2);margin:0 auto 40px;max-width:62ch;}
.sub--left{margin-left:0;}
.sub--tight{margin:28px auto 0;text-align:center;color:var(--tx);font-weight:600;}
.final{text-align:center;border-bottom:1px solid var(--bd);}
.final .sub{margin-bottom:28px;}

/* problems */
.probs{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:15px;}
.prob{background:var(--surf);border:1px solid var(--bd);border-radius:18px;padding:22px;height:100%;}
.prob__g{font-size:24px;display:block;margin-bottom:11px;}
.prob h3{margin:0 0 6px;font-size:15.5px;font-weight:700;}
.prob p{margin:0;font-size:14px;line-height:1.58;color:var(--tx3);}

/* build / break */
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px;}
.two__card{background:var(--surf);border:1px solid var(--bd);border-radius:22px;padding:28px;height:100%;}
.two__card--break{border-color:rgba(88,183,255,.28);background:linear-gradient(180deg,rgba(88,183,255,.06),var(--surf));}
.two__tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.12em;padding:5px 10px;border-radius:999px;margin-bottom:14px;}
.two__tag--build{background:rgba(196,241,75,.14);color:var(--ac);}
.two__tag--break{background:rgba(88,183,255,.15);color:var(--blue);}
.two__card h3{margin:0 0 14px;font-size:19px;font-weight:800;letter-spacing:-.02em;}
.two__card ul{list-style:none;padding:0;margin:0;}
.two__card li{padding:8px 0 8px 24px;position:relative;color:var(--tx2);font-size:14.5px;}
.two__card li::before{content:'';position:absolute;left:2px;top:15px;width:8px;height:8px;border-radius:3px;background:var(--ac);}
.two__card--break li::before{background:var(--blue);}
.two__note{margin:16px 0 0;font-size:13.5px;line-height:1.6;color:var(--tx3);border-top:1px solid var(--bd);padding-top:14px;}

/* 30 days */
.thirty{text-align:center;}
.days{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:6px 0 38px;}
.days__d{width:38px;height:38px;border-radius:10px;background:var(--surf);border:1px solid var(--bd);
 display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--tx3);
 animation:pop .5s cubic-bezier(.2,.9,.3,1) both;}
.days__d:nth-child(-n+22){background:rgba(196,241,75,.14);border-color:rgba(196,241,75,.34);color:var(--ac);}
@keyframes pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.stats{display:flex;gap:34px;justify-content:center;flex-wrap:wrap;}
.stat{text-align:center;}
.stat strong{display:block;font-size:clamp(28px,4vw,40px);font-weight:800;color:var(--ac);letter-spacing:-.03em;}
.stat span{font-size:13px;color:var(--tx3);}

/* illustrations */
.ills{display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:18px;}
.ill{background:var(--surf);border:1px solid var(--bd);border-radius:22px;padding:26px;height:100%;
 display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:250px;}
.ill__cap{font-size:12.5px;color:var(--tx3);text-align:center;}
.heat{display:grid;grid-template-columns:repeat(19,1fr);gap:4px;width:100%;max-width:250px;}
.heat__c{aspect-ratio:1;border-radius:3px;background:var(--hi);animation:fadeIn .5s both;}
.heat__c--1{background:rgba(196,241,75,.32);}
.heat__c--2{background:rgba(196,241,75,.6);}
.heat__c--3{background:var(--ac);}
@keyframes fadeIn{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
.hg-drop{animation:drop 1.5s linear infinite;}
@keyframes drop{0%{transform:translateY(-8px);opacity:0}25%{opacity:1}100%{transform:translateY(30px);opacity:0}}
.pod{display:flex;align-items:flex-end;gap:10px;height:132px;}
.pod__col{width:58px;border-radius:12px 12px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
 padding-top:10px;background:var(--surf2);border:1px solid var(--bd);position:relative;}
.pod__col--1{height:118px;background:linear-gradient(180deg,rgba(196,241,75,.3),rgba(196,241,75,.06));border-color:rgba(196,241,75,.45);}
.pod__col--2{height:88px;}
.pod__col--3{height:66px;}
.pod__n{font-weight:800;font-size:17px;color:var(--tx2);}
.pod__col--1 .pod__n{color:var(--ac);}
.pod__crown{position:absolute;top:-22px;font-size:16px;color:var(--ac);}

/* features */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(252px,1fr));gap:16px;}
.card{background:var(--surf);border:1px solid var(--bd);border-radius:20px;padding:24px;height:100%;
 transition:transform .2s,border-color .2s;}
.card:hover{transform:translateY(-4px);border-color:var(--bd2);}
.glyph{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:12px;
 background:rgba(196,241,75,.12);color:var(--ac);font-size:18px;margin-bottom:14px;}
.card h3{margin:0 0 7px;font-size:16.5px;font-weight:700;letter-spacing:-.01em;}
.card p{margin:0;font-size:14px;line-height:1.6;color:var(--tx2);}

/* pricing */
.tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch;}
.tier{background:var(--surf);border:1px solid var(--bd);border-radius:22px;padding:26px;height:100%;position:relative;}
.tier--hero{border-color:rgba(196,241,75,.45);background:linear-gradient(180deg,rgba(196,241,75,.08),var(--surf));}
.tier__badge{position:absolute;top:-10px;left:26px;font-size:9.5px;font-weight:800;letter-spacing:.1em;
 background:var(--ac);color:#0A0C09;padding:4px 10px;border-radius:999px;}
.tier h3{margin:0 0 4px;font-size:15px;font-weight:700;color:var(--tx3);letter-spacing:.04em;text-transform:uppercase;}
.tier__p{font-size:34px;font-weight:800;letter-spacing:-.03em;margin-bottom:16px;}
.tier__p small{font-size:14px;font-weight:600;color:var(--tx3);}
.tier ul{list-style:none;padding:0;margin:0;}
.tier li{padding:8px 0 8px 23px;position:relative;font-size:14px;color:var(--tx2);}
.tier li::before{content:'✓';position:absolute;left:0;color:var(--ac);font-weight:800;}

/* privacy */
.priv{display:grid;grid-template-columns:1.05fr .95fr;gap:46px;align-items:start;}
.priv strong{color:var(--tx);}
.checks{list-style:none;padding:0;margin:0;background:var(--surf);border:1px solid var(--bd);border-radius:20px;overflow:hidden;}
.checks li{padding:15px 18px 15px 46px;position:relative;border-bottom:1px solid var(--bd);font-size:14.5px;color:var(--tx2);}
.checks li:last-child{border-bottom:0;}
.checks li::before{content:'✓';position:absolute;left:18px;color:var(--ac);font-weight:800;}

/* footer */
.foot{padding:40px 0;background:var(--sunk);}
.foot__in{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;}
.foot__links{display:flex;gap:22px;flex-wrap:wrap;}
.foot__links a{color:var(--tx2);text-decoration:none;font-size:14px;}
.foot__links a:hover{color:var(--ac);}
.foot__n{margin:0;font-size:12.5px;color:var(--tx3);}

/* phone */
.ph{width:282px;margin:0 auto;background:#000;border:9px solid #1a1d17;border-radius:40px;
 box-shadow:0 34px 80px rgba(0,0,0,.62);position:relative;overflow:hidden;animation:float 6s ease-in-out infinite;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.ph__notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:100px;height:19px;background:#1a1d17;border-radius:0 0 13px 13px;z-index:2;}
.ph__screen{background:var(--bg);padding:32px 16px 10px;}
.ph__top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
.ph__hi{font-size:14px;font-weight:700;}
.ph__date{font-size:10.5px;color:var(--tx3);margin-top:2px;}
.ph__streak{background:rgba(196,241,75,.13);color:var(--ac);font-size:11.5px;font-weight:800;padding:5px 9px;border-radius:999px;}
.ph__ring{position:relative;display:flex;justify-content:center;margin:4px 0 16px;}
.ph__arc{animation:arc 1.6s cubic-bezier(.2,.8,.3,1) both;}
@keyframes arc{from{stroke-dashoffset:327}to{stroke-dashoffset:65}}
.ph__rt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ph__rt strong{font-size:24px;font-weight:800;letter-spacing:-.02em;}
.ph__rt span{font-size:9.5px;color:var(--tx3);}
.ph__row{display:flex;align-items:center;gap:10px;background:var(--surf);border-radius:12px;padding:10px 12px;margin-bottom:6px;
 animation:slide .5s cubic-bezier(.2,.9,.3,1) both;}
@keyframes slide{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.ph__box{width:18px;height:18px;border-radius:6px;border:1.6px solid var(--bd2);flex:none;display:flex;align-items:center;
 justify-content:center;font-size:10.5px;color:#0A0C09;font-weight:800;}
.ph__row.is-done .ph__box{background:var(--ac);border-color:var(--ac);}
.ph__label{font-size:12.5px;color:var(--tx2);}
.ph__row.is-done .ph__label{color:var(--tx);}
.ph__tabs{display:flex;justify-content:space-between;padding:11px 10px 5px;margin-top:8px;border-top:1px solid var(--bd);}
.ph__tabs span{font-size:9.5px;color:var(--tx3);}
.ph__tabs .is-on{color:var(--ac);font-weight:700;}

/* ---- responsive ---- */
@media (max-width:960px){
 /* Copy first, phone second. Leading with the mockup pushed the headline off
    the first screen on a phone — the visitor scrolled past a picture of an app
    before being told what it does. */
 .hero__in{grid-template-columns:1fr;gap:36px;}
 .hero__copy{text-align:center;}
 .lead{margin-left:auto;margin-right:auto;}
 .cta{justify-content:center;}
 .trust{justify-content:center;}
 .two,.priv{grid-template-columns:1fr;}
 .tiers{grid-template-columns:1fr;}
 .priv{gap:28px;}
}
@media (max-width:640px){
 .wrap{padding:0 18px;}
 .hero{padding:44px 0 54px;}
 .sec{padding:56px 0;}
 .br-d{display:none;}
 .h1{font-size:clamp(30px,8.6vw,40px);}
 .lead{font-size:15.5px;}
 .sub{font-size:15px;margin-bottom:30px;}
 .days__d{width:31px;height:31px;font-size:11px;border-radius:8px;}
 .stats{gap:22px;}
 .ph{width:230px;}
 .sh-nav .sh-play__t small{display:none;}
 .sh-nav .sh-play{padding:8px 13px;}
 .foot__in{flex-direction:column;align-items:flex-start;gap:14px;}
 .ill{min-height:210px;padding:20px;}
}
@media (prefers-reduced-motion:reduce){
 .rv,.rv--armed{opacity:1;transform:none;transition:none;}
 .ph,.hg-drop,.ph__arc,.days__d,.heat__c{animation:none;}
 .ph__arc{stroke-dashoffset:65;}
}
`;

export default Landing;

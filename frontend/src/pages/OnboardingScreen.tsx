import { useState, useRef } from 'react';

const Screen1 = () => (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
    <div style={{ paddingTop: '80px', marginBottom: '40px' }}>
      <p style={{ fontSize: '11px', fontWeight: '800', color: '#00E87A', letterSpacing: '0.2em', margin: '0 0 16px 0', textTransform: 'uppercase' }}>STAY HARDY</p>
      <h1 style={{ fontSize: '38px', fontWeight: '900', color: '#FFFFFF', margin: '0 0 12px 0', lineHeight: 1.1, letterSpacing: '-1.5px' }}>ESCAPE<br/>THE LATER<br/>TRAP.</h1>
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>Turn 'I'll do it tomorrow' into 'Done today.' Simple task management designed for the ambitious but lazy.</p>
    </div>
    <div style={{ flex: 1, position: 'relative', margin: '0 -8px' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '48%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '16px', padding: '14px', opacity: 0.85 }}>
        <p style={{ fontSize: '9px', fontWeight: '800', color: '#EF4444', letterSpacing: '0.15em', margin: '0 0 12px 0' }}>OVERDUE</p>
        {['Gym... Maybe', 'Start Project', 'Pay Bill', 'Read Book', 'Call Mom'].map((task, i) => (
          <div key={i} style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', border: '1.5px solid rgba(239,68,68,0.4)', flexShrink: 0 }}/>
            <span style={{ fontSize: '11px', color: 'rgba(239,68,68,0.7)', textDecoration: 'line-through', fontWeight: '500' }}>{task}</span>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', right: 0, top: '20px', width: '52%', background: 'rgba(0, 232, 122,0.06)', border: '1px solid rgba(0, 232, 122,0.2)', borderRadius: '16px', padding: '14px' }}>
        <p style={{ fontSize: '9px', fontWeight: '800', color: '#00E87A', letterSpacing: '0.15em', margin: '0 0 4px 0' }}>TODAY</p>
        <p style={{ fontSize: '18px', fontWeight: '900', color: '#00E87A', margin: '0 0 12px 0', letterSpacing: '-0.5px' }}>2 TASKS</p>
        {[{ t: 'Morning workout', done: true }, { t: 'Review proposal', done: true }, { t: 'Team standup', done: false }].map((task, i) => (
          <div key={i} style={{ padding: '8px 10px', background: task.done ? 'rgba(0, 232, 122,0.08)' : 'rgba(255,255,255,0.04)', borderRadius: '8px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: task.done ? '#00E87A' : 'transparent', border: task.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {task.done && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
            </div>
            <span style={{ fontSize: '10px', color: task.done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)', fontWeight: '600', textDecoration: task.done ? 'line-through' : 'none' }}>{task.t}</span>
          </div>
        ))}
        <div style={{ position: 'absolute', top: '-16px', right: '-8px', width: '36px', height: '36px', borderRadius: '50%', background: '#00E87A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0, 232, 122,0.4)', animation: 'pulse 2s ease-in-out infinite' }}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M3 9l4 4 8-8" stroke="#000" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
    </div>
    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: '20px 0 180px 0' }}>Priority task creation made effortless.</p>
  </div>
);

const Screen2 = () => {
  const generateHeatmapData = () => {
    const cells = [];
    for (let i = 0; i < 365; i++) {
      const rand = Math.random();
      if (rand > 0.15) {
        const intensity = Math.random();
        if (intensity > 0.7) cells.push(4);
        else if (intensity > 0.4) cells.push(3);
        else if (intensity > 0.2) cells.push(2);
        else cells.push(1);
      } else {
        cells.push(0);
      }
    }
    return cells;
  };

  const heatData = generateHeatmapData();

  const getCellColor = (val: number) => {
    switch (val) {
      case 4: return '#00E87A';
      case 3: return 'rgba(0, 232, 122,0.7)';
      case 2: return 'rgba(0, 232, 122,0.4)';
      case 1: return 'rgba(0, 232, 122,0.2)';
      default: return 'rgba(255,255,255,0.04)';
    }
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '0 24px', background: '#000000' }}>
      <div style={{ paddingTop: '80px', marginBottom: '32px' }}>
        <p style={{ fontSize: '11px', fontWeight: '800', color: '#00E87A', letterSpacing: '0.2em', margin: '0 0 16px 0', textTransform: 'uppercase' }}>STAY HARDY</p>
        <style>{`
          @keyframes neonPulse {
            0%,100% { text-shadow: 0 0 10px rgba(0, 232, 122,0.4), 0 0 20px rgba(0, 232, 122,0.2); }
            50% { text-shadow: 0 0 20px rgba(0, 232, 122,0.8), 0 0 40px rgba(0, 232, 122,0.4), 0 0 60px rgba(0, 232, 122,0.2); }
          }
        `}</style>
        <h1 style={{ fontSize: '34px', fontWeight: '900', color: '#FFFFFF', margin: '0 0 12px 0', lineHeight: 1.1, letterSpacing: '-1.5px', animation: 'neonPulse 3s ease-in-out infinite' }}>CONSISTENCY<br/>THAT<br/>COMPOUNDS.</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6 }}>Track your habits for a day or a year. Build unbreakable routines with real-time streak tracking.</p>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ background: '#1C1F26', borderRadius: '14px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#00E87A', letterSpacing: '0.1em', margin: '0 0 2px 0' }}>365 DAYS</p>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', margin: 0 }}>LONGEST STREAK</p>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#00E87A', letterSpacing: '-1px' }}>365 🔥</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', padding: '0 2px' }}>
          {['JAN','APR','JUL','OCT'].map(m => (
            <span key={m} style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>{m}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(26, 1fr)', gap: '2px', width: '100%' }}>
          {heatData.map((val, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: '2px', background: getCellColor(val), minWidth: 0 }}/>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '6px' }}>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Less</span>
          {[0,1,2,3,4].map(v => (
            <div key={v} style={{ width: '10px', height: '10px', borderRadius: '2px', background: getCellColor(v) }}/>
          ))}
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>More</span>
        </div>
        <div style={{ marginTop: '14px', background: '#1C1F26', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>ROUTINE CONSISTENCY</span>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#00E87A' }}>95%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '95%', background: 'linear-gradient(90deg, #00E87A, #00E87A)', borderRadius: '6px', boxShadow: '0 0 8px rgba(0, 232, 122,0.4)' }}/>
          </div>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '12px 0 180px 0', fontStyle: 'italic' }}>Data-driven discipline, visualized.</p>
    </div>
  );
};

const Screen3 = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#000000' }}>
      <style>{`
        @keyframes ringGlow {
          0%,100% { filter: drop-shadow(0 0 12px rgba(0, 232, 122,0.5)); }
          50% { filter: drop-shadow(0 0 24px rgba(0, 232, 122,0.9)) drop-shadow(0 0 48px rgba(0, 232, 122,0.3)); }
        }
        @keyframes bloomPulse {
          0%,100% { box-shadow: 0 0 30px rgba(0, 232, 122,0.2), 0 0 60px rgba(0, 232, 122,0.1); }
          50% { box-shadow: 0 0 50px rgba(0, 232, 122,0.4), 0 0 100px rgba(0, 232, 122,0.2); }
        }
      `}</style>

      {/* SCROLLABLE CONTENT — top */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px', paddingBottom: '20px' }}>
        <div style={{ paddingTop: '72px', marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: '800', color: '#00E87A', letterSpacing: '0.2em', margin: '0 0 12px 0', textTransform: 'uppercase' }}>STAY HARDY</p>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#FFFFFF', margin: '0 0 10px 0', lineHeight: 1.1, letterSpacing: '-1.5px' }}>YOUR GRIND,<br/>VISUALIZED.</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>Deep insights into your performance. Track goals, master tasks, and see your productivity score climb. No ads. No subscriptions.</p>
        </div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ position: 'relative', width: '160px', height: '160px', marginBottom: '16px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', animation: 'bloomPulse 3s ease-in-out infinite' }}/>
            <svg width="160" height="160" viewBox="0 0 160 160" style={{ animation: 'ringGlow 3s ease-in-out infinite' }}>
              <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(0, 232, 122,0.1)" strokeWidth="8"/>
              <circle cx="80" cy="80" r="68" fill="none" stroke="#00E87A" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 68}`} strokeDashoffset={`${2 * Math.PI * 68 * (1 - 0.85)}`} transform="rotate(-90 80 80)" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 232, 122,0.8))' }}/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: '#00E87A', lineHeight: 1, letterSpacing: '-1px', textShadow: '0 0 20px rgba(0, 232, 122,0.6)' }}>85%</span>
              <span style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>STAY HARDY</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <div style={{ flex: 1, background: '#1C1F26', borderRadius: '16px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px', filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }}>🔥</span>
              <div>
                <p style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', margin: '0 0 3px 0' }}>GOAL</p>
                <p style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>12 DAYS<br/>LEFT</p>
              </div>
            </div>
            <div style={{ flex: 1, background: '#1C1F26', borderRadius: '16px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 232, 122,0.1)', border: '1px solid rgba(0, 232, 122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#00E87A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', margin: '0 0 3px 0' }}>TASKS</p>
                <p style={{ fontSize: '13px', fontWeight: '800', color: '#00E87A', margin: 0, lineHeight: 1.2 }}>12/15<br/>DONE</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          margin: '0 0 16px 0',
          background: 'rgba(0,232,122,0.05)',
          border: '1.5px solid rgba(0,232,122,0.2)',
          borderRadius: '20px',
          padding: '20px',
          textAlign: 'center' as const
        }}>
          {/* New tagline badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(0,232,122,0.12)',
            border: '1px solid rgba(0,232,122,0.25)',
            borderRadius: '20px',
            padding: '5px 14px',
            marginBottom: '12px'
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '900',
              color: '#00E87A',
              letterSpacing: '0.08em'
            }}>
              ⚡ BECOME A PRODUCTIVITY MONSTER
            </span>
          </div>

          <p style={{
            fontSize: '26px',
            fontWeight: '900',
            color: '#FFFFFF',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
            lineHeight: 1.2
          }}>
            Start for Free.
          </p>

          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
            lineHeight: 1.6
          }}>
            Upgrade anytime, when you're ready.
          </p>
        </div>
      </div>

      {/* BUTTON — fixed at bottom */}
      <div style={{ padding: '0 24px 48px 24px', background: '#000000' }}>
        <button onClick={onComplete} style={{ width: '100%', height: '56px', background: '#00E87A', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '900', color: '#000000', cursor: 'pointer', letterSpacing: '0.04em', marginBottom: '14px', boxShadow: '0 0 30px rgba(0, 232, 122,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Let Me Try It →</button>
        <p onClick={onComplete} style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0, cursor: 'pointer' }}>Already a member? <span style={{ color: '#00E87A', fontWeight: '600' }}>Sign In</span></p>
      </div>
    </div>
  );
};

const OnboardingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);


  const goToScreen = (index: number) => {
    if (isAnimating) return;
    if (index < 0 || index > 2) return;
    setIsAnimating(true);
    setCurrent(index);
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  const handleNext = () => {
    if (current < 2) {
      goToScreen(current + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: any) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handleNext();
      } else {
        if (current > 0) {
          goToScreen(current - 1);
        }
      }
    }
  };

  const getButtonText = () => {
    switch (current) {
      case 0: return 'NEXT';
      case 1: return 'SEE MY STATS';
      case 2: return 'GET STARTED';
      default: return 'NEXT';
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#000000', zIndex: 999, overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Screen 1 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        transform: `translateX(${(0 - current) * 100}%)`,
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        width: '100%',
        height: '100%'
      }}>
        <Screen1 />
      </div>

      {/* Screen 2 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        transform: `translateX(${(1 - current) * 100}%)`,
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        width: '100%',
        height: '100%'
      }}>
        <Screen2 />
      </div>

      {/* Screen 3 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        transform: `translateX(${(2 - current) * 100}%)`,
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        width: '100%',
        height: '100%'
      }}>
        <Screen3 onComplete={onComplete} />
      </div>

      <div onClick={handleSkip} style={{ position: 'absolute', top: '52px', right: '24px', zIndex: 10, fontSize: '13px', fontWeight: '700', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '8px 4px', letterSpacing: '0.06em' }}>
        SKIP
      </div>

      <div style={{ position: 'absolute', bottom: '130px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            onClick={() => goToScreen(i)}
            style={{
              width: i === current ? '28px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === current ? '#00E87A' : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              boxShadow: i === current ? '0 0 8px rgba(0, 232, 122,0.5)' : 'none'
            }}
          />
        ))}
      </div>

      {current < 2 && (
        <div onClick={handleNext} style={{ position: 'absolute', bottom: '48px', left: '24px', right: '24px', height: '56px', background: '#00E87A', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 0 24px rgba(0, 232, 122,0.35)', border: '1px solid rgba(0, 232, 122,0.5)', transition: 'all 0.2s ease', userSelect: 'none', WebkitUserSelect: 'none' }}>
          <span style={{ fontSize: '16px', fontWeight: '900', color: '#000000', letterSpacing: '0.06em' }}>
            {getButtonText()}
          </span>
        </div>
      )}
    </div>
  );
};

export default OnboardingScreen;

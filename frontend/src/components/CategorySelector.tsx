import React, { useState } from 'react';
import { CATEGORIES } from '../constants/categories';

function getCategorySVGIcon(name: string, color: string): React.ReactNode {
  switch (name) {
    case 'General':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="12,5 13.8,11 12,12 10.2,11" fill={color} stroke="none"/>
          <polygon points="12,19 10.2,13 12,12 13.8,13" fill={color} fillOpacity={0.35} stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill={color} fillOpacity={0.6} stroke="none"/>
        </svg>
      );
    case 'Comeback':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,17 8,12 12,15 21,6"/>
          <polyline points="16,6 21,6 21,11"/>
          <circle cx="3" cy="17" r="1.8" fill={color} fillOpacity={0.4} stroke="none"/>
        </svg>
      );
    case 'Growth':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V14"/>
          <path d="M12 14c0 0-5-1.5-5-7 0 0 2-3 5-1.5C15 4 17 7 17 7c0 5.5-5 7-5 7z" fill={color} fillOpacity={0.2}/>
          <path d="M12 18c0 0-3-1-4-3" strokeOpacity={0.5}/>
        </svg>
      );
    case 'Health':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={color} fillOpacity={0.2}/>
          <path d="M8 12h2l1-2 2 4 1-2h2" strokeWidth={1.2}/>
        </svg>
      );
    case 'Hobby':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={color} fillOpacity={0.75} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case 'Home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={color} fillOpacity={0.2}/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      );
    case 'Learning':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill={color} fillOpacity={0.2}/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill={color} fillOpacity={0.2}/>
        </svg>
      );
    case 'Mindset':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14z" fill={color} fillOpacity={0.2}/>
          <line x1="9" y1="18" x2="15" y2="18"/>
          <line x1="10" y1="22" x2="14" y2="22"/>
          <circle cx="12" cy="14" r="0.5" fill={color} stroke="none"/>
        </svg>
      );
    case 'Social':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={color} fillOpacity={0.2}/>
          <line x1="8" y1="10" x2="16" y2="10" strokeOpacity={0.5}/>
          <line x1="8" y1="14" x2="13" y2="14" strokeOpacity={0.5}/>
        </svg>
      );
    case 'Work':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" fill={color} fillOpacity={0.15}/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          <line x1="2" y1="12" x2="22" y2="12" strokeOpacity={0.35}/>
        </svg>
      );
    case 'Content':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill={color} fillOpacity={0.2}/>
        </svg>
      );
    case 'Finance':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" fill={color} fillOpacity={0.15}/>
          <path d="M12 6v1.5"/>
          <path d="M12 16.5V18"/>
          <path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3s2.5 1.5 2.5 3a2.5 2.5 0 0 1-5 0"/>
        </svg>
      );
    case 'Fitness':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="9" width="4" height="6" rx="1" fill={color} fillOpacity={0.3}/>
          <rect x="18" y="9" width="4" height="6" rx="1" fill={color} fillOpacity={0.3}/>
          <rect x="5.5" y="10.5" width="3" height="3" rx="0.5" fill={color} fillOpacity={0.5} stroke="none"/>
          <rect x="15.5" y="10.5" width="3" height="3" rx="0.5" fill={color} fillOpacity={0.5} stroke="none"/>
          <line x1="8.5" y1="12" x2="15.5" y2="12" strokeWidth={2.5}/>
        </svg>
      );
    case 'Creative':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2v-.5c0-.55.45-1 1-1H17c2.76 0 5-2.24 5-5C22 6.48 17.52 2 12 2z" fill={color} fillOpacity={0.15}/>
          <circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/>
          <circle cx="14.5" cy="8.5" r="1.5" fill={color} stroke="none"/>
          <circle cx="8" cy="14" r="1.5" fill={color} stroke="none"/>
          <circle cx="15.5" cy="13.5" r="1.5" fill={color} fillOpacity={0.55} stroke="none"/>
        </svg>
      );
    case 'Travel':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13"/>
          <path d="M22 2L15 22 11 13 2 9l20-7z" fill={color} fillOpacity={0.2}/>
        </svg>
      );
    case 'Custom':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4" fill={color} fillOpacity={0.25}/>
        </svg>
      );
    default:
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3" fill={color} fillOpacity={0.4} stroke="none"/>
        </svg>
      );
  }
}

const CategorySelector = ({
  selected,
  onSelect
}: {
  selected: string
  onSelect: (name: string) => void
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');

  return (
    <div>
      <label style={{
        fontSize: '10px',
        fontWeight: '800',
        color: '#666666',
        letterSpacing: '0.12em',
        display: 'block',
        marginBottom: '10px'
      }}>
        CATEGORY
      </label>

      {/* Horizontal swipe row */}
      <div 
        className="cat-scroll"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          cursor: 'grab'
        }}
      >
        <style>{`
          .cat-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {CATEGORIES.map((cat, i) => {
          const isActive = cat.name === 'Custom'
            ? showCustomInput
            : selected === cat.name;

          // Parse hex to rgb for glassmorphism effects:
          const hex = cat.color.replace('#','');
          const r = parseInt(hex.substring(0,2), 16);
          const g = parseInt(hex.substring(2,4), 16);
          const b = parseInt(hex.substring(4,6), 16);

          return (
            <div
              key={i}
              onClick={() => {
                if (cat.name === 'Custom') {
                  setShowCustomInput(true);
                  onSelect('Custom');
                } else {
                  setShowCustomInput(false);
                  setCustomText('');
                  onSelect(cat.name);
                }
              }}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '16px',
                background: isActive
                  ? `rgba(${r},${g},${b},0.12)`
                  : 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(10px)',
                border: '1px solid ' +
                  (isActive
                    ? cat.color
                    : 'rgba(255,255,255,0.08)'),
                boxShadow: isActive
                  ? `0 0 12px rgba(${r},${g},${b},0.3), inset 0 0 12px rgba(${r},${g},${b},0.05)`
                  : 'none',
                transition: 'all 0.2s ease',
                minWidth: '64px'
              }}
            >
              {/* Icon */}
              <div style={{
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: isActive
                  ? `drop-shadow(0 0 6px ${cat.color}80)`
                  : 'none'
              }}>
                {getCategorySVGIcon(cat.name, isActive ? cat.color : 'rgba(255,255,255,0.5)')}
              </div>

              {/* Name */}
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                color: isActive
                  ? cat.color
                  : 'rgba(255,255,255,0.45)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em'
              }}>
                {cat.name}
              </span>

              {/* Active dot */}
              {isActive && (
                <div style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  background: cat.color,
                  boxShadow: `0 0 6px ${cat.color}`
                }}/>
              )}
            </div>
          );
        })}
      </div>

      {showCustomInput && (
        <div style={{ marginTop: '12px' }}>
          <input
            type="text"
            placeholder="Type your category name..."
            value={customText}
            autoFocus
            onChange={(e) => {
              setCustomText(e.target.value);
              if (e.target.value.trim()) {
                onSelect(e.target.value.trim());
              } else {
                onSelect('Custom');
              }
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(145deg, #080808, #0f0f0f)',
              border: '1px solid rgba(0,232,122,0.4)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#FFFFFF',
              outline: 'none',
              caretColor: '#00E87A',
              boxSizing: 'border-box',
              boxShadow: 'inset 3px 3px 8px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}

      {/* Swipe hint */}
      <p style={{
        fontSize: '9px',
        color: 'rgba(255,255,255,0.15)',
        margin: '4px 0 0 0',
        textAlign: 'right',
        fontStyle: 'italic'
      }}>
        ← swipe to explore →
      </p>
    </div>
  );
}

export default CategorySelector;

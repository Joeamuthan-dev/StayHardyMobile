import { CATEGORIES } from '../constants/categories';

const CategorySelector = ({
  selected,
  onSelect
}: {
  selected: string
  onSelect: (name: string) => void
}) => {

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
          const isActive = selected === cat.name;

          // Parse hex to rgb for glassmorphism effects:
          const hex = cat.color.replace('#','');
          const r = parseInt(hex.substring(0,2), 16);
          const g = parseInt(hex.substring(2,4), 16);
          const b = parseInt(hex.substring(4,6), 16);

          return (
            <div
              key={i}
              onClick={() => onSelect(cat.name)}
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
              <span style={{
                fontSize: '22px',
                lineHeight: 1,
                filter: isActive
                  ? `drop-shadow(0 0 6px ${cat.color}80)`
                  : 'none'
              }}>
                {cat.icon}
              </span>

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

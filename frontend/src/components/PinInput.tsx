import React, { useRef, useEffect } from 'react';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

const PinInput: React.FC<PinInputProps> = ({ 
  value, 
  onChange, 
  onComplete, 
  error, 
  disabled 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val.length <= 4) {
      onChange(val);
      if (val.length === 4 && onComplete) {
        onComplete(val);
      }
    }
  };

  const focusInput = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  // Auto-focus on mount if not disabled
  useEffect(() => {
    focusInput();
  }, []);

  return (
    <div 
      className="relative flex gap-6 justify-center items-center py-4 cursor-pointer"
      onClick={focusInput}
    >
      {/* 
        Hidden Native Input:
        Stretches to cover the container to capture touches everywhere.
        inputMode="numeric" forces the large number pad on mobile.
      */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={handleInput}
        autoComplete="one-time-code"
        disabled={disabled}
        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
        aria-label="Enter 4-digit PIN"
      />

      {/* Visual Circles (Dark Neumorphism) */}
      {[0, 1, 2, 3].map((index) => {
        const isFilled = value.length > index;
        const isActive = value.length === index;

        return (
          <div
            key={index}
            className={`
              w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200
              bg-[#121212] border border-white/10 
              shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]
              ${isActive ? 'border-[#00E676]/50 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9),_0_0_15px_rgba(0,230,118,0.15)] scale-105' : ''}
              ${error ? 'border-red-500/50 shadow-[inset_0_4px_10px_rgba(0,0,0,0.9),_0_0_15px_rgba(239,68,68,0.15)]' : ''}
            `}
          >
            {isFilled && (
              <div 
                className="w-4 h-4 rounded-full bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.8)] animate-in zoom-in duration-200" 
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PinInput;

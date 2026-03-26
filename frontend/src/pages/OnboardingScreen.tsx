// src/pages/OnboardingScreen.tsx
import { useState, useRef } from 'react';
import OnboardingScreen1 from './Onboarding/OnboardingScreen1';
import OnboardingScreen2 from './Onboarding/OnboardingScreen2';
import OnboardingScreen3 from './Onboarding/OnboardingScreen3';

interface OnboardingScreenProps {
  onComplete: () => void;
}

/**
 * OnboardingScreen: Master Router/Switcher for the Onboarding Experience.
 * Manages the swipe/click transitions between the surgical protocol screens.
 */
const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
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
    }, 400); // Animation duration sync
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        handleNext(); // Swipe Left (Next)
      } else {
        if (current > 0) {
          goToScreen(current - 1); // Swipe Right (Prev)
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[#000000] z-[999] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Screen 1 Container */}
      <div 
        className="absolute inset-0 w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.25, 0.46, 0.45, 0.94)]"
        style={{ transform: `translateX(${(0 - current) * 100}%)` }}
      >
        <OnboardingScreen1 onNext={handleNext} onSkip={handleSkip} />
      </div>

      {/* Screen 2 Container */}
      <div 
        className="absolute inset-0 w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.25, 0.46, 0.45, 0.94)]"
        style={{ transform: `translateX(${(1 - current) * 100}%)` }}
      >
        <OnboardingScreen2 onNext={handleNext} onSkip={handleSkip} />
      </div>

      {/* Screen 3 Container */}
      <div 
        className="absolute inset-0 w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.25, 0.46, 0.45, 0.94)]"
        style={{ transform: `translateX(${(2 - current) * 100}%)` }}
      >
        <OnboardingScreen3 onNext={handleNext} />
      </div>
    </div>
  );
};

export default OnboardingScreen;

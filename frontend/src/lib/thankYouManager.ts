type ThankYouState = {
  show: boolean;
  amount: number;
};

type ThankYouListener = () => void;

const TIP_THANK_YOU_KEY = 'tip_thankyou';
const MAX_RESTORE_AGE_MS = 5 * 60 * 1000;

let showThankYou = false;
let thankYouAmount = 0;
let listeners: ThankYouListener[] = [];

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('ThankYouManager listener error:', error);
    }
  });
}

export const ThankYouManager = {
  show(amount: number) {
    const normalizedAmount = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 0;
    console.log('ThankYouManager.show called:', normalizedAmount);
    showThankYou = normalizedAmount > 0;
    thankYouAmount = normalizedAmount;
    notifyListeners();
    try {
      localStorage.setItem(
        TIP_THANK_YOU_KEY,
        JSON.stringify({
          amount: normalizedAmount,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('ThankYouManager storage write error:', error);
    }
  },

  hide() {
    showThankYou = false;
    thankYouAmount = 0;
    try {
      localStorage.removeItem(TIP_THANK_YOU_KEY);
    } catch (error) {
      console.error('ThankYouManager storage remove error:', error);
    }
    notifyListeners();
  },

  getState(): ThankYouState {
    return {
      show: showThankYou,
      amount: thankYouAmount,
    };
  },

  subscribe(listener: ThankYouListener) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((current) => current !== listener);
    };
  },

  restoreFromStorage() {
    try {
      const stored = localStorage.getItem(TIP_THANK_YOU_KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored) as { amount?: unknown; timestamp?: unknown };
      const amount = Number(parsed?.amount);
      const timestamp = Number(parsed?.timestamp);
      const age = Date.now() - timestamp;
      if (Number.isFinite(amount) && amount > 0 && Number.isFinite(age) && age < MAX_RESTORE_AGE_MS) {
        console.log('Restoring thank you:', { amount, timestamp });
        showThankYou = true;
        thankYouAmount = Math.floor(amount);
        notifyListeners();
        return true;
      }
      localStorage.removeItem(TIP_THANK_YOU_KEY);
    } catch (error) {
      console.error('Restore error:', error);
    }
    return false;
  },
};


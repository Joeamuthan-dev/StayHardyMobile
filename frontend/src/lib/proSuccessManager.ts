type ProSuccessListener = () => void;

const PRO_SUCCESS_KEY = 'pro_success_pending';

let show = false;
let listeners: ProSuccessListener[] = [];

function notify() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('ProSuccessManager listener error:', e);
    }
  });
}

export const ProSuccessManager = {
  show() {
    console.log('ProSuccessManager.show()');
    show = true;
    try {
      localStorage.setItem(PRO_SUCCESS_KEY, 'true');
    } catch {
      // ignore storage failures
    }
    notify();
  },
  hide() {
    show = false;
    try {
      localStorage.removeItem(PRO_SUCCESS_KEY);
    } catch {
      // ignore storage failures
    }
    notify();
  },
  isShowing() {
    return show;
  },
  subscribe(fn: ProSuccessListener) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((listener) => listener !== fn);
    };
  },
  restoreFromStorage() {
    try {
      if (localStorage.getItem(PRO_SUCCESS_KEY) === 'true') {
        console.log('Restoring pro success screen');
        show = true;
        notify();
        return true;
      }
    } catch {
      // ignore storage failures
    }
    return false;
  },
};


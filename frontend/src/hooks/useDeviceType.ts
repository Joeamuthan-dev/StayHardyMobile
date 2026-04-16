import { useState, useEffect } from 'react';

export type DeviceType = 'phone' | 'tablet7' | 'tablet10';

function compute(): DeviceType {
  const w = window.innerWidth;
  if (w >= 900) return 'tablet10';
  if (w >= 600) return 'tablet7';
  return 'phone';
}

export function useDeviceType(): DeviceType {
  const [type, setType] = useState<DeviceType>(compute);
  useEffect(() => {
    const handle = () => setType(compute());
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return type;
}

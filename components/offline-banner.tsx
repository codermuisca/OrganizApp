'use client';

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateStatus();

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-[9999] bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
      Sin conexión a internet. Algunas funciones no están disponibles.
    </div>
  );
}
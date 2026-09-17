'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        console.log(
          'Service Worker registrado:',
          registration.scope
        );
      } catch (error) {
        console.error(
          'Error registrando Service Worker:',
          error
        );
      }
    };

    registerServiceWorker();
  }, []);

  return null;
}
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { sdk } from './client'; // Corrected import

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * A client-side component that initializes Firebase and wraps its children
 * with the FirebaseProvider. This ensures that Firebase is initialized only once
 * in the browser and the services are available to all child components.
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Directly use the imported sdk object. It is already a stable singleton.
  const firebaseServices = sdk;

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}

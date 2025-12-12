'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Functions } from 'firebase/functions';
import { sdk } from './client'; // Import the initialized SDKs

// Interface for just the user's authentication state
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context for authentication state
export const AuthContext = createContext<UserAuthState | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

/**
 * FirebaseProvider now *only* manages and provides user authentication state.
 * The core Firebase services (firestore, auth, functions) are imported directly
 * from a client-side module, guaranteeing they are initialized.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start in loading state
    userError: null,
  });

  useEffect(() => {
    // The 'auth' service is now imported directly from the already-initialized SDKs
    const unsubscribe = onAuthStateChanged(
      sdk.auth,
      (user) => {
        setUserAuthState({ user, isUserLoading: false, userError: null });
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe();
  }, []); // No dependencies needed as 'sdk' is a stable module import

  const contextValue = useMemo((): UserAuthState => ({
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
    }), [userAuthState]);

  return (
    <AuthContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </AuthContext.Provider>
  );
};


/** Hook to access Firebase Auth instance. Now imports directly from the client SDK module. */
export const useAuth = (): Auth => {
  return sdk.auth;
};

/** Hook to access Firestore instance. Now imports directly from the client SDK module. */
export const useFirestore = (): Firestore => {
  return sdk.firestore;
};

/** Hook to access Firebase App instance. Now imports directly from the client SDK module. */
export const useFirebaseApp = (): FirebaseApp => {
  return sdk.firebaseApp;
};

/** Hook to access Firebase Functions instance. Now imports directly from the client SDK module. */
export const useFunctions = (): Functions => {
    return sdk.functions;
}

/**
 * Hook specifically for accessing the authenticated user's state from the AuthContext.
 * @returns {UserAuthState} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserAuthState => {
  const context = useContext(AuthContext);
  if (context === undefined) {
      // This can happen during initial server render, so we provide a default "loading" state.
      return { user: null, isUserLoading: true, userError: null };
  }
  return context;
};

// ... the rest of your provider
import { DependencyList } from 'react';

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = React.useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

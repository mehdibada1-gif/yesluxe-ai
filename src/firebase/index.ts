'use client';

// This file is the single source of truth for Firebase client-side services.
// It ensures that Firebase is initialized only once and provides stable SDK instances.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { firebaseConfig } from './config';

// --- Types ---
interface FirebaseClientServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
}

// --- Singleton Initialization ---
let sdk: FirebaseClientServices | null = null;

function initializeFirebase(): FirebaseClientServices {
  if (typeof window === 'undefined') {
    // This function should not be called on the server.
    // Throw an error to make this explicit.
    throw new Error("Firebase client SDK initialization cannot occur on the server.");
  }

  // Check if Firebase has already been initialized.
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app, 'us-central1');
    
    sdk = { firebaseApp: app, auth, firestore, functions };
    return sdk;
  } else {
    // If already initialized, use the existing app instance.
    const app = getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app, 'us-central1');

    sdk = { firebaseApp: app, auth, firestore, functions };
    return sdk;
  }
}

/**
 * Returns the initialized client-side Firebase SDK services.
 * This function ensures that initialization happens only once.
 */
export function getFirebaseClient(): FirebaseClientServices {
    if (!sdk) {
        sdk = initializeFirebase();
    }
    return sdk;
}

// --- Exports from other modules ---
// Re-exporting these makes imports cleaner across the app.
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

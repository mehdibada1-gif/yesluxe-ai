// This file is for initializing Firebase services on the server.
// It's a singleton pattern to avoid re-initialization.

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

let firebase: FirebaseServices | null = null;

// This function initializes and returns the Firebase services.
// It's designed to be called from server-side code (e.g., RSC, Server Actions).
export function getFirebase(): FirebaseServices {
  if (firebase) {
    return firebase;
  }

  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }
  
  const app = getApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  firebase = { app, auth, firestore };

  return firebase;
}

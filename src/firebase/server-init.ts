
// This file is for initializing the Firebase CLIENT SDK on the server.
// It's a singleton pattern to avoid re-initialization.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// This type is now simplified to only include Firestore from the CLIENT SDK
type FirebaseServerServices = {
  app: FirebaseApp;
  firestore: Firestore;
};

let firebaseServerPromise: Promise<FirebaseServerServices> | null = null;

async function initializeServerServices(): Promise<FirebaseServerServices> {
  // Use the standard client `initializeApp`
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const firestore = getFirestore(app);

  return { app, firestore };
}

/**
 * Initializes and returns the Firebase Client SDK services for server-side use.
 */
export function getFirebase(): Promise<FirebaseServerServices> {
  if (!firebaseServerPromise) {
    firebaseServerPromise = initializeServerServices();
  }
  return firebaseServerPromise;
}

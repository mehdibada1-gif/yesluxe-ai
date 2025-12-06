// IMPORTANT: This file should not be included in client-side code.
// It is intended for use in server-side functions only.

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// It's crucial to use environment variables for service account credentials
// and not hardcode them in the source.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This is a singleton pattern to prevent re-initialization.
 * 
 * This function should be called at the beginning of any server-side
 * function that needs to interact with Firebase services.
 * 
 * @returns {App} The initialized Firebase Admin App instance.
 */
export async function initAdmin(): Promise<App> {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Cannot initialize Firebase Admin SDK.');
  }

  const adminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return adminApp;
}

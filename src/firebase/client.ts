"use client"; // 🔑 CRITICAL: Marks this file as Client-side only

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { firebaseConfig } from "./config";

// --- SINGLETON INITIALIZATION ---
// This pattern ensures that Firebase is initialized only once.
const firebaseApp: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp, 'us-central1');

/**
 * A stable, pre-initialized object containing all necessary client-side Firebase SDKs.
 * This is exported and can be imported directly by hooks or components,
 * guaranteeing that the services are available and preventing race conditions.
 */
export const sdk = {
  firebaseApp,
  auth,
  firestore,
  functions,
};

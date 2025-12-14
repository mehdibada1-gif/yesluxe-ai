// src/firebase/server-init.ts (FINAL EXPORT STRATEGY)
import "server-only";

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Only export the App, not the Firestore instance directly
let cachedFirebaseApp: App | undefined;

function initializeServerApp(): App {
    if (cachedFirebaseApp) {
        return cachedFirebaseApp;
    }

    if (getApps().length > 0) {
        const app = getApp();
        cachedFirebaseApp = app;
        return cachedFirebaseApp;
    }

    const rawServiceAcct = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawServiceAcct) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
    }

    let serviceAcct;
    try {
        serviceAcct = JSON.parse(rawServiceAcct);
    } catch (e) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT is malformed JSON.");
    }

    if (typeof serviceAcct.private_key === 'string') {
        serviceAcct.private_key = serviceAcct.private_key.replace(/\\n/g, '\n');
    }
    
    const app = initializeApp({
        credential: cert(serviceAcct)
    });
    
    cachedFirebaseApp = app;
    return cachedFirebaseApp;
}

/**
 * Returns an initialized Firebase Admin SDK App instance.
 */
export function getFirebaseApp(): App { // 🛑 RENAMED FUNCTION
    return initializeServerApp();
}
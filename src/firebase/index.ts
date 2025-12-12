
'use client';

// This file is now the central barrel file for client-side Firebase utilities.
// It NO LONGER handles initialization itself.

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
// Note: We are no longer exporting ./client from here to avoid circular dependencies
// Individual components should import from '@/firebase/client' directly if needed.

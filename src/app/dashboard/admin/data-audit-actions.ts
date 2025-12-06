'use server';

import { initAdmin } from '@/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { IdTokenResult } from 'firebase/auth';

/**
 * A server-side action to fetch all documents from a specified collection or subcollection path using Admin privileges.
 * This function is protected and can only be executed by an authenticated SuperAdmin.
 *
 * @param collectionPath The full path of the collection to audit (e.g., 'owners', 'properties/some-id/reviews').
 * @returns An object containing the fetched data, a success flag, and an optional error message.
 */
export async function getCollectionData(collectionPath: string): Promise<{ data: any[]; success: boolean; error?: string; }> {
    try {
        // Initialize the Firebase Admin SDK to get elevated privileges
        const adminApp = await initAdmin();
        const db = getFirestore(adminApp);
        const auth = getAuth(adminApp);

        // 1. Verify the caller's identity via the Authorization header
        const authorization = headers().get('Authorization');
        if (!authorization?.startsWith('Bearer ')) {
            throw new Error("No bearer token provided.");
        }
        const idToken = authorization.split('Bearer ')[1];
        
        // 2. Verify the ID token and check for SuperAdmin custom claim
        const decodedToken = await auth.verifyIdToken(idToken);
        const superAdminDoc = await db.collection('superAdmins').doc(decodedToken.uid).get();

        if (!superAdminDoc.exists) {
             return { data: [], success: false, error: 'Permission Denied: Caller is not a SuperAdmin.' };
        }
        
        // 3. Validate the input path
        if (!collectionPath || typeof collectionPath !== 'string' || collectionPath.trim().length === 0) {
            return { data: [], success: false, error: "A valid collection path is required." };
        }

        // 4. Fetch data using Admin SDK privileges
        console.log(`ADMIN: Fetching global data from: ${collectionPath}`);
        const snapshot = await db.collection(collectionPath).get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`Found ${data.length} documents.`);
        return { data, success: true };

    } catch (error: any) {
        console.error(`ADMIN: Failed to fetch data from ${collectionPath}:`, error);
        
        // Return a clean error message without exposing internal details
        let errorMessage = 'An error occurred while fetching the data.';
        if (error.code === 'auth/id-token-expired') {
            errorMessage = 'Authentication token has expired. Please refresh the page.';
        } else if (error.code === 'auth/argument-error') {
            errorMessage = 'Invalid authentication token provided.';
        } else if (error.message.includes('insufficient permissions')) {
            errorMessage = 'Permission Denied: The server environment lacks the necessary IAM roles.';
        }

        return { data: [], success: false, error: errorMessage };
    }
}

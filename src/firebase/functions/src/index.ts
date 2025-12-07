
'use server';
import * as logger from "firebase-functions/logger";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { resetMonthlyUsageCounters } from "./scheduled";
import { initAdmin } from "../../../firebase/admin";
import { nanoid } from "nanoid";
import { z } from 'zod';

// Initialize Firebase Admin SDK. This is essential for all functions in this file.
initAdmin().catch(error => {
    logger.error("FATAL: Failed to initialize Firebase Admin SDK", error);
});

// Get SDK instances after initialization
const db = getFirestore();
const adminAuth = getAuth();

// Export scheduled functions
export { resetMonthlyUsageCounters };

/**
 * A callable function that securely creates the SuperAdmin document and sets a custom claim.
 * This is triggered by the client-side /seed page.
 */
export const seedSuperAdmin = onCall({ region: 'us-central1' }, async (request) => {
    const superAdminUid = 'oxbghgSluMPPYfdDVse56yghigr2';
    logger.info(`Processing SuperAdmin grant request for UID: ${superAdminUid}`);

    const superAdminRef = db.collection("superAdmins").doc(superAdminUid);
    const userRef = db.collection("owners").doc(superAdminUid);

    try {
        await db.runTransaction(async (transaction) => {
            const superAdminDoc = await transaction.get(superAdminRef);
            
            if (superAdminDoc.exists) {
                logger.info(`User ${superAdminUid} is already a SuperAdmin. Verifying custom claim.`);
            } else {
                // Grant SuperAdmin by creating the document
                transaction.set(superAdminRef, {
                    role: "superadmin",
                    grantedAt: FieldValue.serverTimestamp(),
                    grantedBy: "System_Seed_Callable",
                });

                // Also, update the main user document in 'owners' if it exists.
                const userDoc = await transaction.get(userRef);
                if (userDoc.exists) {
                   transaction.update(userRef, { subscriptionTier: "premium" });
                }
            }
        });

        // Set custom claim regardless of whether doc existed, to ensure consistency
        await adminAuth.setCustomUserClaims(superAdminUid, { superAdmin: true });
        logger.info(`Successfully granted SuperAdmin role and custom claim to ${superAdminUid}.`);
        return { success: true, message: `Successfully granted SuperAdmin role to ${superAdminUid}.` };

    } catch (error) {
        logger.error(`Error processing SuperAdmin grant for UID ${superAdminUid}:`, error);
        throw new HttpsError('internal', 'An error occurred while granting SuperAdmin privileges.');
    }
});


/**
 * A callable function to grant or revoke SuperAdmin privileges.
 * This function is protected and can only be called by an existing SuperAdmin.
 */
export const setSuperAdmin = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Authenticate the caller
    const callerUid = request.auth?.uid;
    if (!callerUid) {
        throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
    }
    
    // 2. Verify the caller is a SuperAdmin by checking their custom claims
    if (request.auth.token.superAdmin !== true) {
        throw new HttpsError('permission-denied', 'You do not have permission to manage SuperAdmin roles.');
    }

    // 3. Validate input
    const { email, grant } = request.data;
    if (typeof email !== 'string' || typeof grant !== 'boolean') {
        throw new HttpsError('invalid-argument', 'The function must be called with an "email" (string) and "grant" (boolean) argument.');
    }

    try {
        // 4. Find the target user by their email
        const targetUser = await adminAuth.getUserByEmail(email);
        const targetUid = targetUser.uid;
        
        // Prevent a SuperAdmin from revoking their own role.
        if (!grant && callerUid === targetUid) {
            throw new HttpsError('failed-precondition', 'SuperAdmins cannot revoke their own privileges.');
        }

        const targetAdminRef = db.collection('superAdmins').doc(targetUid);

        // 5. Perform the grant or revoke action within a transaction for atomicity.
        await db.runTransaction(async (transaction) => {
             if (grant) {
                // Grant the role
                transaction.set(targetAdminRef, {
                    role: 'superadmin',
                    grantedAt: FieldValue.serverTimestamp(),
                    grantedBy: callerUid,
                });
            } else {
                // Revoke the role
                transaction.delete(targetAdminRef);
            }
        });
        
        // 6. Set or remove the custom claim after the transaction succeeds.
        await adminAuth.setCustomUserClaims(targetUid, { superAdmin: grant });

        logger.info(`SuperAdmin role ${grant ? 'granted to' : 'revoked for'} ${email} (UID: ${targetUid}) by ${callerUid}.`);
        return { success: true, message: `SuperAdmin role ${grant ? 'granted to' : 'revoked for'} ${email}.` };

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            logger.warn(`Attempted to grant SuperAdmin to non-existent user: ${email}`);
            throw new HttpsError('not-found', `No user with the email ${email} exists.`);
        }
        logger.error(`Error in setSuperAdmin function for email ${email}:`, error);
        // If it's already an HttpsError, rethrow it
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred.');
    }
});


// Define the expected schema for incoming data for sendMessage
const SendMessageSchema = z.object({
    propertyId: z.string().min(5),
    question: z.string().min(1).max(500),
    role: z.enum(['user', 'assistant']),
});

/**
 * Cloud Function: sendMessage
 * Handles secure writing of new chat messages to Firestore.
 */
export const sendMessage = onCall({ region: 'us-central1' }, async (request) => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be signed in to send a message.');
    }
    const userId = request.auth.uid;

    // 2. INPUT VALIDATION (Zod Guardrail)
    let validatedData;
    try {
        validatedData = SendMessageSchema.parse(request.data);
    } catch (error: any) {
        logger.error("sendMessage validation failed:", error);
        throw new HttpsError('invalid-argument', 'Invalid message data format.', error.issues);
    }
    
    const { propertyId, question, role } = validatedData;
    
    const propertyRef = db.collection('properties').doc(propertyId);
    const clientRef = db.collection('clients').doc(userId);
    const chatLogRef = propertyRef.collection('chatLogs').doc(userId);

    const message = {
        id: nanoid(),
        role: role,
        content: question,
        createdAt: FieldValue.serverTimestamp(),
    };

    try {
        // 3. ATOMIC WRITE LOGIC
        await db.runTransaction(async (transaction) => {
            const propertyDoc = await transaction.get(propertyRef);
            if (!propertyDoc.exists) {
                throw new HttpsError('not-found', `Property with ID ${propertyId} does not exist.`);
            }
            
            const chatDoc = await transaction.get(chatLogRef);

            if (chatDoc.exists) {
                // Safe UPDATE: Document exists, append message using arrayUnion
                transaction.update(chatLogRef, {
                    messages: FieldValue.arrayUnion(message),
                    lastUpdatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                // Safe CREATE: Document does not exist, initialize it.
                // First, ensure the client document exists.
                const clientDoc = await transaction.get(clientRef);
                if (!clientDoc.exists) {
                    const ownerId = propertyDoc.data()?.ownerId;
                    transaction.set(clientRef, {
                        id: userId,
                        ownerId: ownerId,
                        name: `Visitor (${userId.substring(0, 6)})`,
                    });
                }
                // Now create the chat log document.
                transaction.set(chatLogRef, {
                    messages: [message],
                    lastUpdatedAt: FieldValue.serverTimestamp(),
                    clientId: userId,
                    propertyId: propertyId,
                });
            }
        });
        
        return { success: true };

    } catch (error) {
        logger.error(`CRITICAL WRITE ERROR in sendMessage for user ${userId} in property ${propertyId}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'Server failed to process message.');
    }
});


/**
 * A reusable function to update the aggregate review data on a parent property document.
 */
const updatePropertyReviewAggregation = async (propertyId: string) => {
  logger.info(`Recalculating review aggregation for property: ${propertyId}`);

  const propertyRef = db.collection("properties").doc(propertyId);

  try {
    await db.runTransaction(async (transaction) => {
      const propertyDoc = await transaction.get(propertyRef);
      if (!propertyDoc.exists) {
        logger.error(`Property ${propertyId} not found.`);
        return;
      }

      const reviewsCollectionRef = propertyRef.collection("reviews");
      const publishedReviewsSnapshot = await transaction.get(
        reviewsCollectionRef.where("status", "==", "published")
      );
      
      const totalReviewCount = publishedReviewsSnapshot.size;
      
      let totalRatingSum = 0;
      publishedReviewsSnapshot.forEach(doc => {
          const rating = doc.data().rating;
          if (typeof rating === 'number') {
              totalRatingSum += rating;
          }
      });

      const averageRating = totalReviewCount > 0 ? totalRatingSum / totalReviewCount : 0;

      logger.info(`Updating property ${propertyId} with new aggregates: reviewCount: ${totalReviewCount}, ratingSum: ${totalRatingSum}, averageRating: ${averageRating.toFixed(2)}`);

      transaction.update(propertyRef, {
        reviewCount: totalReviewCount,
        ratingSum: totalRatingSum,
        averageRating: averageRating,
      });
    });

    logger.info(`Transaction successfully committed for property: ${propertyId}`);
  } catch (e) {
    logger.error(`Transaction failed for property ${propertyId}:`, e);
  }
};


/**
 * Triggers when a new review document is CREATED.
 */
export const onReviewCreated = onDocumentCreated(
  "properties/{propertyId}/reviews/{reviewId}",
  (event) => {
    logger.info(`New review created: ${event.params.reviewId}. Triggering aggregation.`);
    return updatePropertyReviewAggregation(event.params.propertyId);
  }
);

/**
 * Triggers when a review document is UPDATED.
 */
export const onReviewUpdated = onDocumentUpdated(
  "properties/{propertyId}/reviews/{reviewId}",
  (event) => {
    const beforeStatus = event.data?.before.data().status;
    const afterStatus = event.data?.after.data().status;

    // Only re-aggregate if the status changed (e.g., from 'pending' to 'published').
    if (beforeStatus !== afterStatus) {
        logger.info(`Review ${event.params.reviewId} status changed. Triggering aggregation.`);
        return updatePropertyReviewAggregation(event.params.propertyId);
    }
    
    logger.info(`Review ${event.params.reviewId} updated without status change. No aggregation needed.`);
    return null;
  }
);

/**
 * Triggers when a review document is DELETED.
 */
export const onReviewDeleted = onDocumentDeleted(
  "properties/{propertyId}/reviews/{reviewId}",
  (event) => {
    logger.info(`Review ${event.params.reviewId} deleted. Triggering aggregation.`);
    return updatePropertyReviewAggregation(event.params.propertyId);
  }
);

/**
 * Callable function to increment the usage count of a specific FAQ.
 */
export const incrementFaqUsage = onCall({ region: 'us-central1' }, async (request) => {
    // We don't require admin auth here since this is called by a trusted server-side Genkit flow.
    const { propertyId, faqId } = request.data;
    
    if (!propertyId || !faqId) {
        throw new HttpsError('invalid-argument', 'The function must be called with "propertyId" and "faqId".');
    }
    
    const usageDocRef = db.collection('properties').doc(propertyId).collection('faqs').doc('--USAGE--');

    try {
        await usageDocRef.set({
            [`${faqId}_count`]: FieldValue.increment(1)
        }, { merge: true });
        
        logger.info(`Incremented usage for FAQ ${faqId} in property ${propertyId}.`);
        return { success: true };

    } catch (error) {
        logger.error(`Error incrementing FAQ usage for property ${propertyId}, FAQ ${faqId}:`, error);
        throw new HttpsError('internal', 'An error occurred while updating the FAQ usage count.');
    }
});


/**
 * Triggers when a new booking inquiry is created.
 * Placeholder for sending owner notifications.
 */
export const onBookingInquiryCreated = onDocumentCreated(
  "properties/{propertyId}/bookingInquiries/{inquiryId}",
  async (event) => {
    const inquiry = event.data?.data();
    if (!inquiry) {
        logger.error("No data associated with the inquiry event.");
        return;
    }

    const { ownerId, visitorName, recommendationTitle } = inquiry;
    
    // In a real app, you would fetch the owner's email and use an email service (e.g., SendGrid)
    logger.info(`New booking inquiry from ${visitorName} for "${recommendationTitle}". Owner ${ownerId} should be notified.`);
    
    return;
  }
);


import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * A scheduled function that runs on the 1st day of every month at midnight.
 * It resets the AI message usage count for all properties.
 */
export const resetMonthlyUsageCounters = onSchedule("0 0 1 * *", async (event) => {
    logger.info("Running monthly job to reset property message counters.");

    const propertiesRef = db.collection("properties");
    const snapshot = await propertiesRef.get();

    if (snapshot.empty) {
        logger.info("No properties found to reset. Job finished.");
        return;
    }

    const batch = db.batch();
    const now = new Date();
    // Set the reset date to the first day of the *next* month
    const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    snapshot.docs.forEach(doc => {
        logger.info(`Resetting counter for property ${doc.id}`);
        const propertyRef = doc.ref;
        batch.update(propertyRef, {
            messageCount: 0,
            messageQuotaResetDate: nextResetDate
        });
    });

    try {
        await batch.commit();
        logger.info(`Successfully reset message counters for ${snapshot.size} properties.`);
    } catch (error) {
        logger.error("Failed to commit batch for resetting message counters:", error);
    }
});

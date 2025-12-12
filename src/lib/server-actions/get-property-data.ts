
'use server';

import { getFirebase } from '@/firebase/server-init';
import {
  getDoc,
  getDocs,
  collection,
  doc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import type {
  Property,
  FirestoreProperty,
  FirestoreFAQ,
  FirestoreRecommendation,
  FirestoreReview,
  Owner,
  Review,
} from '@/lib/types';

export async function getPropertyData(
  propertyId: string
): Promise<Property | null> {
  if (!propertyId) {
    console.error('getPropertyData called with no propertyId');
    return null;
  }

  try {
    // This now correctly returns a CLIENT SDK Firestore instance
    const { firestore } = await getFirebase();

    const propertyDocRef = doc(firestore, 'properties', propertyId);
    const propertyDoc = await getDoc(propertyDocRef);

    if (!propertyDoc.exists()) {
      return null;
    }

    const firestoreProperty = {
      id: propertyDoc.id,
      ...propertyDoc.data(),
    } as FirestoreProperty;

    if (firestoreProperty.status === 'draft') {
      return null;
    }

    const faqsRef = collection(propertyDocRef, 'faqs');
    const recommendationsRef = collection(propertyDocRef, 'recommendations');
    const reviewsRef = query(
      collection(propertyDocRef, 'reviews'),
      where('status', '==', 'published')
    );

    let ownerRef = null;
    if (firestoreProperty.ownerId) {
      ownerRef = doc(firestore, 'owners', firestoreProperty.ownerId);
    }

    const [
      faqsSnapshot,
      recommendationsSnapshot,
      reviewsSnapshot,
      ownerDoc,
    ] = await Promise.all([
      getDocs(faqsRef),
      getDocs(recommendationsRef),
      getDocs(reviewsRef),
      ownerRef ? getDoc(ownerRef) : Promise.resolve(null),
    ]);

    const faqs = faqsSnapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(faq => faq.id !== '--USAGE--') as FirestoreFAQ[];

    const recommendations = recommendationsSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as FirestoreRecommendation[];

    const getSafeDateString = (dateVal: any): string | undefined => {
      if (!dateVal) return undefined;
      if (dateVal instanceof Timestamp) {
        return dateVal.toDate().toISOString();
      }
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) {
          return undefined;
        }
        return d.toISOString();
      } catch (e) {
        return undefined;
      }
    };

    const reviews: Review[] = reviewsSnapshot.docs.map(doc => {
      const data = doc.data() as FirestoreReview;
      return {
        ...data,
        id: doc.id,
        createdAt: getSafeDateString(data.createdAt)!,
        stayDate: getSafeDateString(data.stayDate),
      } as Review;
    });

    const owner =
      ownerDoc && ownerDoc.exists()
        ? ({ id: ownerDoc.id, ...ownerDoc.data() } as Owner)
        : undefined;

    let amenities: string[] = [];
    if (
      typeof firestoreProperty.amenities === 'string' &&
      firestoreProperty.amenities
    ) {
      amenities = firestoreProperty.amenities
        .split(',')
        .map(a => a.trim())
        .filter(Boolean);
    } else if (Array.isArray(firestoreProperty.amenities)) {
      amenities = firestoreProperty.amenities;
    }

    let rules: string[] = [];
    if (typeof firestoreProperty.rules === 'string' && firestoreProperty.rules) {
      rules = firestoreProperty.rules
        .split('.')
        .map(r => r.trim())
        .filter(Boolean);
    } else if (Array.isArray(firestoreProperty.rules)) {
      rules = firestoreProperty.rules;
    }

    const media = (firestoreProperty.media || []).map((url, index) => ({
      id: `gallery-image-${index}`,
      description: firestoreProperty.name,
      imageUrl: url,
      imageHint: 'property image',
    }));

    let messageQuotaResetDate: string | undefined;
    if (firestoreProperty.messageQuotaResetDate) {
      messageQuotaResetDate = getSafeDateString(
        firestoreProperty.messageQuotaResetDate
      );
    }

    const property: Property = {
      id: firestoreProperty.id,
      name: firestoreProperty.name,
      address: firestoreProperty.address,
      description: firestoreProperty.description,
      amenities,
      rules,
      faqs,
      recommendations,
      reviews,
      media,
      ownerId: firestoreProperty.ownerId,
      status: firestoreProperty.status,
      reviewCount: firestoreProperty.reviewCount,
      ratingSum: firestoreProperty.ratingSum,
      averageRating: firestoreProperty.averageRating,
      owner,
      messageCount: firestoreProperty.messageCount,
      messageQuotaResetDate,
    };

    return property;
  } catch (error) {
    console.error('Error fetching property data:', error);
    throw new Error('Failed to load property data.');
  }
}


'use server';

import { getFirebase } from '@/firebase/server-init';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import PropertyPageClient from './page-client';
import {
  FirestoreProperty,
  FirestoreFAQ,
  FirestoreReview,
  FirestoreRecommendation,
  Owner,
  Property,
} from '@/lib/types';
import { notFound } from 'next/navigation';


// This is the correct, server-side data transformation function.
function transformFirestoreProperty(
  firestoreProperty: FirestoreProperty,
  faqs: FirestoreFAQ[],
  reviews: FirestoreReview[],
  recommendations: FirestoreRecommendation[],
  owner?: Owner
): Property {
  const publishedReviews = reviews
    .filter(review => review.status === 'published')
    .map(review => ({
      ...review,
      // Ensure Timestamps are converted to strings for serialization
      createdAt: review.createdAt instanceof Timestamp
        ? review.createdAt.toDate().toISOString()
        : (review.createdAt ? new Date(review.createdAt.toString()).toISOString() : new Date().toISOString()),
      stayDate: review.stayDate instanceof Timestamp
        ? (review.stayDate as Timestamp).toDate().toISOString()
        : (review.stayDate ? new Date(review.stayDate.toString()).toISOString() : undefined),
    }));

  return {
    id: firestoreProperty.id,
    name: firestoreProperty.name,
    description: firestoreProperty.description || '',
    address: firestoreProperty.address,
    ownerId: firestoreProperty.ownerId,
    status: firestoreProperty.status,
    reviewCount: firestoreProperty.reviewCount || 0,
    ratingSum: firestoreProperty.ratingSum || 0,
    averageRating: firestoreProperty.averageRating || 0,
    media: firestoreProperty.media?.map((url, index) => ({
      id: `firestore-img-${index}`,
      imageUrl: url,
      description: `Image for ${firestoreProperty.name}`,
      imageHint: 'property image',
    })) || [],
    amenities: Array.isArray(firestoreProperty.amenities) ? firestoreProperty.amenities : (firestoreProperty.amenities || '').split(',').map(s => s.trim()),
    rules: Array.isArray(firestoreProperty.rules) ? firestoreProperty.rules : (firestoreProperty.rules || '').split('.').map(s => s.trim()).filter(Boolean),
    faqs: faqs,
    reviews: publishedReviews,
    recommendations: recommendations,
    owner: owner,
    messageCount: firestoreProperty.messageCount,
    messageQuotaResetDate: firestoreProperty.messageQuotaResetDate instanceof Timestamp
        ? firestoreProperty.messageQuotaResetDate.toDate().toISOString()
        : firestoreProperty.messageQuotaResetDate,
  };
}


// This is a React Server Component. It can be async.
export default async function PropertyPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const { firestore } = getFirebase();
  const { propertyId } = params;

  try {
    // 1. Fetch all data concurrently
    const propertyDocRef = doc(firestore, 'properties', propertyId);
    const propertyDoc = await getDoc(propertyDocRef);

    if (!propertyDoc.exists() || propertyDoc.data().status === 'draft') {
        // If the property doesn't exist or is a draft, show a 404 page.
        // We will add an exception for the owner viewing their own draft later.
        notFound();
    }
    
    const firestoreProperty = { id: propertyDoc.id, ...propertyDoc.data() } as FirestoreProperty;

    const faqsQuery = query(collection(firestore, 'properties', propertyId, 'faqs'));
    const recommendationsQuery = query(collection(firestore, 'properties', propertyId, 'recommendations'));
    const reviewsQuery = query(collection(firestore, 'properties', propertyId, 'reviews'), where('status', '==', 'published'));
    
    // The owner can be fetched after the property, as we need the ownerId
    const ownerDocRef = doc(firestore, 'owners', firestoreProperty.ownerId);

    const [faqsSnapshot, recommendationsSnapshot, reviewsSnapshot, ownerDoc] = await Promise.all([
      getDocs(faqsQuery),
      getDocs(recommendationsQuery),
      getDocs(reviewsQuery),
      getDoc(ownerDocRef),
    ]);

    // 2. Process the snapshots into data arrays
    const faqs = faqsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(faq => faq.id !== '--USAGE--') as FirestoreFAQ[];
    const recommendations = recommendationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FirestoreRecommendation[];
    const reviews = reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as FirestoreReview[];
    const owner = ownerDoc.exists() ? ({ id: ownerDoc.id, ...ownerDoc.data() } as Owner) : undefined;
    
    // 3. Transform the raw Firestore data into the final 'Property' shape for the client
    const property = transformFirestoreProperty(firestoreProperty, faqs, reviews, recommendations, owner);

    // 4. Pass the prepared data to the Client Component
    return <PropertyPageClient property={property} />;
  } catch (error) {
    console.error("Error fetching property data:", error);
    // You could render a specific error component here
    notFound();
  }
}

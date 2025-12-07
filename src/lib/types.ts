
'use client';

import type { ImagePlaceholder } from './placeholder-images';
import { Timestamp } from 'firebase/firestore';


export type FAQ = {
  id: string;
  question: string;
  answer: string;
};

export type RecommendationCategory = 'Restaurant' | 'Activity' | 'Cafe' | 'Sightseeing' | 'Shopping' | 'Other';

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  imageUrl?: string;
  link?: string;
}

export type ReviewStatus = "published" | "pending" | "archived" | "reported";

export type Review = {
    id: string;
    propertyId: string;
    ownerId: string;
    clientId?: string; 
    reviewerName: string;
    rating: number; 
    ratingCleanliness: number;
    ratingAccuracy: number;
    ratingCheckIn: number;
    ratingCommunication: number;
    ratingLocation: number;
    ratingValue: number;
    comment: string;
    createdAt: string; // Should always be ISO string on client
    stayDate?: string;
    visitorCity?: string;
    visitorCountry?: string;
    ownerResponse?: string;
    helpful_yes?: number;
    helpful_no?: number;
    status: ReviewStatus;
    reportReason?: string;
    reportedAt?: string;
    guestTip?: string; // New field for guest-sourced recommendations
}

// This is the type used throughout the client-side application
export type Property = {
  id: string;
  name: string;
  description: string;
  address: string;
  media: ImagePlaceholder[]; 
  amenities: string[];
  rules: string[];
  faqs: FirestoreFAQ[];
  recommendations: Recommendation[];
  reviews: Review[];
  ownerId: string;
  status: 'draft' | 'published';
  reviewCount?: number;
  ratingSum?: number;
  averageRating?: number;
  owner?: Owner; // Add optional owner details
  messageCount?: number;
  messageQuotaResetDate?: string | Timestamp;
};

// Represents an Owner user
export type Owner = {
    id: string;
    email: string;
    name?: string;
    phoneNumber?: string;
    photoURL?: string;
    city?: string;
    country?: string;
    companyName?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    description?: string;
    subscriptionTier: 'free' | 'pro' | 'premium';
    subscriptionStatus: 'active' | 'inactive' | 'trialing';
}

export type Client = {
    id: string;
    name: string;
    ownerId?: string;
}

// This represents the raw data structure in Firestore for a Property
export type FirestoreProperty = {
  id: string;
  name: string;
  address: string;
  description: string;
  amenities: string | string[]; // Can be string or array now
  rules: string | string[]; // Can be string or array now
  ownerId: string;
  media: string[];
  status: 'draft' | 'published';
  reviewCount?: number;
  ratingSum?: number;
  averageRating?: number;
  messageCount?: number;
  messageQuotaResetDate?: string | Timestamp;
};

// This represents the raw data structure in Firestore for an FAQ
export type FirestoreFAQ = {
  id:string;
  question: string;
  answer: string;
  usageCount?: number;
}

export type FirestoreRecommendation = Recommendation;

// This represents the raw data structure in Firestore for a Review
// It can have a Timestamp directly from Firestore.
export type FirestoreReview = Omit<Review, 'createdAt' | 'stayDate' | 'clientId'> & {
    createdAt: string | Timestamp;
    stayDate?: string | Timestamp;
    clientId?: string;
}


export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | Timestamp;
};

export type BookingInquiry = {
  id: string;
  propertyId: string;
  ownerId: string;
  clientId: string;
  recommendationTitle: string;
  visitorName: string;
  visitorContact: string;
  visitorWhatsApp?: string;
  bookingDate?: string;
  numberOfPeople?: number;
  notes?: string;
  status: 'new' | 'contacted';
  createdAt: Timestamp;
};

export type FirestoreBookingInquiry = Omit<BookingInquiry, 'createdAt'> & {
    createdAt: Timestamp;
};

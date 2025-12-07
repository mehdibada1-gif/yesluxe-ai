
import { z } from 'zod';

export const propertyFormSchema = z.object({
  name: z.string().min(3, {
    message: 'Property name must be at least 3 characters long.',
  }),
  address: z.string().min(10, {
    message: 'Please enter a valid address.',
  }),
  description: z.string().min(20, {
    message: 'Description must be at least 20 characters long.',
  }),
  amenities: z.string().optional(),
  rules: z.string().optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

export const faqFormSchema = z.object({
  question: z.string().min(10, {
    message: "Question must be at least 10 characters long.",
  }),
  answer: z.string().min(10, {
    message: "Answer must be at least 10 characters long.",
  }),
});

export type FaqFormValues = z.infer<typeof faqFormSchema>;

const recommendationCategories = z.enum(['Restaurant', 'Activity', 'Cafe', 'Sightseeing', 'Shopping', 'Other']);

export const recommendationFormSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters long.",
  }),
  category: recommendationCategories,
  imageUrl: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  link: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
});

export type RecommendationFormValues = z.infer<typeof recommendationFormSchema>;

export const mediaFormSchema = z.object({
    url: z.string().url({ message: "Please enter a valid image URL." }),
});

export type MediaFormValues = z.infer<typeof mediaFormSchema>;

export const ownerProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.').optional().or(z.literal('')),
  photoURL: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),
  description: z.string().max(200, 'Description cannot exceed 200 characters.').optional().or(z.literal('')),
  facebookUrl: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  instagramUrl: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
});

export type OwnerProfileValues = z.infer<typeof ownerProfileSchema>;

export const reviewFormSchema = z.object({
    reviewerName: z.string().min(2, "Name must be at least 2 characters."),
    comment: z.string().min(10, "Comment must be at least 10 characters long.").max(500, "Comment cannot exceed 500 characters."),
    stayDate: z.date({
        required_error: "Please select the date of your stay.",
    }).optional(),
    visitorCity: z.string().min(2, "Please enter your city.").optional().or(z.literal('')),
    visitorCountry: z.string().min(2, "Please enter your country.").optional().or(z.literal('')),
    ratingCleanliness: z.number().min(1, "Please rate cleanliness.").max(5),
    ratingAccuracy: z.number().min(1, "Please rate accuracy.").max(5),
    ratingCheckIn: z.number().min(1, "Please rate check-in.").max(5),
    ratingCommunication: z.number().min(1, "Please rate communication.").max(5),
    ratingLocation: z.number().min(1, "Please rate location.").max(5),
    ratingValue: z.number().min(1, "Please rate value.").max(5),
    guestTip: z.string().max(300, "Guest tip cannot exceed 300 characters.").optional(),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;


export const reviewResponseFormSchema = z.object({
    ownerResponse: z.string().min(10, "Response must be at least 10 characters long.").max(500, "Response cannot exceed 500 characters."),
});

export type ReviewResponseFormValues = z.infer<typeof reviewResponseFormSchema>;
    
export const reportReviewFormSchema = z.object({
  reportType: z.enum(['spam', 'inappropriate', 'fraudulent', 'other'], {
    required_error: "You need to select a report type.",
  }),
  reportReason: z.string().max(500, "The reason cannot exceed 500 characters.").optional(),
});

export type ReportReviewFormValues = z.infer<typeof reportReviewFormSchema>;

export const salesInquirySchema = z.object({
    name: z.string().min(2, { message: 'Please enter your name.' }),
    email: z.string().email({ message: 'Please enter a valid email address.' }),
    companyName: z.string().optional(),
    message: z.string().min(10, { message: 'Your message must be at least 10 characters long.' }),
});

export type SalesInquiryValues = z.infer<typeof salesInquirySchema>;

export const bookingInquirySchema = z.object({
    visitorName: z.string().min(2, "Please enter your name."),
    visitorContact: z.string().min(5, "Please enter a valid email or phone number."),
    visitorWhatsApp: z.string().optional().or(z.literal('')),
    bookingDate: z.date().optional(),
    numberOfPeople: z.coerce.number().positive("Must be a positive number.").optional().or(z.literal('')),
    notes: z.string().max(300, "Notes cannot exceed 300 characters.").optional(),
});

export type BookingInquiryValues = z.infer<typeof bookingInquirySchema>;

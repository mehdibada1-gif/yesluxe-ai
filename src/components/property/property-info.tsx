
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Property, Review, Recommendation, BookingInquiry } from '@/lib/types';
import { List, ClipboardList, Phone, CheckCircle2, HelpCircle, Mail, Star, Sparkles, Link as LinkIcon, Facebook, Instagram, Linkedin, Loader2, MessageSquare, MapPin, CalendarIcon, User as UserIcon, Building, UtensilsCrossed, Wind, Tv, ParkingCircle, Wifi, Bath, Send, Lightbulb, Users } from 'lucide-react';
import React, { useMemo, useState, useEffect } from 'react';
import { Separator } from '../ui/separator';
import { useForm } from 'react-hook-form';
import { reviewFormSchema, ReviewFormValues, bookingInquirySchema, BookingInquiryValues } from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { nanoid } from 'nanoid';


type PropertyInfoProps = {
  property: Property;
};

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current">
        <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.487-.137-.05-.274-.074-.412.075-.137.149-.512.65-.627.785-.114.136-.23.15-.412.074-.182-.074-.767-.28-1.46-.906-.54-.486-.906-1.08-.99-1.254-.085-.174-.007-.26.067-.35.065-.08.149-.2.223-.274.074-.074.12-.12.18-.2.06-.08.03-.15-.015-.274-.045-.12-.41-.99-.56-1.355-.149-.364-.3-.31-.41-.31-.112 0-.274-.007-.41-.007-.137 0-.36.05-.546.274-.186.225-.7.695-.7 1.695s.725 1.97.82 2.12c.094.15.14.274.14.274.149.56 1.46 2.37 3.53 3.12.59.21.99.28 1.36.28.66 0 1.25-.28 1.44-.88.19-.6.19-1.1.13-1.25s-.18-.2-.36-.31zM12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 1.78.46 3.45 1.28 4.9L2.04 22l5.12-1.34c1.4.74 3 .12 4.72.12h.01c5.5 0 9.96-4.46 9.96-9.96s-4.46-9.96-9.96-9.96zM12 20.14c-1.6 0-3.13-.4-4.43-1.12l-.3-.18-3.3.86.88-3.2-.2-.32c-.8-1.34-1.28-2.9-1.28-4.54 0-4.5 3.63-8.14 8.14-8.14 2.25 0 4.35.88 5.9 2.42s2.4 3.65 2.4 5.9-1.08 4.35-2.42 5.9c-1.55 1.54-3.65 2.42-5.9 2.42z"/>
    </svg>
)

const RatingCategoryInput = ({ field, label }: { field: any, label: string }) => (
    <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-7 w-7 cursor-pointer transition-colors ${field.value >= star ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`}
                        onClick={() => field.onChange(star)}
                    />
                ))}
            </div>
        </FormControl>
        <FormMessage />
    </FormItem>
);

function BookingInquiryForm({ property, recommendation, onFinished }: { property: Property; recommendation: Recommendation; onFinished: () => void }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<BookingInquiryValues>({
        resolver: zodResolver(bookingInquirySchema),
        defaultValues: {
            visitorName: user?.isAnonymous ? '' : user?.displayName || '',
            visitorContact: user?.isAnonymous ? '' : user?.email || '',
            visitorWhatsApp: '',
            notes: '',
            numberOfPeople: '',
            bookingDate: undefined,
        },
    });

    const onSubmit = (values: BookingInquiryValues) => {
        if (!firestore || !user) {
            toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to make an inquiry." });
            return;
        }
        setIsSubmitting(true);

        const newInquiryId = nanoid();
        const newInquiryData = {
            id: newInquiryId,
            propertyId: property.id,
            ownerId: property.ownerId,
            clientId: user.uid,
            recommendationTitle: recommendation.title,
            status: 'new' as const,
            createdAt: serverTimestamp(),
            ...values,
            numberOfPeople: values.numberOfPeople ? Number(values.numberOfPeople) : undefined,
            bookingDate: values.bookingDate ? values.bookingDate.toISOString().split('T')[0] : undefined,
        };

        // Remove undefined fields before sending to Firestore
        Object.keys(newInquiryData).forEach(key => {
            if (newInquiryData[key as keyof typeof newInquiryData] === undefined) {
                delete newInquiryData[key as keyof typeof newInquiryData];
            }
        });

        const inquiryRef = doc(firestore, 'properties', property.id, 'bookingInquiries', newInquiryId);
        
        setDoc(inquiryRef, newInquiryData)
            .then(() => {
                toast({
                    title: "Inquiry Sent!",
                    description: "The property owner has been notified and will contact you shortly.",
                });
                onFinished();
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: inquiryRef.path,
                    operation: 'create',
                    requestResourceData: newInquiryData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField control={form.control} name="visitorName" render={({ field }) => (
                    <FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="visitorContact" render={({ field }) => (
                        <FormItem><FormLabel>Your Email or Phone</FormLabel><FormControl><Input placeholder="jane.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="visitorWhatsApp" render={({ field }) => (
                        <FormItem><FormLabel>WhatsApp Number (Optional)</FormLabel><FormControl><Input placeholder="+1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField control={form.control} name="bookingDate" render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Desired Date</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                     )} />
                    <FormField control={form.control} name="numberOfPeople" render={({ field }) => (
                        <FormItem><FormLabel>Number of People</FormLabel><FormControl><Input type="number" placeholder="e.g., 2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Any special requests or questions?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Inquiry
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function ReviewForm({ property }: { property: Property }) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<ReviewFormValues>({
        resolver: zodResolver(reviewFormSchema),
        defaultValues: {
            reviewerName: '',
            comment: '',
            visitorCity: '',
            visitorCountry: '',
            ratingCleanliness: 0,
            ratingAccuracy: 0,
            ratingCheckIn: 0,
            ratingCommunication: 0,
            ratingLocation: 0,
            ratingValue: 0,
            guestTip: '',
        },
    });


    const onSubmit = (values: ReviewFormValues) => {
        if (!firestore || !user) {
            toast({ variant: "destructive", title: "Error", description: "Cannot submit review. You must be signed in." });
            return;
        }
        setIsSubmitting(true);
        
        const ratings = [values.ratingCleanliness, values.ratingAccuracy, values.ratingCheckIn, values.ratingCommunication, values.ratingLocation, values.ratingValue];
        const validRatings = ratings.filter(r => r > 0);
        const averageRating = validRatings.length > 0 ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length : 0;

        const reviewData: Omit<Review, 'id' | 'createdAt'> & {createdAt: any} = {
            ...values,
            rating: averageRating,
            stayDate: values.stayDate ? values.stayDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            propertyId: property.id,
            ownerId: property.ownerId,
            clientId: user.uid,
            status: 'published' as const,
            createdAt: serverTimestamp(),
        };

        const reviewsColRef = collection(firestore, 'properties', property.id, 'reviews');

        addDoc(reviewsColRef, reviewData)
            .then(() => {
                toast({
                    title: "Review Submitted!",
                    description: "Thank you for your feedback! Your review is now live.",
                });
                form.reset();
            })
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: reviewsColRef.path,
                    operation: 'create',
                    requestResourceData: reviewData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <Card className="bg-muted/30">
            <CardHeader>
                <CardTitle>Leave a Review</CardTitle>
                <CardDescription>Share your experience with future visitors.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField control={form.control} name="reviewerName" render={({ field }) => (
                            <FormItem><FormLabel>Your Name</FormLabel><FormControl><Input placeholder="John D." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="visitorCity" render={({ field }) => (
                                <FormItem><FormLabel>Your City</FormLabel><FormControl><Input placeholder="e.g., New York" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="visitorCountry" render={({ field }) => (
                                <FormItem><FormLabel>Your Country</FormLabel><FormControl><Input placeholder="e.g., USA" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>

                         <FormField control={form.control} name="stayDate" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Date of Stay</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                        )}
                                        >
                                        {field.value ? (
                                            format(field.value, "PPP")
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                         )} />

                        <Separator />
                        <h4 className="font-medium">Rate Your Experience</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                            <FormField control={form.control} name="ratingCleanliness" render={({ field }) => <RatingCategoryInput field={field} label="Cleanliness"/>} />
                            <FormField control={form.control} name="ratingAccuracy" render={({ field }) => <RatingCategoryInput field={field} label="Accuracy"/>} />
                            <FormField control={form.control} name="ratingCheckIn" render={({ field }) => <RatingCategoryInput field={field} label="Check-in"/>} />
                            <FormField control={form.control} name="ratingCommunication" render={({ field }) => <RatingCategoryInput field={field} label="Communication"/>} />
                            <FormField control={form.control} name="ratingLocation" render={({ field }) => <RatingCategoryInput field={field} label="Location"/>} />
                            <FormField control={form.control} name="ratingValue" render={({ field }) => <RatingCategoryInput field={field} label="Value"/>} />
                        </div>
                        <Separator />

                        <FormField control={form.control} name="comment" render={({ field }) => (
                            <FormItem><FormLabel>Your Comment</FormLabel><FormControl><Textarea rows={4} placeholder="How was your stay? Tell us about your experience..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="guestTip" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4" />
                                    Add a "Guest Tip" (Optional)
                                </FormLabel>
                                <FormControl><Textarea rows={2} placeholder="Did you discover a hidden gem? Share a tip for future guests! (e.g., 'The bakery down the street has amazing croissants!')" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Review
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}


export default function PropertyInfo({ property }: PropertyInfoProps) {
  
  const [reviewsToShow, setReviewsToShow] = useState(5);
  const [isBookDialogOpen, setBookDialogOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);

  const amenitiesList = useMemo(() => Array.isArray(property.amenities) ? property.amenities : property.amenities?.split(',').map(a => a.trim()) || [], [property.amenities]);
  const rulesList = useMemo(() => Array.isArray(property.rules) ? property.rules : property.rules?.split('.').map(r => r.trim()).filter(r => r.length > 0) || [], [property.rules]);

  const handleWhatsAppClick = () => {
    const phone = property.owner?.phoneNumber;
    if (phone) {
       const cleanPhone = phone.replace(/[\s+()-]/g, '');
       window.open(`https://wa.me/${cleanPhone}`, '_blank');
    }
  }
  
  const handleEmailClick = () => {
      const email = property.owner?.email;
      if (email) {
          window.location.href = `mailto:${email}`;
      }
  }

  const allReviews = useMemo(() => {
    return [...(property.reviews || [])]
      .filter(review => review.status === 'published')
      .sort(
        (a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()
      );
  }, [property.reviews]);
  
  const visibleReviews = useMemo(() => allReviews.slice(0, reviewsToShow), [allReviews, reviewsToShow]);
  
  const hasReviews = allReviews && allReviews.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl tracking-tight">About the Property</CardTitle>
        <p className="text-muted-foreground pt-1">{property.description}</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="general" className="py-2 gap-2"><List className="h-4 w-4"/>General Info</TabsTrigger>
            <TabsTrigger value="faq" className="py-2 gap-2"><HelpCircle className="h-4 w-4"/>FAQ</TabsTrigger>
            <TabsTrigger value="recommendations" className="py-2 gap-2"><Sparkles className="h-4 w-4"/>Recommendations</TabsTrigger>
            <TabsTrigger value="contact" className="py-2 gap-2"><Phone className="h-4 w-4"/>Contact</TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="mt-6 space-y-8">
             <div>
                <h3 className="text-lg font-semibold mb-4">What this place offers</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {amenitiesList.map(amenity => {
                    let Icon = CheckCircle2;
                    if (amenity.toLowerCase().includes('wifi')) Icon = Wifi;
                    if (amenity.toLowerCase().includes('bed')) Icon = Building;
                    if (amenity.toLowerCase().includes('bath')) Icon = Bath;
                    if (amenity.toLowerCase().includes('kitchen')) Icon = UtensilsCrossed;
                    if (amenity.toLowerCase().includes('parking')) Icon = ParkingCircle;
                    if (amenity.toLowerCase().includes('air conditioning')) Icon = Wind;
                    if (amenity.toLowerCase().includes('tv')) Icon = Tv;

                    return (
                    <div key={amenity} className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" strokeWidth={1.5}/>
                        <span className="text-sm font-medium text-foreground">{amenity}</span>
                    </div>
                    );
                })}
                </div>
             </div>
             <div>
                <h3 className="text-lg font-semibold mb-4">Things to know</h3>
                <ul className="space-y-3">
                {rulesList.map((rule, index) => (
                    <li key={index} className="flex items-start gap-3">
                    <ClipboardList className="h-5 w-5 text-primary/80 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{rule}</span>
                    </li>
                ))}
                </ul>
             </div>
          </TabsContent>
           <TabsContent value="faq" className="mt-6">
             <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
              {property.faqs && property.faqs.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {property.faqs.map((faq) => (
                    <AccordionItem value={faq.id} key={faq.id}>
                      <AccordionTrigger className="hover:no-underline text-left">
                        <span className="font-medium flex-1">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                    <p>No FAQs have been added for this property yet.</p>
                </div>
              )}
          </TabsContent>
          <TabsContent value="recommendations" className="mt-6">
             <h3 className="text-lg font-semibold mb-4">Owner's Recommendations</h3>
              {property.recommendations && property.recommendations.length > 0 ? (
                <div className="space-y-4">
                  <Dialog open={isBookDialogOpen} onOpenChange={setBookDialogOpen}>
                  {property.recommendations.map((rec) => (
                    <Card key={rec.id} className="bg-secondary/50 flex flex-col sm:flex-row overflow-hidden">
                        {rec.imageUrl && (
                            <div className="sm:w-1/3 aspect-video sm:aspect-auto relative">
                                <Image src={rec.imageUrl} alt={rec.title} fill className="object-cover"/>
                            </div>
                        )}
                        <div className="flex-1">
                            <CardHeader>
                                <Badge variant="outline" className="w-fit mb-2">{rec.category}</Badge>
                                <CardTitle className="text-lg">{rec.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm">{rec.description}</p>
                            </CardContent>
                           <CardFooter className="flex-wrap gap-2">
                                {rec.link && (
                                    <a href={rec.link} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" size="sm">
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Learn More
                                        </Button>
                                    </a>
                                )}
                                <DialogTrigger asChild>
                                  <Button size="sm" onClick={() => setSelectedRec(rec)}>
                                      <Send className="mr-2 h-4 w-4"/>
                                      Request to Book
                                  </Button>
                                </DialogTrigger>
                            </CardFooter>
                        </div>
                    </Card>
                  ))}
                  <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Book: {selectedRec?.title}</DialogTitle>
                        <DialogDescription>
                            Send an inquiry to the property owner to book this experience. They will contact you to confirm details.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRec && <BookingInquiryForm property={property} recommendation={selectedRec} onFinished={() => setBookDialogOpen(false)} />}
                  </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-8">
                    <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                    <p>The owner hasn't added any personal recommendations yet.</p>
                </div>
              )}
          </TabsContent>
          <TabsContent value="contact" className="mt-6">
             <h3 className="text-lg font-semibold mb-4">Your Host</h3>
            <Card className="bg-gradient-to-br from-secondary/30 to-background border">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                    <Avatar className="h-20 w-20 border-2 border-primary/50">
                        <AvatarImage src={property.owner?.photoURL || ''} alt="Property Owner" />
                        <AvatarFallback>{property.owner?.name?.charAt(0) || 'O'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <h4 className="font-semibold text-xl">{property.owner?.name || 'Your Host'}</h4>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {property.owner?.description || 'Your host is here to ensure you have a great stay. Feel free to reach out with any questions!'}
                        </p>
                         <div className="mt-4 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 flex-wrap">
                            {property.ownerId && (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/owner/${property.ownerId}`}>
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        View Host Profile
                                    </Link>
                                </Button>
                            )}
                            {property.owner?.phoneNumber && (
                                <Button size="sm" onClick={handleWhatsAppClick} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
                                    <WhatsAppIcon />
                                    Contact via WhatsApp
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
       <Separator className="my-4" />
        <CardHeader>
            {hasReviews && property.reviewCount && property.averageRating ? (
                <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-primary fill-primary" />
                    <CardTitle className="text-2xl font-bold">
                        {property.averageRating.toFixed(1)}
                        <span className="text-base font-normal text-muted-foreground">
                            {' '}
                            &middot; {property.reviewCount} review{property.reviewCount !== 1 ? 's' : ''}
                        </span>
                    </CardTitle>
                </div>
            ) : (
                 <CardTitle>Visitor Reviews</CardTitle>
            )}
        </CardHeader>
        <CardContent className="space-y-8">
            {hasReviews ? (
                <div className="space-y-6">
                    {visibleReviews.map((review) => (
                        <div key={review.id}>
                            <div className="flex items-start gap-4">
                                <Avatar>
                                    <AvatarFallback>{review.reviewerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start flex-wrap gap-2">
                                        <div>
                                            <p className="font-semibold">{review.reviewerName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {review.visitorCity}{review.visitorCity && review.visitorCountry ? ', ' : ''}{review.visitorCountry}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm">
                                            <Star className="h-4 w-4 text-primary fill-primary" />
                                            <span className="font-bold">{review.rating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Stayed: {review.stayDate ? format(new Date(review.stayDate), 'MMMM yyyy') : format(new Date(review.createdAt.toString()), 'PPP')}
                                    </p>
                                    <p className="text-muted-foreground mt-2 italic">"{review.comment}"</p>
                                     {review.guestTip && (
                                        <Card className="mt-3 bg-primary/5 border-primary/20">
                                            <CardContent className="p-3">
                                                <p className="text-xs font-semibold flex items-center gap-2">
                                                    <Lightbulb className="h-4 w-4 text-primary" />
                                                    Guest Tip:
                                                </p>
                                                <p className="text-xs text-primary/90 mt-1 italic">"{review.guestTip}"</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                            {review.ownerResponse && (
                                <Card className="mt-4 ml-14 bg-muted/50 border-l-4">
                                    <CardHeader className="p-4">
                                        <p className="text-xs text-muted-foreground">Response from the owner</p>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-sm text-muted-foreground italic">"{review.ownerResponse}"</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ))}
                    {allReviews.length > reviewsToShow && (
                        <Button variant="outline" className="w-full" onClick={() => setReviewsToShow(allReviews.length)}>
                            Show All {allReviews.length} Reviews
                        </Button>
                    )}
                </div>
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground mb-2"/>
                    <p>No reviews have been published for this property yet.</p>
                </div>
            )}

            <Separator className="my-8" />
            
            <ReviewForm property={property} />

        </CardContent>
    </Card>
  );
}

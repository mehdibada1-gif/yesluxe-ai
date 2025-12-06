'use client';

import { useState, useMemo, useTransition } from 'react';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Send, Inbox, Sparkles, Mail, User, Phone, Calendar, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FirestoreBookingInquiry } from '@/lib/types';
import { FirestorePermissionError } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { generateBookingInquiryResponse } from '@/ai/flows/generate-booking-inquiry-response';
import { Separator } from '@/components/ui/separator';

function InquiryResponseGenerator({ inquiry }: { inquiry: FirestoreBookingInquiry }) {
    const [isGenerating, startGenerating] = useTransition();
    const { toast } = useToast();
    const [draft, setDraft] = useState('');

    const handleGenerate = () => {
        startGenerating(async () => {
            try {
                const result = await generateBookingInquiryResponse({
                    recommendationTitle: inquiry.recommendationTitle,
                    visitorName: inquiry.visitorName,
                    notes: inquiry.notes || "",
                    bookingDate: inquiry.bookingDate,
                    numberOfPeople: inquiry.numberOfPeople,
                });
                setDraft(result.response);
                toast({ title: 'AI response drafted!' });
            } catch (e) {
                console.error("AI response generation failed:", e);
                toast({ variant: 'destructive', title: 'Generation Failed' });
            }
        });
    };

    return (
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>AI-Assisted Response</DialogTitle>
                <DialogDescription>
                    Generate a draft response to {inquiry.visitorName}'s inquiry. You can copy this text and send it via email.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                 <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Draft
                </Button>
                {draft && (
                    <div className="space-y-2">
                        <Textarea value={draft} readOnly rows={10} />
                        <a href={`mailto:${inquiry.visitorContact}?subject=Re: Your inquiry for ${inquiry.recommendationTitle}&body=${encodeURIComponent(draft)}`}>
                             <Button variant="outline">
                                <Mail className="mr-2 h-4 w-4" />
                                Open in Email Client
                            </Button>
                        </a>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current">
        <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.487-.137-.05-.274-.074-.412.075-.137.149-.512.65-.627.785-.114.136-.23.15-.412.074-.182-.074-.767-.28-1.46-.906-.54-.486-.906-1.08-.99-1.254-.085-.174-.007-.26.067-.35.065-.08.149-.2.223-.274.074-.074.12-.12.18-.2.06-.08.03-.15-.015-.274-.045-.12-.41-.99-.56-1.355-.149-.364-.3-.31-.41-.31-.112 0-.274-.007-.41-.007-.137 0-.36.05-.546.274-.186.225-.7.695-.7 1.695s.725 1.97.82 2.12c.094.15.14.274.14.274.149.56 1.46 2.37 3.53 3.12.59.21.99.28 1.36.28.66 0 1.25-.28 1.44-.88.19-.6.19-1.1.13-1.25s-.18-.2-.36-.31zM12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 1.78.46 3.45 1.28 4.9L2.04 22l5.12-1.34c1.4.74 3 .12 4.72.12h.01c5.5 0 9.96-4.46 9.96-9.96s-4.46-9.96-9.96-9.96zM12 20.14c-1.6 0-3.13-.4-4.43-1.12l-.3-.18-3.3.86.88-3.2-.2-.32c-.8-1.34-1.28-2.9-1.28-4.54 0-4.5 3.63-8.14 8.14-8.14 2.25 0 4.35.88 5.9 2.42s2.4 3.65 2.4 5.9-1.08 4.35-2.42 5.9c-1.55 1.54-3.65 2.42-5.9 2.42z"/>
    </svg>
)

export default function BookingInquiriesPage() {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const firestore = useFirestore();
  const { toast } = useToast();

  const inquiriesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'properties', propertyId, 'bookingInquiries'), orderBy('createdAt', 'desc')) : null),
    [firestore, propertyId]
  );

  const { data: inquiries, isLoading } = useCollection<FirestoreBookingInquiry>(inquiriesQuery);

  const handleStatusChange = async (inquiryId: string, newStatus: 'new' | 'contacted') => {
    if (!firestore) return;
    
    const inquiryRef = doc(firestore, 'properties', propertyId, 'bookingInquiries', inquiryId);
    const updatedData = { status: newStatus };

    updateDoc(inquiryRef, updatedData)
        .then(() => {
            toast({
                title: 'Status Updated',
                description: `Inquiry marked as ${newStatus}.`
            });
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: inquiryRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleWhatsApp = (contact: string) => {
    const phoneNumber = contact.replace(/[^0-9+]/g, '');
    if (phoneNumber) {
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    } else {
      toast({ variant: 'destructive', title: 'Invalid Number' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isPhoneNumber = (contact: string) => /[\d+]/.test(contact) && !contact.includes('@');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Inquiries</CardTitle>
        <CardDescription>
          Inquiries from visitors interested in booking your recommended experiences.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {inquiries && inquiries.length > 0 ? (
           <div className="grid gap-6 md:grid-cols-2">
            {inquiries.map(inquiry => (
              <Card key={inquiry.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{inquiry.recommendationTitle}</CardTitle>
                         <Select
                            value={inquiry.status}
                            onValueChange={(value: 'new' | 'contacted') => handleStatusChange(inquiry.id, value)}
                        >
                            <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Set status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">
                                    <Badge variant="destructive" className="w-full justify-center">New</Badge>
                                </SelectItem>
                                <SelectItem value="contacted">
                                    <Badge variant="secondary" className="w-full justify-center">Contacted</Badge>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <CardDescription className="flex items-center gap-2 pt-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        {format(inquiry.createdAt.toDate(), 'PPP p')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                    <Separator />
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="font-medium">{inquiry.visitorName}</span>

                        <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span>{inquiry.visitorContact}</span>
                        
                        {inquiry.visitorWhatsApp && (
                            <>
                                <WhatsAppIcon />
                                <span>{inquiry.visitorWhatsApp}</span>
                            </>
                        )}
                        
                        {inquiry.bookingDate && (
                            <>
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span>{format(new Date(inquiry.bookingDate), 'PPP')}</span>
                            </>
                        )}
                        
                        {inquiry.numberOfPeople && (
                           <>
                                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span>{inquiry.numberOfPeople} people</span>
                           </>
                        )}
                    </div>
                     {inquiry.notes && (
                         <div className="p-3 rounded-md bg-muted text-sm">
                            <p className="font-semibold text-xs text-muted-foreground mb-1">Visitor Notes:</p>
                            <p className="italic">"{inquiry.notes}"</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-wrap gap-2 justify-start">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Sparkles className="mr-2 h-4 w-4"/>
                                AI Draft Reply
                            </Button>
                        </DialogTrigger>
                        <InquiryResponseGenerator inquiry={inquiry} />
                    </Dialog>
                    <Button 
                      size="sm"
                      onClick={() => handleWhatsApp(inquiry.visitorWhatsApp || inquiry.visitorContact)} 
                      disabled={!isPhoneNumber(inquiry.visitorWhatsApp || inquiry.visitorContact)}
                      className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                    >
                        <WhatsAppIcon />
                        Contact via WhatsApp
                    </Button>
                </CardFooter>
              </Card>
            ))}
           </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center h-60">
            <Inbox className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold mt-4">No Inquiries Yet</h3>
            <p className="text-muted-foreground text-sm">
              When visitors request to book a recommendation, their inquiries will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

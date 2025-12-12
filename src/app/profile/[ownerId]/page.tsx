

'use server';

import { getFirebase } from '@/firebase/server-init';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Owner, FirestoreProperty } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Globe, Mail, Link as LinkIcon, Facebook, Instagram, Linkedin } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
        <path d="M17.472 14.382c-.297-.149-.88-.436-1.017-.487-.137-.05-.274-.074-.412.075-.137.149-.512.65-.627.785-.114.136-.23.15-.412.074-.182-.074-.767-.28-1.46-.906-.54-.486-.906-1.08-.99-1.254-.085-.174-.007-.26.067-.35.065-.08.149-.2.223-.274.074-.074.12-.12.18-.2.06-.08.03-.15-.015-.274-.045-.12-.41-.99-.56-1.355-.149-.364-.3-.31-.41-.31-.112 0-.274-.007-.41-.007-.137 0-.36.05-.546.274-.186.225-.7.695-.7 1.695s.725 1.97.82 2.12c.094.15.14.274.14.274.149.56 1.46 2.37 3.53 3.12.59.21.99.28 1.36.28.66 0 1.25-.28 1.44-.88.19-.6.19-1.1.13-1.25s-.18-.2-.36-.31zM12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 1.78.46 3.45 1.28 4.9L2.04 22l5.12-1.34c1.4.74 3 .12 4.72.12h.01c5.5 0 9.96-4.46 9.96-9.96s-4.46-9.96-9.96-9.96zM12 20.14c-1.6 0-3.13-.4-4.43-1.12l-.3-.18-3.3.86.88-3.2-.2-.32c-.8-1.34-1.28-2.9-1.28-4.54 0-4.5 3.63-8.14 8.14-8.14 2.25 0 4.35.88 5.9 2.42s2.4 3.65 2.4 5.9-1.08 4.35-2.42 5.9c-1.55 1.54-3.65 2.42-5.9 2.42z"/>
    </svg>
)

export default async function OwnerProfilePage({ params }: { params: { ownerId: string } }) {
    const { firestore } = await getFirebase();
    const { ownerId } = params;

    // Fetch owner data
    const ownerDocRef = doc(firestore, 'owners', ownerId);
    const ownerDoc = await getDoc(ownerDocRef);

    if (!ownerDoc.exists()) {
        notFound();
    }
    const owner = ownerDoc.data() as Owner;
    
    // Fetch owner's properties
    const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('ownerId', '==', ownerId),
        where('status', '==', 'published')
    );
    const propertiesSnapshot = await getDocs(propertiesQuery);
    const properties = propertiesSnapshot.docs.map(d => d.data() as FirestoreProperty);

    return (
        <div className="bg-muted min-h-screen p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Card>
                    <CardHeader className="text-center">
                        <Avatar className="h-32 w-32 border-4 border-primary/50 mx-auto">
                            <AvatarImage src={owner.photoURL} alt={owner.name} />
                            <AvatarFallback className="text-5xl">{owner.name?.charAt(0) || 'O'}</AvatarFallback>
                        </Avatar>
                        <CardTitle className="text-4xl font-headline mt-4">{owner.name}</CardTitle>
                        {owner.companyName && (
                            <p className="text-lg text-muted-foreground">{owner.companyName}</p>
                        )}
                         {owner.city && owner.country && (
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mt-2">
                                <Globe className="h-4 w-4"/> {owner.city}, {owner.country}
                            </p>
                        )}
                        {owner.description && (
                            <CardDescription className="max-w-2xl mx-auto pt-4 !text-base">
                                {owner.description}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex justify-center items-center gap-4">
                        {owner.phoneNumber && (
                            <Button asChild>
                                <a href={`https://wa.me/${owner.phoneNumber.replace(/[\s+()-]/g, '')}`} target="_blank" rel="noopener noreferrer">
                                    <WhatsAppIcon /> Contact via WhatsApp
                                </a>
                            </Button>
                        )}
                        {owner.email && (
                             <Button variant="outline" asChild>
                                <a href={`mailto:${owner.email}`}>
                                    <Mail className="mr-2 h-4 w-4" /> Contact via Email
                                </a>
                            </Button>
                        )}
                    </CardContent>
                    {(owner.facebookUrl || owner.instagramUrl || owner.linkedinUrl) && (
                         <CardFooter className="flex justify-center gap-4 border-t pt-6 mt-6">
                             {owner.facebookUrl && <a href={owner.facebookUrl} target="_blank" rel="noopener noreferrer"><Facebook className="h-6 w-6 text-muted-foreground hover:text-primary"/></a>}
                             {owner.instagramUrl && <a href={owner.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram className="h-6 w-6 text-muted-foreground hover:text-primary"/></a>}
                             {owner.linkedinUrl && <a href={owner.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin className="h-6 w-6 text-muted-foreground hover:text-primary"/></a>}
                         </CardFooter>
                    )}
                </Card>

                <div>
                    <h2 className="text-2xl font-bold font-headline mb-4">Properties</h2>
                    {properties.length > 0 ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {properties.map(prop => (
                                <Card key={prop.id} className="overflow-hidden flex flex-col">
                                    <div className="aspect-video relative bg-muted">
                                        {prop.media?.[0] && (
                                            <Image src={prop.media[0]} alt={prop.name} fill className="object-cover"/>
                                        )}
                                    </div>
                                    <div className="flex flex-col flex-1">
                                        <CardHeader>
                                            <CardTitle>{prop.name}</CardTitle>
                                            <CardDescription>{prop.address}</CardDescription>
                                        </CardHeader>
                                        <CardFooter className="mt-auto">
                                            <Button asChild variant="outline">
                                                <Link href={`/property/${prop.id}`}>View Property</Link>
                                            </Button>
                                        </CardFooter>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                            <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4"/>
                            <p>This host has no public properties listed at the moment.</p>
                        </div>
                    )}
                </div>
                 <Button asChild variant="link" className="w-full mt-8">
                    <Link href="/">Back to Home</Link>
                </Button>
            </div>
        </div>
    );
}

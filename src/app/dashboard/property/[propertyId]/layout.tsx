
'use client';

import { useMemo, useEffect, useRef } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, useDoc, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { useParams, useRouter } from 'next/navigation';
import { FirestoreProperty } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Download, QrCode, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/ui/badge';
import PropertyManagementNav from './sidebar';
import { useToast } from '@/hooks/use-toast';

export default function PropertyManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const propertyId = params.propertyId as string;
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const propertyRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'properties', propertyId) : null),
    [firestore, propertyId]
  );
  
  const {
    data: firestoreProperty,
    isLoading: isPropertyLoading,
    error: propertyError,
  } = useDoc<FirestoreProperty>(propertyRef);
  
  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;


  useEffect(() => {
    if (isUserLoading || isSuperAdminLoading || isPropertyLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    // If the property is loaded, and the user is NOT a superadmin AND they don't own the property, redirect.
    if (firestoreProperty && !isSuperAdmin && user.uid !== firestoreProperty.ownerId) {
      toast({ variant: 'destructive', title: 'Access Denied' });
      router.push('/dashboard');
    }
  }, [user, isUserLoading, isPropertyLoading, firestoreProperty, isSuperAdmin, isSuperAdminLoading, router, toast]);

  const handleDownloadQR = () => {
    if (qrCodeRef.current) {
        const svgElement = qrCodeRef.current.querySelector('svg');
        if (svgElement) {
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                if (!ctx) return;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const pngFile = canvas.toDataURL('image/png');
                
                const downloadLink = document.createElement('a');
                downloadLink.download = `${firestoreProperty?.name?.replace(/\s+/g, '_') ?? 'property'}-qr-code.png`;
                downloadLink.href = pngFile;
                downloadLink.click();
            };

            img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
        }
    }
  };

  const handleCopyId = () => {
    if (navigator.clipboard && window.isSecureContext) {
      // Modern clipboard API
      navigator.clipboard.writeText(propertyId).then(() => {
        toast({
            title: "Property ID Copied!",
            description: "You can now share this ID with your visitors.",
        });
      }).catch(err => {
        console.error("Failed to copy text: ", err);
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy the ID to your clipboard.",
        });
      });
    } else {
      // Fallback for insecure contexts or older browsers
      const textArea = document.createElement("textarea");
      textArea.value = propertyId;
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast({
            title: "Property ID Copied!",
            description: "You can now share this ID with your visitors.",
        });
      } catch (err) {
        console.error("Failed to copy text: ", err);
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy the ID to your clipboard.",
        });
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  if (isUserLoading || isPropertyLoading || isSuperAdminLoading) {
    return (
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_250px]">
          <div>
            <Skeleton className="h-40 w-full" />
             <Skeleton className="h-12 w-full mt-8" />
             <Skeleton className="h-64 w-full mt-4" />
          </div>
          <div>
             <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (propertyError || !firestoreProperty) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Alert variant="destructive" className="w-full max-w-lg">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Property Not Found</AlertTitle>
          <AlertDescription>
            The property with ID "{propertyId}" could not be loaded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (user && firestoreProperty && !isSuperAdmin && user.uid !== firestoreProperty.ownerId) {
    return null; // Redirecting
  }

  const backLink = isSuperAdmin ? '/dashboard/admin/properties' : '/dashboard/properties';

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
                 <Button variant="outline" size="sm" asChild className="mb-4">
                    <Link href={backLink}>&larr; Back to All Properties</Link>
                </Button>
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-headline font-bold tracking-tight">{firestoreProperty.name}</h1>
                    {firestoreProperty.status === 'draft' && (
                        <Badge variant="outline" className="text-base">Draft</Badge>
                    )}
                </div>
                <p className="text-muted-foreground">{firestoreProperty.address}</p>
                <div className="flex items-center gap-2 mt-2">
                    <p className="font-mono text-sm bg-muted text-muted-foreground px-2 py-1 rounded-md">{propertyId}</p>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyId}>
                        <Copy className="h-4 w-4"/>
                        <span className="sr-only">Copy Property ID</span>
                    </Button>
                </div>
            </div>
            <Card className="lg:col-span-1 w-full max-w-xs">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><QrCode /> Property QR Code</CardTitle>
                    <CardDescription>Scan this to instantly access the digital concierge. Disabled for drafts.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <div ref={qrCodeRef} className={`p-4 bg-white rounded-lg border ${firestoreProperty.status === 'draft' ? 'opacity-25' : ''}`}>
                         <QRCodeSVG 
                            value={`${window.location.origin}/property/${propertyId}`}
                            size={128} 
                            level="H"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleDownloadQR} disabled={firestoreProperty.status === 'draft'} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </header>
      
      <div className="space-y-8">
        <PropertyManagementNav property={firestoreProperty} />
        <div className="grid gap-6">
            {children}
        </div>
      </div>
    </main>
  );
}

    
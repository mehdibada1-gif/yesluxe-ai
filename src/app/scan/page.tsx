
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CameraOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ScanPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleDecode = (result: string) => {
    let propertyId = '';
    try {
      // Handle full URLs by extracting the last path segment
      if (result.startsWith('http')) {
        const url = new URL(result);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        propertyId = pathSegments[pathSegments.length - 1];
      } else {
        // Assume the result is just the ID
        propertyId = result.trim();
      }
    } catch (e) {
      // If URL parsing fails, assume the result is the ID
      propertyId = result.trim();
    }

    if (propertyId) {
      toast({
        title: 'QR Code Scanned!',
        description: `Redirecting to property...`,
      });
      router.push(`/property/${propertyId}`);
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner Error:', error);
    let description = 'An unknown error occurred. Please try again.';
    if (error?.name === 'NotAllowedError') {
        description = 'Camera access was denied. Please enable camera permissions in your browser settings to scan a QR code.';
    } else if (error?.name === 'NotFoundError') {
        description = 'No camera was found on this device. Please use a device with a camera.';
    } else if (error?.name === 'NotReadableError') {
        description = 'The camera is currently in use by another application or could not be accessed.';
    }
    
    toast({
        variant: 'destructive',
        title: 'Camera Error',
        description: description,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 relative">
       <div className="absolute top-4 left-4 z-20">
        <Button asChild variant="outline" size="icon">
          <Link href="/">
            <ArrowLeft />
            <span className="sr-only">Back to Home</span>
          </Link>
        </Button>
      </div>
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/20 shadow-xl z-10">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-4xl">Scan QR Code</CardTitle>
          <CardDescription className="text-foreground/60 pt-2">
            Center the property's QR code in the frame below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted border-2 border-dashed flex items-center justify-center relative">
            <QrScanner
              onDecode={handleDecode}
              onError={handleError}
              containerStyle={{ width: '100%', height: '100%', paddingTop: 0 }}
              videoStyle={{ width: '100%', height: '100%', objectFit: 'cover' }}
              scanDelay={500}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-3/4 border-4 border-primary/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

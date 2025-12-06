'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QrCode, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function VisitorHomePage() {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState('');

  const handlePropertyIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (propertyId.trim()) {
      router.push(`/property/${propertyId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-background z-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,180,98,0.15),rgba(255,255,255,0))]"></div>
        </div>
        
      <div className="absolute top-4 right-4 z-10">
        <Button asChild variant="ghost" className="text-foreground/80 hover:text-foreground">
          <Link href="/login">Owner Access</Link>
        </Button>
      </div>
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/20 shadow-xl z-10">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-4xl">Digital Concierge</CardTitle>
          <CardDescription className="text-foreground/60 pt-2">Enter your property code to access your personalized guide.</CardDescription>
        </CardHeader>
        <form onSubmit={handlePropertyIdSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property-id" className="text-foreground/80">Property Code</Label>
              <Input
                id="property-id"
                placeholder="e.g., PROP123"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="bg-input/50 h-12 text-center text-lg tracking-widest"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold">
              Enter
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                    Or
                    </span>
                </div>
            </div>
          <Button asChild variant="secondary" className="w-full h-12 text-base font-semibold">
            <Link href="/scan">
                <QrCode className="mr-2 h-5 w-5" />
                Scan QR Code
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

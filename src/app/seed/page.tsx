
'use client';

import { useState } from 'react';
import { useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SeedSuperAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const functions = useFunctions();
  const { toast } = useToast();

  const handleGrantAccess = async () => {
    if (!functions) {
      toast({
        variant: 'destructive',
        title: 'Firebase Functions not available',
        description: 'Please try again later.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const seedSuperAdmin = httpsCallable(functions, 'seedSuperAdmin');
      const result = await seedSuperAdmin();
      
      console.log('Callable function result:', result.data);
      
      toast({
        title: 'SuperAdmin Role Granted!',
        description: 'The background process to grant SuperAdmin access has completed.',
      });
      setIsDone(true);
    } catch (error: any) {
      console.error('Error calling seedSuperAdmin function:', error);
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: error.message || 'Could not trigger the SuperAdmin grant. Check the console for details.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>SuperAdmin Seeding</CardTitle>
          <CardDescription>
            This is a one-time action to grant SuperAdmin privileges to the designated user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isDone ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <ShieldCheck className="h-16 w-16 text-green-500" />
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Process Triggered Successfully</h3>
                <p className="text-muted-foreground">
                  The user with UID `...{ 'oxbghgSluMPPYfdDVse56yghigr2'.slice(-6)}` has been granted SuperAdmin access. You may now delete this page.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-warning-foreground/20 bg-warning/10 p-4">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-yellow-400">Warning</h4>
                    <p className="text-sm text-yellow-400/80">
                      This action will modify security roles in your database. Only proceed if you are authorized to do so. This action can only be performed once.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Clicking the button below will trigger a secure Cloud Function to create a SuperAdmin document for the user with UID: <br />
                <span className="font-mono text-xs bg-muted p-1 rounded-md">
                  oxbghgSluMPPYfdDVse56yghigr2
                </span>
              </p>
              <Button
                className="w-full"
                onClick={handleGrantAccess}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Grant SuperAdmin Role
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

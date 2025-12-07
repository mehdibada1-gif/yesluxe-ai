'use client';

import { useState, useTransition } from 'react';
import { useAuth } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCollectionData } from '../data-audit-actions';
import { Loader2, Database, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function DataAuditPage() {
    const [path, setPath] = useState('');
    const [data, setData] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isFetching, startFetching] = useTransition();
    const { toast } = useToast();
    const auth = useAuth();

    const handleFetchData = async () => {
        if (!auth?.currentUser) {
            toast({ variant: 'destructive', title: 'Not authenticated!' });
            return;
        }

        setError(null);
        setData(null);
        startFetching(async () => {
            try {
                // Get the current user's ID token to pass for server-side verification
                const idToken = await auth.currentUser!.getIdToken();

                // Create a temporary fetch override to add the Authorization header
                const originalFetch = global.fetch;
                global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
                    const headers = new Headers(init?.headers);
                    headers.set('Authorization', `Bearer ${idToken}`);
                    return originalFetch(input, { ...init, headers });
                };

                const result = await getCollectionData(path);
                
                // Restore the original fetch function
                global.fetch = originalFetch;

                if (result.success) {
                    setData(result.data);
                    toast({ title: `Found ${result.data.length} document(s).` });
                } else {
                    setError(result.error || 'An unknown error occurred.');
                }
            } catch (e: any) {
                setError(e.message || 'Failed to fetch data.');
            }
        });
    };

    return (
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-headline font-bold tracking-tight">Data Audit Tool</h1>
                    <p className="text-muted-foreground">
                        Inspect raw Firestore data from any collection path. This is a privileged, read-only action.
                    </p>
                </header>
                
                <Card>
                    <CardHeader>
                        <CardTitle>Fetch Collection Data</CardTitle>
                        <CardDescription>
                            Enter the exact path to a collection or sub-collection (e.g., `properties` or `properties/PROP_ID/reviews`).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-start gap-2">
                        <Input
                            placeholder="Enter collection path..."
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            disabled={isFetching}
                            onKeyDown={(e) => e.key === 'Enter' && handleFetchData()}
                        />
                        <Button onClick={handleFetchData} disabled={isFetching || !path}>
                            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Fetch
                        </Button>
                    </CardContent>
                </Card>

                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {data && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Results for: <span className="font-mono text-base bg-muted px-2 py-1 rounded-md">{path}</span></CardTitle>
                            <CardDescription>
                                {data.length} document(s) found.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96 w-full rounded-md border">
                                <pre className="p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                )}

                 {isFetching && (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
            </div>
        </main>
    );
}

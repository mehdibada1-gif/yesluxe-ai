
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Owner } from '@/lib/types';
import { Loader2, Users, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function OwnersListPage() {
    const firestore = useFirestore();

    const ownersQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'owners')) : null),
        [firestore]
    );
    const { data: owners, isLoading } = useCollection<Owner>(ownersQuery);

    if (isLoading) {
        return (
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-full min-h-[calc(100vh-10rem)]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-headline font-bold tracking-tight">All Owners</h1>
                    <p className="text-muted-foreground">
                        A list of all registered property owners on the platform.
                    </p>
                </header>

                <Card>
                    <CardContent className="p-0">
                        {owners && owners.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Subscription</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {owners.map(owner => (
                                        <TableRow key={owner.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={owner.photoURL} alt={owner.name} />
                                                        <AvatarFallback>{owner.name?.charAt(0) || owner.email.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold">{owner.name}</p>
                                                        <p className="text-xs text-muted-foreground">{owner.companyName || 'No company'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{owner.email}</div>
                                                <div className="text-sm text-muted-foreground">{owner.phoneNumber || 'No phone'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={owner.subscriptionTier === 'premium' ? 'default' : 'secondary'} className="capitalize">
                                                    {owner.subscriptionTier}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                 <Link href={`/owner/${owner.id}`} target="_blank">
                                                    View Profile
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <p>No owners found.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

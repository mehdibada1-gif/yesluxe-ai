
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { Loader2, ShieldCheck, UserPlus, Users, ShieldAlert, Database, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Owner } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFunctions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';


function SuperAdminList({ isSuperAdmin }: { isSuperAdmin: boolean }) {
    const firestore = useFirestore();
    const functions = useFunctions();
    const { toast } = useToast();
    const { user } = useUser();
    
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const superAdminsQuery = useMemoFirebase(
      () => (firestore && isSuperAdmin ? query(collection(firestore, 'superAdmins')) : null),
      [firestore, isSuperAdmin]
    );
    const { data: superAdminDocs, isLoading: areSuperAdminsLoading } = useCollection(superAdminsQuery);

    const [superAdminOwners, setSuperAdminOwners] = useState<Owner[]>([]);
    const [isLoadingOwners, setIsLoadingOwners] = useState(true);

    useEffect(() => {
        const fetchOwners = async () => {
            if (firestore && superAdminDocs) {
                setIsLoadingOwners(true);
                const ownerIds = superAdminDocs.map(admin => admin.id);
                if (ownerIds.length > 0) {
                    const ownersRef = collection(firestore, 'owners');
                    // Firestore 'in' queries are limited to 30 items. For a larger app, pagination would be needed.
                    const ownersQuery = query(ownersRef, where('__name__', 'in', ownerIds));
                    const ownerSnapshots = await getDocs(ownersQuery);
                    const owners = ownerSnapshots.docs.map(d => d.data() as Owner);
                    setSuperAdminOwners(owners);
                } else {
                    setSuperAdminOwners([]);
                }
                setIsLoadingOwners(false);
            }
        };
        fetchOwners();
    }, [firestore, superAdminDocs]);

    const handleRevokeAccess = async (email: string, id: string) => {
        if (!functions) {
            toast({ variant: 'destructive', title: 'Functions service not available.' });
            return;
        }
        setRevokingId(id);
        try {
            const setSuperAdmin = httpsCallable(functions, 'setSuperAdmin');
            const result = await setSuperAdmin({ email: email, grant: false });
            
            const data = result.data as { success: boolean; message: string };

            if (data.success) {
                toast({ title: 'Success!', description: data.message });
            } else {
                toast({ variant: 'destructive', title: 'Revoking Failed', description: data.message });
            }
        } catch (error: any) {
            console.error("Error calling setSuperAdmin function:", error);
            toast({
                variant: 'destructive',
                title: 'Request Failed',
                description: error.message || 'Could not revoke SuperAdmin role. Check the logs.',
            });
        } finally {
            setRevokingId(null);
        }
    };
    
    const isLoading = areSuperAdminsLoading || isLoadingOwners;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Current SuperAdmins</CardTitle>
                <CardDescription>A list of all users with SuperAdmin privileges.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin"/>
                    </div>
                ) : superAdminOwners.length > 0 ? (
                    <div className="space-y-4">
                        {superAdminOwners.map(admin => (
                            <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={admin.photoURL} alt={admin.name}/>
                                        <AvatarFallback>{admin.name?.charAt(0) || admin.email.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{admin.name}</p>
                                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    onClick={() => handleRevokeAccess(admin.email, admin.id)}
                                    disabled={revokingId === admin.id || user?.uid === admin.id}
                                    title={user?.uid === admin.id ? "You cannot revoke your own access" : "Revoke SuperAdmin access"}
                                >
                                    {revokingId === admin.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                                    Revoke
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No SuperAdmins found.</p>
                )}
            </CardContent>
        </Card>
    )
}


export default function AdminPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  // Securely check if the current user is a SuperAdmin.
  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;

  useEffect(() => {
    if (!isUserLoading && !isSuperAdminLoading && !isSuperAdmin) {
      toast({ variant: 'destructive', title: 'Access Denied' });
      router.push('/dashboard');
    }
  }, [isUserLoading, isSuperAdminLoading, isSuperAdmin, toast, router]);
  
  const handleGrantAccess = async () => {
    if (!functions) {
        toast({ variant: 'destructive', title: 'Functions service not available.' });
        return;
    }
    if (!newAdminEmail) {
        toast({ variant: 'destructive', title: 'Email is required.' });
        return;
    }

    setIsGranting(true);
    try {
        const setSuperAdmin = httpsCallable(functions, 'setSuperAdmin');
        const result = await setSuperAdmin({ email: newAdminEmail, grant: true });
        
        const data = result.data as { success: boolean; message: string };

        if (data.success) {
            toast({ title: 'Success!', description: data.message });
            setNewAdminEmail('');
        } else {
             toast({ variant: 'destructive', title: 'Granting Failed', description: data.message });
        }
    } catch (error: any) {
        console.error("Error calling setSuperAdmin function:", error);
        toast({
            variant: 'destructive',
            title: 'Request Failed',
            description: error.message || 'Could not grant SuperAdmin role. Check the logs.',
        });
    } finally {
        setIsGranting(false);
    }
  };

  const isLoading = isUserLoading || isSuperAdminLoading;

  if (isLoading) {
     return (
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-center h-full min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }
  
  if (!isSuperAdmin) return null; // Redirecting

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-headline font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage SuperAdmin privileges and platform-wide settings.
          </p>
        </header>
        
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldAlert /> Content Moderation</CardTitle>
                    <CardDescription>View and manage reported reviews from across the platform.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/moderation">Go to Moderation Center</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Database /> Data Audit Tool</CardTitle>
                    <CardDescription>Inspect raw data from any collection in the database.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/data-audit">Go to Data Audit</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <SuperAdminList isSuperAdmin={isSuperAdmin} />

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus /> Grant SuperAdmin Role</CardTitle>
                <CardDescription>Enter the email address of an existing property owner to promote them to a SuperAdmin.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
                <Input 
                    type="email"
                    placeholder="owner.to.promote@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    disabled={isGranting}
                />
                <Button onClick={handleGrantAccess} disabled={isGranting || !newAdminEmail}>
                    {isGranting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                    Grant Access
                </Button>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}

    
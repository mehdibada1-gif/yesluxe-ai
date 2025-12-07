
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { Loader2, ShieldCheck, UserPlus, Users, ShieldAlert, Database, Trash2, Building, PlusCircle, Send } from 'lucide-react';
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
      () => (firestore ? query(collection(firestore, 'superAdmins')) : null),
      [firestore]
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
        // Only fetch if the query is ready and has results
        if(isSuperAdmin && superAdminDocs) {
            fetchOwners();
        } else if (!areSuperAdminsLoading) {
            // If not a super admin or no docs, stop loading
            setIsLoadingOwners(false);
        }
    }, [firestore, superAdminDocs, isSuperAdmin, areSuperAdminsLoading]);

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


export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();
  
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
        if (user) {
            try {
                // Force a refresh of the ID token to get the latest custom claims.
                const idTokenResult = await user.getIdTokenResult(true);
                const isAdmin = idTokenResult.claims.superAdmin === true;
                setIsSuperAdmin(isAdmin);
                
                if (!isAdmin) {
                    toast({ variant: 'destructive', title: 'Access Denied' });
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error("Error checking admin status:", error);
                setIsSuperAdmin(false);
                router.push('/dashboard');
            }
        }
        setIsCheckingAdmin(false);
    };
    
    if (!isUserLoading) {
        if (!user) {
            router.push('/login');
        } else {
            checkAdminStatus();
        }
    }
  }, [user, isUserLoading, router, toast]);
  
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

  const isLoading = isUserLoading || isCheckingAdmin;

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
          <h1 className="text-3xl font-headline font-bold tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, properties, content, and platform-wide settings from one place.
          </p>
        </header>
        
        <div className="grid md:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users /> All Owners</CardTitle>
                    <CardDescription>View all registered owners on the platform.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/owners">Manage Owners</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building /> All Properties</CardTitle>
                    <CardDescription>View, edit, and manage all properties on the platform.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/properties">Manage Properties</Link>
                    </Button>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldAlert /> Content Moderation</CardTitle>
                    <CardDescription>Review and manage reported reviews from across the platform.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/moderation">Go to Moderation</Link>
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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Send /> Sales Inquiries</CardTitle>
                    <CardDescription>Manage contact requests for the Premium plan.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/admin/sales">Manage Inquiries</Link>
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

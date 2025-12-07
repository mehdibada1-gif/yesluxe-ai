
'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, doc, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, PlusCircle } from 'lucide-react';
import { FirestoreProperty, Owner } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default function AdminPropertiesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [owners, setOwners] = useState<Map<string, Owner>>(new Map());
  const [isLoadingOwners, setIsLoadingOwners] = useState(true);
  const [filter, setFilter] = useState('');

  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;

  // This query is only for SuperAdmins, fetching ALL properties.
  const propertiesQuery = useMemoFirebase(
    () => {
      if (!firestore || !isSuperAdmin) return null;
      return collection(firestore, 'properties');
    },
    [firestore, isSuperAdmin]
  );

  const { data: properties, isLoading: arePropertiesLoading } = useCollection<FirestoreProperty>(propertiesQuery);

  useEffect(() => {
    if (!isUserLoading && !isSuperAdminLoading && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, isSuperAdmin, isSuperAdminLoading, router]);

  useEffect(() => {
    const fetchOwners = async () => {
      if (!firestore || !properties) return;

      const ownerIds = [...new Set(properties.map(p => p.ownerId))];
      if (ownerIds.length === 0) {
        setIsLoadingOwners(false);
        return;
      }

      try {
        const ownersQuery = query(collection(firestore, 'owners'));
        const ownersSnapshot = await getDocs(ownersQuery);
        const ownersMap = new Map<string, Owner>();
        ownersSnapshot.forEach(doc => {
          ownersMap.set(doc.id, doc.data() as Owner);
        });
        setOwners(ownersMap);
      } catch (e) {
        console.error("Failed to fetch owners", e);
      } finally {
        setIsLoadingOwners(false);
      }
    };
    if (properties) {
      fetchOwners();
    }
  }, [properties, firestore]);

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    if (!filter) return properties;
    return properties.filter(p => {
      const ownerName = owners.get(p.ownerId)?.name || '';
      return p.name.toLowerCase().includes(filter.toLowerCase()) ||
             ownerName.toLowerCase().includes(filter.toLowerCase()) ||
             p.address.toLowerCase().includes(filter.toLowerCase());
    });
  }, [properties, owners, filter]);

  const isLoading = isUserLoading || isSuperAdminLoading || arePropertiesLoading || isLoadingOwners;

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
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold tracking-tight">All Platform Properties</h1>
                <p className="text-muted-foreground">A global view of every property on the platform.</p>
            </div>
             <Button asChild>
                <Link href="/dashboard/properties/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Property
                </Link>
            </Button>
        </header>

        <Card>
          <CardContent className="p-4">
             <div className="flex justify-end mb-4">
                <Input 
                    placeholder="Filter by name, owner, or address..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.length > 0 ? (
                  filteredProperties.map(property => {
                    const owner = owners.get(property.ownerId);
                    return (
                      <TableRow key={property.id}>
                        <TableCell className="font-medium">{property.name}</TableCell>
                        <TableCell>{owner?.name || property.ownerId}</TableCell>
                        <TableCell>
                          <Badge variant={property.status === 'published' ? 'default' : 'secondary'}>
                            {property.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{property.address}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/property/${property.id}/edit`}>Manage</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No properties found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

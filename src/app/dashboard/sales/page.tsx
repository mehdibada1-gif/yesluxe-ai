'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useMemoFirebase, useCollectionGroup, errorEmitter, FirestorePermissionError, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collectionGroup, query, orderBy, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Inbox, Mail, Send } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type SalesInquiry = {
  id: string;
  name: string;
  email: string;
  companyName?: string;
  message: string;
  status: 'new' | 'contacted';
  createdAt: Timestamp;
  ownerId: string;
};

export default function SalesInquiriesPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // Securely check if the current user is a SuperAdmin.
  const superAdminRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'superAdmins', user.uid) : null),
    [firestore, user]
  );
  const { data: superAdminDoc, isLoading: isSuperAdminLoading } = useDoc(superAdminRef);
  const isSuperAdmin = !!superAdminDoc;

  // This effect ensures only SuperAdmins can access this page
  useEffect(() => {
    if (!isUserLoading && !isSuperAdminLoading && !isSuperAdmin) {
        toast({ variant: 'destructive', title: 'Access Denied' });
        router.push('/dashboard');
    }
  }, [user, isUserLoading, isSuperAdmin, isSuperAdminLoading, router, toast]);

  const inquiriesQuery = useMemoFirebase(
    () =>
      firestore && isSuperAdmin
        ? query(collectionGroup(firestore, 'inquiries'), orderBy('createdAt', 'desc'))
        : null,
    [firestore, isSuperAdmin]
  );
  
  const { data: inquiries, isLoading: areInquiriesLoading } = useCollectionGroup<SalesInquiry>(inquiriesQuery);

  const handleStatusChange = async (inquiry: SalesInquiry, newStatus: 'new' | 'contacted') => {
    if (!firestore) return;
    
    const inquiryRef = doc(firestore, 'owners', inquiry.ownerId, 'inquiries', inquiry.id);
    const updatedData = { status: newStatus };

    try {
      await updateDoc(inquiryRef, updatedData);
      toast({
        title: 'Status Updated',
        description: `Inquiry from ${inquiry.name} marked as ${newStatus}.`,
      });
    } catch (serverError) {
      const permissionError = new FirestorePermissionError({
        path: inquiryRef.path,
        operation: 'update',
        requestResourceData: updatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const isLoading = isUserLoading || areInquiriesLoading || isSuperAdminLoading;

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Sales Inquiries</h1>
          <p className="text-muted-foreground">
            Manage contact requests from owners interested in the Premium plan.
          </p>
        </header>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 h-80">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : inquiries && inquiries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inquiries.map((inquiry) => (
                    <TableRow key={inquiry.id}>
                      <TableCell>
                        <div className="font-medium">{inquiry.name}</div>
                        <div className="text-sm text-muted-foreground">{inquiry.email}</div>
                      </TableCell>
                      <TableCell>{inquiry.companyName || 'N/A'}</TableCell>
                      <TableCell className="max-w-sm truncate">{inquiry.message}</TableCell>
                      <TableCell>{format(inquiry.createdAt.toDate(), 'PP')}</TableCell>
                      <TableCell>
                        <Select
                          value={inquiry.status}
                          onValueChange={(value: 'new' | 'contacted') =>
                            handleStatusChange(inquiry, value)
                          }
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">
                              <Badge variant="destructive" className="w-full justify-center">New</Badge>
                            </SelectItem>
                            <SelectItem value="contacted">
                              <Badge variant="secondary" className="w-full justify-center">Contacted</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <a href={`mailto:${inquiry.email}?subject=Re: Your Inquiry for the Premium Plan`}>
                          <Mail className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-center h-80">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold mt-4">No Inquiries Yet</h3>
                <p className="text-muted-foreground text-sm">
                  When owners inquire about the Premium plan, their messages will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
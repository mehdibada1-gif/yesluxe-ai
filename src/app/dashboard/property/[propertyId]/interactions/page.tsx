'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ManageInteractionsPage from '../_components/interactions-page';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

export default function InteractionsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor Interactions</CardTitle>
        <CardDescription>
          Review the conversation logs between visitors and the AI concierge.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
          <ManageInteractionsPage />
        </Suspense>
      </CardContent>
    </Card>
  );
}

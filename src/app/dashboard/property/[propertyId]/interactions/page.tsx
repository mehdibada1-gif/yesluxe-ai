'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import ManageInteractionsPage from '../_components/interactions-page';

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
        <ManageInteractionsPage />
      </CardContent>
    </Card>
  );
}

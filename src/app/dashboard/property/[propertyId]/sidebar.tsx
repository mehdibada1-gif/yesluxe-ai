'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FirestoreProperty } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit,
  Star,
  ExternalLink,
  Sparkles,
  HelpCircle,
  MessagesSquare,
  Gauge,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PropertyManagementNavProps {
  property: FirestoreProperty;
}

export default function PropertyManagementNav({
  property,
}: PropertyManagementNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      value: 'edit',
      href: `/dashboard/property/${property.id}/edit`,
      label: 'Details & Media',
      icon: Edit,
    },
    {
      value: 'faqs',
      href: `/dashboard/property/${property.id}/faqs`,
      label: 'Manage FAQs',
      icon: HelpCircle,
    },
    {
      value: 'recommendations',
      href: `/dashboard/property/${property.id}/recommendations`,
      label: 'Recommendations',
      icon: Sparkles,
    },
    {
      value: 'bookings',
      href: `/dashboard/property/${property.id}/bookings`,
      label: 'Booking Inquiries',
      icon: Send,
    },
    {
      value: 'reviews',
      href: `/dashboard/property/${property.id}/reviews`,
      label: 'Reviews',
      icon: Star,
    },
     {
      value: 'interactions',
      href: `/dashboard/property/${property.id}/interactions`,
      label: 'Interactions',
      icon: MessagesSquare,
    },
     {
      value: 'usage',
      href: `/dashboard/property/${property.id}/usage`,
      label: 'Usage',
      icon: Gauge,
    },
  ];

  // Determine the current active tab value from the path
  const activeTab = navItems.find(item => pathname.startsWith(item.href))?.value || 'edit';

  const handleValueChange = (value: string) => {
    const item = navItems.find(item => item.value === value);
    if (item) {
        router.push(item.href);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={handleValueChange} className="w-full md:w-auto">
        <TabsList className="h-auto flex-wrap justify-start">
            {navItems.map(item => (
            <TabsTrigger key={item.value} value={item.value} className="gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
            </TabsTrigger>
            ))}
        </TabsList>
        </Tabs>
        {property.status === 'published' && (
            <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/property/${property.id}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public Page
            </Link>
            </Button>
        )}
    </div>
  );
}

    
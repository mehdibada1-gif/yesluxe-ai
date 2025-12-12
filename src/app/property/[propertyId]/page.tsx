
import { notFound } from 'next/navigation';
import type { Property } from '@/lib/types';
import PropertyPageClient from './page-client';
import { getPropertyData } from '@/lib/server-actions/get-property-data';

export default async function PropertyPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const property = await getPropertyData(params.propertyId);

  if (!property) {
    notFound();
  }
  
  return <PropertyPageClient property={property} />;
}

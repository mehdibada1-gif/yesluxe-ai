
import { getFirebase } from '@/firebase/server-init';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { Owner, FirestoreProperty } from '@/lib/types';
import OwnerProfileClientPage from './page-client';


export default async function OwnerProfilePage({ params }: { params: { ownerId: string } }) {
    const { firestore } = await getFirebase();
    const { ownerId } = params;

    // Fetch owner data
    const ownerDocRef = doc(firestore, 'owners', ownerId);
    const ownerDoc = await getDoc(ownerDocRef);

    if (!ownerDoc.exists()) {
        notFound();
    }
    const owner = ownerDoc.data() as Owner;
    
    // Fetch owner's properties
    const propertiesQuery = query(
        collection(firestore, 'properties'),
        where('ownerId', '==', ownerId),
        where('status', '==', 'published')
    );
    const propertiesSnapshot = await getDocs(propertiesQuery);
    const properties = propertiesSnapshot.docs.map(d => d.data() as FirestoreProperty);

    return <OwnerProfileClientPage owner={owner} properties={properties} />;
}


'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  collectionGroup,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirestore } from '..';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    },
    collectionGroup: string | null;
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Default to true
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    if (!memoizedTargetRefOrQuery || !firestore) {
      setData(null);
      setIsLoading(true); // Explicitly set loading to true when query is not ready
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Directly use memoizedTargetRefOrQuery as it's assumed to be the final query
    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        let path: string = 'unknown_path'; // Default path to prevent error

        try {
            if (memoizedTargetRefOrQuery.type === 'collection') {
              path = (memoizedTargetRefOrQuery as CollectionReference).path;
            } else if (memoizedTargetRefOrQuery.type === 'query') {
              // This is a safer way to access the path for queries.
              path = (memoizedTargetRefOrQuery as any)._query.path.segments.join('/');
            }
        } catch (e) {
            // If path extraction fails, we keep the default 'unknown_path'.
            console.error("Could not extract path from Firestore query for error reporting:", e);
        }
    
        const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
        })
    
        setError(contextualError)
        setData(null)
        setIsLoading(false)
    
        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery, firestore]); // Re-run if the target query/reference changes or firestore becomes available
  
  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}


/**
 * React hook to subscribe to a Firestore collection group query in real-time.
 * @template T Type of the document data.
 * @param {Query<DocumentData> | null | undefined} query - The Firestore collectionGroup query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollectionGroup<T = any>(
  memoizedQuery: (Query<DocumentData> & {__memo?: boolean}) | null | undefined
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const firestore = useFirestore();

  useEffect(() => {
    // If the query is not ready or firestore is not available, don't do anything.
    if (!memoizedQuery || !firestore) {
      setData(null);
      setIsLoading(true);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(memoizedQuery, 
      (snapshot) => {
        const results = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id, ...('ownerId' in doc.data() ? {} : { ownerId: doc.ref.parent.parent?.id }) }));
        setData(results);
        setIsLoading(false);
      },
      (err) => {
        console.error("useCollectionGroup error:", err);
        setError(err);
        setIsLoading(false);

        // This is a robust way to get the collection ID for the error message
        const collectionId = (memoizedQuery as any)._query.collectionGroup;

        if (collectionId) {
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path: `collectionGroup(${collectionId})`,
          });
          errorEmitter.emit('permission-error', contextualError);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery, firestore]);
  
  if(memoizedQuery && !memoizedQuery.__memo) {
    throw new Error(memoizedQuery + ' was not properly memoized using useMemoFirebase');
  }

  return { data, isLoading, error };
}

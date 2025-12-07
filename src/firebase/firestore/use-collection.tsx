
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

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
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

        // SAFELY try to get the path; the internal structure might be missing 
        // when a security rule error occurs, which is what caused the crash.
        try {
            path = 
                memoizedTargetRefOrQuery.type === 'collection'
                    ? (memoizedTargetRefOrQuery as CollectionReference).path
                    : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()
        } catch (e) {
            // If the path extraction fails, we keep the default 'unknown_path'.
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
  }, [memoizedTargetRefOrQuery]); // Re-run if the target query/reference changes.
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

  useEffect(() => {
    // If the query is not ready, don't do anything.
    if (!memoizedQuery) {
      setData(null);
      setIsLoading(false);
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
  }, [memoizedQuery]);
  
  if(memoizedQuery && !memoizedQuery.__memo) {
    throw new Error(memoizedQuery + ' was not properly memoized using useMemoFirebase');
  }

  return { data, isLoading, error };
}

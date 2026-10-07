export * from './category';
export * from './product';
export * from './audit-log';
export * from './admin';

/** Document Firestore avec son identifiant. */
export type WithId<T> = T & { id: string };

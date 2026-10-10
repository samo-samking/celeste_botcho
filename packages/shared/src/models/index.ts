export * from './category';
export * from './product';
export * from './audit-log';
export * from './admin';

/** Document Firestore avec son identifiant. */
export type WithId<T> = T & { id: string };
export * from './settings';
export * from './order';
export * from './order-tracking';
export * from './message';
export * from './promotion';

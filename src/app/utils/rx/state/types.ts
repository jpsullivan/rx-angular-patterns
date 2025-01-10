import { LoadingState } from './loading-state.interface';

export type WithContext<T> = LoadingState & {
  value: T;
  error?: boolean;
  complete?: boolean;
};

/**
 * Represents a collection of domain entities where both the collection itself and each individual entity
 * maintains contextual information about its state (loading, errors, etc).
 *
 * This type combines:
 * 1. A dictionary/record of entities keyed by their ID
 * 2. Context tracking for each individual entity (loading, error states)
 * 3. Context tracking for operations on the entire collection
 *
 * @example
 * // Collection loading state
 * { loading: true, value: {}, error: null }
 *
 * // Collection with entities
 * {
 *   loading: false,
 *   value: {
 *     "123": { loading: false, value: { id: "123", name: "Todo" }, error: null },
 *     "456": { loading: true, value: null, error: null }
 *   },
 *   error: null
 * }
 */
export type EntityContextCollection<T> = WithContext<
  Record<string, WithContext<T>>
>;

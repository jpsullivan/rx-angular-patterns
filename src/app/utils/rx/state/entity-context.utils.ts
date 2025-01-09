import { patch } from '@rx-angular/cdk/transformations';
import { EntityContextCollection, WithContext } from './types';

/**
 * Creates an empty context state with default values.
 * Used to ensure we always have a valid state structure even before any data is loaded.
 *
 * @returns A WithContext object with an empty value and no loading state
 */
export const createInitialContext = <T>(): WithContext<T> => ({
  value: {} as T,
  loading: false,
});

/**
 * Creates a properly structured response object with context information.
 * Handles both single-entity and collection responses.
 *
 * @param value - The entity or entities to wrap with context
 * @param id - Optional entity ID. If provided, wraps a single entity. If omitted, wraps the entire collection
 * @returns A context-wrapped response object
 *
 * @example
 * // Single entity
 * withContextResponse(todo, "123")
 * // Collection
 * withContextResponse(todos)
 */
export const withContextResponse = <T>(value: T, id?: string) => ({
  value: id ? { [id]: { value, loading: false, error: null } } : value,
  loading: false,
  error: null,
});

/**
 * Creates a properly structured error state with context information.
 * Handles both single-entity and collection-level errors.
 *
 * @param error - The error to wrap with context
 * @param id - Optional entity ID. If provided, associates error with specific entity
 * @returns A context-wrapped error object
 *
 * @example
 * // Single entity error
 * withContextError(error, "123")
 * // Collection error
 * withContextError(error)
 */
export const withContextError = (error: any, id?: string) => ({
  value: id
    ? { [id]: { value: null, loading: false, error: error.message } }
    : {},
  loading: false,
  error: error.message || 'An error occurred',
});

/**
 * Helper to merge changes into an EntityContextCollection while preserving its structure.
 * Handles both the top-level context state and the nested entity dictionary.
 *
 * @param oldState - The existing entity collection state
 * @param newPartial - The new partial state to merge
 * @returns The merged entity collection maintaining full context structure
 *
 * @example
 * connect(
 *   'todos',
 *   todoActions$.pipe(...),
 *   (state, newPartial) => ({
 *     ...state,
 *     todos: mergeEntityContext(state.todos, newPartial)
 *   })
 * );
 */
export function mergeEntityContext<T>(
  oldState: EntityContextCollection<T>,
  newPartial: Partial<WithContext<any>>
): EntityContextCollection<T> {
  const resultState = patch(oldState || createInitialContext(), newPartial);
  resultState.value = patch(oldState?.value || {}, resultState?.value || {});
  return resultState;
}

/**
 * Helper function to merge state changes into EntityContextCollection while preserving
 * the required WithContext structure. This is specifically designed for use with RxState's connect()
 * operator when updating collections of entities that maintain loading/error states.
 *
 * @example
 * connect(
 *   'todos',
 *   todoActions$.pipe(
 *     map(todos => withContextResponse(todos))
 *   ),
 *   (state, newPartial) => mergeEntityContextState(state, newPartial, 'todos')
 * );
 */
export function mergeEntityContextState<
  T extends { [K in keyof T]: EntityContextCollection<any> },
  K extends keyof T
>(state: T, newPartial: Partial<WithContext<any>>, key: K): T {
  return {
    ...state,
    value: mergeEntityContext(state[key], newPartial).value,
    loading: newPartial.loading,
    error: newPartial.error,
  };
}

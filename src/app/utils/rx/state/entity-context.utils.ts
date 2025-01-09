import { patch, toDictionary } from '@rx-angular/cdk/transformations';
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
 * Converts a dictionary of entities that do not contain any "context" fields, and transforms that input
 * into a new dictionary where each value is wrapped in the standard `WithContext` fields for future use.
 */
const entityDictionaryToContextCollection = <T>(
  input: Record<string, any>
): Record<string, WithContext<T>> => {
  return Object.fromEntries(
    Object.entries(input_.map([key, value]) => [
      key,
      {
        ...createInitialContext(),
        value: value,
      }
    ])
  )
};

const createWithContext = <T>(value: T) => {
  if (Array.isArray(value)) {
    return {
      value: entityDictionaryToContextCollection(toDictionary(value, 'id' as any)),
      loading: false,
      error: undefined,
    }
  }

  return {
    value: value,
    loading: false,
    error: undefined,
  }
}

const createEntityContextCollection = <T>(id: string, value: T) => {
  if (Array.isArray(value)) {
    return {
      value: entityDictionaryToContextCollection(toDictionary(value, 'id' as any)),
      loading: false,
      error: undefined,
    }
  }

  return {
    value: { [id]: { value, loading: false, error: undefined }},
    loading: false,
    error: undefined,
  }
}

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
export const withContextResponse = <T>(value: T, id?: string) => 
  id ? createEntityContextCollection(id, value) : createWithContext(value)

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
  oldState: WithContext<T>,
  newPartial: Partial<WithContext<any>>
): WithContext<T> {
  const resultState = patch(oldState || createInitialContext(), newPartial);
  resultState.value = patch(oldState?.value || {}, resultState?.value || {});
  return resultState;
}

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
export function mergeEntityCollectionContext<T>(
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
function mergeEntityContextState<
  T extends { [P in K]: EntityContextCollection<any> },
  K extends keyof T & string
>(
  state: T,
  newPartial: Partial<WithContext<any>>, 
  key: K
): EntityContextCollection<any> {
  // Handle standalone loading/error updates
  if (Object.keys(newPartial).length === 1 && ('loading' in newPartial || 'error' in newPartial)) {
    return {
      ...state[key],
      ...newPartial,
      value: state[key]?.value || {} 
    };
  }

  // Handle full entity updates
  return mergeEntityContext(
    state[key],
    newPartial
  );
}

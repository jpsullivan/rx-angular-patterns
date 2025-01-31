import { Observable } from 'rxjs';
import { map, startWith, endWith } from 'rxjs/operators';

/**
 * The default property name used for loading states
 */
export type DefaultLoadingProp = 'loading';
export const defaultLoadingProp: DefaultLoadingProp = 'loading';

/**
 * Represents a generic loading state with a configurable property name
 * @template K - The property name to use for the loading state
 */
export type LoadingState<K extends string = DefaultLoadingProp> = {
  [k in K]?: boolean;
};

/**
 * Base context wrapper that adds loading, error, and completion states to a value
 * @template T - The type of the value being wrapped
 */
export type WithContext<T> = LoadingState & {
  value: T;
  error?: boolean;
  complete?: boolean;
};

/**
 * Represents a collection of entities where both the collection itself and each entity
 * has its own loading, error, and completion states
 * @template T - The type of entity being stored in the collection
 */
export type EntityContextCollection<T> = WithContext<Record<string, WithContext<T>>>;

/**
 * Operator that wraps a stream with loading state emissions.
 * Emits { [property]: true } before the source observable,
 * then the source values, then { [property]: false } after completion.
 * 
 * @template T - The type of values in the source observable
 * @template K - The property name to use for loading state
 * @param property - Optional custom property name for loading state (defaults to 'loading')
 * @returns An operator function that adds loading state to the stream
 * 
 * @example
 * myService.getData().pipe(
 *   withLoadingEmission()
 * )
 * // Emits: { loading: true } -> data -> { loading: false }
 * 
 * // With custom property
 * myService.getData().pipe(
 *   withLoadingEmission('fetching')
 * )
 * // Emits: { fetching: true } -> data -> { fetching: false }
 */
export function withLoadingEmission<T, K extends string = DefaultLoadingProp>(
  property?: K
) {
  const _property = property ?? defaultLoadingProp;
  const start = { [_property]: true } as T & LoadingState<K>;
  const end = { [_property]: false } as T & LoadingState<K>;

  return (o$: Observable<T>) =>
    (o$ as Observable<T & LoadingState<K>>).pipe(
      startWith(start),
      endWith(end)
    );
}

/**
 * Creates an initial empty state for an entity collection
 * with loading and error states initialized to false
 * 
 * @template T - The type of entity in the collection
 * @returns An empty EntityContextCollection
 * 
 * @example
 * const initialState = createInitialEntityState<User>();
 */
export const createInitialEntityState = <T>(): EntityContextCollection<T> => ({
  value: {},
  loading: false,
  error: false
});

/**
 * Creates an initial empty state for an entity collection
 * with loading and error states initialized to false
 */
export const createInitialEntityState = <T>(): EntityContextCollection<T> => ({
  value: {},
  loading: false,
  error: false
});

/**
 * Sets loading state while preserving value and resetting error
 */
export const setContextLoading = <T>(
  state: WithContext<T>
): WithContext<T> => ({
  ...state,
  loading: true,
  error: false
});

/**
 * Sets error state while turning off loading
 */
export const setContextError = <T>(
  state: WithContext<T>
): WithContext<T> => ({
  ...state,
  loading: false,
  error: true
});

/**
 * Sets the loading state to true for an entire collection while resetting error state
 * 
 * @template T - The type of entity in the collection
 * @param state - The current collection state
 * @returns Updated collection state with loading true and error false
 */
export const setCollectionLoading = <T>(
  state: EntityContextCollection<T>
): EntityContextCollection<T> => ({
  ...state,
  loading: true,
  error: false
});

/**
 * Sets the loading state to true for a specific entity while resetting its error state
 * 
 * @template T - The type of entity in the collection
 * @param state - The current collection state
 * @param entityId - The ID of the entity to update
 * @returns Updated collection state with the specified entity's loading set to true
 */
export const setEntityLoading = <T>(
  state: EntityContextCollection<T>, 
  entityId: string
): EntityContextCollection<T> => ({
  ...state,
  value: {
    ...state.value,
    [entityId]: {
      ...state.value[entityId],
      loading: true,
      error: false
    }
  }
});

/**
 * Updates a specific entity in the collection with new data
 * 
 * @template T - The type of entity in the collection
 * @param state - The current collection state
 * @param entityId - The ID of the entity to update
 * @param update - Partial entity data to merge with existing entity
 * @returns Updated collection state with the modified entity
 * 
 * @example
 * const newState = updateEntity(state, '123', { name: 'New Name' });
 */
export const updateEntity = <T>(
  state: EntityContextCollection<T>,
  entityId: string,
  update: Partial<T>
): EntityContextCollection<T> => ({
  ...state,
  value: {
    ...state.value,
    [entityId]: {
      ...state.value[entityId],
      value: {
        ...state.value[entityId].value,
        ...update
      }
    }
  }
});

/**
 * Removes an entity from the collection
 * 
 * @template T - The type of entity in the collection
 * @param state - The current collection state
 * @param entityId - The ID of the entity to remove
 * @returns Updated collection state with the entity removed
 */
export const removeEntity = <T>(
  state: EntityContextCollection<T>,
  entityId: string
): EntityContextCollection<T> => {
  const { [entityId]: removed, ...remaining } = state.value;
  return {
    ...state,
    value: remaining
  };
};

/**
 * Sets the error state to true for a specific entity while setting loading to false
 * 
 * @template T - The type of entity in the collection
 * @param state - The current collection state
 * @param entityId - The ID of the entity to mark as errored
 * @returns Updated collection state with the specified entity marked as errored
 */
export const setEntityError = <T>(
  state: EntityContextCollection<T>,
  entityId: string
): EntityContextCollection<T> => ({
  ...state,
  value: {
    ...state.value,
    [entityId]: {
      ...state.value[entityId],
      error: true,
      loading: false
    }
  }
});

/**
 * Sets the error state to true for the entire collection while setting loading to false
 * 
 * @template T - The type of entity in the collection
 * @param state - The current collection state
 * @returns Updated collection state marked as errored
 */
export const setCollectionError = <T>(
  state: EntityContextCollection<T>
): EntityContextCollection<T> => ({
  ...state,
  error: true,
  loading: false
});

/**
 * Converts an array of entities into a record of WithContext-wrapped entities
 * indexed by their ID
 * 
 * @template T - The type of entity being processed
 * @param entities - Array of entities to process
 * @param idKey - The property to use as the entity ID (defaults to 'id')
 * @returns Record of entities with loading and error states
 */
export const updateCollection = <T>(
  entities: T[],
  idKey: keyof T = 'id'
): Record<string, WithContext<T>> => 
  entities.reduce(
    (acc, entity) => ({
      ...acc,
      [String(entity[idKey])]: {
        value: entity,
        loading: false,
        error: false
      }
    }),
    {}
  );

/**
 * A specialized operator that combines entity collection mapping with loading state tracking.
 * It transforms a stream of entities into an EntityContextCollection and adds loading state.
 * 
 * @template T - The type of entity being processed
 * @param idKey - The property to use as the entity ID (defaults to 'id')
 * @returns An operator function that transforms entities into a tracked collection
 * 
 * @example
 * service.getUsers().pipe(
 *   withTrackedEntityCollection()
 * )
 * // Emits: { loading: true } -> { value: { [id]: { value: user, loading: false } }, loading: false } 
 */
export function withTrackedEntityCollection<T>(
  idKey: keyof T = 'id'
): (source$: Observable<T[] | T>) => Observable<EntityContextCollection<T>> {
  return (request$: Observable<T[] | T>) =>
    request$.pipe(
      map(entities => ({
        value: updateCollection(Array.isArray(entities) ? entities : [entities], idKey),
        error: false
      })),
      withLoadingEmission()
    );
}

/**
 * Merges a context state update with existing state while preserving the value
 * when receiving loading/error updates.
 */
export const mergeContextState = <T>(
  currentState: WithContext<T>,
  update: Partial<WithContext<T>>
): WithContext<T> => ({
  ...currentState,
  ...update,
  value: update.value ?? currentState.value
});

/**
 * Merges a loading emission with existing collection state
 * while preserving entity data
 */
export const mergeCollectionState = <T>(
  state: EntityContextCollection<T>,
  update: Partial<EntityContextCollection<T>>
): EntityContextCollection<T> => {
     // Handle metadata updates (loading, error, complete) 
    const baseState = {
      ...state,
      ...update
    };

    // If no value update, return base state
    if (!update.value) {
      return baseState;
    }

    // Handle value updates by merging each updated entity's value with existing entity's value
    return {
      ...baseState,
      value: {
        ...state.value,
        ...Object.keys(update.value).reduce((acc, key) => ({
          ...acc,
          [key]: {
            ...state.value?.[key],
            ...update.value![key],
            value: {
              ...(state.value?.[key]?.value || {}),
              ...(update.value![key]?.value || {})
            }
          }
        }), {})
      }
    };
  };
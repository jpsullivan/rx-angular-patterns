import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EntityContextCollection, WithContext } from './types';
import { withLoadingEmission } from './with-loading-emission';

// Helper to create initial entity context state
export const createInitialEntityState = <T>(): EntityContextCollection<T> => ({
  value: {},
  loading: false,
  error: false,
});

// Helper to set loading state for entire collection
export const setCollectionLoading = <T>(
  state: EntityContextCollection<T>
): EntityContextCollection<T> => ({
  ...state,
  loading: true,
  error: false,
});

// Helper to set loading state for a single entity
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
      error: false,
    },
  },
});

// Helper to update entity in collection
export const updateEntity = <T>(
  state: EntityContextCollection<T>,
  entityId: string | number,
  update: Partial<T>
): EntityContextCollection<T> => ({
  ...state,
  value: {
    ...state.value,
    [entityId]: {
      ...state.value[entityId],
      value: {
        ...state.value[entityId].value,
        ...update,
      },
    },
  },
});

// Helper to remove entity from collection
export const removeEntity = <T>(
  state: EntityContextCollection<T>,
  entityId: string | number
): EntityContextCollection<T> => {
  const { [entityId]: removed, ...remaining } = state.value;
  return {
    ...state,
    value: remaining,
  };
};

// Helper to set error state for entity
export const setEntityError = <T>(
  state: EntityContextCollection<T>,
  entityId: string | number
): EntityContextCollection<T> => ({
  ...state,
  value: {
    ...state.value,
    [entityId]: {
      ...state.value[entityId],
      error: true,
      loading: false,
    },
  },
});

// Helper to set error state for collection
export const setCollectionError = <T>(
  state: EntityContextCollection<T>
): EntityContextCollection<T> => ({
  ...state,
  error: true,
  loading: false,
});

/**
 * Creates an operator that handles errors by setting error state and stopping the stream.
 * Works with both EntityContextCollection and WithContext types.
 * 
 * @template T - The type of state being updated 
 * @param state - The RxState instance
 * @param setErrorState - Function to update state with error
 * @returns An operator that handles errors
 * 
 * @example
 * // With EntityContextCollection
 * this.todosService.getTodos().pipe(
 *   withTrackedEntityCollection(),
 *   handleError(this.state, (state) => ({
 *     todos: setEntityError(state.todos, todoId)
 *   }))
 * )
 */
export function handleError<T extends object>(
  state: RxState<T>,
  setErrorState: (state: T) => Partial<T>
) {
  return (source$: Observable<any>) =>
    source$.pipe(
      catchError(() => {
        state.set(setErrorState);
        return EMPTY;
      })
    );
}

// Helper to update collection with new entities
export const updateCollection = <T>(
  entities: T[],
  idKey: keyof T = 'id' as any
): Record<string, WithContext<T>> =>
  entities.reduce(
    (acc, entity) => ({
      ...acc,
      [String(entity[idKey])]: {
        value: entity,
        loading: false,
        error: false,
      },
    }),
    {}
  );

export function withTrackedEntityCollection<T>(
  idKey: keyof T = 'id' as any
): (source$: Observable<T[] | T>) => Observable<EntityContextCollection<T>> {
  return (request$: Observable<T[] | T>) =>
    request$.pipe(
      map((entities) => ({
        value: updateCollection(
          Array.isArray(entities) ? entities : [entities],
          idKey
        ),
        error: false,
      })),
      withLoadingEmission()
    );
}

/**
 * Merges a loading emission with existing collection state
 * while preserving entity data
 */
export const mergeCollectionState = <T>(
  currentState: EntityContextCollection<T>,
  update: Partial<EntityContextCollection<T>>
): EntityContextCollection<T> => ({
  ...currentState,
  ...update,
  value: update.value || currentState.value
});
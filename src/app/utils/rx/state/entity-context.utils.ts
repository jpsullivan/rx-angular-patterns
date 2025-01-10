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

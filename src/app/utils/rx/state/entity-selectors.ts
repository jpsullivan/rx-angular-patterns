// utils/rx/state/entity-selectors.ts
import { OperatorFunction } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { EntityContextCollection } from './types';
import { select } from '@rx-angular/state/selections';

/**
 * Selects a single entity by its ID from an EntityContextCollection.
 * This selector provides direct access to the entity value, stripping away the 
 * loading and error context for scenarios where only the data is needed.
 * 
 * @example
 * ```typescript
 * // Access a single todo entity
 * const todo$ = state$.pipe(selectEntity('123'));
 * ```
 * 
 * @param id - The unique identifier of the entity to select
 * @returns An operator that extracts the entity from the collection, 
 *          returning undefined if not found
 */
export function selectEntity<T>(id: string): OperatorFunction<EntityContextCollection<T>, T | undefined> {
  return map(state => state?.value?.[id]?.value);
}

/**
 * Selects a single entity by ID along with its associated context metadata.
 * Useful when you need to know the loading or error state of a specific entity,
 * such as during updates or initial loads.
 * 
 * @example
 * ```typescript
 * // Access todo with loading state
 * const todoWithContext$ = state$.pipe(
 *   selectEntityWithContext('123')
 * );
 * // template: <div *ngIf="todoWithContext$.loading">Loading...</div>
 * ```
 * 
 * @param id - The unique identifier of the entity to select
 * @returns An operator that extracts the entity and its context
 */
export function selectEntityWithContext<T>(id: string): OperatorFunction<EntityContextCollection<T>, {
  value: T | undefined;
  loading: boolean;
  error: unknown;
}> {
  return map(state => ({
    value: state?.value?.[id]?.value,
    loading: state?.value?.[id]?.loading || false,
    error: state?.value?.[id]?.error
  }));
}

/**
 * Transforms an EntityContextCollection into an array of entity values.
 * Automatically filters out any undefined or null entities, ensuring a clean
 * array of valid entities.
 * 
 * @example
 * ```typescript
 * // Get all todos as an array
 * const todos$ = state$.pipe(selectAllEntities());
 * ```
 * 
 * @returns An operator that extracts all entities as an array
 */
export function selectAllEntities<T>(): OperatorFunction<EntityContextCollection<T>, T[]> {
  return map(state => 
    Object.values(state?.value || {})
      .map(ctx => ctx.value)
      .filter((v): v is T => !!v)
  );
}

/**
 * Transforms an EntityContextCollection into an array of entities with their context.
 * Each item includes both the entity value and its associated metadata (loading, error).
 * Also includes the entity's ID, which can be useful for tracking or updates.
 * 
 * @example
 * ```typescript
 * // Get all todos with their loading states
 * const todosWithContext$ = state$.pipe(selectAllEntitiesWithContext());
 * ```
 * 
 * @returns An operator that extracts all entities and their context as an array
 */
export function selectAllEntitiesWithContext<T>(): OperatorFunction<EntityContextCollection<T>, {
  value: T | undefined;
  loading: boolean;
  error: unknown;
  id: string;
}[]> {
  return map(state => 
    Object.entries(state?.value || {}).map(([id, ctx]) => ({
      value: ctx.value,
      loading: ctx.loading || false,
      error: ctx.error,
      id
    }))
  );
}

/**
 * A type-safe operator that filters out undefined or null values.
 * Particularly useful after selecting an entity that might not exist.
 * The type guard ensures that downstream operators receive only defined values.
 * 
 * @example
 * ```typescript
 * const todo$ = state$.pipe(
 *   selectEntity('123'),
 *   whereEntityExists(), // TypeScript now knows todo is defined
 *   map(todo => todo.name) // Safe to access properties
 * );
 * ```
 * 
 * @returns An operator that filters out undefined values while maintaining type safety
 */
export function whereEntityExists<T>(): OperatorFunction<T | undefined, T> {
  return filter((v): v is T => !!v);
}

/**
 * Determines if any loading operation is in progress, either at the collection
 * level or for any individual entity.
 * 
 * @example
 * ```typescript
 * // Show loading indicator for any todo operation
 * const isLoading$ = state$.pipe(selectIsLoading());
 * ```
 * 
 * @returns An operator that extracts the loading state
 */
export function selectIsLoading(): OperatorFunction<EntityContextCollection<any>, boolean> {
  return map(state => {
    if (state.loading) return true;
    return Object.values(state?.value || {}).some(ctx => ctx.loading);
  });
}

/**
 * Collects all errors from both the collection level and individual entities.
 * Useful for displaying error summaries or determining if any errors exist
 * in the collection.
 * 
 * @example
 * ```typescript
 * // Show all todo-related errors
 * const errors$ = state$.pipe(selectErrors());
 * ```
 * 
 * @returns An operator that extracts all errors as an array
 */
export function selectErrors(): OperatorFunction<EntityContextCollection<any>, unknown[]> {
  return map(state => {
    const errors: unknown[] = [];
    if (state.error) errors.push(state.error);
    Object.values(state?.value || {}).forEach(ctx => {
      if (ctx.error) errors.push(ctx.error);
    });
    return errors;
  });
}
import { inject, Injectable } from '@angular/core';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { TodosService } from '../services/todos.service';
import {
  mergeEntityContext,
  mergeEntityContextState,
  withContextError,
  withContextResponse,
} from '../utils/rx/state/entity-context.utils';
import { EntityContextCollection } from '../utils/rx/state/types';
import { withLoadingEmission } from '../utils/rx/state/with-loading-emission';

export type Todo = {
  id: string;
  name: string;
  done: boolean;
  createdAt: string;
};

export interface TodosStateModel {
  todos: EntityContextCollection<Todo>;
}

interface Actions {
  fetchTodos: void;
  fetchTodo: string;
  updateTodo: Partial<Todo>;
}

@Injectable({
  providedIn: 'root',
})
export class GlobalTodosState {
  private readonly todoService = inject(TodosService);
  private readonly actions = rxActions<Actions>();
  private readonly state = rxState<TodosStateModel>(({ connect }) => {
    // Fetch all todos
    connect(
      'todos',
      this.actions.fetchTodos$.pipe(
        exhaustMap(() =>
          this.todoService.getTodos().pipe(
            withLoadingEmission(),
            map((todos) => withContextResponse(todos)),
            catchError((error) => of(withContextError(error)))
          )
        )
      ),
      // (state, newPartial) => mergeEntityContextState(state, newPartial, 'todos')
      (state, newPartial) => {
        return {
          ...state,
          value: mergeEntityContext(state.todos, newPartial).value,
          loading: newPartial.loading,
          error: newPartial.error,
        };
      }
    );

    // Fetch single todo
    connect(
      'todos',
      this.actions.fetchTodo$.pipe(
        exhaustMap((todoId) =>
          this.todoService.getTodo(todoId).pipe(
            withLoadingEmission(),
            map((todo) => withContextResponse(todo, todoId)),
            catchError((error) => of(withContextError(error, todoId)))
          )
        )
      ),
      mergeEntityContextState
    );

    // Update todo
    connect(
      'todos',
      this.actions.updateTodo$.pipe(
        exhaustMap((todoUpdate) =>
          this.todoService.updateTodo(todoUpdate).pipe(
            withLoadingEmission(),
            map((todo) => withContextResponse(todo, todo.id)),
            catchError((error) => of(withContextError(error, todoUpdate.id)))
          )
        )
      ),
      mergeEntityContextState
    );
  });

  // State selectors
  /**
   * Selects a todo by ID, either from a static ID or observable ID stream
   * @param id - Static todo ID
   */
  selectTodo(id: string): Observable<Todo | undefined>;
  selectTodo(id$: Observable<string>): Observable<Todo | undefined>;
  selectTodo(idOrId$: string | Observable<string>): Observable<Todo | undefined> {
    return isObservable(idOrId$) 
      ? idOrId$.pipe(switchMap(id => this.state.select('todos', selectEntity<Todo>(id))))
      : this.state.select('todos', selectEntity<Todo>(idOrId$));
  }

  /**
   * Selects a todo with context by ID, either from a static ID or observable ID stream
   * @param id - Static todo ID
   */
  selectTodoWithContext(id: string): Observable<{
    value: Todo | undefined;
    loading: boolean;
    error: unknown;
  }>;
  selectTodoWithContext(id$: Observable<string>): Observable<{
    value: Todo | undefined;
    loading: boolean;
    error: unknown;
  }>;
  selectTodoWithContext(idOrId$: string | Observable<string>): Observable<{
    value: Todo | undefined;
    loading: boolean;
    error: unknown;
  }> {
    return isObservable(idOrId$)
      ? idOrId$.pipe(switchMap(id => this.state.select('todos', selectEntityWithContext<Todo>(id))))
      : this.state.select('todos', selectEntityWithContext<Todo>(idOrId$));
  }

  // Public API
  readonly fetchTodos = this.actions.fetchTodos;
  readonly fetchTodo = this.actions.fetchTodo;
  readonly updateTodo = this.actions.updateTodo;
  readonly todos$ = this.state.select('todos');
}

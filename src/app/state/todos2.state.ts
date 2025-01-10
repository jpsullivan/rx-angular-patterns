import { inject, Injectable } from '@angular/core';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import { EMPTY } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Todo } from '../models/todo';
import { TodosService } from '../services/todos.service';
import {
  createInitialEntityState,
  removeEntity,
  setEntityError,
  updateEntity,
  withTrackedEntityCollection,
} from '../utils/rx/state/entity-context.utils';
import { EntityContextCollection } from '../utils/rx/state/types';
import { withLoadingEmission } from '../utils/rx/state/with-loading-emission';

interface TodosState {
  todos: EntityContextCollection<Todo>;
}

@Injectable({
  providedIn: 'root',
})
export class TodosStateService {
  private readonly todosService = inject(TodosService);

  private readonly actions = rxActions<{
    loadAll: void;
    loadOne: number;
    toggle: number;
    remove: number;
  }>();

  private readonly state = rxState<TodosState>(({ set, connect }) => {
    // Set initial state
    set({
      todos: createInitialEntityState<Todo>(),
    });

    // Connect load all action
    connect(
      this.actions.loadAll$.pipe(
        switchMap(() =>
          this.todosService.getTodos().pipe(
            withTrackedEntityCollection(),
            catchError(() => {
              set((state) => ({
                todos: {
                  ...state.todos,
                  error: true,
                  loading: false,
                },
              }));
              return EMPTY;
            })
          )
        )
      ),
      (_, todos) => ({ todos })
    );

    connect(
      'todos',
      this.actions.loadAll$.pipe(
        switchMap(() =>
          this.todosService.getTodos().pipe(
            withTrackedEntityCollection(),
            catchError(() => {
              set((state) => ({
                todos: {
                  ...state.todos,
                  error: true,
                  loading: false,
                },
              }));
              return EMPTY;
            })
          )
        )
      ),
      (_, todos) => todos
    );

    // Connect load single todo
    connect(
      this.actions.loadOne$.pipe(
        switchMap((todoId) =>
          this.todosService.getTodoById(todoId).pipe(
            withLoadingEmission(),
            map((todo) => ({ todo, todoId })),
            catchError(() => {
              set((state) => ({
                todos: setEntityError(state.todos, todoId),
              }));
              return EMPTY;
            })
          )
        )
      ),
      (state, { todo, todoId }) => ({
        todos: updateEntity(state.todos, todoId, todo),
      })
    );

    connect(
      'todos',
      this.actions.loadOne$.pipe(
        switchMap((todoId) =>
          this.todosService.getTodoById(todoId).pipe(
            withLoadingEmission(),
            map((todo) => ({ todo, todoId })),
            catchError(() => {
              set((state) => ({
                todos: setEntityError(state.todos, todoId),
              }));
              return EMPTY;
            })
          )
        )
      ),
      (state, { todo, todoId }) => updateEntity(state.todos, todoId, todo)
    );

    // Connect toggle action
    connect(this.actions.toggle$, (state, todoId) => ({
      todos: updateEntity(state.todos, todoId, {
        completed: !state.todos.value[todoId].value.completed,
      }),
    }));

    // Connect remove action
    connect(
      this.actions.remove$.pipe(
        switchMap((todoId) =>
          this.todosService.deleteTodo(todoId).pipe(
            withLoadingEmission(),
            map(() => todoId),
            catchError(() => {
              set((state) => ({
                todos: setEntityError(state.todos, todoId),
              }));
              return EMPTY;
            })
          )
        )
      ),
      (state, todoId) => ({
        todos: removeEntity(state.todos, todoId),
      })
    );
  });

  // Public selectors as signals
  readonly todos = this.state.signal('todos');

  // Computed signals
  readonly isLoading = this.state.computed((state) => state.todos().loading);

  readonly hasError = this.state.computed((state) => state.todos().error);

  readonly todosList = this.state.computed((state) =>
    Object.values(state.todos().value).map((ctx) => ctx.value)
  );

  readonly completedCount = this.state.computed(
    (state) =>
      Object.values(state.todos().value).filter((ctx) => ctx.value.completed)
        .length
  );

  // Observable selectors
  readonly todos$ = this.state.select('todos');

  // Public actions
  readonly loadAll = this.actions.loadAll;
  readonly loadOne = this.actions.loadOne;
  readonly toggle = this.actions.toggle;
  readonly remove = this.actions.remove;
}

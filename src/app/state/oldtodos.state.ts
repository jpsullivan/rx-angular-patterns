import { inject, Injectable } from '@angular/core';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';
import { EMPTY } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';
import { TodosService } from '../services/todos.service';
import { EntityContextCollection } from '../utils/rx/state/types';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

interface TodosState {
  todos: EntityContextCollection<Todo>;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TodosStateService {
  private readonly todosService = inject(TodosService);

  // Define actions with more granular loading states
  private readonly actions = rxActions<{
    loadAll: void;
    loadOne: string;
    add: Todo;
    toggle: string;
    remove: string;
    update: Todo;
  }>();

  // Initialize state
  private readonly state = rxState<TodosState>(({ set, connect }) => {
    // Set initial state with empty collection
    set({
      todos: {
        loading: false,
        value: {},
      },
      error: null,
    });

    // Connect load all action
    connect(
      this.actions.loadAll$.pipe(
        switchMap(() =>
          this.todosService.getTodos().pipe(
            map((todos) =>
              todos.reduce(
                (acc, todo) => ({
                  ...acc,
                  [todo.id]: {
                    value: todo,
                    loading: false,
                  },
                }),
                {}
              )
            ),
            startWith(null),
            catchError((error) => {
              set({ error: error.message });
              return EMPTY;
            })
          )
        )
      ),
      (state, todosMap) => ({
        todos: {
          value: todosMap === null ? state.todos.value : todosMap,
          loading: todosMap === null,
          error: null,
        },
      })
    );

    // Connect load single todo
    connect(
      this.actions.loadOne$.pipe(
        switchMap((todoId) =>
          this.todosService.getTodo(todoId).pipe(
            startWith(null),
            catchError((error) => {
              set((state) => ({
                todos: {
                  ...state.todos,
                  value: {
                    ...state.todos.value,
                    [todoId]: {
                      ...state.todos.value[todoId],
                      error,
                    },
                  },
                },
              }));
              return EMPTY;
            })
          )
        )
      ),
      (state, payload) => {
        if (payload === null) return state;

        return {
          todos: {
            ...state.todos,
            value: {
              ...state.todos.value,
              [payload.id]: {
                value: payload,
                loading: false,
              },
            },
          },
        };
      }
    );

    // Connect toggle action
    connect(this.actions.toggle$, (state, todoId) => ({
      todos: {
        ...state.todos,
        value: {
          ...state.todos.value,
          [todoId]: {
            ...state.todos.value[todoId],
            value: {
              ...state.todos.value[todoId].value,
              completed: !state.todos.value[todoId].value.completed,
            },
          },
        },
      },
    }));

    // Connect remove action
    connect(
      this.actions.remove$.pipe(
        switchMap((todoId) =>
          this.todosService.deleteTodo(todoId).pipe(
            map(() => todoId),
            startWith(null),
            catchError((error) => {
              set((state) => ({
                todos: {
                  ...state.todos,
                  value: {
                    ...state.todos.value,
                    [todoId]: {
                      ...state.todos.value[todoId],
                      error,
                    },
                  },
                },
              }));
              return EMPTY;
            })
          )
        )
      ),
      (state, todoId) => {
        if (todoId === null) return state;

        const { [todoId]: removed, ...remaining } = state.todos.value;
        return {
          todos: {
            ...state.todos,
            value: remaining,
          },
        };
      }
    );
  });

  // Public selectors as signals
  readonly todos = this.state.signal('todos');
  readonly error = this.state.signal('error');

  // Computed signals
  readonly isLoading = this.state.computed((state) => state.todos().loading);

  readonly todosList = this.state.computed((state) =>
    Object.values(state.todos().value).map((ctx) => ctx.value)
  );

  readonly completedCount = this.state.computed(
    (state) =>
      Object.values(state.todos().value).filter((ctx) => ctx.value.completed)
        .length
  );

  // For reactive/observable usage
  readonly todos$ = this.state.select('todos');
  readonly error$ = this.state.select('error');

  // Public action methods
  readonly loadAll = this.actions.loadAll;
  readonly loadOne = this.actions.loadOne;
  readonly toggle = this.actions.toggle;
  readonly remove = this.actions.remove;
}

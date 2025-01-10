import { inject, Injectable } from '@angular/core';
import { rxState } from '@rx-angular/state';
import { rxActions } from '@rx-angular/state/actions';

interface TodosState {
  todos: EntityContextCollection<Todo>;
  recentTodos: WithContext<Todo>;
}

@Injectable({
  providedIn: 'root'
})
export class TodosStateService {
  private readonly todosService = inject(TodosService);

  private readonly actions = rxActions<{
    loadAll: void;
    loadOne: number;
    loadRecent: void;
    toggle: number;
    remove: number;
  }>();

  private readonly state = rxState<TodosState>(({ set, connect }) => {
    // Set initial state
    set({
      todos: createInitialEntityState<Todo>(),
      recentTodos: createInitialContextState<Todo>()
    });

    // Connect load all action
    connect(
      this.actions.loadAll$.pipe(
        switchMap(() =>
          this.todosService.getTodos().pipe(
            withTrackedEntityCollection(),
            handleError(set, state => ({
              todos: setCollectionError(state.todos)
            }))
          )
        )
      ),
      (state, todos) => ({
        todos: mergeCollectionState(state.todos, todos)
      })
    );

    // Connect load single todo
    connect(
      this.actions.loadOne$.pipe(
        switchMap((todoId) =>
          this.todosService.getTodoById(todoId).pipe(
            withLoadingEmission(),
            map((todo) => ({ todo, todoId })),
            handleError(set, state => ({
              todos: setEntityError(state.todos, todoId)
            }))
          )
        )
      ),
      (state, { todo, todoId }) => ({
        todos: updateEntity(state.todos, todoId, todo)
      })
    );

    // Connect recent todo
    connect(
      this.actions.loadRecent$.pipe(
        switchMap(() => 
          this.todosService.getRecentTodo().pipe(
            withLoadingEmission(),
            handleError(set, state => ({
              recentTodos: setContextError(state.recentTodos)
            }))
          )
        )
      ),
      (state, update) => ({
        recentTodos: mergeContextState(state.recentTodos, update)
      })
    );

    // Connect toggle action
    connect(this.actions.toggle$, (state, todoId) => ({
      todos: updateEntity(state.todos, todoId, {
        completed: !state.todos.value[todoId].value.completed
      })
    }));

    // Connect remove action
    connect(
      this.actions.remove$.pipe(
        switchMap((todoId) =>
          this.todosService.deleteTodo(todoId).pipe(
            withLoadingEmission(),
            map(() => todoId),
            handleError(set, state => ({
              todos: setEntityError(state.todos, todoId)
            }))
          )
        )
      ),
      (state, todoId) => ({
        todos: removeEntity(state.todos, todoId)
      })
    );
  });

  // Public selectors as signals
  readonly todos = this.state.signal('todos'); 
  readonly recentTodos = this.state.signal('recentTodos');

  // Computed signals
  readonly isLoading = this.state.computed(state => 
    state.todos().loading || state.recentTodos().loading
  );

  readonly hasError = this.state.computed(state =>
    state.todos().error || state.recentTodos().error
  );

  readonly todosList = this.state.computed(state =>
    Object.values(state.todos().value).map(ctx => ctx.value)
  );

  readonly completedCount = this.state.computed(state =>
    Object.values(state.todos().value).filter(ctx => ctx.value.completed).length
  );

  // Observable selectors
  readonly todos$ = this.state.select('todos');
  readonly recentTodos$ = this.state.select('recentTodos');

  // Public actions
  readonly loadAll = this.actions.loadAll;
  readonly loadOne = this.actions.loadOne;
  readonly loadRecent = this.actions.loadRecent;
  readonly toggle = this.actions.toggle;
  readonly remove = this.actions.remove;
}
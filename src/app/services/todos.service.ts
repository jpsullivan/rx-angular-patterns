import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Todo } from '../state/todos.state';

@Injectable({
  providedIn: 'root',
})
export class TodosService {
  private readonly http: HttpClient = inject(HttpClient);

  private readonly apiUrl = 'https://jsonplaceholder.typicode.com/todos';

  /**
   * GET all todos
   */
  getTodos(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.apiUrl);
  }

  /**
   * GET a specific todo by its id
   */
  getTodoById(id: number): Observable<Todo> {
    return this.http.get<Todo>(`${this.apiUrl}/${id}`);
  }

  /**
   * POST a new todo
   */
  createTodo(todo: Todo): Observable<Todo> {
    return this.http.post<Todo>(this.apiUrl, todo);
  }

  /**
   * PUT (update) an existing todo
   */
  updateTodo(todo: Todo): Observable<Todo> {
    if (!todo.id) {
      throw new Error('Todo must have an id to be updated.');
    }
    return this.http.put<Todo>(`${this.apiUrl}/${todo.id}`, todo);
  }

  /**
   * DELETE a todo by its id
   */
  deleteTodo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

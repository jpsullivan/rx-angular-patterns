import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Todo } from '../state/todos.state';

@Injectable({
  providedIn: 'root',
})
export class TodosService {
  private readonly http: HttpClient = inject(HttpClient);

  getTodos() {
    return this.http.get<any[]>('https://jsonplaceholder.typicode.com/todos');
  }

  getTodo(id: string) {
    return this.http.get<any>('https://jsonplaceholder.typicode.com/todo/123');
  }

  updateTodo(todo: Partial<Todo>) {
    return this.http.post(
      'https://jsonplaceholder.typicode.com/todo/123',
      todo
    );
  }
}

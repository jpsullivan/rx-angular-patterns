import { RxState } from '@rx-angular/state';
import { isObservable, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export abstract class RxDirective<T extends object = never> extends RxState<T> {
  readonly state$ = this.select();

  protected setState(state: Partial<T> | Observable<Partial<T>>) {
    if (isObservable(state)) {
      this.connect(state);
    } else {
      this.set(state);
    }
  }

  protected setProperty(
    key: keyof T,
    value: T[keyof T] | Observable<T[keyof T]>
  ) {
    if (isObservable(value)) {
      this.connect(value.pipe(map((emission) => ({ [key]: emission } as any))));
    } else {
      this.set({ [key]: value } as any);
    }
  }
}

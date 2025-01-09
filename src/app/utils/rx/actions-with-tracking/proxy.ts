import { ErrorHandler } from '@angular/core';
import {
  BehaviorSubject,
  EMPTY,
  from,
  merge,
  OperatorFunction,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import {
  ActionDispatchConfig,
  EffectMap,
  KeysOf,
  RxActions,
  SubjectMap,
  ValuesOf,
} from './types';

/**
 * @internal
 * Internal helper to create the proxy object
 * It lives as standalone function because we don't need to carrie it in memory for every ActionHandler instance
 * @param subjects
 * @param transforms
 */
export function actionProxyHandler<T extends object, U extends object>({
  subjectMap,
  transformsMap,
  effectMap,
  errorHandler = null,
}: {
  subjectMap: SubjectMap<T>;
  transformsMap?: U;
  effectMap: EffectMap<T>;
  errorHandler: ErrorHandler | null;
}): ProxyHandler<RxActions<T, U>> {
  type KeysOfT = KeysOf<T>;
  type ValuesOfT = ValuesOf<T>;

  // Track states for each action
  const stateMap: Record<
    string,
    {
      loading$: BehaviorSubject<boolean>;
      complete$: Subject<boolean>;
      error$: Subject<any>;
    }
  > = {};

  function getOrCreateState(prop: KeysOfT) {
    if (!stateMap[prop as string]) {
      stateMap[prop as string] = {
        loading$: new BehaviorSubject(false),
        complete$: new Subject(),
        error$: new Subject(),
      };
    }
    return stateMap[prop as string];
  }

  function getEventEmitter(prop: KeysOfT): Subject<ValuesOfT> {
    if (!subjectMap[prop]) {
      const subject = new Subject<ValuesOfT>();
      subjectMap[prop] = subject;

      // Instead of subscribing directly, we use the subject as a trigger
      // The actual completion/error states will be derived from the action's result
      const state = getOrCreateState(prop);

      subject
        .pipe(
          // Start loading when action starts
          tap(() => state.loading$.next(true)),
          // Handle the action execution
          switchMap((value) => {
            try {
              // Transform the value if needed
              const transformedValue =
                transformsMap && (transformsMap as any)[prop]
                  ? (transformsMap as any)[prop](value)
                  : value;

              // Return as observable to handle both sync and async results
              return from(Promise.resolve(transformedValue)).pipe(
                // Complete signals success
                tap({
                  next: () => {
                    state.loading$.next(false);
                    state.complete$.next(true);
                  },
                  error: (err) => {
                    state.loading$.next(false);
                    state.error$.next(err);
                    if (errorHandler) {
                      errorHandler.handleError(err);
                    }
                  },
                })
              );
            } catch (err) {
              state.loading$.next(false);
              state.error$.next(err);
              if (errorHandler) {
                errorHandler.handleError(err);
              }
              return EMPTY;
            }
          })
        )
        .subscribe();
    }
    return subjectMap[prop];
  }

  function dispatch(value: ValuesOfT, prop: KeysOfT) {
    subjectMap[prop] = subjectMap[prop] || new Subject<ValuesOfT>();
    try {
      const val =
        transformsMap && (transformsMap as any)[prop]
          ? (transformsMap as any)[prop](value)
          : value;
      subjectMap[prop].next(val);
    } catch (err) {
      errorHandler?.handleError(err);
    }
  }
  return {
    // shorthand setter for multiple EventEmitter e.g. actions({propA: 1, propB: 2})
    apply(_: RxActions<T, U>, __: any, props: [T]): any {
      props.forEach((slice) =>
        Object.entries(slice).forEach(([k, v]) =>
          dispatch(v as any, k as any as KeysOfT)
        )
      );
    },
    get(_, property: string) {
      const prop = property as KeysOfT;

      // Handle loading$ observables
      if (prop.toString().endsWith('Loading$')) {
        const actionName = prop.toString().replace(/Loading\$$/, '') as KeysOfT;
        return getOrCreateState(actionName).loading$.asObservable();
      }

      // Handle complete$ observables
      if (prop.toString().endsWith('Complete$')) {
        const actionName = prop
          .toString()
          .replace(/Complete\$$/, '') as KeysOfT;
        return getOrCreateState(actionName).complete$.asObservable();
      }

      // Handle error$ observables
      if (prop.toString().endsWith('Error$')) {
        const actionName = prop.toString().replace(/Error\$$/, '') as KeysOfT;
        return getOrCreateState(actionName).error$.asObservable();
      }

      // the user wants to get multiple or one single EventEmitter as observable `eventEmitter.prop$`
      if (prop.toString().split('').pop() === '$') {
        // the user wants to get multiple EventEmitter as observable `eventEmitter.$(['prop1', 'prop2'])`
        if (prop.toString().length === 1) {
          return (props: KeysOfT[]) =>
            merge(
              ...props.map((k) => {
                return getEventEmitter(k);
              })
            );
        }
        // the user wants to get a single EventEmitter as observable `eventEmitter.prop$`
        const propName = prop.toString().slice(0, -1) as KeysOfT;
        return getEventEmitter(propName);
      }

      // the user wants to get a single EventEmitter and trigger a side effect on event emission
      if (prop.toString().startsWith('on')) {
        // we need to first remove the 'on' from the the prop name
        const slicedPropName = prop.toString().slice(2);
        // now convert the slicedPropName to camelcase
        const propName = (slicedPropName.charAt(0).toLowerCase() +
          slicedPropName.slice(1)) as KeysOfT;
        return (
          behaviour: OperatorFunction<T[KeysOfT], T[KeysOfT]>,
          sf: (v: T[KeysOfT]) => void
        ) => {
          const sub = getEventEmitter(propName).pipe(behaviour).subscribe(sf);
          effectMap[propName] = sub;
          return () => sub.unsubscribe();
        };
      }

      // the user wants to get a dispatcher function to imperatively dispatch the EventEmitter
      return (...args: any[]) => {
        // Extract config if provided as last argument
        const config =
          typeof args[args.length - 1] === 'object'
            ? (args.pop() as ActionDispatchConfig)
            : {};

        const state = getOrCreateState(prop);

        // Only update loading state if not silent
        if (!config.silent) {
          state.loading$.next(true);
        }
        state.complete$.next(false);
        state.error$.next(null);

        try {
          // Pass remaining args to dispatch
          dispatch(args[0], prop);
        } catch (err) {
          if (!config.silent) {
            state.loading$.next(false);
          }
          state.error$.next(err);
          if (errorHandler) {
            errorHandler.handleError(err);
          }
        }
      };
    },
    set() {
      throw new Error('No setters available. To emit call the property name.');
    },
  };
}

import { trackById, trackByIndex } from '../track-by/track-by';
import { RxDirective } from './rx.directive';

export abstract class RxComponent<
  T extends object = {}
> extends RxDirective<T> {
  readonly trackById = trackById;
  readonly trackByIndex = trackByIndex;
}

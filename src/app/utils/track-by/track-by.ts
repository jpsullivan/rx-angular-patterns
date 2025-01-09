type TrackByResult = string | number | null | undefined;

/**
 * Function to track elements via their id.
 * Used in anglar templates, i.e. together with the `*ngFor` directive.
 * @param _
 * @param element
 * @returns
 */
export function trackById<ElementType extends { id?: number | string }>(
  _: number,
  element: ElementType
): TrackByResult {
  return element ? element.id : null;
}

export function trackByIndex(index: number, _element: any): TrackByResult {
  return index;
}

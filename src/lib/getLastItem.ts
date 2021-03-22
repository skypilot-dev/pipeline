interface GetLastItemOptions<D> {
  defaultValue?: D;
}

export function getLastItem<T>(items: ReadonlyArray<T>, options?: { defaultValue: undefined }): T | undefined;
export function getLastItem<T, D extends T | undefined>(items: ReadonlyArray<T>, options: GetLastItemOptions<D>): T | D;

// Return the last item in the array, or null if the array is empty
export function getLastItem<T, D extends T>(
  items: ReadonlyArray<T>, options: GetLastItemOptions<T> = {}
): T | D | undefined {
  const { defaultValue } = options;
  if (items.length === 0) {
    return defaultValue !== undefined ? defaultValue : undefined;
  }
  return items.slice(-1)[0];
}

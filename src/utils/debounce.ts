export interface Debounced<T extends unknown[]> {
  (...args: T): void;
  cancel(): void;
}

export function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number): Debounced<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  function debounced(...args: T) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

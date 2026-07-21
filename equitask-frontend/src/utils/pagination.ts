// Utilities for handling Django REST Framework list responses.
//
// A DRF list endpoint returns either a bare array (when pagination is
// disabled for that view) or a paginated envelope of the shape
// { count, next, previous, results }. Components expect a plain array,
// so every service that fetches a list should normalize the response
// through unwrapList().

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function isPaginated<T>(data: unknown): data is PaginatedResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as PaginatedResponse<T>).results)
  );
}

// Normalize any list response to a plain array, whether it arrives as a
// bare array or as a paginated { results } envelope.
export function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (isPaginated<T>(data)) {
    return data.results;
  }
  return [];
}

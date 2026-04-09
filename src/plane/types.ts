export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export interface PlaneProject {
  id: string;
  identifier?: string | null;
  name: string;
}

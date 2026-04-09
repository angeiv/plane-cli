export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export interface PlaneProject {
  id: string;
  identifier?: string | null;
  name: string;
}

export interface PlaneWorkItem {
  assignees: string[];
  id: string;
  name: string;
  priority?: string | null;
  sequence_id?: number | null;
  state?: string | null;
}

export interface PlaneState {
  id: string;
  name: string;
}

export interface PlaneMember {
  display_name?: string | null;
  email?: string | null;
  id: string;
}

export interface PlaneComment {
  comment_html: string;
  id: string;
  issue?: string | null;
}

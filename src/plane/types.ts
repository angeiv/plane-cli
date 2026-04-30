export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next_cursor?: string | null;
  prev_cursor?: string | null;
  next_page_results?: boolean | null;
  prev_page_results?: boolean | null;
  total_count?: number | null;
  total_pages?: number | null;
  total_results?: number | null;
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
  id: string;
  comment_html?: string | null;
  comment_json?: unknown | null;
  comment_stripped_html?: string | null;
  issue?: string | null;
  project?: string | null;
  workspace?: string | null;
  actor?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  actor_detail?: {
    id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    email?: string | null;
  } | null;
}

export interface PlaneLabel {
  id: string;
  name: string;
}

export interface PlaneCycle {
  id: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  owned_by?: string | null;
  project_id?: string | null;
  workspace_id?: string | null;
  status?: string | null;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: number | null;
  progress_snapshot?: Record<string, unknown> | null;
}

export interface PlaneModule {
  id: string;
  name: string;
  description?: string | null;
  description_text?: string | null;
  description_html?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  status?: string | null;
  lead?: string | null;
  members?: string[];
  project_id?: string | null;
  workspace_id?: string | null;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sort_order?: number | null;
}

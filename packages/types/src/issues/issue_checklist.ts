export type TIssueChecklistItem = {
  id: string;
  issue: string;
  name: string; // Backend expects 'name' field
  title?: string; // Optional, for backward compatibility
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  assignee: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Additional fields from serializer
  completed_by_detail?: {
    id: string;
    avatar: string | null;
    display_name: string;
    first_name: string;
    last_name: string;
  } | null;
  assignee_detail?: {
    id: string;
    avatar: string | null;
    display_name: string;
    first_name: string;
    last_name: string;
  } | null;
};


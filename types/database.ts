export type ProjectPhase = "luzna_rozkmina" | "kodzimy_hackathon" | "lecimy_po_hajs";

export type NotificationType = "fire_received" | "join_request" | "new_message" | "system";

export type JoinRequestStatus = "pending" | "accepted" | "declined";

export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  faculty: string | null;
  bio: string;
  skills_have: string[];
  skills_want: string[];
  hype_score: number;
  is_admin: boolean;
  is_shadowbanned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  roles_needed: string[];
  tags: string[];
  fire_count: number;
  is_shadowbanned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Fire {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  project_id: string | null;
  room_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  project_id: string;
  requester_id: string;
  message: string;
  status: JoinRequestStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_profile_id: string | null;
  reported_project_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
}

// Minimal Supabase generated-types shape — swap for `supabase gen types typescript`
// output once the project is live; this hand-written version keeps the app
// fully typed in the meantime.
// supabase-js's GenericTable requires a `Relationships` field on every table,
// and GenericSchema requires the Views/Functions keys. Omitting any of these
// makes the schema fail to match GenericSchema, which collapses every query
// result type to `never` (e.g. profile.is_admin). We don't rely on typed
// embedded joins, so empty relationships are fine.
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      projects: Table<Project>;
      fires: Table<Fire>;
      chat_rooms: Table<ChatRoom>;
      messages: Table<Message>;
      notifications: Table<Notification>;
      join_requests: Table<JoinRequest>;
      reports: Table<Report>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

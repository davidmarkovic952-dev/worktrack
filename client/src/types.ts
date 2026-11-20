export type Role = 'employee' | 'admin';
export interface User { id: number; name: string; email: string; role: Role; weekly_hours?: number }
export interface TimeRecord { id: number; user_id: number; start_time: string; end_time: string | null; name?: string; email?: string }
export type Severity = 'violation' | 'warning' | 'unknown';
export interface Finding {
  rule: string; severity: Severity; period: string; value: number | null; limit: number | null;
  legalBasis: string; message: string; recordIds: number[];
}
export interface Summary { todayHours: number; weekHours: number; totalHours: number; openRecords: number }
export interface AuditRow {
  id: number; actor_name: string | null; action: string; entity: string; entity_id: number | null;
  before: Record<string, unknown> | null; after: Record<string, unknown> | null; reason: string | null; created_at: string;
}

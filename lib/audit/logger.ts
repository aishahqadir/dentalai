import { createClient } from '@supabase/supabase-js';

/**
 * Server-side audit logging helper
 * Writes to audit_log table via service_role (bypasses RLS)
 * Call this on every read/write of patient-related data
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type AuditAction =
  | 'read_plan'
  | 'read_patient'
  | 'update_plan'
  | 'update_item'
  | 'sync_dentally'
  | 'draft_generated'
  | 'outreach_sent'
  | 'conversion_detected'
  | 'item_state_changed';

export interface AuditLogEntry {
  practiceId: string;
  actorId?: string;
  action: AuditAction;
  entityType: 'treatment_plan' | 'treatment_item' | 'outreach_event' | 'conversion_event';
  entityId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an audit event
 * @param entry Audit log entry
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; audit logging disabled');
    return;
  }

  try {
    const { error } = await supabaseAdmin.from('audit_log').insert({
      practice_id: entry.practiceId,
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      details: entry.details,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Audit log error:', error);
      // Don't throw; audit failure should not break the main operation
    }
  } catch (err) {
    console.error('Audit log exception:', err);
  }
}

/**
 * Log a usage event (digest_opened, plan_viewed, draft_generated, etc.)
 */
export async function logUsage(
  practiceId: string,
  eventType: string,
  entityType?: string,
  entityId?: string,
  actorId?: string
): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set; usage logging disabled');
    return;
  }

  try {
    const { error } = await supabaseAdmin.from('usage_events').insert({
      practice_id: practiceId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      actor_id: actorId,
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Usage log error:', error);
    }
  } catch (err) {
    console.error('Usage log exception:', err);
  }
}

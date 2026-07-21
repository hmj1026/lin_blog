import type { AuditSummary } from "../domain/audit-summary";

export type CreateAuditEvent = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: AuditSummary;
};

export type AuditEventRecord = CreateAuditEvent & {
  id: string;
  createdAt: Date;
};

export interface AuditRepository {
  create(input: CreateAuditEvent): Promise<{ id: string }>;
  deleteBefore(cutoff: Date): Promise<number>;
  listPage(input: {
    since: Date;
    until?: Date;
    actor?: string;
    resource?: string;
    skip: number;
    take: number;
  }): Promise<{ total: number; items: AuditEventRecord[] }>;
}

import { decrypt } from './crypto.js';

export const formatPolicy = (p: any) => {
  if (!p) return null;
  return {
    ...p,
    id: p.policyId,
    uuid: p.id,
  };
};

export const formatAudit = (a: any) => {
  if (!a) return null;
  return {
    ...a,
    id: a.auditId,
    title: a.auditTitle,
    scheduledDate: a.auditDate,
    uuid: a.id,
  };
};

export const formatFinding = (f: any) => {
  if (!f) return null;
  
  const correctiveActions = f.correctiveActions ? f.correctiveActions.map((c: any) => ({
    ...c,
    progress: c.progressPercentage,
    evidence: c.evidenceUrl,
    closureNotes: decrypt(c.resolutionNotes),
    completionTimestamp: c.closedAt
  })) : [];

  return {
    ...f,
    description: decrypt(f.description),
    id: f.findingId,
    uuid: f.id,
    auditId: f.audit ? f.audit.auditId : f.auditId,
    correctiveActions
  };
};

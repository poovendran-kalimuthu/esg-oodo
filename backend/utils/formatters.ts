// Utility formatter helpers to map 3NF columns to frontend expectations.

export const formatPolicy = (p: any) => {
  if (!p) return null;
  return {
    ...p,
    id: p.policyId, // Mapped business key for frontend
    uuid: p.id,    // Database UUID
  };
};

export const formatAudit = (a: any) => {
  if (!a) return null;
  return {
    ...a,
    id: a.auditId,            // Business ID (e.g. AUD-001) for frontend
    title: a.auditTitle,      // Title mapped
    scheduledDate: a.auditDate, // Date mapped
    uuid: a.id,               // DB UUID
  };
};

export const formatFinding = (f: any) => {
  if (!f) return null;
  
  const correctiveActions = f.correctiveActions ? f.correctiveActions.map((c: any) => ({
    ...c,
    progress: c.progressPercentage,
    evidence: c.evidenceUrl,
    closureNotes: c.resolutionNotes,
    completionTimestamp: c.closedAt
  })) : [];

  return {
    ...f,
    id: f.findingId,            // Business ID (e.g. FND-001)
    uuid: f.id,                 // DB UUID
    auditId: f.audit ? f.audit.auditId : f.auditId, // Map parent business key
    correctiveActions
  };
};

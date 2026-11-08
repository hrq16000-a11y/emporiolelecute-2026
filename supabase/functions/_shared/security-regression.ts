export interface SecurityFinding { id: string; package: string; severity: string }
export const hasHighRegression = (current: SecurityFinding[], previous: SecurityFinding[] | null) => {
  if (!previous) return false;
  return current.some(f => ['high', 'critical'].includes(f.severity) && !previous.some(p => p.id === f.id && p.package === f.package && (p.severity === 'critical' || p.severity === f.severity)));
};
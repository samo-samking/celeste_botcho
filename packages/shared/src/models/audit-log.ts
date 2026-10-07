export interface AuditLog {
  actorUid: string;
  action: string; // 'product.update', 'product.publish', 'category.delete'…
  targetPath: string; // 'products/abc123'
  summary: string; // 'prix 30 boules : 3000 → 2500'
  at: Date | null;
}

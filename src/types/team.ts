export type StaffRole = 'owner' | 'editor' | 'author';
export type StaffIdentity = { id: string; username: string; name: string; role: StaffRole };
export type TeamMember = StaffIdentity & { status: 'invited' | 'active' | 'disabled'; createdAt: string };
export function canManagePost(user: StaffIdentity, post: { createdBy?: string; status: string }) { return user.role !== 'author' || (post.createdBy === user.id && post.status !== 'published'); }
export function canSeePost(user: StaffIdentity, post: { createdBy?: string }) { return user.role !== 'author' || post.createdBy === user.id; }

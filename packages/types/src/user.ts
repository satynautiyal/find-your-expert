export type UserRole = 'CLIENT' | 'EXPERT' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

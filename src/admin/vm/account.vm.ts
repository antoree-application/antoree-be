import { UserRole } from '@prisma/client';

export class AccountVM {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  firstName: string;
  lastName: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AccountListVM {
  items: AccountVM[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
} 

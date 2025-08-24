import { UserRole } from "@prisma/client";

export class UserVm {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

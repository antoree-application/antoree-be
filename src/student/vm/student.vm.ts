import { EnglishLevel, UserRole } from '@prisma/client';

export class StudentVm {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Student specific fields
  studentId: string;
  englishLevel: EnglishLevel;
  learningGoals?: string;
  timezone: string;
  
  // Computed fields
  fullName: string;
  totalBookings?: number;
  totalLessons?: number;
}

export class StudentListVm {
  students: StudentVm[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class StudentProfileVm extends StudentVm {
  // Additional fields for detailed profile
  recentBookings?: any[];
  upcomingLessons?: any[];
  completedLessons?: number;
}

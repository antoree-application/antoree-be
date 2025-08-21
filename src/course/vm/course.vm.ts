import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnglishLevel } from '@prisma/client';

export class CourseVm {
  @ApiProperty({
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Business English Mastery',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'A comprehensive course designed to improve your business English skills.',
  })
  description?: string;

  @ApiProperty({
    description: 'Duration of each lesson in minutes',
    example: 60,
  })
  duration: number;

  @ApiProperty({
    description: 'Total number of lessons in the course',
    example: 10,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Course price in VND',
    example: '1500000.00',
  })
  price: string;

  @ApiProperty({
    description: 'English level required for this course',
    enum: EnglishLevel,
    example: EnglishLevel.INTERMEDIATE,
  })
  level: EnglishLevel;

  @ApiProperty({
    description: 'Whether the course is active and bookable',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-02-10T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-02-12T14:30:00Z',
  })
  updatedAt: Date;

  // Teacher information
  @ApiPropertyOptional({
    description: 'Teacher information',
  })
  teacher?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    averageRating?: string;
    totalLessons: number;
    specialties: string[];
    hourlyRate: string;
  };

  // Course statistics
  @ApiPropertyOptional({
    description: 'Course statistics',
  })
  stats?: {
    totalBookings: number;
    activeBookings: number;
    completedLessons: number;
    averageRating?: string;
  };
}

export class CourseListVm {
  @ApiProperty({
    description: 'List of courses',
    type: [CourseVm],
  })
  courses: CourseVm[];

  @ApiProperty({
    description: 'Total number of courses',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev: boolean;
}

export class CourseDetailVm extends CourseVm {
  @ApiPropertyOptional({
    description: 'Course lessons breakdown',
    type: [Object],
  })
  lessonsPlan?: Array<{
    lessonNumber: number;
    title: string;
    description?: string;
    duration: number;
    objectives: string[];
  }>;

  @ApiPropertyOptional({
    description: 'Recent bookings for this course',
    type: [Object],
  })
  recentBookings?: Array<{
    id: string;
    studentName: string;
    scheduledAt: string;
    status: string;
  }>;

  @ApiPropertyOptional({
    description: 'Course reviews and ratings',
    type: [Object],
  })
  reviews?: Array<{
    id: string;
    studentName: string;
    rating: number;
    comment?: string;
    createdAt: string;
  }>;
}

export class PopularCourseVm {
  @ApiProperty({
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Course name',
    example: 'IELTS Preparation Intensive',
  })
  name: string;

  @ApiProperty({
    description: 'Course price in VND',
    example: '2500000.00',
  })
  price: string;

  @ApiProperty({
    description: 'English level required',
    enum: EnglishLevel,
    example: EnglishLevel.UPPER_INTERMEDIATE,
  })
  level: EnglishLevel;

  @ApiProperty({
    description: 'Total number of lessons',
    example: 20,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Duration per lesson in minutes',
    example: 90,
  })
  duration: number;

  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    name: string;
    avatar?: string;
    averageRating?: string;
    specialties: string[];
  };

  @ApiProperty({
    description: 'Popularity metrics',
  })
  popularity: {
    totalBookings: number;
    monthlyBookings: number;
    averageRating?: string;
    reviewCount: number;
  };
}

export class CourseAnalyticsVm {
  @ApiProperty({
    description: 'Course ID',
    example: 'cm3course123def456',
  })
  courseId: string;

  @ApiProperty({
    description: 'Course name',
    example: 'Business English Mastery',
  })
  courseName: string;

  @ApiProperty({
    description: 'Analytics data',
  })
  analytics: {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalRevenue: string;
    averageRating?: string;
    totalReviews: number;
    completionRate: number; // percentage
    monthlyTrend: Array<{
      month: string;
      bookings: number;
      revenue: string;
    }>;
    levelDistribution: Array<{
      level: EnglishLevel;
      count: number;
      percentage: number;
    }>;
  };
}

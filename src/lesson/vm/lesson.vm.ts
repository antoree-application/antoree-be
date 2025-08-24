import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonStatus, EnglishLevel } from '@prisma/client';

export class LessonVm {
  @ApiProperty({
    description: 'Lesson ID',
    example: 'cm3lesson123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Course ID this lesson belongs to',
    example: 'cm3course123def456',
  })
  courseId: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'cm3teacher123def456',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Business Presentations',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example: 'Learn the fundamentals of creating and delivering effective business presentations',
  })
  description?: string;

  @ApiProperty({
    description: 'Scheduled date and time',
    example: '2024-02-15T14:00:00Z',
  })
  scheduledAt: Date;

  @ApiPropertyOptional({
    description: 'Actual start time',
    example: '2024-02-15T14:02:00Z',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Actual end time',
    example: '2024-02-15T15:05:00Z',
  })
  endedAt?: Date;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiPropertyOptional({
    description: 'Meeting room URL',
    example: 'https://zoom.us/j/123456789',
  })
  meetingUrl?: string;

  @ApiPropertyOptional({
    description: 'Learning objectives',
    example: ['Understand presentation structure', 'Practice public speaking'],
    type: [String],
  })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    description: 'Required materials',
    example: ['Business English textbook Chapter 5', 'Presentation slides'],
    type: [String],
  })
  materials?: string[];

  @ApiPropertyOptional({
    description: 'Homework assignments',
    example: 'Prepare a 5-minute presentation about your company',
  })
  homework?: string;

  @ApiPropertyOptional({
    description: 'Teacher notes',
    example: 'Student shows improvement in confidence. Focus on advanced vocabulary next time.',
  })
  notes?: string;

  @ApiProperty({
    description: 'Lesson status',
    enum: LessonStatus,
    example: LessonStatus.SCHEDULED,
  })
  status: LessonStatus;

  @ApiPropertyOptional({
    description: 'Lesson sequence number within the course',
    example: 1,
  })
  sequenceNumber?: number;

  @ApiProperty({
    description: 'Whether lesson is available for booking',
    example: true,
  })
  isAvailableForBooking: boolean;

  @ApiProperty({
    description: 'Maximum number of students',
    example: 1,
  })
  maxStudents: number;

  @ApiProperty({
    description: 'Number of current bookings',
    example: 0,
  })
  currentBookings: number;

  @ApiProperty({
    description: 'Whether lesson has available slots',
    example: true,
  })
  hasAvailableSlots: boolean;

  @ApiPropertyOptional({
    description: 'Prerequisite lessons',
    example: ['cm3lesson123abc456'],
    type: [String],
  })
  prerequisites?: string[];

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

  // Related data
  @ApiPropertyOptional({
    description: 'Course information',
  })
  course?: {
    id: string;
    name: string;
    level: EnglishLevel;
    totalLessons: number;
  };

  @ApiPropertyOptional({
    description: 'Teacher information',
  })
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    averageRating?: string;
    specialties: string[];
  };

  @ApiPropertyOptional({
    description: 'Booking information if user has booked this lesson',
  })
  booking?: {
    id: string;
    status: string;
    notes?: string;
  };
}

export class LessonDetailVm extends LessonVm {
  @ApiPropertyOptional({
    description: 'Student feedback for this lesson',
    type: [Object],
  })
  studentFeedback?: Array<{
    studentId: string;
    studentName: string;
    feedback: string;
    rating?: number;
    submittedAt: Date;
  }>;

  @ApiPropertyOptional({
    description: 'Lesson completion statistics',
  })
  stats?: {
    totalBookings: number;
    completedBookings: number;
    averageRating?: number;
    attendanceRate: number;
  };

  @ApiPropertyOptional({
    description: 'Next lesson in sequence',
  })
  nextLesson?: {
    id: string;
    title: string;
    scheduledAt?: Date;
  };

  @ApiPropertyOptional({
    description: 'Previous lesson in sequence',
  })
  previousLesson?: {
    id: string;
    title: string;
    scheduledAt?: Date;
  };

  @ApiPropertyOptional({
    description: 'Lesson progress tracking',
  })
  progress?: {
    topicsCovered?: string[];
    studentStrengths?: string[];
    improvementAreas?: string[];
    nextLessonFocus?: string;
    completionPercentage: number;
  };
}

export class LessonListVm {
  @ApiProperty({
    description: 'Array of lessons',
    type: [LessonVm],
  })
  lessons: LessonVm[];

  @ApiProperty({
    description: 'Pagination metadata',
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };

  @ApiPropertyOptional({
    description: 'Search and filter summary',
  })
  summary?: {
    totalLessons: number;
    scheduledLessons: number;
    completedLessons: number;
    availableSlots: number;
    upcomingLessons: number;
  };
}

export class LessonTemplateVm {
  @ApiProperty({
    description: 'Template ID',
    example: 'cm3template123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Template name',
    example: 'Business Presentation Template',
  })
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Standard template for business presentation lessons',
  })
  description: string;

  @ApiProperty({
    description: 'Default duration in minutes',
    example: 60,
  })
  duration: number;

  @ApiPropertyOptional({
    description: 'Default learning objectives',
    example: ['Practice presentation skills', 'Build confidence', 'Learn business vocabulary'],
    type: [String],
  })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    description: 'Default materials',
    example: ['Presentation slides template', 'Business vocabulary handout'],
    type: [String],
  })
  materials?: string[];

  @ApiPropertyOptional({
    description: 'Default homework template',
    example: 'Prepare a presentation on [TOPIC]',
  })
  homeworkTemplate?: string;

  @ApiProperty({
    description: 'Template category',
    example: 'Business English',
  })
  category: string;

  @ApiProperty({
    description: 'Times this template has been used',
    example: 25,
  })
  usageCount: number;

  @ApiProperty({
    description: 'Teacher who created this template',
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiProperty({
    description: 'Whether template is public or private',
    example: false,
  })
  isPublic: boolean;
}

export class LessonStatsVm {
  @ApiProperty({
    description: 'Total lessons created',
    example: 150,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Scheduled lessons',
    example: 45,
  })
  scheduledLessons: number;

  @ApiProperty({
    description: 'In progress lessons',
    example: 3,
  })
  inProgressLessons: number;

  @ApiProperty({
    description: 'Completed lessons',
    example: 95,
  })
  completedLessons: number;

  @ApiProperty({
    description: 'Cancelled lessons',
    example: 7,
  })
  cancelledLessons: number;

  @ApiProperty({
    description: 'Average lesson duration',
    example: 58.5,
  })
  averageDuration: number;

  @ApiProperty({
    description: 'Total teaching hours',
    example: 142.5,
  })
  totalTeachingHours: number;

  @ApiProperty({
    description: 'Completion rate percentage',
    example: 92.3,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Average student rating',
    example: 4.7,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Lessons by month (last 12 months)',
    example: [
      { month: '2024-01', count: 12 },
      { month: '2024-02', count: 15 },
    ],
  })
  lessonsByMonth: Array<{ month: string; count: number }>;

  @ApiProperty({
    description: 'Most popular lesson times',
    example: [
      { hour: 14, count: 25 },
      { hour: 15, count: 22 },
    ],
  })
  popularTimes: Array<{ hour: number; count: number }>;
}

export class CourseLessonProgressVm {
  @ApiProperty({
    description: 'Course information',
  })
  course: {
    id: string;
    name: string;
    totalLessons: number;
    level: EnglishLevel;
  };

  @ApiProperty({
    description: 'Lesson progress summary',
  })
  progress: {
    totalLessons: number;
    scheduledLessons: number;
    completedLessons: number;
    progressPercentage: number;
    nextLesson?: {
      id: string;
      title: string;
      scheduledAt?: Date;
      sequenceNumber: number;
    };
  };

  @ApiProperty({
    description: 'Recent lesson activity',
    type: [Object],
  })
  recentLessons: Array<{
    id: string;
    title: string;
    scheduledAt: Date;
    status: LessonStatus;
    sequenceNumber: number;
    duration: number;
  }>;

  @ApiProperty({
    description: 'Upcoming lessons',
    type: [Object],
  })
  upcomingLessons: Array<{
    id: string;
    title: string;
    scheduledAt: Date;
    sequenceNumber: number;
    duration: number;
    hasAvailableSlots: boolean;
  }>;
}

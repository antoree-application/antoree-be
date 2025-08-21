import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewVm {
  @ApiProperty({
    description: 'Review ID',
    example: 'clk123456789',
  })
  id: string;

  @ApiProperty({
    description: 'Student information',
  })
  student: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    englishLevel: string;
  };

  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    example: 5,
  })
  rating: number;

  @ApiPropertyOptional({
    description: 'Review comment',
    example: 'Excellent teacher!',
  })
  comment?: string;

  @ApiPropertyOptional({
    description: 'Associated booking information',
  })
  booking?: {
    id: string;
    isTrialLesson: boolean;
    scheduledAt: string;
    duration: number;
  };

  @ApiProperty({
    description: 'Review creation date',
    example: '2023-08-20T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Review last update date',
    example: '2023-08-20T10:00:00.000Z',
  })
  updatedAt: string;
}

export class TrialLessonFeedbackVm {
  @ApiProperty({
    description: 'Feedback ID',
    example: 'clk123456789',
  })
  id: string;

  @ApiProperty({
    description: 'Student information',
  })
  student: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    englishLevel: string;
  };

  @ApiProperty({
    description: 'Teacher information',
  })
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };

  @ApiProperty({
    description: 'Trial lesson booking information',
  })
  booking: {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
  };

  @ApiProperty({
    description: 'Overall rating from 1 to 5',
    example: 5,
  })
  overallRating: number;

  @ApiPropertyOptional({
    description: 'Detailed ratings breakdown',
  })
  detailedRatings?: {
    teachingQuality?: number;
    communication?: number;
    punctuality?: number;
    preparation?: number;
  };

  @ApiProperty({
    description: 'What the student liked',
    example: 'Patient and clear explanations',
  })
  whatYouLiked: string;

  @ApiPropertyOptional({
    description: 'Areas for improvement',
    example: 'Could speak a bit slower',
  })
  areasForImprovement?: string;

  @ApiProperty({
    description: 'Would book again',
    example: true,
  })
  wouldBookAgain: boolean;

  @ApiPropertyOptional({
    description: 'Additional comments',
    example: 'Looking forward to more lessons!',
  })
  additionalComments?: string;

  @ApiPropertyOptional({
    description: 'Topics covered',
    example: 'Basic conversation, pronunciation',
  })
  topicsCovered?: string;

  @ApiPropertyOptional({
    description: 'Future learning goals',
    example: 'Business English focus',
  })
  futureGoals?: string;

  @ApiProperty({
    description: 'Feedback creation date',
    example: '2023-08-20T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Feedback last update date',
    example: '2023-08-20T10:00:00.000Z',
  })
  updatedAt: string;
}

export class ReviewSearchResultVm {
  @ApiProperty({
    description: 'List of reviews',
    type: [ReviewVm],
  })
  reviews: ReviewVm[];

  @ApiProperty({
    description: 'Total number of reviews',
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 5,
  })
  totalPages: number;

  @ApiPropertyOptional({
    description: 'Average rating',
    example: 4.5,
  })
  averageRating?: number;

  @ApiPropertyOptional({
    description: 'Rating distribution',
  })
  ratingDistribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export class TeacherReviewStatsVm {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'clk123456789',
  })
  teacherId: string;

  @ApiProperty({
    description: 'Total number of reviews',
    example: 25,
  })
  totalReviews: number;

  @ApiProperty({
    description: 'Average rating',
    example: 4.7,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Rating distribution',
  })
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };

  @ApiProperty({
    description: 'Recent reviews',
    type: [ReviewVm],
  })
  recentReviews: ReviewVm[];

  @ApiProperty({
    description: 'Trial lesson specific stats',
  })
  trialLessonStats: {
    totalTrialReviews: number;
    averageTrialRating: number;
    wouldBookAgainPercentage: number;
  };

  @ApiProperty({
    description: 'Response rate to student feedback',
    example: 85,
  })
  responseRate: number;

  @ApiProperty({
    description: 'Last review date',
    example: '2023-08-20T10:00:00.000Z',
  })
  lastReviewDate: string;
}

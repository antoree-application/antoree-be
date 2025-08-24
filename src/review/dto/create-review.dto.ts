import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'ID of the teacher being reviewed',
    example: 'clk123456789',
  })
  @IsNotEmpty()
  @IsUUID()
  teacherId: string;

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Optional review comment',
    example: 'Great teacher! Very patient and helpful.',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: 'ID of the booking/lesson this review is for',
    example: 'clk123456789',
  })
  @IsOptional()
  @IsUUID()
  bookingId?: string;
}

export class CreateTrialLessonFeedbackDto {
  @ApiProperty({
    description: 'ID of the teacher being reviewed',
    example: 'clk123456789',
  })
  @IsNotEmpty()
  @IsUUID()
  teacherId: string;

  @ApiProperty({
    description: 'ID of the trial lesson booking',
    example: 'clk123456789',
  })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({
    description: 'Overall rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiPropertyOptional({
    description: 'Teaching quality rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  teachingQuality?: number;

  @ApiPropertyOptional({
    description: 'Communication rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communication?: number;

  @ApiPropertyOptional({
    description: 'Punctuality rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  punctuality?: number;

  @ApiPropertyOptional({
    description: 'Lesson preparation rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  preparation?: number;

  @ApiProperty({
    description: 'What the student liked most about the lesson',
    example: 'The teacher was very patient and explained concepts clearly.',
  })
  @IsNotEmpty()
  @IsString()
  whatYouLiked: string;

  @ApiPropertyOptional({
    description: 'Areas for improvement',
    example: 'Maybe speak a bit slower for beginners.',
  })
  @IsOptional()
  @IsString()
  areasForImprovement?: string;

  @ApiProperty({
    description: 'Would you book another lesson with this teacher?',
    example: true,
  })
  @IsNotEmpty()
  wouldBookAgain: boolean;

  @ApiPropertyOptional({
    description: 'Additional comments',
    example: 'Looking forward to continuing lessons!',
  })
  @IsOptional()
  @IsString()
  additionalComments?: string;

  @ApiPropertyOptional({
    description: 'Topics covered during the lesson',
    example: 'Basic conversation, pronunciation',
  })
  @IsOptional()
  @IsString()
  topicsCovered?: string;

  @ApiPropertyOptional({
    description: 'Learning goals for future lessons',
    example: 'Focus on business English and presentation skills',
  })
  @IsOptional()
  @IsString()
  futureGoals?: string;
}

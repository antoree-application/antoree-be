import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsDateString, 
  IsInt, 
  Min, 
  Max, 
  IsUrl,
  IsArray,
  IsBoolean,
  IsEnum
} from 'class-validator';
import { Transform } from 'class-transformer';
import { LessonStatus } from '@prisma/client';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    description: 'Lesson title',
    example: 'Advanced Business Presentations',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example: 'Advanced techniques for creating compelling business presentations',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Scheduled date and time for the lesson (ISO 8601)',
    example: '2024-02-15T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Lesson duration in minutes',
    example: 90,
    minimum: 15,
    maximum: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(180)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Meeting room URL (Zoom, Meet, etc.)',
    example: 'https://zoom.us/j/123456789',
  })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiPropertyOptional({
    description: 'Learning objectives for this lesson',
    example: ['Master advanced presentation techniques', 'Handle Q&A sessions effectively'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    description: 'Materials needed for the lesson',
    example: ['Advanced Business English textbook Chapter 8', 'Presentation slides template'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({
    description: 'Homework assignments for the lesson',
    example: 'Create a 10-minute presentation with Q&A section',
  })
  @IsOptional()
  @IsString()
  homework?: string;

  @ApiPropertyOptional({
    description: 'Teacher notes for lesson preparation and observations',
    example: 'Student shows improvement in confidence. Focus more on advanced vocabulary next time.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Lesson sequence number within the course',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceNumber?: number;

  @ApiPropertyOptional({
    description: 'Whether this lesson is publicly available for booking',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailableForBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of students for this lesson',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxStudents?: number;

  @ApiPropertyOptional({
    description: 'Prerequisite lessons that must be completed before this one',
    example: ['cm3lesson123abc456', 'cm3lesson456def789'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({
    description: 'Lesson status',
    enum: LessonStatus,
    example: LessonStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;
}

export class UpdateLessonNotesDto {
  @ApiPropertyOptional({
    description: 'Teacher notes and observations about the lesson',
    example: 'Student demonstrated excellent progress in pronunciation. Recommend focusing on advanced grammar structures in the next lesson. Homework completed satisfactorily.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Homework assignments given during or after the lesson',
    example: 'Practice the irregular verbs list provided. Prepare a 3-minute speech about your weekend plans.',
  })
  @IsOptional()
  @IsString()
  homework?: string;

  @ApiPropertyOptional({
    description: 'Additional feedback for the student',
    example: 'Great improvement in fluency! Keep practicing the pronunciation exercises.',
  })
  @IsOptional()
  @IsString()
  studentFeedback?: string;

  @ApiPropertyOptional({
    description: 'Topics covered during the lesson',
    example: ['Past tense review', 'Irregular verbs', 'Conversation practice', 'Pronunciation drills'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicsCovered?: string[];

  @ApiPropertyOptional({
    description: 'Areas where student excelled',
    example: ['Pronunciation improved significantly', 'Good understanding of grammar concepts'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strengths?: string[];

  @ApiPropertyOptional({
    description: 'Areas needing improvement',
    example: ['Needs more practice with irregular verbs', 'Work on sentence structure'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvementAreas?: string[];

  @ApiPropertyOptional({
    description: 'Recommended focus for next lesson',
    example: 'Continue with irregular verbs and introduce future tense',
  })
  @IsOptional()
  @IsString()
  nextLessonFocus?: string;
}

export class RescheduleLessonDto {
  @ApiPropertyOptional({
    description: 'New scheduled date and time for the lesson (ISO 8601)',
    example: '2024-02-16T15:00:00Z',
  })
  @IsDateString()
  newScheduledAt: string;

  @ApiPropertyOptional({
    description: 'Reason for rescheduling',
    example: 'Student requested change due to work conflict',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify the student about the reschedule',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyStudent?: boolean = true;
}

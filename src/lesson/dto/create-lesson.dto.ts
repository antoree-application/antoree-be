import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsDateString, 
  IsInt, 
  Min, 
  Max, 
  IsUUID, 
  IsUrl,
  IsArray,
  ValidateNested,
  IsBoolean
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Course ID this lesson belongs to',
    example: 'cm3course123def456',
  })
  @IsString()
  
  courseId: string;

  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Business Presentations',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Lesson description',
    example: 'Learn the fundamentals of creating and delivering effective business presentations',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Scheduled date and time for the lesson (ISO 8601)',
    example: '2024-02-15T14:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({
    description: 'Lesson duration in minutes',
    example: 60,
    minimum: 15,
    maximum: 180,
  })
  @IsInt()
  @Min(15)
  @Max(180)
  duration: number;

  @ApiPropertyOptional({
    description: 'Meeting room URL (Zoom, Meet, etc.)',
    example: 'https://zoom.us/j/123456789',
  })
  @IsOptional()
  @IsUrl()
  meetingUrl?: string;

  @ApiPropertyOptional({
    description: 'Learning objectives for this lesson',
    example: ['Understand presentation structure', 'Practice public speaking', 'Learn business vocabulary'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    description: 'Materials needed for the lesson',
    example: ['Business English textbook Chapter 5', 'Presentation slides', 'Vocabulary handout'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[];

  @ApiPropertyOptional({
    description: 'Homework assignments for the lesson',
    example: 'Prepare a 5-minute presentation about your company',
  })
  @IsOptional()
  @IsString()
  homework?: string;

  @ApiPropertyOptional({
    description: 'Teacher notes for lesson preparation',
    example: 'Focus on pronunciation and confidence building',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Lesson sequence number within the course',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sequenceNumber?: number;

  @ApiPropertyOptional({
    description: 'Whether this lesson is publicly available for booking',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailableForBooking?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum number of students for this lesson (for group lessons)',
    example: 1,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxStudents?: number = 1;

  @ApiPropertyOptional({
    description: 'Prerequisite lessons that must be completed before this one',
    example: ['cm3lesson123abc456'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}

export class CreateLessonFromTemplateDto {
  @ApiProperty({
    description: 'Course ID this lesson belongs to',
    example: 'cm3course123def456',
  })
  @IsString()
  
  courseId: string;

  @ApiProperty({
    description: 'Template lesson ID to copy from',
    example: 'cm3lesson123template',
  })
  @IsString()
  
  templateLessonId: string;

  @ApiProperty({
    description: 'Scheduled date and time for the new lesson (ISO 8601)',
    example: '2024-02-15T14:00:00Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Override lesson title',
    example: 'Advanced Business Presentations',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Override lesson duration in minutes',
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
    description: 'Additional notes for this specific lesson instance',
    example: 'Review previous lesson feedback before starting',
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class BulkCreateLessonsDto {
  @ApiProperty({
    description: 'Course ID these lessons belong to',
    example: 'cm3course123def456',
  })
  @IsString()
  
  courseId: string;

  @ApiProperty({
    description: 'Base lesson template to use for all lessons',
  })
  @ValidateNested()
  @Type(() => CreateLessonDto)
  lessonTemplate: Omit<CreateLessonDto, 'courseId' | 'scheduledAt'>;

  @ApiProperty({
    description: 'Array of scheduled times for the lessons',
    example: ['2024-02-15T14:00:00Z', '2024-02-17T14:00:00Z', '2024-02-19T14:00:00Z'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  scheduledTimes: string[];

  @ApiPropertyOptional({
    description: 'Auto-increment lesson titles with sequence numbers',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoIncrementTitles?: boolean = false;

  @ApiPropertyOptional({
    description: 'Starting sequence number for lessons',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  startingSequence?: number = 1;
}

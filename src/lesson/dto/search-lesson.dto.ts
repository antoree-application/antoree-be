import { ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsDateString, 
  IsInt, 
  Min, 
  Max, 
  IsEnum,
  IsBoolean,
  IsUUID,
  IsArray
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LessonStatus } from '@prisma/client';

export class SearchLessonDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search query for lesson title or description',
    example: 'business presentation',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by course ID',
    example: 'cm3course123def456',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by teacher ID',
    example: 'cm3teacher123def456',
  })
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Filter by lesson status',
    enum: LessonStatus,
    example: LessonStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601)',
    example: '2024-02-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601)',
    example: '2024-02-28T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum duration in minutes',
    example: 30,
    minimum: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  minDuration?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum duration in minutes',
    example: 120,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(180)
  maxDuration?: number;

  @ApiPropertyOptional({
    description: 'Filter by availability for booking',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  availableForBooking?: boolean;

  @ApiPropertyOptional({
    description: 'Include only lessons with available slots',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  hasAvailableSlots?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by specific learning objectives',
    example: ['speaking', 'presentation skills'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['scheduledAt', 'createdAt', 'title', 'duration', 'sequenceNumber'],
    example: 'scheduledAt',
    default: 'scheduledAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'scheduledAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({
    description: 'Include lessons from this date onwards (for upcoming lessons)',
    example: '2024-02-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Include lessons up to this date (for past lessons)',
    example: '2024-02-28T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Include only lessons with homework assigned',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  hasHomework?: boolean;

  @ApiPropertyOptional({
    description: 'Include only lessons with notes',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  hasNotes?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by sequence number range (minimum)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minSequence?: number;

  @ApiPropertyOptional({
    description: 'Filter by sequence number range (maximum)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSequence?: number;
}

export class GetTeacherLessonsDto extends SearchLessonDto {
  @ApiPropertyOptional({
    description: 'Include only upcoming lessons',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  upcomingOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Include lesson statistics in response',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeStats?: boolean;
}

export class GetCourseLessonsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 50,
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Include only scheduled lessons',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  scheduledOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['sequenceNumber', 'scheduledAt', 'createdAt', 'title'],
    example: 'sequenceNumber',
    default: 'sequenceNumber',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'sequenceNumber';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';
}

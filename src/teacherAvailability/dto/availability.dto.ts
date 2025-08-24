import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsInt, 
  Min, 
  Max, 
  IsBoolean, 
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  Matches,
  ArrayNotEmpty
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum AvailabilityType {
  REGULAR = 'REGULAR',        // Weekly recurring
  ONE_TIME = 'ONE_TIME',      // Specific date
  BLACKOUT = 'BLACKOUT'       // Unavailable periods
}

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format (24-hour)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (24-hour)',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format (24-hour)',
    example: '17:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (24-hour)',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Type of availability',
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
    default: AvailabilityType.REGULAR,
  })
  @IsOptional()
  @IsEnum(AvailabilityType)
  type?: AvailabilityType;

  @ApiPropertyOptional({
    description: 'Whether this availability is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Start time in HH:mm format (24-hour)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (24-hour)',
  })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time in HH:mm format (24-hour)',
    example: '17:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (24-hour)',
  })
  endTime?: string;

  @ApiPropertyOptional({
    description: 'Type of availability',
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
  })
  @IsOptional()
  @IsEnum(AvailabilityType)
  type?: AvailabilityType;

  @ApiPropertyOptional({
    description: 'Whether this availability is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkCreateAvailabilityDto {
  @ApiProperty({
    description: 'Array of availability slots to create',
    type: [CreateAvailabilityDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  availabilities: CreateAvailabilityDto[];
}

export class GetAvailabilityQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Filter by availability type',
    enum: AvailabilityType,
    example: AvailabilityType.REGULAR,
  })
  @IsOptional()
  @IsEnum(AvailabilityType)
  type?: AvailabilityType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Include weekly schedule summary',
    example: true,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeWeeklySummary?: boolean;
}

export class AvailabilityConflictCheckDto {
  @ApiProperty({
    description: 'Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:mm format (24-hour)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (24-hour)',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format (24-hour)',
    example: '17:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (24-hour)',
  })
  endTime: string;

  @ApiPropertyOptional({
    description: 'Exclude this availability ID from conflict checking (for updates)',
    example: 'clm123abc456',
  })
  @IsOptional()
  @IsString()
  excludeId?: string;
}

export class CopyAvailabilityDto {
  @ApiProperty({
    description: 'Source day of week to copy from (0=Sunday, 1=Monday, ..., 6=Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  fromDayOfWeek: number;

  @ApiProperty({
    description: 'Target days of week to copy to',
    example: [2, 3, 4],
    type: [Number],
  })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  toDaysOfWeek: number[];

  @ApiPropertyOptional({
    description: 'Whether to replace existing availability on target days',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean;
}
